/**
 * ========================================================================
 * BONK BATTLE - OPTIMIZED PRICE ORACLE HOOK
 * ========================================================================
 * 
 * Changes from original:
 * ✅ React Query caching - una sola fetch per l'intera app
 * ✅ Global singleton - tutti i componenti condividono lo stesso prezzo
 * ✅ Smart polling - solo se oracle scaduto (daily update)
 * ✅ Supabase fallback - usa DB prima di RPC
 * 
 * ========================================================================
 */

import { PublicKey } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { connection, executeWithRetry } from '@/lib/solana';
import { getPriceOraclePDA } from '@/lib/solana/pdas';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';
import { queryKeys } from '@/lib/queryClient';

/**
 * Price Oracle Hook Result
 */
export interface UsePriceOracleResult {
  solPriceUsd: number | null;
  lastUpdate: number | null;
  nextUpdate: number | null;
  updateCount: number | null;
  keeperAuthority: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Price Oracle data interface
 */
interface PriceOracleData {
  solPriceUsd: number;
  lastUpdate: number;
  nextUpdate: number;
  updateCount: number;
  keeperAuthority: string;
}

/**
 * Fetch price oracle da blockchain con Supabase fallback
 */
async function fetchPriceOracle(): Promise<PriceOracleData> {
  try {
    // 1. ✅ TRY SUPABASE FIRST (instant, no rate limit)
    const { data: oracleData, error: supabaseError } = await supabase
      .from('price_oracle')
      .select('*')
      .single();

    if (oracleData && !supabaseError) {
      console.log('⚡ Price Oracle fetched from Supabase cache');

      // 🔧 FIX: Determina se il valore è già in USD o è raw
      const rawValue = Number(oracleData.sol_price_usd);

      let solPriceUsd: number;

      if (rawValue > 1000) {
        // Valore è in micro-USD (formato raw), converti
        solPriceUsd = rawValue / 1_000_000;
        console.log('✅ Converted from micro-USD:', rawValue, '→', solPriceUsd);
      } else if (rawValue > 1) {
        // Valore è già in USD, usa diretto
        solPriceUsd = rawValue;
        console.log('✅ Already in USD:', solPriceUsd);
      } else {
        // Valore è sbagliato (< 1), usa fallback RPC
        console.warn('⚠️ Invalid price in Supabase:', rawValue, '- falling back to RPC');
        throw new Error('Invalid Supabase price, fallback to RPC');
      }

      return {
        solPriceUsd,
        lastUpdate: Number(oracleData.last_update_timestamp),
        nextUpdate: Number(oracleData.next_update_timestamp),
        updateCount: Number(oracleData.update_count),
        keeperAuthority: oracleData.keeper_authority,
      };
    }

    // 2. ⚠️ FALLBACK TO RPC (with retry logic)
    console.warn('⚠️ Price Oracle not in Supabase, falling back to RPC');

    return await executeWithRetry(
      async () => {
        const [priceOraclePDA] = getPriceOraclePDA();

        console.log('🔍 Fetching Price Oracle from RPC');

        // Fetch account info
        const accountInfo = await connection.getAccountInfo(priceOraclePDA);

        if (!accountInfo) {
          throw new Error('Price Oracle account not found - needs initialization');
        }

        // Verify program ownership
        if (!accountInfo.owner.equals(BONK_BATTLE_PROGRAM_ID)) {
          throw new Error(
            `Invalid oracle owner. Expected ${BONK_BATTLE_PROGRAM_ID.toString()}`
          );
        }

        // Parse account data
        const data = accountInfo.data;
        let offset = 8; // Skip discriminator

        // Helper to parse u64 (little-endian)
        const parseU64 = (offset: number): number => {
          let value = 0n;
          for (let i = 0; i < 8; i++) {
            value |= BigInt(data[offset + i]) << BigInt(i * 8);
          }
          return Number(value);
        };

        // Helper to parse i64 (little-endian, signed)
        const parseI64 = (offset: number): number => {
          let value = 0n;
          for (let i = 0; i < 8; i++) {
            value |= BigInt(data[offset + i]) << BigInt(i * 8);
          }
          if (value > 0x7fffffffffffffffn) {
            value = value - 0x10000000000000000n;
          }
          return Number(value);
        };

        // Parse sol_price_usd (u64, 6 decimals)
        const solPriceUsdRaw = parseU64(offset);
        const solPriceUsd = solPriceUsdRaw / 1_000_000; // Convert to USD
        offset += 8;

        // Parse last_update_timestamp (i64)
        const lastUpdate = parseI64(offset);
        offset += 8;

        // Parse next_update_timestamp (i64)
        const nextUpdate = parseI64(offset);
        offset += 8;

        // Parse keeper_authority (32 bytes)
        const keeperAuthorityBytes = data.slice(offset, offset + 32);
        const keeperAuthority = new PublicKey(keeperAuthorityBytes).toString();
        offset += 32;

        // Parse update_count (u64)
        const updateCount = parseU64(offset);

        console.log('✅ Price Oracle fetched from RPC:', {
          solPriceUsd,
          lastUpdate: new Date(lastUpdate * 1000).toISOString(),
          nextUpdate: new Date(nextUpdate * 1000).toISOString(),
          updateCount,
        });

        return {
          solPriceUsd,
          lastUpdate,
          nextUpdate,
          updateCount,
          keeperAuthority,
        };
      },
      'priceOracle', // Deduplication key
      3 // Max 3 retries
    );

  } catch (err) {
    console.error('❌ Error fetching Price Oracle:', err);
    throw err;
  }
}

/**
 * ========================================================================
 * OPTIMIZED HOOK WITH REACT QUERY
 * ========================================================================
 */
export function usePriceOracle(): UsePriceOracleResult {
  const {
    data,
    isLoading: loading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.oracle.price,
    queryFn: fetchPriceOracle,

    // ⭐ AGGRESSIVE CACHING - prezzo cambia raramente
    staleTime: 60_000, // 1min - considera fresh per 1 minuto
    gcTime: 5 * 60 * 1000, // 5min - mantieni in cache

    // ⭐ SMART POLLING - solo se oracle scaduto
    refetchInterval: (query) => {
      // ✅ FIX: usa query.state.data invece di data direttamente
      const data = query.state.data;

      if (!data) return false;

      const now = Math.floor(Date.now() / 1000);
      const needsUpdate = now >= data.nextUpdate;

      // Polling ogni 5 minuti se scaduto, altrimenti no polling
      return needsUpdate ? 5 * 60 * 1000 : false;
    },

    // ⭐ REFETCH OPTIMIZATION
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true, // Refetch solo su reconnect
  });

  // Wrapper per refetch
  const refetch = async () => {
    await queryRefetch();
  };

  return {
    solPriceUsd: data?.solPriceUsd ?? null,
    lastUpdate: data?.lastUpdate ?? null,
    nextUpdate: data?.nextUpdate ?? null,
    updateCount: data?.updateCount ?? null,
    keeperAuthority: data?.keeperAuthority ?? null,
    loading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Helper hook to check if oracle needs update
 */
export function usePriceOracleNeedsUpdate(): boolean {
  const { nextUpdate } = usePriceOracle();
  if (!nextUpdate) return false;

  const now = Math.floor(Date.now() / 1000);
  return now >= nextUpdate;
}

/**
 * Helper hook to calculate market cap in USD
 */
export function useCalculateMarketCapUsd(solAmount: number): number | null {
  const { solPriceUsd } = usePriceOracle();

  if (!solPriceUsd) return null;

  // Convert lamports to SOL, then to USD
  const solValue = solAmount / 1e9;
  return solValue * solPriceUsd;
}