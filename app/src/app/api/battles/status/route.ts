/**
 * GET /api/battles/status?id=<battle_id_or_mint>
 *
 * Returns battle status and winner info for redirect logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BattleStatus = {
  Created: 0,
  Qualified: 1,
  InBattle: 2,
  VictoryPending: 3,
  Listed: 4,
  PoolCreated: 5,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    // Parse id - could be "mintA-mintB" or just "mint"
    const parts = id.split('-');
    const mintA = parts[0];
    const mintB = parts.length > 1 ? parts[1] : null;

    // Check if id is a mint address (base58, ~32-50 chars)
    const isMintAddress = mintA.length >= 32 && mintA.length <= 50;

    if (isMintAddress) {
      // Query token A
      const { data: tokenDataA } = await supabase
        .from('tokens')
        .select('mint, battle_status, opponent_mint, symbol, raydium_pool_id')
        .eq('mint', mintA)
        .single();

      if (tokenDataA) {
        const statusA = tokenDataA.battle_status;

        // Check if token A won (PoolCreated or Listed)
        if (statusA === BattleStatus.PoolCreated || statusA === BattleStatus.Listed) {
          return NextResponse.json({
            completed: true,
            winnerMint: tokenDataA.mint,
            winnerSymbol: tokenDataA.symbol,
            poolId: tokenDataA.raydium_pool_id,
            status: statusA,
          });
        }

        // Check token B (from URL or opponent_mint)
        const tokenBMint = mintB || tokenDataA.opponent_mint;

        if (tokenBMint) {
          const { data: tokenDataB } = await supabase
            .from('tokens')
            .select('mint, battle_status, symbol, raydium_pool_id')
            .eq('mint', tokenBMint)
            .single();

          if (tokenDataB) {
            const statusB = tokenDataB.battle_status;

            // Check if token B won
            if (statusB === BattleStatus.PoolCreated || statusB === BattleStatus.Listed) {
              return NextResponse.json({
                completed: true,
                winnerMint: tokenDataB.mint,
                winnerSymbol: tokenDataB.symbol,
                loserMint: tokenDataA.mint,
                poolId: tokenDataB.raydium_pool_id,
                status: statusB,
              });
            }
          }
        }

        // Battle still ongoing
        return NextResponse.json({
          completed: false,
          tokenMint: tokenDataA.mint,
          opponentMint: tokenDataA.opponent_mint,
          status: statusA,
        });
      }
    }

    // Try to find by battle_id (if you have a battles table)
    const { data: battleData } = await supabase
      .from('battles')
      .select('*')
      .eq('id', id)
      .single();

    if (battleData) {
      // Check winner status
      const { data: winnerToken } = await supabase
        .from('tokens')
        .select('mint, battle_status, symbol, raydium_pool_id')
        .eq('mint', battleData.winner_mint)
        .single();

      if (winnerToken) {
        const isCompleted =
          winnerToken.battle_status === BattleStatus.PoolCreated ||
          winnerToken.battle_status === BattleStatus.Listed;

        return NextResponse.json({
          completed: isCompleted,
          winnerMint: battleData.winner_mint,
          loserMint: battleData.loser_mint,
          winnerSymbol: winnerToken?.symbol,
          poolId: winnerToken?.raydium_pool_id,
          status: winnerToken?.battle_status,
        });
      }
    }

    return NextResponse.json({
      completed: false,
      error: 'Battle not found'
    }, { status: 404 });

  } catch (error) {
    console.error('Battle status error:', error);
    return NextResponse.json({
      completed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
