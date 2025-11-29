/**
 * ========================================================================
 * BONK BATTLE V2 - OPTIMIZED TOKEN BATTLE STATE HOOK
 * ========================================================================
 * 
 * V2 Changes:
 * ✅ New fields: tier, virtualSolReserves, virtualTokenReserves, realSolReserves, realTokenReserves
 * ✅ Removed: solCollected, creator (now computed from reserves)
 * ✅ New status: PoolCreated
 * ✅ Market cap calculated from virtual reserves
 * 
 * ========================================================================
 */

import { PublicKey } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { connection, executeWithRetry } from '@/lib/solana';
import { getBattleStatePDA } from '@/lib/solana/pdas';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';
import { ParsedTokenBattleState, BattleStatus, BattleTier } from '@/types/bonk';
import { queryKeys } from '@/lib/queryClient';

/**
 * Helper to parse metadata that might be stored as JSON string
 */
function parseMetadataField(value: string, field: 'name' | 'symbol' | 'image' | 'description'): string {
  if (!value) return '';

  const trimmed = value.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed[field] || parsed[field.toLowerCase()] || parsed[field.toUpperCase()] || '';
    } catch {
      return value;
    }
  }

  return value;
}

/**
 * Token Battle State Hook Result
 */
export interface UseTokenBattleStateResult {
  state: ParsedTokenBattleState | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch token battle state da Supabase (priorità) o RPC (fallback)
 */
async function fetchTokenBattleState(
  mint: PublicKey
): Promise<ParsedTokenBattleState | null> {
  try {
    // 1. ✅ TRY SUPABASE FIRST (instant, no rate limit)
    const { data: tokenData, error: supabaseError } = await supabase
      .from('tokens')
      .select('*')
      .eq('mint', mint.toString())
      .single();

    if (tokenData && !supabaseError) {
      console.log('⚡ Battle State fetched from Supabase cache');

      // Parse metadata - handle JSON in any field
      let name = tokenData.name || '';
      let symbol = tokenData.symbol || '';
      let image = tokenData.image || '';

      // Try to extract from uri if it's JSON
      if (tokenData.uri) {
        const nameFromUri = parseMetadataField(tokenData.uri, 'name');
        const symbolFromUri = parseMetadataField(tokenData.uri, 'symbol');
        const imageFromUri = parseMetadataField(tokenData.uri, 'image');

        if (nameFromUri) name = nameFromUri;
        if (symbolFromUri) symbol = symbolFromUri;
        if (imageFromUri) image = imageFromUri;
      }

      // Parse from name field if it's JSON
      if (!name || name.startsWith('{')) {
        const parsedName = parseMetadataField(tokenData.name || '', 'name');
        if (parsedName) name = parsedName;
      }

      // ⭐ Parse from symbol field if it's JSON (common V2 issue)
      if (!symbol || symbol.startsWith('{')) {
        const parsedSymbol = parseMetadataField(tokenData.symbol || '', 'symbol');
        if (parsedSymbol) symbol = parsedSymbol;

        // Also try to get name/image from symbol if it's JSON
        if (!name) {
          const nameFromSymbol = parseMetadataField(tokenData.symbol || '', 'name');
          if (nameFromSymbol) name = nameFromSymbol;
        }
        if (!image) {
          const imageFromSymbol = parseMetadataField(tokenData.symbol || '', 'image');
          if (imageFromSymbol) image = imageFromSymbol;
        }
      }

      return {
        mint: new PublicKey(tokenData.mint),
        tier: (tokenData.tier ?? 0) as BattleTier,
        virtualSolReserves: Number(tokenData.virtual_sol_reserves || 0),
        virtualTokenReserves: Number(tokenData.virtual_token_reserves || 0),
        realSolReserves: Number(tokenData.real_sol_reserves || 0),
        realTokenReserves: Number(tokenData.real_token_reserves || 0),
        tokensSold: Number(tokenData.tokens_sold || 0),
        totalTradeVolume: Number(tokenData.total_trade_volume || 0),
        isActive: tokenData.is_active ?? true,
        battleStatus: (tokenData.battle_status ?? 0) as BattleStatus,
        opponentMint: new PublicKey(tokenData.opponent_mint || PublicKey.default.toString()),
        creationTimestamp: Number(tokenData.creation_timestamp || 0),
        lastTradeTimestamp: Number(tokenData.last_trade_timestamp || 0),
        battleStartTimestamp: Number(tokenData.battle_start_timestamp || 0),
        victoryTimestamp: Number(tokenData.victory_timestamp || 0),
        listingTimestamp: Number(tokenData.listing_timestamp || 0),
        bump: Number(tokenData.bump || 0),
        name,
        symbol,
        uri: tokenData.uri || '',
        image: image || undefined,
      };
    }

    // 2. ⚠️ FALLBACK TO RPC (with retry logic)
    console.warn('⚠️ Token not in Supabase, falling back to RPC');

    return await executeWithRetry(
      async () => {
        const [battleStatePDA] = getBattleStatePDA(mint);

        console.log('🔍 Fetching Battle State V2 from RPC for:', mint.toString());

        const accountInfo = await connection.getAccountInfo(battleStatePDA);

        if (!accountInfo) {
          console.log('ℹ️ Battle State account not found');
          return null;
        }

        if (!accountInfo.owner.equals(BONK_BATTLE_PROGRAM_ID)) {
          throw new Error(`Invalid account owner`);
        }

        // Parse V2 account data
        const data = accountInfo.data;
        let offset = 8; // Skip discriminator

        // Helper to parse u64 (little-endian)
        const parseU64 = (): number => {
          let value = 0n;
          for (let i = 0; i < 8; i++) {
            value |= BigInt(data[offset + i]) << BigInt(i * 8);
          }
          offset += 8;
          return Number(value);
        };

        // Helper to parse i64 (little-endian, signed)
        const parseI64 = (): number => {
          let value = 0n;
          for (let i = 0; i < 8; i++) {
            value |= BigInt(data[offset + i]) << BigInt(i * 8);
          }
          offset += 8;
          if (value > 0x7fffffffffffffffn) {
            value = value - 0x10000000000000000n;
          }
          return Number(value);
        };

        // Helper to read string (4-byte length prefix + UTF-8)
        const readString = (): string => {
          const length = data.readUInt32LE(offset);
          offset += 4;
          const str = data.slice(offset, offset + length).toString('utf8');
          offset += length;
          return str;
        };

        // ========== PARSE V2 STRUCTURE ==========

        // mint (32 bytes)
        const mintPubkey = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // tier (1 byte) - V2 NEW
        const tier = data[offset] as BattleTier;
        offset += 1;

        // virtual_sol_reserves (8 bytes) - V2 NEW
        const virtualSolReserves = parseU64();

        // virtual_token_reserves (8 bytes) - V2 NEW
        const virtualTokenReserves = parseU64();

        // real_sol_reserves (8 bytes) - V2 NEW
        const realSolReserves = parseU64();

        // real_token_reserves (8 bytes) - V2 NEW
        const realTokenReserves = parseU64();

        // tokens_sold (8 bytes)
        const tokensSold = parseU64();

        // total_trade_volume (8 bytes)
        const totalTradeVolume = parseU64();

        // is_active (1 byte)
        const isActive = data[offset] !== 0;
        offset += 1;

        // battle_status (1 byte)
        const battleStatusIndex = data[offset];
        const battleStatusMap: Record<number, BattleStatus> = {
          0: BattleStatus.Created,
          1: BattleStatus.Qualified,
          2: BattleStatus.InBattle,
          3: BattleStatus.VictoryPending,
          4: BattleStatus.Listed,
          5: BattleStatus.PoolCreated,
        };
        const battleStatus = battleStatusMap[battleStatusIndex] ?? BattleStatus.Created;
        offset += 1;

        // opponent_mint (32 bytes)
        const opponentMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // timestamps (5 x i64)
        const creationTimestamp = parseI64();
        const lastTradeTimestamp = parseI64();
        const battleStartTimestamp = parseI64();
        const victoryTimestamp = parseI64();
        const listingTimestamp = parseI64();

        // bump (1 byte)
        const bump = data[offset];
        offset += 1;

        // metadata strings
        const rawName = readString();
        const rawSymbol = readString();
        const uri = readString();

        // Parse metadata - handle JSON in name/uri
        let name = parseMetadataField(rawName, 'name') || rawName;
        let symbol = parseMetadataField(rawSymbol, 'symbol') ||
          parseMetadataField(rawName, 'symbol') ||
          rawSymbol;

        // Try to get image from uri if it's JSON
        let image: string | undefined;
        if (uri) {
          try {
            const metadata = JSON.parse(uri);
            image = metadata.image || metadata.IMAGE;
            if (!name && metadata.name) name = metadata.name;
            if (!symbol && metadata.symbol) symbol = metadata.symbol;
          } catch {
            // URI is not JSON, might be a URL
          }
        }

        // Try to get image from rawName if it's JSON
        if (!image && rawName) {
          image = parseMetadataField(rawName, 'image') || undefined;
        }

        const parsedState: ParsedTokenBattleState = {
          mint: mintPubkey,
          tier,
          virtualSolReserves,
          virtualTokenReserves,
          realSolReserves,
          realTokenReserves,
          tokensSold,
          totalTradeVolume,
          isActive,
          battleStatus,
          opponentMint,
          creationTimestamp,
          lastTradeTimestamp,
          battleStartTimestamp,
          victoryTimestamp,
          listingTimestamp,
          bump,
          name,
          symbol,
          uri,
          image,
        };

        console.log('✅ Battle State V2 fetched from RPC:', parsedState);
        return parsedState;
      },
      `battleState-${mint.toString()}`,
      3
    );

  } catch (err) {
    console.error('❌ Error fetching Battle State V2:', err);
    throw err;
  }
}

/**
 * ========================================================================
 * OPTIMIZED HOOK WITH REACT QUERY
 * ========================================================================
 */
export function useTokenBattleState(
  mint: PublicKey | null
): UseTokenBattleStateResult {
  const {
    data: state,
    isLoading: loading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.token.battleState(mint?.toString() || ''),
    queryFn: () => {
      if (!mint) return null;
      return fetchTokenBattleState(mint);
    },
    enabled: !!mint,

    staleTime: 5_000,
    gcTime: 2 * 60 * 1000,

    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;

      const shouldPollFast =
        data.battleStatus === BattleStatus.InBattle ||
        data.battleStatus === BattleStatus.VictoryPending;

      return shouldPollFast ? 10_000 : false;
    },

    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const refetch = async () => {
    await queryRefetch();
  };

  return {
    state: state ?? null,
    loading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Helper hooks
 */
export function useIsTokenInBattle(mint: PublicKey | null): boolean {
  const { state } = useTokenBattleState(mint);
  return state?.battleStatus === BattleStatus.InBattle;
}

export function useCanTokenBattle(mint: PublicKey | null): boolean {
  const { state } = useTokenBattleState(mint);
  return state?.battleStatus === BattleStatus.Qualified;
}

/**
 * Calculate market cap from virtual reserves
 * Formula: MC = (virtualSolReserves / 1e9) * solPriceUsd * (totalSupply / virtualTokenReserves)
 */
export function calculateMarketCapFromReserves(
  virtualSolReserves: number,
  virtualTokenReserves: number,
  solPriceUsd: number,
  totalSupply: number = 1_000_000_000 * 1e6 // 1B tokens with 6 decimals
): number {
  if (virtualTokenReserves === 0) return 0;

  // Price per token in SOL = virtualSolReserves / virtualTokenReserves
  const pricePerTokenSol = virtualSolReserves / virtualTokenReserves;

  // Price per token in USD
  const pricePerTokenUsd = (pricePerTokenSol / 1e9) * solPriceUsd;

  // Market cap = price per token * total supply
  const marketCap = pricePerTokenUsd * totalSupply;

  return marketCap;
}

/**
 * Calculate price per token from reserves
 */
export function calculatePricePerToken(
  virtualSolReserves: number,
  virtualTokenReserves: number,
  solPriceUsd: number
): number {
  if (virtualTokenReserves === 0) return 0;

  const pricePerTokenSol = virtualSolReserves / virtualTokenReserves;
  const pricePerTokenUsd = (pricePerTokenSol / 1e9) * solPriceUsd;

  return pricePerTokenUsd;
}