/**
 * BONK BATTLE - Start Battle API
 * POST /api/battles/start - Start battle between two tokens
 * GET /api/battles/start - Get active battles
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
    const { tokenAMint, tokenBMint } = body;

    if (!tokenAMint || !tokenBMint) {
      return NextResponse.json({ error: 'Missing tokenAMint or tokenBMint' }, { status: 400 });
    }

    let tokenA: PublicKey;
    let tokenB: PublicKey;
    try {
      tokenA = new PublicKey(tokenAMint);
      tokenB = new PublicKey(tokenBMint);
    } catch {
      return NextResponse.json({ error: 'Invalid mint addresses' }, { status: 400 });
    }

    const keeper = getKeeperKeypair();
    if (!keeper) {
      return NextResponse.json({ error: 'Keeper not configured' }, { status: 500 });
    }

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    const canBattle = await canTokensBattle(connection, tokenA, tokenB);
    if (!canBattle.canBattle) {
      return NextResponse.json({ error: canBattle.reason }, { status: 400 });
    }

    const result = await startBattle(connection, keeper, tokenA, tokenB);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Save to database
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      await supabase.from('battles').insert({
        token_a_mint: tokenAMint,
        token_b_mint: tokenBMint,
        status: 'active',
        started_at: new Date().toISOString(),
        signature: result.signature,
      });

      await Promise.all([
        supabase.from('tokens').update({ battle_status: 2, opponent_mint: tokenBMint }).eq('mint', tokenAMint),
        supabase.from('tokens').update({ battle_status: 2, opponent_mint: tokenAMint }).eq('mint', tokenBMint),
      ]);
    } catch (dbError) {
      console.error('Database update failed:', dbError);
    }

    return NextResponse.json({
      success: true,
      signature: result.signature,
      tokenA: tokenAMint,
      tokenB: tokenBMint,
      message: 'Battle started successfully!',
    });

  } catch (error) {
    console.error('Start battle API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: battles, error } = await supabase
      .from('battles')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ battles: battles || [] });
  } catch (error) {
    console.error('Get battles error:', error);
    return NextResponse.json({ error: 'Failed to fetch battles' }, { status: 500 });
  }
}
