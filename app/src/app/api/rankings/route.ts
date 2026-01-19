// =================================================================
// FILE: app/src/app/api/rankings/route.ts
// LIVE RANKINGS API - Last Trade & Market Cap sorting
// =================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const solPrice = await getSolPrice();
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;
    const oneDayAgo = now - 86400;
    const fiveMinutesAgo = now - 300;

    const { data: tokens, error: tokensError } = await supabase
      .from('tokens')
      .select(`
        mint, name, symbol, image,
        sol_collected, real_sol_reserves,
        virtual_sol_reserves, virtual_token_reserves,
        total_trade_volume, market_cap_usd,
        last_trade_timestamp, battle_status, is_active
      `)
      .eq('is_active', true)
      .order('sol_collected', { ascending: false, nullsFirst: false })
      .limit(limit);

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

    const { data: recentTrades } = await supabase
      .from('user_trades')
      .select('token_mint, sol_amount, trade_type, block_time')
      .in('token_mint', tokenMints)
      .gte('block_time', oneDayAgo)
      .order('block_time', { ascending: false });

    const tokenStats = new Map<string, {
      recentCount: number;
      recentVolume: number;
      volume24h: number;
      netFlow1h: number;
      lastTrade: { amount: number; secondsAgo: number; type: 'buy' | 'sell' } | null;
    }>();

    for (const token of tokens) {
      tokenStats.set(token.mint, {
        recentCount: 0,
        recentVolume: 0,
        volume24h: 0,
        netFlow1h: 0,
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

        stats.volume24h += usdAmount;

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

      const lastTradeTimestamp = token.last_trade_timestamp || 0;
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
