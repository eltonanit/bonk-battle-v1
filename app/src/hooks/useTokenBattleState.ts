/**
 * ========================================================================
 * BONK BATTLE V3 - TOKEN BATTLE STATE HOOK (MAINNET OPTIMIZED)
 * ========================================================================
 * 
 * STRATEGY: Supabase-first, NO RPC reads
 * - Supabase: Unlimited, fast, free - use for ALL reads
 * - RPC: Only for transactions (buy/sell/battle)
 * - Helius Webhook: Keeps Supabase in sync with blockchain
 * 
 * This eliminates 429 errors and reduces costs on mainnet!
 * ========================================================================
 */

import { PublicKey } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryClient';
import { BattleStatus, BattleTier } from '@/types/bonk';
import {
  lamportsToSol,
  calculateSolProgress,
  calculateVolumeProgress,
} from '@/lib/solana/constants';

// ⭐ Import tier config for correct MC calculation
import {
  VIRTUAL_TOKEN_INIT,
  TOTAL_SUPPLY,
  ACTIVE_TIER,
  calculateMarketCapUsd as tierCalculateMarketCapUsd,
} from '@/config/tier-config';

// ═══════════════════════════════════════════════════════════════════════════
// OPTIMIZED POLLING CONFIG FOR MAINNET
// ═══════════════════════════════════════════════════════════════════════════
const POLLING_CONFIG = {
  BATTLE_INTERVAL: 10_000,    // 10s for active battles (Supabase can handle it)
  IDLE_INTERVAL: 30_000,      // 30s for non-battle states
  STALE_TIME: 5_000,          // 5s stale time
  GC_TIME: 5 * 60 * 1000,     // 5 min cache
};

// Reduce logging in production
const isDev = process.env.NODE_ENV === 'development';
const log = isDev ? console.log : () => { };

/**
 * Parsed Token Battle State
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
  creatorWallet?: string;
  // Computed SOL-based progress
  solCollectedSol?: number;
  totalVolumeSol?: number;
  solProgress?: number;
  volumeProgress?: number;
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
 * ========================================================================
 * SUPABASE-ONLY FETCH (No RPC!)
 * ========================================================================
 * 
 * Why no RPC fallback?
 * 1. Helius webhook syncs all blockchain events to Supabase
 * 2. RPC reads are expensive and rate-limited
 * 3. If token isn't in Supabase, it means webhook hasn't processed it yet
 *    → Call /api/sync-token/[mint] to force sync, then retry
 */
async function fetchTokenBattleState(
  mint: PublicKey
): Promise<ParsedTokenBattleState | null> {
  try {
    const mintStr = mint.toString();

    // ✅ FETCH FROM SUPABASE ONLY
    const { data: tokenData, error: supabaseError } = await supabase
      .from('tokens')
      .select('*')
      .eq('mint', mintStr)
      .single();

    if (supabaseError || !tokenData) {
      // Token not in database - this is expected for brand new tokens
      // The create page should call /api/sync-token after creation
      log('ℹ️ Token not found in Supabase:', mintStr.slice(0, 8) + '...');
      return null;
    }

    log('⚡ Token data from Supabase:', tokenData.symbol);

    // Parse metadata from URI if needed
    let name = tokenData.name || '';
    let symbol = tokenData.symbol || '';
    let image = tokenData.image || '';

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

    // Parse numeric values safely
    const realSolReserves = parseFloat(tokenData.real_sol_reserves) || 0;
    const totalTradeVolume = parseFloat(tokenData.total_trade_volume) || 0;

    return {
      mint: new PublicKey(tokenData.mint),
      tier: (tokenData.tier ?? 1) as BattleTier, // Default to Production tier
      virtualSolReserves: parseFloat(tokenData.virtual_sol_reserves) || 0,
      virtualTokenReserves: parseFloat(tokenData.virtual_token_reserves) || 0,
      realSolReserves,
      realTokenReserves: parseFloat(tokenData.real_token_reserves) || 0,
      tokensSold: parseFloat(tokenData.tokens_sold) || 0,
      totalTradeVolume,
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
      creatorWallet: tokenData.creator_wallet || undefined,
      // Computed SOL-based progress
      solCollectedSol: lamportsToSol(realSolReserves),
      totalVolumeSol: lamportsToSol(totalTradeVolume),
      solProgress: calculateSolProgress(realSolReserves),
      volumeProgress: calculateVolumeProgress(totalTradeVolume),
    };

  } catch (err) {
    console.error('❌ Error fetching token state:', err);
    throw err;
  }
}

/**
 * ========================================================================
 * MAIN HOOK - OPTIMIZED FOR MAINNET
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

    staleTime: POLLING_CONFIG.STALE_TIME,
    gcTime: POLLING_CONFIG.GC_TIME,

    // Smart polling based on battle status
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;

      // Don't poll if tab is hidden
      if (typeof document !== 'undefined' && document.hidden) {
        return false;
      }

      // Active battles: poll every 10s
      if (data.battleStatus === BattleStatus.InBattle ||
        data.battleStatus === BattleStatus.VictoryPending) {
        return POLLING_CONFIG.BATTLE_INTERVAL;
      }

      // Qualified tokens waiting for battle: poll every 30s
      if (data.battleStatus === BattleStatus.Qualified) {
        return POLLING_CONFIG.IDLE_INTERVAL;
      }

      // Listed/Created: no polling needed
      return false;
    },

    refetchOnWindowFocus: false,
    refetchOnMount: true, // Fetch once on mount
    refetchOnReconnect: false,
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
 * MARKET CAP CALCULATION - CORRECT BONDING CURVE FORMULA (xy=k)
 * ========================================================================
 * 
 * This uses the Pump.fun style constant product formula:
 * MC = (virtualSol / virtualToken) × totalSupply × solPrice
 * 
 * The formula accounts for:
 * - Virtual SOL reserves (increases as users buy)
 * - Virtual Token reserves (decreases as users buy)
 * - Constant product k = virtualSol × virtualToken
 */

/**
 * Calculate Market Cap using the CORRECT bonding curve formula (xy=k)
 * 
 * ⭐ UPDATED: Uses tier-config formula for consistency across all components
 * 
 * @param solCollected - SOL collected in the bonding curve (in SOL, not lamports)
 * @param solPriceUsd - Current SOL price from oracle
 * @returns Market cap in USD
 */
export function calculateMarketCapFromReserves(
  virtualSolReserves: number,
  virtualTokenReserves: number,
  solPriceUsd: number,
  totalSupply: number = TOTAL_SUPPLY
): number {
  if (virtualTokenReserves === 0 || virtualSolReserves === 0 || !solPriceUsd) return 0;

  // Convert lamports to SOL for calculation
  const virtualSolLamports = virtualSolReserves;
  const virtualTokenLamports = virtualTokenReserves;

  // Price per token = virtualSol / virtualToken
  const pricePerTokenLamports = virtualSolLamports / virtualTokenLamports;

  // MC = pricePerToken × totalSupply
  const mcLamports = pricePerTokenLamports * totalSupply;

  // Convert to USD
  const mcUsd = (mcLamports / 1e9) * solPriceUsd;

  return mcUsd;
}

/**
 * ⭐ NEW: Calculate Market Cap using tier-config formula
 * This is the RECOMMENDED function for UI components
 * 
 * @param solCollectedLamports - SOL collected (in lamports)
 * @param solPriceUsd - Current SOL price from oracle
 * @returns Market cap in USD
 */
export function calculateMarketCapFromSolCollected(
  solCollectedLamports: number,
  solPriceUsd: number
): number {
  const solCollected = solCollectedLamports / 1e9; // Convert to SOL
  return tierCalculateMarketCapUsd(solCollected, solPriceUsd);
}

/**
 * Calculate price per token in USD
 */
export function calculatePricePerToken(
  virtualSolReserves: number,
  virtualTokenReserves: number,
  solPriceUsd: number
): number {
  if (virtualTokenReserves === 0 || !solPriceUsd) return 0;
  const pricePerTokenLamports = virtualSolReserves / virtualTokenReserves;
  const pricePerTokenUsd = (pricePerTokenLamports / 1e9) * solPriceUsd;
  return pricePerTokenUsd;
}

/**
 * Calculate tokens out for a given SOL input (for buy preview)
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
 * Calculate SOL out for a given token input (for sell preview)
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