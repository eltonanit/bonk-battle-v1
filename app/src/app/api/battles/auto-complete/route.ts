/**
 * BONK BATTLE - Auto Complete Victory Pipeline
 * POST /api/battles/auto-complete
 * GET /api/battles/auto-complete (scans for winners)
 * 
 * Automatically executes the full victory flow:
 * 1. check_victory_conditions → VictoryPending
 * 2. finalize_duel → Listed (+ spoils transfer)
 * 3. withdraw_for_listing → SOL + Tokens to Keeper
 * 4. create_raydium_pool → Pool Created!
 * 
 * Can be triggered:
 * - Manually via POST with tokenMint
 * - Automatically via GET (scans all InBattle tokens)
 * - From webhook after trades
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
import {
  Raydium,
  TxVersion,
  DEVNET_PROGRAM_ID,
  getCpmmPdaAmmConfigId
} from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');
const TREASURY_WALLET = new PublicKey('5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Victory thresholds (TEST tier)
const TARGET_SOL = 6_000_000_000; // 6 SOL in lamports
const VICTORY_VOLUME_SOL = 6_600_000_000; // 6.6 SOL in lamports

// V1 Struct offsets
const V1_OFFSET_SOL_COLLECTED = 40;
const V1_OFFSET_TOTAL_VOLUME = 56;
const V1_OFFSET_BATTLE_STATUS = 65;
const V1_OFFSET_OPPONENT_MINT = 66;

// Battle status enum
const BattleStatus = {
  Created: 0,
  Qualified: 1,
  InBattle: 2,
  VictoryPending: 3,
  Listed: 4,
  PoolCreated: 5,
};

// Anchor discriminators
const CHECK_VICTORY_DISCRIMINATOR = Buffer.from([176, 199, 31, 103, 154, 28, 170, 98]);
const FINALIZE_DUEL_DISCRIMINATOR = Buffer.from([57, 165, 69, 195, 50, 206, 212, 134]);
const WITHDRAW_FOR_LISTING_DISCRIMINATOR = Buffer.from([127, 237, 151, 214, 106, 20, 93, 33]);

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getKeeperKeypair(): Keypair {
  const privateKeyString = process.env.KEEPER_PRIVATE_KEY;
  if (!privateKeyString) {
    throw new Error('KEEPER_PRIVATE_KEY not configured');
  }
  const privateKeyArray = JSON.parse(privateKeyString);
  return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
}

function getBattleStatePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('battle_state'), mint.toBuffer()],
    PROGRAM_ID
  );
}

function getPriceOraclePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('price_oracle')],
    PROGRAM_ID
  );
}

async function getTokenProgramForMint(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const mintAccount = await connection.getAccountInfo(mint);
  if (!mintAccount) throw new Error('Mint account not found');

  if (mintAccount.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return TOKEN_2022_PROGRAM_ID;
  }
  return TOKEN_PROGRAM_ID;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: CHECK VICTORY CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════

async function checkVictory(
  connection: Connection,
  keeper: Keypair,
  mint: PublicKey
): Promise<{ success: boolean; victory: boolean; signature?: string; error?: string }> {
  console.log('🏆 Step 1: Checking victory conditions...');

  const [battleStatePDA] = getBattleStatePDA(mint);
  const [priceOraclePDA] = getPriceOraclePDA();

  const keys = [
    { pubkey: battleStatePDA, isSigner: false, isWritable: true },
    { pubkey: priceOraclePDA, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data: CHECK_VICTORY_DISCRIMINATOR,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: keeper.publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(instruction);

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [keeper],
      { commitment: 'confirmed' }
    );

    // Check if status changed to VictoryPending
    await sleep(1000);
    const updatedAccount = await connection.getAccountInfo(battleStatePDA);
    const newStatus = updatedAccount?.data[V1_OFFSET_BATTLE_STATUS];
    const victory = newStatus === BattleStatus.VictoryPending;

    console.log(victory ? '✅ Victory achieved!' : '⚔️ Battle continues');
    return { success: true, victory, signature };

  } catch (error: any) {
    console.error('❌ Check victory failed:', error.message);
    return { success: false, victory: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: FINALIZE DUEL
// ═══════════════════════════════════════════════════════════════════════════

async function finalizeDuel(
  connection: Connection,
  keeper: Keypair,
  winnerMint: PublicKey,
  loserMint: PublicKey
): Promise<{ success: boolean; signature?: string; error?: string }> {
  console.log('👑 Step 2: Finalizing duel...');

  const [winnerStatePDA] = getBattleStatePDA(winnerMint);
  const [loserStatePDA] = getBattleStatePDA(loserMint);

  const keys = [
    { pubkey: winnerStatePDA, isSigner: false, isWritable: true },
    { pubkey: loserStatePDA, isSigner: false, isWritable: true },
    { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true },
    { pubkey: keeper.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data: FINALIZE_DUEL_DISCRIMINATOR,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: keeper.publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(instruction);

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [keeper],
      { commitment: 'confirmed' }
    );

    console.log('✅ Duel finalized! Spoils transferred.');
    return { success: true, signature };

  } catch (error: any) {
    console.error('❌ Finalize duel failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: WITHDRAW FOR LISTING
// ═══════════════════════════════════════════════════════════════════════════

async function withdrawForListing(
  connection: Connection,
  keeper: Keypair,
  mint: PublicKey
): Promise<{ success: boolean; signature?: string; solWithdrawn?: number; error?: string }> {
  console.log('📤 Step 3: Withdrawing for listing...');

  const tokenProgramId = await getTokenProgramForMint(connection, mint);
  const [battleStatePDA] = getBattleStatePDA(mint);

  // Get SOL amount before withdraw
  const battleStateAccount = await connection.getAccountInfo(battleStatePDA);
  const solInAccount = battleStateAccount ? battleStateAccount.lamports / 1e9 : 0;

  const contractTokenAccount = getAssociatedTokenAddressSync(
    mint,
    battleStatePDA,
    true,
    tokenProgramId
  );

  const keeperTokenAccount = getAssociatedTokenAddressSync(
    mint,
    keeper.publicKey,
    false,
    tokenProgramId
  );

  // Create keeper ATA if needed
  const keeperTokenAccountInfo = await connection.getAccountInfo(keeperTokenAccount);
  if (!keeperTokenAccountInfo) {
    console.log('Creating keeper token account...');
    const createATAIx = createAssociatedTokenAccountInstruction(
      keeper.publicKey,
      keeperTokenAccount,
      keeper.publicKey,
      mint,
      tokenProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const ataTx = new Transaction({
      feePayer: keeper.publicKey,
      blockhash,
      lastValidBlockHeight,
    }).add(createATAIx);

    await sendAndConfirmTransaction(connection, ataTx, [keeper], { commitment: 'confirmed' });
    await sleep(2000);
  }

  // Build withdraw instruction
  const withdrawIx = new TransactionInstruction({
    keys: [
      { pubkey: battleStatePDA, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: contractTokenAccount, isSigner: false, isWritable: true },
      { pubkey: keeperTokenAccount, isSigner: false, isWritable: true },
      { pubkey: keeper.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: WITHDRAW_FOR_LISTING_DISCRIMINATOR,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: keeper.publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(withdrawIx);

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [keeper],
      { commitment: 'confirmed' }
    );

    console.log('✅ Withdrawal complete!', solInAccount.toFixed(2), 'SOL');
    return { success: true, signature, solWithdrawn: solInAccount };

  } catch (error: any) {
    console.error('❌ Withdraw failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: CREATE RAYDIUM POOL
// ═══════════════════════════════════════════════════════════════════════════

async function createRaydiumPool(
  connection: Connection,
  keeper: Keypair,
  mint: PublicKey,
  solAmount: number
): Promise<{ success: boolean; poolId?: string; signature?: string; error?: string }> {
  console.log('🌊 Step 4: Creating Raydium pool...');

  try {
    // Initialize Raydium SDK
    const raydium = await Raydium.load({
      owner: keeper,
      connection: connection,
      cluster: 'devnet',
      disableFeatureCheck: true,
      disableLoadToken: false,
    });

    const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
    const tokenMintStr = mint.toString();
    const solMintStr = SOL_MINT.toString();
    const solFirst = solMintStr < tokenMintStr;

    // Get keeper token balance
    const tokenProgramId = await getTokenProgramForMint(connection, mint);
    const keeperTokenAccount = getAssociatedTokenAddressSync(mint, keeper.publicKey, false, tokenProgramId);
    const tokenAccountInfo = await connection.getTokenAccountBalance(keeperTokenAccount);
    const tokenAmount = parseInt(tokenAccountInfo.value.amount);

    console.log('SOL for pool:', solAmount.toFixed(2));
    console.log('Tokens for pool:', (tokenAmount / 1e9).toFixed(0), 'M');

    const solAmountBN = new BN(Math.floor(solAmount * 1e9));
    const tokenAmountBN = new BN(tokenAmount);

    const mintA = {
      address: solFirst ? SOL_MINT.toString() : mint.toString(),
      decimals: 9,
      programId: TOKEN_PROGRAM_ID.toString(),
    };

    const mintB = {
      address: solFirst ? mint.toString() : SOL_MINT.toString(),
      decimals: 9,
      programId: TOKEN_PROGRAM_ID.toString(),
    };

    const mintAAmount = solFirst ? solAmountBN : tokenAmountBN;
    const mintBAmount = solFirst ? tokenAmountBN : solAmountBN;

    // Get fee configs
    const feeConfigs = await raydium.api.getCpmmConfigs();
    feeConfigs.forEach((config) => {
      config.id = getCpmmPdaAmmConfigId(
        DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
        config.index
      ).publicKey.toBase58();
    });

    // Create pool
    const { execute, extInfo } = await raydium.cpmm.createPool({
      programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
      poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
      mintA,
      mintB,
      mintAAmount,
      mintBAmount,
      startTime: new BN(0),
      feeConfig: feeConfigs[0],
      associatedOnly: false,
      ownerInfo: { useSOLBalance: true },
      txVersion: TxVersion.V0,
    });

    const { txId } = await execute({ sendAndConfirm: true });
    const poolId = extInfo.address.poolId.toString();

    console.log('✅ Pool created!', poolId);
    return { success: true, poolId, signature: txId };

  } catch (error: any) {
    console.error('❌ Raydium pool creation failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

async function executeFullPipeline(
  tokenMint: string
): Promise<{
  success: boolean;
  steps: Record<string, any>;
  poolId?: string;
  raydiumUrl?: string;
  error?: string;
}> {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🚀 AUTO-COMPLETE PIPELINE STARTING');
  console.log('Token:', tokenMint);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const steps: Record<string, any> = {};
  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const keeper = getKeeperKeypair();

  let mint: PublicKey;
  try {
    mint = new PublicKey(tokenMint);
  } catch {
    return { success: false, steps, error: 'Invalid mint address' };
  }

  // Get current state
  const [battleStatePDA] = getBattleStatePDA(mint);
  const battleStateAccount = await connection.getAccountInfo(battleStatePDA);

  if (!battleStateAccount) {
    return { success: false, steps, error: 'Battle state not found' };
  }

  const currentStatus = battleStateAccount.data[V1_OFFSET_BATTLE_STATUS];
  const solCollected = Number(battleStateAccount.data.readBigUInt64LE(V1_OFFSET_SOL_COLLECTED));
  const totalVolume = Number(battleStateAccount.data.readBigUInt64LE(V1_OFFSET_TOTAL_VOLUME));

  console.log('Current Status:', ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][currentStatus]);
  console.log('SOL Collected:', (solCollected / 1e9).toFixed(4));
  console.log('Total Volume:', (totalVolume / 1e9).toFixed(4));

  // Get opponent mint
  const opponentBytes = battleStateAccount.data.slice(V1_OFFSET_OPPONENT_MINT, V1_OFFSET_OPPONENT_MINT + 32);
  const opponentMint = new PublicKey(opponentBytes);
  const hasOpponent = !opponentMint.equals(PublicKey.default);

  console.log('Opponent:', hasOpponent ? opponentMint.toString() : 'None');

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Check Victory (if InBattle)
  // ─────────────────────────────────────────────────────────────────────────

  if (currentStatus === BattleStatus.InBattle) {
    // Verify conditions are met
    if (solCollected < TARGET_SOL || totalVolume < VICTORY_VOLUME_SOL) {
      return {
        success: false,
        steps,
        error: 'Victory conditions not met',
      };
    }

    const victoryResult = await checkVictory(connection, keeper, mint);
    steps.checkVictory = victoryResult;

    if (!victoryResult.success || !victoryResult.victory) {
      return { success: false, steps, error: 'Victory check failed' };
    }

    await sleep(2000); // Wait for state to update
  } else if (currentStatus !== BattleStatus.VictoryPending && currentStatus !== BattleStatus.Listed) {
    return { success: false, steps, error: `Cannot process token with status ${currentStatus}` };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Finalize Duel (if VictoryPending)
  // ─────────────────────────────────────────────────────────────────────────

  // Re-read status
  const stateAfterVictory = await connection.getAccountInfo(battleStatePDA);
  const statusAfterVictory = stateAfterVictory?.data[V1_OFFSET_BATTLE_STATUS] ?? currentStatus;

  if (statusAfterVictory === BattleStatus.VictoryPending) {
    if (!hasOpponent) {
      return { success: false, steps, error: 'No opponent found for finalize' };
    }

    const finalizeResult = await finalizeDuel(connection, keeper, mint, opponentMint);
    steps.finalizeDuel = finalizeResult;

    if (!finalizeResult.success) {
      return { success: false, steps, error: 'Finalize duel failed' };
    }

    await sleep(2000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Withdraw for Listing (if Listed)
  // ─────────────────────────────────────────────────────────────────────────

  const stateAfterFinalize = await connection.getAccountInfo(battleStatePDA);
  const statusAfterFinalize = stateAfterFinalize?.data[V1_OFFSET_BATTLE_STATUS] ?? statusAfterVictory;

  let solWithdrawn = 0;

  if (statusAfterFinalize === BattleStatus.Listed) {
    const withdrawResult = await withdrawForListing(connection, keeper, mint);
    steps.withdraw = withdrawResult;

    if (!withdrawResult.success) {
      return { success: false, steps, error: 'Withdraw failed' };
    }

    solWithdrawn = withdrawResult.solWithdrawn || 0;
    await sleep(2000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Create Raydium Pool
  // ─────────────────────────────────────────────────────────────────────────

  // Use withdrawn SOL amount, or estimate from state
  const solForPool = solWithdrawn > 0 ? solWithdrawn : (solCollected / 1e9);

  const poolResult = await createRaydiumPool(connection, keeper, mint, solForPool);
  steps.createPool = poolResult;

  if (!poolResult.success) {
    // Pool creation failed, but earlier steps succeeded
    // Update database with partial success
    await supabase.from('tokens').update({
      battle_status: BattleStatus.Listed,
      raydium_pool_error: poolResult.error,
    }).eq('mint', tokenMint);

    return { success: false, steps, error: 'Pool creation failed (token is Listed)' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUCCESS! Update database
  // ─────────────────────────────────────────────────────────────────────────

  const raydiumUrl = `https://raydium.io/swap/?inputMint=${tokenMint}&outputMint=sol&cluster=devnet`;

  // Update token in database
  await supabase.from('tokens').update({
    battle_status: BattleStatus.PoolCreated,
    raydium_pool_id: poolResult.poolId,
    raydium_url: raydiumUrl,
    listing_timestamp: new Date().toISOString(),
  }).eq('mint', tokenMint);

  // Add to winners table
  await supabase.from('winners').upsert({
    token_mint: tokenMint,
    pool_id: poolResult.poolId,
    raydium_url: raydiumUrl,
    sol_liquidity: solForPool,
    victory_timestamp: new Date().toISOString(),
  }, { onConflict: 'token_mint' });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎉 AUTO-COMPLETE PIPELINE SUCCESS!');
  console.log('Pool ID:', poolResult.poolId);
  console.log('Raydium URL:', raydiumUrl);
  console.log('═══════════════════════════════════════════════════════════════\n');

  return {
    success: true,
    steps,
    poolId: poolResult.poolId,
    raydiumUrl,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCAN FOR POTENTIAL WINNERS
// ═══════════════════════════════════════════════════════════════════════════

async function scanForWinners(): Promise<{
  scanned: number;
  potentialWinners: string[];
  processed: Array<{ mint: string; success: boolean; poolId?: string; error?: string }>;
}> {
  console.log('\n🔍 Scanning for potential winners...');

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // Get all InBattle tokens from database
  const { data: inBattleTokens, error } = await supabase
    .from('tokens')
    .select('mint, symbol')
    .eq('battle_status', BattleStatus.InBattle);

  if (error || !inBattleTokens) {
    console.log('No InBattle tokens found or error:', error?.message);
    return { scanned: 0, potentialWinners: [], processed: [] };
  }

  console.log(`Found ${inBattleTokens.length} tokens in battle`);

  const potentialWinners: string[] = [];
  const processed: Array<{ mint: string; success: boolean; poolId?: string; error?: string }> = [];

  for (const token of inBattleTokens) {
    try {
      const [battleStatePDA] = getBattleStatePDA(new PublicKey(token.mint));
      const account = await connection.getAccountInfo(battleStatePDA);

      if (!account) continue;

      const solCollected = Number(account.data.readBigUInt64LE(V1_OFFSET_SOL_COLLECTED));
      const totalVolume = Number(account.data.readBigUInt64LE(V1_OFFSET_TOTAL_VOLUME));

      // Check if victory conditions are met
      if (solCollected >= TARGET_SOL && totalVolume >= VICTORY_VOLUME_SOL) {
        console.log(`🏆 Winner found: ${token.symbol} (${token.mint.slice(0, 8)}...)`);
        potentialWinners.push(token.mint);

        // Execute full pipeline
        const result = await executeFullPipeline(token.mint);
        processed.push({
          mint: token.mint,
          success: result.success,
          poolId: result.poolId,
          error: result.error,
        });
      }
    } catch (err) {
      console.error(`Error checking ${token.mint}:`, err);
    }
  }

  return {
    scanned: inBattleTokens.length,
    potentialWinners,
    processed,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// API HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenMint } = body;

    if (!tokenMint) {
      return NextResponse.json({ error: 'Missing tokenMint' }, { status: 400 });
    }

    const result = await executeFullPipeline(tokenMint);

    return NextResponse.json({
      ...result,
      message: result.success
        ? '🎉 Full pipeline complete! Token listed on Raydium!'
        : `Pipeline stopped: ${result.error}`,
    });

  } catch (error) {
    console.error('Auto-complete error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await scanForWinners();

    return NextResponse.json({
      success: true,
      message: result.potentialWinners.length > 0
        ? `Found and processed ${result.potentialWinners.length} winner(s)!`
        : 'No winners found',
      ...result,
    });

  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}