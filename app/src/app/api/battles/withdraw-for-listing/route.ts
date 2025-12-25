/**
 * BONK BATTLE - Withdraw For Listing API
 * POST /api/battles/withdraw-for-listing
 * 
 * Withdraws SOL and reserved tokens from a Listed token
 * for creating Raydium liquidity pool.
 * 
 * ⭐ SECURITY FIX: Added CRON_SECRET authentication
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
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const PROGRAM_ID = new PublicKey('F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD');
const NETWORK = 'mainnet-beta';

// Helper per generare link Solscan
const getSolscanUrl = (type: 'tx' | 'token' | 'account', address: string): string => {
  const base = `https://solscan.io/${type}/${address}`;
  return NETWORK === 'mainnet-beta' ? base : `${base}?cluster=${NETWORK}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ SECURITY: Authentication Check (NEW)
// ═══════════════════════════════════════════════════════════════════════════

function verifyAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET configured, allow requests (backward compatible)
  // ⚠️ Set CRON_SECRET in production!
  if (!cronSecret) {
    console.warn('⚠️ CRON_SECRET not configured - allowing request');
    return true;
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Check Vercel Cron header (automatically added by Vercel Cron)
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader === '1') {
    return true;
  }

  return false;
}

// Load keeper keypair
function getKeeperKeypair(): Keypair {
  const privateKeyString = process.env.KEEPER_PRIVATE_KEY;
  if (!privateKeyString) {
    throw new Error('KEEPER_PRIVATE_KEY not configured');
  }
  const privateKeyArray = JSON.parse(privateKeyString);
  return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
}

// Anchor discriminator for withdraw_for_listing
const WITHDRAW_FOR_LISTING_DISCRIMINATOR = Buffer.from([127, 237, 151, 214, 106, 20, 93, 33]);

function getBattleStatePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('battle_state'), mint.toBuffer()],
    PROGRAM_ID
  );
}

// Battle status enum
const BattleStatus = {
  Created: 0,
  Qualified: 1,
  InBattle: 2,
  VictoryPending: 3,
  Listed: 4,
  PoolCreated: 5,
};

// ⭐ Auto-detect which token program the mint uses
async function getTokenProgramForMint(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const mintAccount = await connection.getAccountInfo(mint);
  if (!mintAccount) {
    throw new Error('Mint account not found');
  }

  // Check the owner of the mint account
  if (mintAccount.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    console.log('🔷 Mint uses Token-2022 program');
    return TOKEN_2022_PROGRAM_ID;
  } else if (mintAccount.owner.equals(TOKEN_PROGRAM_ID)) {
    console.log('🔶 Mint uses legacy Token program');
    return TOKEN_PROGRAM_ID;
  } else {
    throw new Error(`Unknown token program: ${mintAccount.owner.toString()}`);
  }
}

export async function POST(request: NextRequest) {
  // ⭐ SECURITY: Verify authentication (NEW)
  if (!verifyAuth(request)) {
    console.log('❌ Unauthorized access attempt to withdraw-for-listing');
    return NextResponse.json({
      error: 'Unauthorized',
      message: 'Valid CRON_SECRET required'
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const tokenMint = body.tokenMint || body.mint;

    if (!tokenMint) {
      return NextResponse.json({
        error: 'Missing tokenMint or mint'
      }, { status: 400 });
    }

    let mint: PublicKey;
    try {
      mint = new PublicKey(tokenMint);
    } catch {
      return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 });
    }

    console.log('\n📤 WITHDRAW FOR LISTING');
    console.log('Token:', tokenMint);

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const keeperKeypair = getKeeperKeypair();

    // ⭐ Auto-detect token program
    const tokenProgramId = await getTokenProgramForMint(connection, mint);
    console.log('Token Program:', tokenProgramId.toString());

    const [battleStatePDA] = getBattleStatePDA(mint);

    console.log('Battle State PDA:', battleStatePDA.toString());
    console.log('Keeper:', keeperKeypair.publicKey.toString());

    // Verify token has Listed status
    const battleStateAccount = await connection.getAccountInfo(battleStatePDA);
    if (!battleStateAccount) {
      return NextResponse.json({
        error: 'Battle state not found'
      }, { status: 404 });
    }

    // Offset 65 = 8 (discriminator) + 32 (mint) + 8 (sol_collected) + 8 (tokens_sold) + 8 (total_trade_volume) + 1 (is_active)
    const battleStatus = battleStateAccount.data[65];
    if (battleStatus !== BattleStatus.Listed) {
      return NextResponse.json({
        error: 'Token is not in Listed status',
        currentStatus: battleStatus,
        statusName: ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][battleStatus],
        hint: 'Token must win a battle and be finalized before withdrawal'
      }, { status: 400 });
    }

    // Get current SOL in battle state
    const solInAccount = battleStateAccount.lamports / 1e9;
    console.log('SOL in battle state:', solInAccount.toFixed(4), 'SOL');

    // Get contract token account (holds the reserved tokens)
    const contractTokenAccount = getAssociatedTokenAddressSync(
      mint,
      battleStatePDA,
      true, // allowOwnerOffCurve
      tokenProgramId
    );
    console.log('Contract Token Account:', contractTokenAccount.toString());

    // Get or create keeper token account
    const keeperTokenAccount = getAssociatedTokenAddressSync(
      mint,
      keeperKeypair.publicKey,
      false,
      tokenProgramId
    );
    console.log('Keeper Token Account:', keeperTokenAccount.toString());

    // Check if keeper token account exists
    const keeperTokenAccountInfo = await connection.getAccountInfo(keeperTokenAccount);

    // Create keeper token account FIRST in separate transaction if needed
    if (!keeperTokenAccountInfo) {
      console.log('Creating keeper token account in separate tx...');
      const createATAIx = createAssociatedTokenAccountInstruction(
        keeperKeypair.publicKey,
        keeperTokenAccount,
        keeperKeypair.publicKey,
        mint,
        tokenProgramId,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const { blockhash: ataBlockhash, lastValidBlockHeight: ataLastValid } = await connection.getLatestBlockhash();
      const ataTx = new Transaction({
        feePayer: keeperKeypair.publicKey,
        blockhash: ataBlockhash,
        lastValidBlockHeight: ataLastValid,
      }).add(createATAIx);

      const ataSignature = await sendAndConfirmTransaction(
        connection,
        ataTx,
        [keeperKeypair],
        { commitment: 'confirmed' }
      );
      console.log('✅ Keeper token account created:', ataSignature);

      // Wait a bit for account to be available
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Build withdraw_for_listing instruction
    const withdrawIx = new TransactionInstruction({
      keys: [
        { pubkey: battleStatePDA, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: contractTokenAccount, isSigner: false, isWritable: true },
        { pubkey: keeperTokenAccount, isSigner: false, isWritable: true },
        { pubkey: keeperKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: tokenProgramId, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: WITHDRAW_FOR_LISTING_DISCRIMINATOR,
    });

    // Build and send transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: keeperKeypair.publicKey,
      blockhash,
      lastValidBlockHeight,
    }).add(withdrawIx);

    console.log('📤 Sending withdraw_for_listing transaction...');

    try {
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [keeperKeypair],
        { commitment: 'confirmed' }
      );

      console.log('✅ Transaction confirmed:', signature);
      console.log('🔗', getSolscanUrl('tx', signature));

      // Re-read state
      const updatedAccount = await connection.getAccountInfo(battleStatePDA);
      const newStatus = updatedAccount ? updatedAccount.data[65] : -1;

      return NextResponse.json({
        success: true,
        message: '🚀 WITHDRAWAL COMPLETE! Ready for Raydium listing!',
        signature,
        solscanUrl: getSolscanUrl('tx', signature),
        withdrawn: {
          sol: solInAccount,
          tokens: '206,900,000 (reserved for Raydium)',
        },
        newStatus: ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][newStatus] || 'Unknown',
        nextStep: 'Use withdrawn SOL and tokens to create Raydium liquidity pool'
      });

    } catch (txError: any) {
      console.error('Transaction error:', txError);

      const errorMessage = txError.message || String(txError);
      const logs = txError.logs || [];

      // Parse specific errors
      if (errorMessage.includes('NotReadyForListing')) {
        return NextResponse.json({
          success: false,
          error: 'Token is not ready for listing',
          logs
        }, { status: 400 });
      }

      if (errorMessage.includes('NoLiquidityToWithdraw')) {
        return NextResponse.json({
          success: false,
          error: 'No liquidity available to withdraw',
          logs
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        error: 'Transaction failed',
        details: errorMessage,
        logs
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Withdraw for listing API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mint = searchParams.get('mint');

  if (!mint) {
    return NextResponse.json({
      endpoint: 'withdraw-for-listing',
      usage: 'POST with { tokenMint: "..." }',
      description: 'Withdraws SOL and reserved tokens from a Listed token for Raydium pool creation',
      requirements: 'Token must be in Listed status (won a battle and finalized)',
      example: {
        tokenMint: 'GBZf7U9mRzxLfRiZL5hFs7Q397YCvd6C5ckW6kng1Y1'
      }
    });
  }

  // Redirect GET to POST logic
  const response = await POST(new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ tokenMint: mint }),
  }));

  return response;
}