/**
 * ========================================================================
 * BONK BATTLE - TOKEN HOLDERS FETCHER (SUPABASE)
 * ========================================================================
 *
 * BEFORE: getProgramAccounts() for EACH token = thousands of RPC calls
 * AFTER: Simple Supabase query = 0 RPC calls
 *
 * Holders are calculated from user_trades table
 *
 * ========================================================================
 */

import { supabase } from '@/lib/supabase';

/**
 * Get unique holder count for a token
 * Counts unique wallets that have traded this token
 */
export async function fetchTokenHolders(mint: string): Promise<number> {
  try {
    // Count unique wallets that bought this token
    const { data, error } = await supabase
      .from('user_trades')
      .select('wallet_address')
      .eq('token_mint', mint)
      .eq('trade_type', 'buy');

    if (error) {
      console.error(`Error fetching holders for ${mint}:`, error);
      return 0;
    }

    // Get unique wallets
    const uniqueWallets = new Set(data?.map((t) => t.wallet_address) || []);
    return uniqueWallets.size;
  } catch (error) {
    console.error(`Error fetching holders for ${mint}:`, error);
    return 0;
  }
}

/**
 * Get holder counts for multiple tokens in one query
 * Much more efficient than individual calls
 */
export async function fetchBatchHolders(
  mints: string[]
): Promise<Map<string, number>> {
  const holdersMap = new Map<string, number>();

  if (mints.length === 0) return holdersMap;

  try {
    // Fetch all buy trades for the given mints
    const { data, error } = await supabase
      .from('user_trades')
      .select('token_mint, wallet_address')
      .in('token_mint', mints)
      .eq('trade_type', 'buy');

    if (error) {
      console.error('Error fetching batch holders:', error);
      // Initialize all to 0
      mints.forEach((mint) => holdersMap.set(mint, 0));
      return holdersMap;
    }

    // Group by token and count unique wallets
    const tokenWallets: Record<string, Set<string>> = {};

    data?.forEach((trade) => {
      if (!tokenWallets[trade.token_mint]) {
        tokenWallets[trade.token_mint] = new Set();
      }
      tokenWallets[trade.token_mint].add(trade.wallet_address);
    });

    // Convert to counts
    mints.forEach((mint) => {
      holdersMap.set(mint, tokenWallets[mint]?.size || 0);
    });

    return holdersMap;
  } catch (error) {
    console.error('Error fetching batch holders:', error);
    mints.forEach((mint) => holdersMap.set(mint, 0));
    return holdersMap;
  }
}

/**
 * Get top holders for a specific token
 */
export interface TokenHolder {
  wallet: string;
  totalBought: number;
  totalSold: number;
  netPosition: number;
  tradeCount: number;
}

export async function fetchTopHolders(
  mint: string,
  limit = 10
): Promise<TokenHolder[]> {
  try {
    // Get all trades for this token
    const { data, error } = await supabase
      .from('user_trades')
      .select('wallet_address, trade_type, token_amount, sol_amount')
      .eq('token_mint', mint)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('Error fetching top holders:', error);
      return [];
    }

    // Aggregate by wallet
    const walletStats: Record<string, TokenHolder> = {};

    data.forEach((trade) => {
      const wallet = trade.wallet_address;

      if (!walletStats[wallet]) {
        walletStats[wallet] = {
          wallet,
          totalBought: 0,
          totalSold: 0,
          netPosition: 0,
          tradeCount: 0,
        };
      }

      const tokenAmount = trade.token_amount || 0;

      if (trade.trade_type === 'buy') {
        walletStats[wallet].totalBought += tokenAmount;
        walletStats[wallet].netPosition += tokenAmount;
      } else {
        walletStats[wallet].totalSold += tokenAmount;
        walletStats[wallet].netPosition -= tokenAmount;
      }

      walletStats[wallet].tradeCount++;
    });

    // Sort by net position and return top holders
    return Object.values(walletStats)
      .filter((h) => h.netPosition > 0)
      .sort((a, b) => b.netPosition - a.netPosition)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching top holders:', error);
    return [];
  }
}

/**
 * Get holder distribution stats
 */
export interface HolderDistribution {
  totalHolders: number;
  top10Percentage: number;
  top20Percentage: number;
  averageHolding: number;
}

export async function fetchHolderDistribution(
  mint: string
): Promise<HolderDistribution | null> {
  try {
    const holders = await fetchTopHolders(mint, 100);

    if (holders.length === 0) {
      return null;
    }

    const totalSupplyHeld = holders.reduce((sum, h) => sum + h.netPosition, 0);
    const top10Supply = holders
      .slice(0, 10)
      .reduce((sum, h) => sum + h.netPosition, 0);
    const top20Supply = holders
      .slice(0, 20)
      .reduce((sum, h) => sum + h.netPosition, 0);

    return {
      totalHolders: holders.length,
      top10Percentage: totalSupplyHeld > 0 ? (top10Supply / totalSupplyHeld) * 100 : 0,
      top20Percentage: totalSupplyHeld > 0 ? (top20Supply / totalSupplyHeld) * 100 : 0,
      averageHolding: totalSupplyHeld / holders.length,
    };
  } catch (error) {
    console.error('Error fetching holder distribution:', error);
    return null;
  }
}
