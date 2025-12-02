/**
 * BONK BATTLE - Complete Victory Flow
 * POST /api/battles/complete-victory
 *
 * Automatically executes the full victory flow:
 * 1. check_victory_conditions
 * 2. finalize_duel
 * 3. withdraw_for_listing
 * 4. create_raydium_pool
 * 5. Save winner to database
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { supabase } from '@/lib/supabase';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');
const TREASURY_WALLET = new PublicKey('5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf');
const PRICE_ORACLE = new PublicKey('7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE');

// Victory thresholds (3x test mode)
const VICTORY_MC_USD = 1200;
const VICTORY_VOLUME_USD = 200;

// Discriminators
const CHECK_VICTORY_DISCRIMINATOR = Buffer.from([176, 199, 31, 103, 154, 28, 170, 98]);
const FINALIZE_DUEL_DISCRIMINATOR = Buffer.from([57, 165, 69, 195, 50, 206, 212, 134]);
const WITHDRAW_FOR_LISTING_DISCRIMINATOR = Buffer.from([127, 237, 151, 214, 106, 20, 93, 33]);

// Battle status enum
const BattleStatus = {
  Created: 0,
  Qualified: 1,
  InBattle: 2,
  VictoryPending: 3,
  Listed: 4,
  PoolCreated: 5,
};

function getKeeperKeypair(): Keypair {
  const privateKeyString = process.env.KEEPER_PRIVATE_KEY;
  if (!privateKeyString) throw new Error('KEEPER_PRIVATE_KEY not configured');
  return Keypair.fromSecretKey(new Uint8Array(JSON.parse(privateKeyString)));
}

function getBattleStatePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('battle_state'), mint.toBuffer()],
    PROGRAM_ID
  );
}

// Parse battle state from account data
function parseBattleState(data: Buffer) {
  return {
    battleStatus: data[90],
    opponentMint: new PublicKey(data.slice(91, 123)),
    realSolReserves: Number(data.readBigUInt64LE(58)),
    totalTradeVolume: Number(data.readBigUInt64LE(66)),
  };
}

export async function POST(request: NextRequest) {
  const results: any = {
    step: 'start',
    success: false,
    signatures: {},
    errors: [],
  };

  try {
    const body = await request.json();
    const { winnerMint } = body;

    if (!winnerMint) {
      return NextResponse.json({ error: 'Missing winnerMint' }, { status: 400 });
    }

    const mint = new PublicKey(winnerMint);
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const keeperKeypair = getKeeperKeypair();
    const [battleStatePDA] = getBattleStatePDA(mint);

    console.log('\n🏆 COMPLETE VICTORY FLOW');
    console.log('Winner Mint:', winnerMint);

    // Get current state
    const battleStateAccount = await connection.getAccountInfo(battleStatePDA);
    if (!battleStateAccount) {
      return NextResponse.json({ error: 'Battle state not found' }, { status: 404 });
    }

    const state = parseBattleState(battleStateAccount.data);
    console.log('Current Status:', state.battleStatus);

    // Get token info from DB
    const { data: winnerToken } = await supabase
      .from('tokens')
      .select('*')
      .eq('mint', winnerMint)
      .single();

    // Get opponent info
    const opponentMintStr = state.opponentMint.toString();
    const [loserPDA] = getBattleStatePDA(state.opponentMint);

    const { data: loserToken } = await supabase
      .from('tokens')
      .select('*')
      .eq('mint', opponentMintStr)
      .single();

    // ============================================
    // STEP 1: CHECK VICTORY (if InBattle)
    // ============================================
    if (state.battleStatus === BattleStatus.InBattle) {
      results.step = 'check_victory';
      console.log('\n📍 Step 1: Check Victory Conditions...');

      const checkVictoryIx = new TransactionInstruction({
        keys: [
          { pubkey: battleStatePDA, isSigner: false, isWritable: true },
          { pubkey: PRICE_ORACLE, isSigner: false, isWritable: false },
          { pubkey: keeperKeypair.publicKey, isSigner: true, isWritable: true },
        ],
        programId: PROGRAM_ID,
        data: CHECK_VICTORY_DISCRIMINATOR,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction({ feePayer: keeperKeypair.publicKey, blockhash, lastValidBlockHeight })
        .add(checkVictoryIx);

      const sig = await sendAndConfirmTransaction(connection, tx, [keeperKeypair], { commitment: 'confirmed' });
      results.signatures.checkVictory = sig;
      console.log('✅ Check Victory TX:', sig);

      // Wait and re-read state
      await new Promise(r => setTimeout(r, 2000));
    }

    // Re-read state
    const updatedAccount1 = await connection.getAccountInfo(battleStatePDA);
    const state1 = parseBattleState(updatedAccount1!.data);

    // ============================================
    // STEP 2: FINALIZE DUEL (if VictoryPending)
    // ============================================
    if (state1.battleStatus === BattleStatus.VictoryPending) {
      results.step = 'finalize_duel';
      console.log('\n📍 Step 2: Finalize Duel...');

      const finalizeDuelIx = new TransactionInstruction({
        keys: [
          { pubkey: battleStatePDA, isSigner: false, isWritable: true },
          { pubkey: loserPDA, isSigner: false, isWritable: true },
          { pubkey: keeperKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: FINALIZE_DUEL_DISCRIMINATOR,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction({ feePayer: keeperKeypair.publicKey, blockhash, lastValidBlockHeight })
        .add(finalizeDuelIx);

      const sig = await sendAndConfirmTransaction(connection, tx, [keeperKeypair], { commitment: 'confirmed' });
      results.signatures.finalizeDuel = sig;
      console.log('✅ Finalize Duel TX:', sig);

      await new Promise(r => setTimeout(r, 2000));
    }

    // Re-read state
    const updatedAccount2 = await connection.getAccountInfo(battleStatePDA);
    const state2 = parseBattleState(updatedAccount2!.data);

    // ============================================
    // STEP 3: WITHDRAW FOR LISTING (if Listed)
    // ============================================
    if (state2.battleStatus === BattleStatus.Listed) {
      results.step = 'withdraw_for_listing';
      console.log('\n📍 Step 3: Withdraw For Listing...');

      const contractTokenAccount = getAssociatedTokenAddressSync(mint, battleStatePDA, true, TOKEN_PROGRAM_ID);
      const keeperTokenAccount = getAssociatedTokenAddressSync(mint, keeperKeypair.publicKey, false, TOKEN_PROGRAM_ID);

      // Create keeper token account if needed
      const keeperTokenAccountInfo = await connection.getAccountInfo(keeperTokenAccount);
      if (!keeperTokenAccountInfo) {
        const createATAIx = createAssociatedTokenAccountInstruction(
          keeperKeypair.publicKey, keeperTokenAccount, keeperKeypair.publicKey, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
        );
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        const ataTx = new Transaction({ feePayer: keeperKeypair.publicKey, blockhash, lastValidBlockHeight }).add(createATAIx);
        await sendAndConfirmTransaction(connection, ataTx, [keeperKeypair], { commitment: 'confirmed' });
        await new Promise(r => setTimeout(r, 2000));
      }

      const withdrawIx = new TransactionInstruction({
        keys: [
          { pubkey: battleStatePDA, isSigner: false, isWritable: true },
          { pubkey: mint, isSigner: false, isWritable: true },
          { pubkey: contractTokenAccount, isSigner: false, isWritable: true },
          { pubkey: keeperTokenAccount, isSigner: false, isWritable: true },
          { pubkey: keeperKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: WITHDRAW_FOR_LISTING_DISCRIMINATOR,
      });

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const tx = new Transaction({ feePayer: keeperKeypair.publicKey, blockhash, lastValidBlockHeight }).add(withdrawIx);

      const sig = await sendAndConfirmTransaction(connection, tx, [keeperKeypair], { commitment: 'confirmed' });
      results.signatures.withdrawForListing = sig;
      console.log('✅ Withdraw For Listing TX:', sig);

      await new Promise(r => setTimeout(r, 2000));
    }

    // ============================================
    // STEP 4: CREATE RAYDIUM POOL
    // ============================================
    let poolId: string | null = null;
    let poolSignature: string | null = null;
    let raydiumUrl: string | null = null;

    results.step = 'create_raydium_pool';
    console.log('\n📍 Step 4: Create Raydium Pool...');

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

      const poolResponse = await fetch(`${baseUrl}/api/battles/create-raydium-pool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerMint: winnerMint }),
      });

      const poolResult = await poolResponse.json();

      if (poolResult.success && poolResult.poolId) {
        poolId = poolResult.poolId;
        poolSignature = poolResult.signature;
        raydiumUrl = poolResult.raydiumUrl || `https://raydium.io/swap/?inputMint=sol&outputMint=${winnerMint}`;
        results.signatures.createPool = poolSignature;
        console.log('✅ Raydium Pool created:', poolId);
      } else {
        console.error('⚠️ Pool creation failed:', poolResult.error);
        results.errors.push(`Pool creation: ${poolResult.error || 'Unknown error'}`);
      }
    } catch (poolError: any) {
      console.error('⚠️ Pool creation error:', poolError.message);
      results.errors.push(`Pool creation: ${poolError.message}`);
    }

    // ============================================
    // STEP 5: SAVE WINNER TO DATABASE
    // ============================================
    results.step = 'save_to_database';
    console.log('\n📍 Step 5: Save Winner to Database...');

    // Get final state
    const finalAccount = await connection.getAccountInfo(battleStatePDA);
    const finalState = parseBattleState(finalAccount!.data);
    const finalSol = finalAccount!.lamports / LAMPORTS_PER_SOL;

    // Calculate spoils (approximate)
    const spoilsSol = (state.realSolReserves - finalState.realSolReserves) / 1e9;

    const winnerRecord = {
      mint: winnerMint,
      name: winnerToken?.name || 'Unknown',
      symbol: winnerToken?.symbol || 'UNK',
      image: winnerToken?.image || null,
      loser_mint: opponentMintStr,
      loser_name: loserToken?.name || 'Unknown',
      loser_symbol: loserToken?.symbol || 'UNK',
      loser_image: loserToken?.image || null,
      final_mc_usd: winnerToken?.market_cap_usd || 0,
      final_volume_usd: winnerToken?.volume_usd || 0,
      final_sol_collected: finalSol,
      spoils_sol: Math.abs(spoilsSol),
      platform_fee_sol: 0, // Calculate if needed
      pool_id: poolId,
      pool_created_at: poolId ? new Date().toISOString() : null,
      raydium_url: raydiumUrl,
      victory_signature: results.signatures.checkVictory || null,
      finalize_signature: results.signatures.finalizeDuel || null,
      withdraw_signature: results.signatures.withdrawForListing || null,
      pool_signature: poolSignature,
      status: poolId ? 'pool_created' : 'listed',
    };

    const { data: insertedWinner, error: insertError } = await supabase
      .from('winners')
      .upsert(winnerRecord, { onConflict: 'mint' })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error saving winner:', insertError);
      results.errors.push(insertError.message);
    } else {
      console.log('✅ Winner saved to database:', insertedWinner?.id);
      results.winnerId = insertedWinner?.id;
    }

    // ============================================
    // DONE!
    // ============================================
    results.success = true;
    results.step = 'complete';
    results.message = '🏆 Victory flow completed!';
    results.winner = {
      mint: winnerMint,
      symbol: winnerToken?.symbol,
      finalStatus: finalState.battleStatus,
    };

    console.log('\n🎉 VICTORY FLOW COMPLETE!');

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('❌ Complete victory error:', error);
    results.errors.push(error.message || String(error));
    return NextResponse.json(results, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'complete-victory',
    usage: 'POST with { winnerMint: "..." }',
    description: 'Executes full victory flow: check-victory → finalize → withdraw → create pool → save to DB',
    steps: [
      '1. check_victory_conditions (if InBattle)',
      '2. finalize_duel (if VictoryPending)',
      '3. withdraw_for_listing (if Listed)',
      '4. create_raydium_pool',
      '5. Save winner to database',
    ],
  });
}
