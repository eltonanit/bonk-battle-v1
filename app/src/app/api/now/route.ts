// =================================================================
// FILE: app/src/app/api/now/route.ts
// NOW API - Anti-FOMO opportunities
// Shows tokens with: low MC, low trades, early entry points
// =================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type NetworkType = 'mainnet' | 'devnet';
const DEFAULT_NETWORK: NetworkType = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? 'devnet' : 'mainnet';

const LAMPORTS_PER_SOL = 1_000_000_000;
const TOTAL_SUPPLY = 1_000_000_000;

// Get SOL price
async function getSolPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
      next: { revalidate: 60 }
    });
    const data = await res.json();
    return data.solana?.usd || 100;
  } catch {
    return 100;
  }
}

// Format time ago
function formatTimeAgo(timestamp: number | null): string {
  if (!timestamp) return 'Unknown';

  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

// Calculate opportunity score (0-100)
// Higher = better opportunity (lower MC, fewer trades, newer)
function calculateOpportunityScore(
  marketCapUsd: number,
  tradeCount: number,
  holders: number,
  ageSeconds: number
): number {
  let score = 100;

  // MC penalty (lower MC = higher score)
  // $0-1K = 100, $1K-10K = 80, $10K-100K = 60, $100K+ = 40
  if (marketCapUsd > 100000) score -= 60;
  else if (marketCapUsd > 10000) score -= 40;
  else if (marketCapUsd > 1000) score -= 20;

  // Trade count penalty (fewer trades = higher score)
  // 0-10 trades = 0 penalty, 10-50 = -10, 50-100 = -20, 100+ = -30
  if (tradeCount > 100) score -= 30;
  else if (tradeCount > 50) score -= 20;
  else if (tradeCount > 10) score -= 10;

  // Holders bonus (some holders = good, too few = risky)
  // 1-10 holders = slight penalty, 10-50 = bonus, 50+ = neutral
  if (holders < 5) score -= 5;
  else if (holders >= 10 && holders < 50) score += 5;

  // Age bonus (newer = better, but not too new)
  // < 1 hour = slight risk, 1-24h = optimal, 24h-7d = good, 7d+ = older
  const ageHours = ageSeconds / 3600;
  if (ageHours < 1) score -= 5; // Too new, might be scam
  else if (ageHours >= 1 && ageHours < 24) score += 10; // Sweet spot
  else if (ageHours >= 24 && ageHours < 168) score += 5; // Still good

  return Math.max(0, Math.min(100, score));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const networkParam = searchParams.get('network');
    const networkDb: NetworkType = (networkParam === 'mainnet' || networkParam === 'devnet')
      ? networkParam
      : DEFAULT_NETWORK;

    const solPrice = await getSolPrice();
    const now = Math.floor(Date.now() / 1000);

    // Get tokens that are NOT in battle, NOT completed
    // Exclude: InBattle (2), VictoryPending (3), Listed (4), Defeated (5)
    const EXCLUDED_STATUSES = [2, 3, 4, 5];

    const { data: tokens, error } = await supabase
      .from('tokens')
      .select(`
        mint, name, symbol, image,
        sol_collected, real_sol_reserves,
        virtual_sol_reserves, virtual_token_reserves,
        market_cap_usd, battle_status,
        holder_count, creation_timestamp
      `)
      .eq('network', networkDb)
      .not('battle_status', 'in', `(${EXCLUDED_STATUSES.join(',')})`)
      .order('creation_timestamp', { ascending: false, nullsFirst: false })
      .limit(limit * 2); // Get more to filter

    if (error) {
      console.error('Now API error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ tokens: [] });
    }

    // Get trade counts for each token
    const mints = tokens.map(t => t.mint);
    const { data: tradeCounts } = await supabase
      .from('user_trades')
      .select('token_mint')
      .in('token_mint', mints)
      .eq('network', networkDb);

    // Count trades per token
    const tradeCountMap = new Map<string, number>();
    tradeCounts?.forEach(t => {
      const count = tradeCountMap.get(t.token_mint) || 0;
      tradeCountMap.set(t.token_mint, count + 1);
    });

    // Process tokens
    const processedTokens = tokens.map(token => {
      const solCollected = (token.real_sol_reserves || token.sol_collected || 0) / LAMPORTS_PER_SOL;
      const virtualSol = (token.virtual_sol_reserves || 0) / LAMPORTS_PER_SOL;
      const virtualToken = (token.virtual_token_reserves || 0) / 1e9;

      const priceUsd = virtualToken > 0 ? (virtualSol / virtualToken) * solPrice : 0;
      const marketCapUsd = token.market_cap_usd || (priceUsd * TOTAL_SUPPLY);

      const tradeCount = tradeCountMap.get(token.mint) || 0;
      const holders = token.holder_count || 0;
      const creationTimestamp = token.creation_timestamp || now;
      const ageSeconds = now - creationTimestamp;

      const opportunityScore = calculateOpportunityScore(
        marketCapUsd,
        tradeCount,
        holders,
        ageSeconds
      );

      return {
        mint: token.mint,
        name: token.name || 'Unknown',
        symbol: token.symbol || '???',
        image: token.image || null,
        marketCapUsd,
        priceUsd,
        solCollected,
        tradeCount,
        holders,
        createdAgo: formatTimeAgo(creationTimestamp),
        opportunityScore,
      };
    });

    // Sort by opportunity score (highest first)
    processedTokens.sort((a, b) => b.opportunityScore - a.opportunityScore);

    // Return top tokens
    return NextResponse.json({
      tokens: processedTokens.slice(0, limit),
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Now API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
