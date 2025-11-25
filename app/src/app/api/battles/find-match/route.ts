/**
 * BONK BATTLE - Find Match API
 * POST /api/battles/find-match - Auto-find opponent and start battle
 * GET /api/battles/find-match - Get matchmaking queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { startBattle, canTokensBattle } from '@/lib/solana/start-battle';
import { createClient } from '@supabase/supabase-js';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getKeeperKeypair(): Keypair | null {
  if (!KEEPER_PRIVATE_KEY) {
    console.error('KEEPER_PRIVATE_KEY not configured');
    return null;
  }
  try {
    const secretKey = new Uint8Array(JSON.parse(KEEPER_PRIVATE_KEY));
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error('Failed to parse keeper private key:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenMint } = body;

    if (!tokenMint) {
      return NextResponse.json({ error: 'Missing tokenMint' }, { status: 400 });
    }

    let myToken: PublicKey;
    try {
      myToken = new PublicKey(tokenMint);
    } catch {
      return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get my token info
    const { data: myTokenData, error: myTokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('mint', tokenMint)
      .single();

    if (myTokenError || !myTokenData) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    if (myTokenData.battle_status !== 1) {
      return NextResponse.json({
        error: `Token is not qualified for battle (status: ${myTokenData.battle_status})`
      }, { status: 400 });
    }

    // Find qualified opponents (status = 1 = Qualified)
    const { data: potentialOpponents, error: opponentsError } = await supabase
      .from('tokens')
      .select('*')
      .eq('battle_status', 1)
      .neq('mint', tokenMint)
      .order('updated_at', { ascending: true })
      .limit(10);

    if (opponentsError) throw opponentsError;

    if (!potentialOpponents || potentialOpponents.length === 0) {
      return NextResponse.json({
        success: true,
        found: false,
        message: 'No opponents available. Your token is in the queue.',
        myToken: { mint: tokenMint, name: myTokenData.name, symbol: myTokenData.symbol },
      });
    }

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const keeper = getKeeperKeypair();

    if (!keeper) {
      return NextResponse.json({ error: 'Keeper not configured' }, { status: 500 });
    }

    // Try to match with each opponent
    for (const opponent of potentialOpponents) {
      try {
        const opponentMint = new PublicKey(opponent.mint);

        const canBattle = await canTokensBattle(connection, myToken, opponentMint);
        if (!canBattle.canBattle) {
          console.log(`Cannot battle ${opponent.mint}: ${canBattle.reason}`);
          continue;
        }

        const result = await startBattle(connection, keeper, myToken, opponentMint);

        if (!result.success) {
          console.log(`Failed to start battle with ${opponent.mint}: ${result.error}`);
          continue;
        }

        // Save to database
        await supabase.from('battles').insert({
          token_a_mint: tokenMint,
          token_b_mint: opponent.mint,
          status: 'active',
          started_at: new Date().toISOString(),
          signature: result.signature,
        });

        await Promise.all([
          supabase.from('tokens').update({ battle_status: 2, opponent_mint: opponent.mint }).eq('mint', tokenMint),
          supabase.from('tokens').update({ battle_status: 2, opponent_mint: tokenMint }).eq('mint', opponent.mint),
        ]);

        return NextResponse.json({
          success: true,
          found: true,
          message: 'Battle started!',
          battle: {
            signature: result.signature,
            tokenA: { mint: tokenMint, name: myTokenData.name, symbol: myTokenData.symbol },
            tokenB: { mint: opponent.mint, name: opponent.name, symbol: opponent.symbol },
          },
        });

      } catch (error) {
        console.error(`Error matching with ${opponent.mint}:`, error);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      found: false,
      message: 'No compatible opponents found on-chain. Token queued for matching.',
      potentialOpponents: potentialOpponents.length,
    });

  } catch (error) {
    console.error('Find match API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mint = searchParams.get('mint');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (mint) {
      const { data: token } = await supabase
        .from('tokens')
        .select('mint, name, symbol, battle_status, opponent_mint')
        .eq('mint', mint)
        .single();

      return NextResponse.json({ token });
    }

    // Get all qualified tokens (queue)
    const { data: queue, error } = await supabase
      .from('tokens')
      .select('mint, name, symbol, image, sol_collected, battle_status, updated_at')
      .eq('battle_status', 1)
      .order('updated_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      queue: queue || [],
      count: queue?.length || 0,
    });

  } catch (error) {
    console.error('Get queue error:', error);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}
