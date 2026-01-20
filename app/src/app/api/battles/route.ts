// =================================================================
// FILE: app/src/app/api/battles/route.ts
// BATTLES API - Get tokens currently in battle
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const networkParam = searchParams.get('network');
    const networkDb: NetworkType = (networkParam === 'mainnet' || networkParam === 'devnet')
      ? networkParam
      : DEFAULT_NETWORK;

    const solPrice = await getSolPrice();

    // Get tokens with battle_status = 2 (InBattle)
    const { data: tokens, error } = await supabase
      .from('tokens')
      .select(`
        mint, name, symbol, image,
        sol_collected, real_sol_reserves,
        virtual_sol_reserves, virtual_token_reserves,
        market_cap_usd, opponent_mint
      `)
      .eq('network', networkDb)
      .eq('battle_status', 2) // InBattle
      .order('sol_collected', { ascending: false });

    if (error) {
      console.error('Battles API error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ battles: [] });
    }

    // Create token map for quick lookup
    const tokenMap = new Map<string, any>();
    tokens.forEach(t => tokenMap.set(t.mint, t));

    // Find battle pairs (avoid duplicates)
    const processedMints = new Set<string>();
    const battles: any[] = [];

    tokens.forEach(token => {
      if (processedMints.has(token.mint)) return;

      const opponentMint = token.opponent_mint;
      if (!opponentMint || opponentMint === '11111111111111111111111111111111') return;

      const opponent = tokenMap.get(opponentMint);
      if (!opponent) return;

      // Mark both as processed
      processedMints.add(token.mint);
      processedMints.add(opponentMint);

      // Calculate market caps
      const calcMC = (t: any) => {
        const solCollected = (t.real_sol_reserves || t.sol_collected || 0) / LAMPORTS_PER_SOL;
        const virtualSol = (t.virtual_sol_reserves || 0) / LAMPORTS_PER_SOL;
        const virtualToken = (t.virtual_token_reserves || 0) / 1e9;
        const priceUsd = virtualToken > 0 ? (virtualSol / virtualToken) * solPrice : 0;
        return t.market_cap_usd || (priceUsd * TOTAL_SUPPLY);
      };

      const calcSolCollected = (t: any) => {
        return (t.real_sol_reserves || t.sol_collected || 0) / LAMPORTS_PER_SOL;
      };

      battles.push({
        tokenA: {
          mint: token.mint,
          name: token.name || 'Unknown',
          symbol: token.symbol || '???',
          image: token.image || null,
          marketCapUsd: calcMC(token),
          solCollected: calcSolCollected(token),
          opponentMint: opponentMint,
        },
        tokenB: {
          mint: opponent.mint,
          name: opponent.name || 'Unknown',
          symbol: opponent.symbol || '???',
          image: opponent.image || null,
          marketCapUsd: calcMC(opponent),
          solCollected: calcSolCollected(opponent),
          opponentMint: token.mint,
        },
      });
    });

    return NextResponse.json({
      battles,
      updatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Battles API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
