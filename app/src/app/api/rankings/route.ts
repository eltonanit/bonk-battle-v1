// =================================================================
// FILE: app/src/app/api/rankings/route.ts
// LIVE RANKINGS API - Last Trade & Market Cap sorting
// =================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchRealHolders } from '@/lib/helius/fetch-holders';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ⭐ Network types
type NetworkType = 'mainnet' | 'devnet';

// Default network from env
const DEFAULT_NETWORK: NetworkType = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? 'devnet' : 'mainnet';

const LAMPORTS_PER_SOL = 1_000_000_000;
const TOTAL_SUPPLY = 1_000_000_000;

export interface RankedToken {
  rank: number;
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  priceUsd: number;
  marketCapUsd: number;
  volume24hUsd: number;
  change1h: number;
  change24h: number;
  change7d: number;
  holders: number;
  lastTradeAmountUsd: number;
  lastTradeSecondsAgo: number;
  lastTradeType: 'buy' | 'sell' | null;
  activityScore: number;
  battleStatus: number;
  solCollected: number;
}

export interface RankingsResponse {
  tokens: RankedToken[];
  updatedAt: string;
  totalTokens: number;
}

function calculateActivityScore(
  lastTradeTimestamp: number,
  recentTradeCount: number,
  recentVolume: number
): number {
  const now = Math.floor(Date.now() / 1000);
  const secondsAgo = now - lastTradeTimestamp;
  const recencyScore = Math.max(0, 1000 - (secondsAgo * 3));
  const tradeCountBoost = recentTradeCount * 150;
  const volumeBoost = Math.log10(Math.max(1, recentVolume)) * 80;
  return recencyScore + tradeCountBoost + volumeBoost;
}

async function getSolPrice(): Promise<number> {
  try {
    const { data } = await supabase
      .from('price_oracle')
      .select('sol_price_usd')
      .single();
    if (data?.sol_price_usd) {
      return data.sol_price_usd / 1_000_000;
    }
  } catch (e) {
    console.error('Error fetching SOL price:', e);
  }
  return 200;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const sortBy = searchParams.get('sortBy') || 'lastTrade';

    // ⭐ Network from query param or default
    const networkParam = searchParams.get('network');
    const networkDb: NetworkType = (networkParam === 'mainnet' || networkParam === 'devnet')
      ? networkParam
      : DEFAULT_NETWORK;

    const solPrice = await getSolPrice();
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;
    const oneDayAgo = now - 86400;
    const sevenDaysAgo = now - 604800;
    const fiveMinutesAgo = now - 300;

    // Try with holder columns, fallback without them
    let tokens;
    let tokensError;

    // ⭐ Exclude completed tokens (winners/defeated):
    // - battle_status 3 = VictoryPending (winner waiting for listing)
    // - battle_status 4 = Listed (graduated to Raydium)
    // - battle_status 5 = Defeated (lost the battle)
    const EXCLUDED_STATUSES = [3, 4, 5];

    // Try full query with all optional columns
    // Order by created_at DESC so new tokens are always included
    const result = await supabase
      .from('tokens')
      .select(`
        mint, name, symbol, image,
        sol_collected, real_sol_reserves,
        virtual_sol_reserves, virtual_token_reserves,
        total_trade_volume, market_cap_usd,
        last_trade_timestamp, battle_status, is_active,
        holder_count, holder_updated_at, created_at, creation_timestamp
      `)
      .eq('network', networkDb)
      .not('battle_status', 'in', `(${EXCLUDED_STATUSES.join(',')})`)
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    // If error (missing columns), try progressively simpler queries
    if (result.error) {
      // Try without holder columns but with created_at
      const fallback1 = await supabase
        .from('tokens')
        .select(`
          mint, name, symbol, image,
          sol_collected, real_sol_reserves,
          virtual_sol_reserves, virtual_token_reserves,
          total_trade_volume, market_cap_usd,
          last_trade_timestamp, battle_status, is_active,
          created_at, creation_timestamp
        `)
        .eq('network', networkDb)
        .not('battle_status', 'in', `(${EXCLUDED_STATUSES.join(',')})`)
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (fallback1.error) {
        // Final fallback: minimal query without created_at or holder columns
        const fallback2 = await supabase
          .from('tokens')
          .select(`
            mint, name, symbol, image,
            sol_collected, real_sol_reserves,
            virtual_sol_reserves, virtual_token_reserves,
            total_trade_volume, market_cap_usd,
            last_trade_timestamp, battle_status, is_active
          `)
          .eq('network', networkDb)
          .order('last_trade_timestamp', { ascending: false, nullsFirst: false })
          .limit(limit);

        tokens = fallback2.data;
        tokensError = fallback2.error;
      } else {
        tokens = fallback1.data;
        tokensError = fallback1.error;
      }
    } else {
      tokens = result.data;
      tokensError = result.error;
    }

    if (tokensError) {
      console.error('❌ Tokens fetch error:', tokensError);
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        tokens: [],
        updatedAt: new Date().toISOString(),
        totalTokens: 0
      });
    }

    const tokenMints = tokens.map(t => t.mint);

    // Check for stale holders (older than 5 minutes) and update in background
    // Only if holder columns exist
    const hasHolderColumns = tokens[0] && 'holder_updated_at' in tokens[0];

    if (hasHolderColumns) {
      const HOLDER_CACHE_MINUTES = 5;
      const staleThreshold = new Date(Date.now() - HOLDER_CACHE_MINUTES * 60 * 1000).toISOString();

      const staleTokens = tokens.filter((t: { holder_updated_at?: string }) =>
        !t.holder_updated_at || t.holder_updated_at < staleThreshold
      );

      // Update stale holders in background (don't await - fire and forget)
      if (staleTokens.length > 0) {
        // Only update first 3 to avoid too many RPC calls per request
        const tokensToUpdate = staleTokens.slice(0, 3);

        Promise.all(
          tokensToUpdate.map(async (token: { mint: string }) => {
            try {
              const holderCount = await fetchRealHolders(token.mint);
              await supabase
                .from('tokens')
                .update({
                  holder_count: holderCount,
                  holder_updated_at: new Date().toISOString(),
                })
                .eq('mint', token.mint);
            } catch (err) {
              console.error(`Error updating holders for ${token.mint}:`, err);
            }
          })
        ).catch(err => console.error('Background holder update error:', err));
      }
    }

    // Fetch 7 days of trades for change calculations
    const { data: recentTrades } = await supabase
      .from('user_trades')
      .select('token_mint, sol_amount, trade_type, block_time, wallet_address')
      .in('token_mint', tokenMints)
      .gte('block_time', sevenDaysAgo)
      .order('block_time', { ascending: false });

    const tokenStats = new Map<string, {
      recentCount: number;
      recentVolume: number;
      volume24h: number;
      netFlow1h: number;
      netFlow24h: number;
      netFlow7d: number;
      holders: Set<string>;
      lastTrade: { amount: number; secondsAgo: number; type: 'buy' | 'sell' } | null;
    }>();

    for (const token of tokens) {
      tokenStats.set(token.mint, {
        recentCount: 0,
        recentVolume: 0,
        volume24h: 0,
        netFlow1h: 0,
        netFlow24h: 0,
        netFlow7d: 0,
        holders: new Set(),
        lastTrade: null,
      });
    }

    if (recentTrades) {
      for (const trade of recentTrades) {
        const stats = tokenStats.get(trade.token_mint);
        if (!stats) continue;

        const solAmount = (trade.sol_amount || 0) / LAMPORTS_PER_SOL;
        const usdAmount = solAmount * solPrice;
        const tradeTime = trade.block_time || now;

        // Track holders (unique wallet addresses that bought)
        if (trade.trade_type === 'buy' && trade.wallet_address) {
          stats.holders.add(trade.wallet_address);
        }

        // 7d net flow
        stats.netFlow7d += trade.trade_type === 'buy' ? usdAmount : -usdAmount;

        if (tradeTime >= oneDayAgo) {
          stats.volume24h += usdAmount;
          stats.netFlow24h += trade.trade_type === 'buy' ? usdAmount : -usdAmount;
        }

        if (tradeTime >= oneHourAgo) {
          stats.netFlow1h += trade.trade_type === 'buy' ? usdAmount : -usdAmount;
        }

        if (tradeTime >= fiveMinutesAgo) {
          stats.recentCount++;
          stats.recentVolume += usdAmount;
        }

        if (!stats.lastTrade) {
          stats.lastTrade = {
            amount: usdAmount,
            secondsAgo: now - tradeTime,
            type: trade.trade_type as 'buy' | 'sell',
          };
        }
      }
    }

    const rankedTokens: RankedToken[] = tokens.map(token => {
      const stats = tokenStats.get(token.mint)!;

      const solCollected = (token.sol_collected || token.real_sol_reserves || 0) / LAMPORTS_PER_SOL;
      const virtualSol = (token.virtual_sol_reserves || 0) / LAMPORTS_PER_SOL;
      const virtualToken = (token.virtual_token_reserves || 0) / 1e9;

      const priceUsd = virtualToken > 0 ? (virtualSol / virtualToken) * solPrice : 0;
      const marketCapUsd = token.market_cap_usd || (priceUsd * TOTAL_SUPPLY);
      const change1h = marketCapUsd > 0 ? (stats.netFlow1h / marketCapUsd) * 100 : 0;
      const change24h = marketCapUsd > 0 ? (stats.netFlow24h / marketCapUsd) * 100 : 0;
      const change7d = marketCapUsd > 0 ? (stats.netFlow7d / marketCapUsd) * 100 : 0;

      // Use created_at or creation_timestamp as fallback for new tokens without trades
      const createdAtTimestamp = token.created_at
        ? Math.floor(new Date(token.created_at).getTime() / 1000)
        : token.creation_timestamp
          ? token.creation_timestamp
          : 0;
      const lastTradeTimestamp = token.last_trade_timestamp || createdAtTimestamp;
      const activityScore = calculateActivityScore(
        lastTradeTimestamp,
        stats.recentCount,
        stats.recentVolume
      );

      return {
        rank: 0,
        mint: token.mint,
        name: token.name || token.symbol || `Token ${token.mint.slice(0, 6)}`,
        symbol: token.symbol || 'TKN',
        image: token.image,
        priceUsd,
        marketCapUsd,
        volume24hUsd: stats.volume24h,
        change1h: Math.round(change1h * 100) / 100,
        change24h: Math.round(change24h * 100) / 100,
        change7d: Math.round(change7d * 100) / 100,
        holders: token.holder_count || stats.holders.size,
        lastTradeAmountUsd: stats.lastTrade?.amount || 0,
        lastTradeSecondsAgo: stats.lastTrade?.secondsAgo || (now - lastTradeTimestamp),
        lastTradeType: stats.lastTrade?.type || null,
        activityScore,
        battleStatus: token.battle_status ?? 0,
        solCollected,
      };
    });

    if (sortBy === 'lastTrade') {
      rankedTokens.sort((a, b) => b.activityScore - a.activityScore);
    } else if (sortBy === 'lastCreated') {
      // Already sorted by created_at from database query, keep that order
    } else {
      rankedTokens.sort((a, b) => b.marketCapUsd - a.marketCapUsd);
    }

    rankedTokens.forEach((token, index) => {
      token.rank = index + 1;
    });

    return NextResponse.json({
      tokens: rankedTokens,
      updatedAt: new Date().toISOString(),
      totalTokens: rankedTokens.length,
    });

  } catch (error) {
    console.error('Rankings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
