/**
 * BONK BATTLE - Find Match API
 * POST /api/battles/find-match - Auto-find opponent and start battle
 * GET /api/battles/find-match - Get matchmaking queue
 *
 * ✅ Updated: Returns image data for BattleStartedModal
 * ✅ V2: Network-aware RPC + On-chain status validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { startBattle, canTokensBattle, getBattleStatePDA, BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/start-battle';
import { createClient } from '@supabase/supabase-js';

// Network-aware RPC endpoints
const RPC_ENDPOINTS = {
  mainnet: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=8c51da3b-f506-42bb-9000-1cf7724b3846',
  devnet: 'https://devnet.helius-rpc.com/?api-key=8c51da3b-f506-42bb-9000-1cf7724b3846',
};

const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Parse on-chain battle status (V1 struct offsets)
const OFFSET_BATTLE_STATUS = 65;

function parseOnChainBattleStatus(data: Buffer): number {
  return data[OFFSET_BATTLE_STATUS];
}

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
    const { tokenMint, network: requestNetwork } = body;

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

    // Get my token info (including network)
    const { data: myTokenData, error: myTokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('mint', tokenMint)
      .single();

    if (myTokenError || !myTokenData) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Determine network from token data or request
    const network = myTokenData.network || requestNetwork || 'mainnet';
    const rpcEndpoint = network === 'devnet' ? RPC_ENDPOINTS.devnet : RPC_ENDPOINTS.mainnet;
    console.log(`🌐 Using ${network} RPC: ${rpcEndpoint}`);

    const connection = new Connection(rpcEndpoint, 'confirmed');

    // ✅ V2 FIX: Check ON-CHAIN status instead of database (database may be stale)
    const [battleStatePDA] = getBattleStatePDA(myToken);
    const battleStateInfo = await connection.getAccountInfo(battleStatePDA);

    if (!battleStateInfo || battleStateInfo.owner.toString() !== BONK_BATTLE_PROGRAM_ID.toString()) {
      return NextResponse.json({ error: 'Token not found on-chain' }, { status: 404 });
    }

    const onChainStatus = parseOnChainBattleStatus(battleStateInfo.data as Buffer);
    console.log(`📊 Token ${tokenMint} on-chain status: ${onChainStatus} (1=Qualified)`);

    // Sync database if status differs
    if (myTokenData.battle_status !== onChainStatus) {
      console.log(`🔄 Syncing database: ${myTokenData.battle_status} → ${onChainStatus}`);
      await supabase
        .from('tokens')
        .update({ battle_status: onChainStatus })
        .eq('mint', tokenMint);
    }

    if (onChainStatus !== 1) {
      return NextResponse.json({
        error: `Token is not qualified for battle (on-chain status: ${onChainStatus}). Status 1 = Qualified.`
      }, { status: 400 });
    }

    // Find qualified opponents from same network
    // Note: We check on-chain status later via canTokensBattle
    // Order by updated_at DESCENDING so newest tokens (likely valid) come first
    const { data: potentialOpponents, error: opponentsError } = await supabase
      .from('tokens')
      .select('*')
      .eq('network', network)
      .neq('mint', tokenMint)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (opponentsError) throw opponentsError;

    if (!potentialOpponents || potentialOpponents.length === 0) {
      return NextResponse.json({
        success: true,
        found: false,
        message: 'No opponents available on this network. Your token is in the queue.',
        myToken: {
          mint: tokenMint,
          name: myTokenData.name,
          symbol: myTokenData.symbol,
          image: myTokenData.image || '',
        },
        network,
      });
    }

    const keeper = getKeeperKeypair();

    if (!keeper) {
      return NextResponse.json({ error: 'Keeper not configured' }, { status: 500 });
    }

    console.log(`🔍 Found ${potentialOpponents.length} potential opponents on ${network}`);

    // Track why opponents failed for debugging
    const failureReasons: Array<{ mint: string; symbol: string; reason: string }> = [];

    // Helper: delay to avoid rate limiting
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Try to match with each opponent (limit to 10 checks to avoid rate limiting)
    const maxChecks = Math.min(potentialOpponents.length, 10);
    for (let i = 0; i < maxChecks; i++) {
      const opponent = potentialOpponents[i];
      try {
        // Small delay between RPC calls to avoid 429
        if (i > 0) await delay(100);

        const opponentMint = new PublicKey(opponent.mint);
        console.log(`🎯 Checking opponent ${i + 1}/${maxChecks}: ${opponent.symbol} (${opponent.mint})`);

        const canBattle = await canTokensBattle(connection, myToken, opponentMint);
        if (!canBattle.canBattle) {
          const reason = canBattle.reason || 'Unknown';
          console.log(`❌ Cannot battle ${opponent.symbol}: ${reason}`);
          console.log(`   Details:`, canBattle.details);
          failureReasons.push({ mint: opponent.mint, symbol: opponent.symbol, reason });
          continue;
        }

        console.log(`✅ Can battle ${opponent.symbol}! Starting battle...`);
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

        // ✅ UPDATED: Return image data for BattleStartedModal
        return NextResponse.json({
          success: true,
          found: true,
          message: 'Battle started!',
          battle: {
            signature: result.signature,
            tokenA: {
              mint: tokenMint,
              name: myTokenData.name,
              symbol: myTokenData.symbol,
              image: myTokenData.image || '',
            },
            tokenB: {
              mint: opponent.mint,
              name: opponent.name,
              symbol: opponent.symbol,
              image: opponent.image || '',
            },
          },
        });

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error matching with ${opponent.mint}:`, error);
        failureReasons.push({ mint: opponent.mint, symbol: opponent.symbol || '???', reason: `Exception: ${errMsg}` });
        continue;
      }
    }

    console.log(`💔 No match found. Failure reasons:`, failureReasons);

    return NextResponse.json({
      success: true,
      found: false,
      message: 'No compatible opponents found on-chain. Token queued for matching.',
      potentialOpponents: potentialOpponents.length,
      failureReasons, // Include for debugging
      network,
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
    const network = searchParams.get('network') || 'mainnet';

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (mint) {
      const { data: token } = await supabase
        .from('tokens')
        .select('mint, name, symbol, image, battle_status, opponent_mint, network')
        .eq('mint', mint)
        .single();

      return NextResponse.json({ token });
    }

    // Get all qualified tokens (queue) filtered by network
    const { data: queue, error } = await supabase
      .from('tokens')
      .select('mint, name, symbol, image, sol_collected, battle_status, updated_at, network')
      .eq('battle_status', 1)
      .eq('network', network)
      .order('updated_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      queue: queue || [],
      count: queue?.length || 0,
      network,
    });

  } catch (error) {
    console.error('Get queue error:', error);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}