/**
 * ========================================================================
 * BONK BATTLE V2 - TOKEN BATTLE STATE HOOK
 * ========================================================================
 *
 * Parsing structure matches DEPLOYED on-chain TokenBattleState V2:
 * 
 * pub struct TokenBattleState {
 *     pub mint: Pubkey,                    // 32 bytes
 *     pub tier: BattleTier,                // 1 byte
 *     pub virtual_sol_reserves: u64,       // 8 bytes
 *     pub virtual_token_reserves: u64,     // 8 bytes
 *     pub real_sol_reserves: u64,          // 8 bytes
 *     pub real_token_reserves: u64,        // 8 bytes
 *     pub tokens_sold: u64,                // 8 bytes
 *     pub total_trade_volume: u64,         // 8 bytes
 *     pub is_active: bool,                 // 1 byte
 *     pub battle_status: BattleStatus,     // 1 byte
 *     pub opponent_mint: Pubkey,           // 32 bytes
 *     pub creation_timestamp: i64,         // 8 bytes
 *     pub last_trade_timestamp: i64,       // 8 bytes
 *     pub battle_start_timestamp: i64,     // 8 bytes
 *     pub victory_timestamp: i64,          // 8 bytes
 *     pub listing_timestamp: i64,          // 8 bytes
 *     pub bump: u8,                        // 1 byte
 *     pub name: String,                    // 4 + N bytes
 *     pub symbol: String,                  // 4 + M bytes
 *     pub uri: String,                     // 4 + P bytes
 * }
 *
 * ========================================================================
 */

import { PublicKey } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { connection, executeWithRetry } from '@/lib/solana';
import { getBattleStatePDA } from '@/lib/solana/pdas';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';
import { queryKeys } from '@/lib/queryClient';
import { BattleStatus, BattleTier } from '@/types/bonk';

/**
 * Parsed Token Battle State V2 - matches on-chain structure
 */
export interface ParsedTokenBattleState {
  mint: PublicKey;
  tier: BattleTier;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  realSolReserves: number;
  realTokenReserves: number;
  tokensSold: number;
  totalTradeVolume: number;
  isActive: boolean;
  battleStatus: BattleStatus;
  opponentMint: PublicKey;
  creationTimestamp: number;
  lastTradeTimestamp: number;
  battleStartTimestamp: number;
  victoryTimestamp: number;
  listingTimestamp: number;
  bump: number;
  name: string;
  symbol: string;
  uri: string;
  image?: string;
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
 * Fetch token battle state from Supabase (priority) or RPC (fallback)
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
      console.log('⚡ Battle State V2 fetched from Supabase cache');

      // Get metadata - prioritize direct fields, fallback to parsing URI
      let name = tokenData.name || '';
      let symbol = tokenData.symbol || '';
      let image = tokenData.image || '';

      // If URI is JSON, try to extract metadata from it
      if (tokenData.uri && tokenData.uri.startsWith('{')) {
        try {
          const metadata = JSON.parse(tokenData.uri);
          if (!name && metadata.name) name = metadata.name;
          if (!symbol && metadata.symbol) symbol = metadata.symbol;
          if (!image && metadata.image) image = metadata.image;
        } catch {
          // URI is not valid JSON, ignore
        }
      }

      console.log('📊 Supabase V2 data:', {
        name,
        symbol,
        tier: tokenData.tier,
        virtual_sol_reserves: tokenData.virtual_sol_reserves,
        battle_status: tokenData.battle_status
      });

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

        // Parse account data - V2 STRUCTURE
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

        // Helper to read Borsh string (4-byte length prefix + UTF-8 content)
        const readString = (): string => {
          if (offset + 4 > data.length) return '';
          const length = data.readUInt32LE(offset);
          offset += 4;
          if (length === 0 || length > 500 || offset + length > data.length) return '';
          const str = data.slice(offset, offset + length).toString('utf8').replace(/\0/g, '').trim();
          offset += length;
          return str;
        };

        // ========== PARSE V2 STRUCTURE ==========

        // mint (32 bytes) - offset 8 → 40
        const mintPubkey = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // tier (1 byte) - offset 40 → 41
        const tier = data[offset] as BattleTier;
        offset += 1;

        // virtual_sol_reserves (8 bytes) - offset 41 → 49
        const virtualSolReserves = parseU64();

        // virtual_token_reserves (8 bytes) - offset 49 → 57
        const virtualTokenReserves = parseU64();

        // real_sol_reserves (8 bytes) - offset 57 → 65
        const realSolReserves = parseU64();

        // real_token_reserves (8 bytes) - offset 65 → 73
        const realTokenReserves = parseU64();

        // tokens_sold (8 bytes) - offset 73 → 81
        const tokensSold = parseU64();

        // total_trade_volume (8 bytes) - offset 81 → 89
        const totalTradeVolume = parseU64();

        // is_active (1 byte) - offset 89 → 90
        const isActive = data[offset] !== 0;
        offset += 1;

        // battle_status (1 byte) - offset 90 → 91
        const battleStatusRaw = data[offset];
        offset += 1;

        // opponent_mint (32 bytes) - offset 91 → 123
        const opponentMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // timestamps (5 x i64 = 40 bytes)
        const creationTimestamp = parseI64();
        const lastTradeTimestamp = parseI64();
        const battleStartTimestamp = parseI64();
        const victoryTimestamp = parseI64();
        const listingTimestamp = parseI64();

        // bump (1 byte)
        const bump = data[offset];
        offset += 1;

        // metadata strings (Borsh format)
        const name = readString();
        const symbol = readString();
        const uri = readString();

        // Extract image from URI if it's JSON
        let image: string | undefined;
        if (uri) {
          try {
            if (uri.startsWith('{')) {
              const metadata = JSON.parse(uri);
              image = metadata.image || metadata.IMAGE;
            }
          } catch {
            // URI is not JSON
          }
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
          battleStatus: battleStatusRaw as BattleStatus,
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

        console.log('✅ Battle State V2 fetched from RPC:', {
          name: parsedState.name,
          symbol: parsedState.symbol,
          tier: parsedState.tier,
          virtualSolReserves: parsedState.virtualSolReserves,
          battleStatus: parsedState.battleStatus
        });

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
 * MAIN HOOK WITH REACT QUERY
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
 * ========================================================================
 * V2 CALCULATION FUNCTIONS
 * ========================================================================
 */

// Total supply: 1B tokens with 9 decimals
const TOTAL_SUPPLY = 1_000_000_000_000_000_000; // 1B * 10^9

/**
 * Calculate market cap from virtual reserves (V2)
 * Formula: MC = (virtualSolReserves / virtualTokenReserves) * totalSupply * solPriceUsd
 */
export function calculateMarketCapFromReserves(
  virtualSolReserves: number,
  virtualTokenReserves: number,
  solPriceUsd: number,
  totalSupply: number = TOTAL_SUPPLY
): number {
  if (virtualTokenReserves === 0) return 0;

  // MC in lamports = (virtualSolReserves * totalSupply) / virtualTokenReserves
  const mcLamports = (virtualSolReserves * totalSupply) / virtualTokenReserves;
  
  // Convert to USD: mcLamports / 1e9 (lamports to SOL) * solPriceUsd / 1e6 (price has 6 decimals)
  const mcUsd = (mcLamports / 1e9) * (solPriceUsd / 1e6);

  return mcUsd;
}

/**
 * Calculate price per token from reserves (V2)
 */
export function calculatePricePerToken(
  virtualSolReserves: number,
  virtualTokenReserves: number,
  solPriceUsd: number
): number {
  if (virtualTokenReserves === 0) return 0;

  // Price per token in lamports
  const pricePerTokenLamports = virtualSolReserves / virtualTokenReserves;
  
  // Convert to USD
  const pricePerTokenUsd = (pricePerTokenLamports / 1e9) * (solPriceUsd / 1e6);

  return pricePerTokenUsd;
}

/**
 * Calculate tokens out for a given SOL input (constant product formula)
 */
export function calculateTokensOut(
  solIn: number,
  virtualSolReserves: number,
  virtualTokenReserves: number
): number {
  if (virtualSolReserves === 0) return 0;
  
  const tokensOut = (virtualTokenReserves * solIn) / (virtualSolReserves + solIn);
  return tokensOut;
}

/**
 * Calculate SOL out for a given token input (constant product formula)
 */
export function calculateSolOut(
  tokensIn: number,
  virtualSolReserves: number,
  virtualTokenReserves: number
): number {
  if (virtualTokenReserves === 0) return 0;
  
  const solOut = (virtualSolReserves * tokensIn) / (virtualTokenReserves + tokensIn);
  return solOut;
}