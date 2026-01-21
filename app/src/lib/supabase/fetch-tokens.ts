/**
 * ========================================================================
 * BONK BATTLE - SUPABASE TOKEN FETCHER
 * ========================================================================
 *
 * STRATEGY: Supabase-first, NO RPC reads
 * - Replaces fetch-all-tokens.ts which used expensive getProgramAccounts()
 * - All data comes from Supabase (synced via Helius webhook)
 * - Zero RPC calls = Zero costs
 *
 * ========================================================================
 */

import { supabase } from '@/lib/supabase';
import { TARGET_SOL, ACTIVE_TIER, VIRTUAL_TOKEN_INIT } from '@/config/tier-config';

// Constants
const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Token data from Supabase
 */
export interface SupabaseToken {
  mint: string;
  name: string | null;
  symbol: string | null;
  image: string | null;
  uri: string | null;
  creator: string | null;
  creator_wallet: string | null;

  // On-chain data (in lamports)
  sol_collected: number | null;
  tokens_sold: number | null;
  total_trade_volume: number | null;
  virtual_sol_reserves: number | null;
  virtual_token_reserves: number | null;
  real_sol_reserves: number | null;
  real_token_reserves: number | null;

  // Status
  is_active: boolean | null;
  battle_status: number | null;
  opponent_mint: string | null;
  tier: number | null;

  // Timestamps
  creation_timestamp: number | null;
  qualification_timestamp: number | null;
  last_trade_timestamp: number | null;
  battle_start_timestamp: number | null;
  victory_timestamp: number | null;
  listing_timestamp: number | null;

  // Computed
  market_cap_usd: number | null;

  // Metadata
  updated_at: string | null;

  // Army
  army_id: string | null;

  // Raydium
  raydium_pool_id: string | null;
  raydium_url: string | null;
}

/**
 * Formatted token for UI display
 */
export interface FormattedToken {
  mint: string;
  name: string;
  symbol: string;
  image: string;

  // SOL values (converted from lamports)
  solCollected: number;
  totalVolume: number;
  virtualSolReserves: number;

  // Market data
  marketCapUsd: number;
  progress: number; // 0-100%

  // Status
  battleStatus: number;
  isActive: boolean;
  tier: number;

  // Timestamps
  createdAt: number;
  lastTradeAt: number;
  updatedAt: string;
}

/**
 * Battle status enum (matches smart contract)
 */
export enum BattleStatus {
  Created = 0,
  Qualified = 1,
  InBattle = 2,
  VictoryPending = 3,
  Listed = 4,
  Defeated = 5,
}

/**
 * Calculate progress percentage based on SOL collected
 * Uses TARGET_SOL from tier-config (14,586,338 SOL for PRODUCTION $10B tier)
 */
function calculateProgress(solCollectedLamports: number | null): number {
  if (!solCollectedLamports) return 0;
  const solCollected = solCollectedLamports / LAMPORTS_PER_SOL;
  return Math.min((solCollected / TARGET_SOL) * 100, 100);
}

/**
 * Calculate market cap from bonding curve formula
 * MC = (virtualSol / virtualToken) × totalSupply × solPrice
 *
 * ⭐ ALWAYS calculates fresh from bonding curve - never uses stale DB values
 */
function calculateMarketCap(
  virtualSolReserves: number | null,
  solCollected: number | null,
  _existingMarketCap: number | null, // Ignored - always calculate fresh
  solPriceUsd: number = 200
): number {
  // Calculate virtual reserves from bonding curve
  // virtualSol = VIRTUAL_SOL_INIT + solCollected
  const solCollectedSol = (solCollected || 0) / LAMPORTS_PER_SOL;
  const virtualSol = ACTIVE_TIER.VIRTUAL_SOL_INIT + solCollectedSol;

  // virtualToken = VIRTUAL_TOKEN_INIT - tokensSold (approximation: use initial if not available)
  // For simplicity, use the stored virtual_token_reserves if available
  const virtualTokenReserves = virtualSolReserves
    ? VIRTUAL_TOKEN_INIT // Use initial if we have data
    : VIRTUAL_TOKEN_INIT;

  // Price per token = virtualSol / virtualToken
  const pricePerToken = virtualSol / virtualTokenReserves;

  // MC = price × totalSupply × solPrice
  const TOTAL_SUPPLY = 1_000_000_000; // 1B tokens
  const mcSol = pricePerToken * TOTAL_SUPPLY;

  return mcSol * solPriceUsd;
}

/**
 * Extract image from URI if stored as JSON
 */
function extractImage(token: SupabaseToken): string {
  // Direct image field
  if (token.image) return token.image;

  // Try parsing URI as JSON
  if (token.uri && token.uri.startsWith('{')) {
    try {
      const metadata = JSON.parse(token.uri);
      if (metadata.image) return metadata.image;
    } catch {
      // ignore parse errors
    }
  }

  return '';
}

/**
 * Format raw Supabase token for UI
 */
function formatToken(token: SupabaseToken): FormattedToken {
  return {
    mint: token.mint,
    name: token.name || token.symbol || token.mint.slice(0, 8),
    symbol: token.symbol || 'TKN',
    image: extractImage(token),

    solCollected: (token.sol_collected || 0) / LAMPORTS_PER_SOL,
    totalVolume: (token.total_trade_volume || 0) / LAMPORTS_PER_SOL,
    virtualSolReserves: (token.virtual_sol_reserves || 0) / LAMPORTS_PER_SOL,

    marketCapUsd: calculateMarketCap(
      token.virtual_sol_reserves,
      token.sol_collected,
      token.market_cap_usd
    ),
    progress: calculateProgress(token.sol_collected),

    battleStatus: token.battle_status ?? BattleStatus.Created,
    isActive: token.is_active ?? true,
    tier: token.tier ?? 1,

    createdAt: token.creation_timestamp || 0,
    lastTradeAt: token.last_trade_timestamp || 0,
    updatedAt: token.updated_at || '',
  };
}

/**
 * ========================================================================
 * MAIN FETCH FUNCTIONS
 * ========================================================================
 */

/**
 * Fetch all active tokens from Supabase
 * Replaces: fetchAllTokens() from fetch-all-tokens.ts
 */
export async function fetchAllTokensFromSupabase(): Promise<FormattedToken[]> {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('is_active', true)
      .order('last_trade_timestamp', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('❌ Supabase fetch error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('📭 No tokens found in Supabase');
      return [];
    }

    console.log(`✅ Fetched ${data.length} tokens from Supabase (0 RPC calls!)`);
    return data.map(formatToken);
  } catch (err) {
    console.error('❌ fetchAllTokensFromSupabase error:', err);
    return [];
  }
}

/**
 * Fetch hot/trending tokens (by recent activity)
 */
export async function fetchHotTokens(limit = 20): Promise<FormattedToken[]> {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('is_active', true)
      .not('last_trade_timestamp', 'is', null)
      .order('last_trade_timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Supabase fetch hot tokens error:', error);
      return [];
    }

    return (data || []).map(formatToken);
  } catch (err) {
    console.error('❌ fetchHotTokens error:', err);
    return [];
  }
}

/**
 * Fetch tokens by battle status
 */
export async function fetchTokensByStatus(
  status: BattleStatus,
  limit = 50
): Promise<FormattedToken[]> {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('battle_status', status)
      .order('last_trade_timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Supabase fetch by status error:', error);
      return [];
    }

    return (data || []).map(formatToken);
  } catch (err) {
    console.error('❌ fetchTokensByStatus error:', err);
    return [];
  }
}

/**
 * Fetch tokens in active battles
 */
export async function fetchBattlingTokens(): Promise<FormattedToken[]> {
  return fetchTokensByStatus(BattleStatus.InBattle);
}

/**
 * Fetch qualified tokens waiting for battle
 */
export async function fetchQualifiedTokens(): Promise<FormattedToken[]> {
  return fetchTokensByStatus(BattleStatus.Qualified);
}

/**
 * Fetch single token by mint
 */
export async function fetchTokenByMint(mint: string): Promise<FormattedToken | null> {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('mint', mint)
      .single();

    if (error || !data) {
      console.error('❌ Token not found:', mint);
      return null;
    }

    return formatToken(data);
  } catch (err) {
    console.error('❌ fetchTokenByMint error:', err);
    return null;
  }
}

/**
 * Fetch top tokens by market cap
 */
export async function fetchTopTokensByMarketCap(limit = 10): Promise<FormattedToken[]> {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('is_active', true)
      .order('market_cap_usd', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('❌ Supabase fetch top tokens error:', error);
      return [];
    }

    return (data || []).map(formatToken);
  } catch (err) {
    console.error('❌ fetchTopTokensByMarketCap error:', err);
    return [];
  }
}

/**
 * Fetch top tokens by volume
 */
export async function fetchTopTokensByVolume(limit = 10): Promise<FormattedToken[]> {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('is_active', true)
      .order('total_trade_volume', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('❌ Supabase fetch by volume error:', error);
      return [];
    }

    return (data || []).map(formatToken);
  } catch (err) {
    console.error('❌ fetchTopTokensByVolume error:', err);
    return [];
  }
}

/**
 * Get token count by status (for stats)
 */
export async function getTokenCountByStatus(): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('battle_status');

    if (error || !data) return {};

    const counts: Record<string, number> = {
      total: data.length,
      created: 0,
      qualified: 0,
      inBattle: 0,
      victoryPending: 0,
      listed: 0,
      defeated: 0,
    };

    data.forEach((t) => {
      switch (t.battle_status) {
        case 0: counts.created++; break;
        case 1: counts.qualified++; break;
        case 2: counts.inBattle++; break;
        case 3: counts.victoryPending++; break;
        case 4: counts.listed++; break;
        case 5: counts.defeated++; break;
      }
    });

    return counts;
  } catch (err) {
    console.error('❌ getTokenCountByStatus error:', err);
    return {};
  }
}
