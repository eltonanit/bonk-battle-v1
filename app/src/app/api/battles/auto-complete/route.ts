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
 * ⭐ FIX V6:
 * - CRITICAL: Read loser SOL BEFORE finalize_duel (was reading AFTER = wrong!)
 * - CRITICAL: Update loser's sol_collected to 50% remaining in database
 * - REMOVED: battle_end_timestamp (field doesn't exist in tokens table)
 * - REMOVED: winner_final_sol, loser_final_sol (fields don't exist in winners table)
 * - ADDED: spoils_transferred and finalize_signature to battles table
 * - Platform fee calculation fixed (5% of winner+spoils)
 * - Added plunder verification logging
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

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ VICTORY THRESHOLDS - MUST MATCH CONTRACT!
// ═══════════════════════════════════════════════════════════════════════════

// ⭐ Set this to match USE_TEST_TIER in smart contract!
const USE_TEST_TIER = false; // false = PRODUCTION (37.7 SOL), true = TEST (6 SOL)

const TEST_TARGET_SOL = 6_000_000_000; // 6 SOL
const TEST_VICTORY_VOLUME_SOL = 6_600_000_000; // 6.6 SOL

const PROD_TARGET_SOL = 37_700_000_000; // 37.7 SOL
const PROD_VICTORY_VOLUME_SOL = 41_500_000_000; // 41.5 SOL

const TARGET_SOL = USE_TEST_TIER ? TEST_TARGET_SOL : PROD_TARGET_SOL;
const VICTORY_VOLUME_SOL = USE_TEST_TIER ? TEST_VICTORY_VOLUME_SOL : PROD_VICTORY_VOLUME_SOL;
const SOL_THRESHOLD = Math.floor(TARGET_SOL * 995 / 1000); // 99.5%

// Fee constants (must match smart contract!)
const PLATFORM_FEE_BPS = 500; // 5%

console.log(`🎯 Victory Thresholds: SOL >= ${SOL_THRESHOLD / 1e9} SOL (99.5% of ${TARGET_SOL / 1e9}), Volume >= ${VICTORY_VOLUME_SOL / 1e9} SOL`);

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
  return mintAccount.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ Read battle state SOL values from on-chain
// ═══════════════════════════════════════════════════════════════════════════

async function readBattleStateSol(
  connection: Connection,
  mint: PublicKey
): Promise<{ solCollected: number; totalVolume: number; status: number } | null> {
  const [battleStatePDA] = getBattleStatePDA(mint);
  const account = await connection.getAccountInfo(battleStatePDA);

  if (!account) return null;

  return {
    solCollected: Number(account.data.readBigUInt64LE(V1_OFFSET_SOL_COLLECTED)) / 1e9,
    totalVolume: Number(account.data.readBigUInt64LE(V1_OFFSET_TOTAL_VOLUME)) / 1e9,
    status: account.data[V1_OFFSET_BATTLE_STATUS],
  };
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
): Promise<{ success: boolean; signature?: string; solWithdrawn?: number; error?: string; alreadyWithdrawn?: boolean }> {
  console.log('📤 Step 3: Withdrawing for listing...');

  const tokenProgramId = await getTokenProgramForMint(connection, mint);
  const [battleStatePDA] = getBattleStatePDA(mint);

  const battleStateAccount = await connection.getAccountInfo(battleStatePDA);
  const rent = await connection.getMinimumBalanceForRentExemption(battleStateAccount?.data.length || 200);
  const availableLamports = (battleStateAccount?.lamports || 0) - rent;
  const solInAccount = availableLamports / 1e9;

  if (availableLamports <= 0) {
    console.log('ℹ️ No SOL to withdraw - already withdrawn previously');
    return { success: true, solWithdrawn: 0, alreadyWithdrawn: true };
  }

  const contractTokenAccount = getAssociatedTokenAddressSync(mint, battleStatePDA, true, tokenProgramId);
  const keeperTokenAccount = getAssociatedTokenAddressSync(mint, keeper.publicKey, false, tokenProgramId);

  const keeperTokenAccountInfo = await connection.getAccountInfo(keeperTokenAccount);
  if (!keeperTokenAccountInfo) {
    console.log('Creating keeper token account...');
    const createATAIx = createAssociatedTokenAccountInstruction(
      keeper.publicKey, keeperTokenAccount, keeper.publicKey, mint, tokenProgramId, ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const ataTx = new Transaction({ feePayer: keeper.publicKey, blockhash, lastValidBlockHeight }).add(createATAIx);
    await sendAndConfirmTransaction(connection, ataTx, [keeper], { commitment: 'confirmed' });
    await sleep(2000);
  }

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
  const transaction = new Transaction({ feePayer: keeper.publicKey, blockhash, lastValidBlockHeight }).add(withdrawIx);

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [keeper], { commitment: 'confirmed' });
    console.log('✅ Withdrawal complete!', solInAccount.toFixed(4), 'SOL');
    return { success: true, signature, solWithdrawn: solInAccount };

  } catch (error: any) {
    if (error.message?.includes('0x1788') || error.message?.includes('6024') || error.message?.includes('NoLiquidityToWithdraw')) {
      console.log('ℹ️ Withdraw already done (NoLiquidityToWithdraw) - continuing to pool creation');
      return { success: true, solWithdrawn: 0, alreadyWithdrawn: true };
    }
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

    const tokenProgramId = await getTokenProgramForMint(connection, mint);
    const keeperTokenAccount = getAssociatedTokenAddressSync(mint, keeper.publicKey, false, tokenProgramId);

    const tokenAccountInfo = await connection.getAccountInfo(keeperTokenAccount);
    if (!tokenAccountInfo) {
      return { success: false, error: 'Keeper has no token account - tokens not withdrawn yet' };
    }

    const tokenBalance = await connection.getTokenAccountBalance(keeperTokenAccount);
    const tokenAmountRaw = tokenBalance.value.amount;

    if (tokenAmountRaw === '0' || !tokenAmountRaw) {
      return { success: false, error: 'Keeper has 0 tokens - check if pool already created or withdraw failed' };
    }

    const keeperBalance = await connection.getBalance(keeper.publicKey);
    const keeperSol = keeperBalance / 1e9;
    const actualSolAmount = solAmount > 0 ? solAmount : Math.min(keeperSol - 0.1, 7);

    if (actualSolAmount < 1) {
      return { success: false, error: `Keeper has insufficient SOL: ${keeperSol.toFixed(2)} SOL` };
    }

    console.log('SOL for pool:', actualSolAmount.toFixed(4));

    const solAmountBN = new BN(Math.floor(actualSolAmount * 1e9));
    const tokenAmountBN = new BN(tokenAmountRaw);

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

    console.log('mintA:', mintA.address.slice(0, 8) + '...', 'amount:', mintAAmount.toString());
    console.log('mintB:', mintB.address.slice(0, 8) + '...', 'amount:', mintBAmount.toString());

    const feeConfigs = await raydium.api.getCpmmConfigs();
    feeConfigs.forEach((config) => {
      config.id = getCpmmPdaAmmConfigId(DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, config.index).publicKey.toBase58();
    });

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
  plunderReport?: Record<string, any>;
}> {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🚀 AUTO-COMPLETE PIPELINE V6 STARTING');
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

  const [battleStatePDA] = getBattleStatePDA(mint);
  const battleStateAccount = await connection.getAccountInfo(battleStatePDA);

  if (!battleStateAccount) {
    return { success: false, steps, error: 'Battle state not found' };
  }

  const currentStatus = battleStateAccount.data[V1_OFFSET_BATTLE_STATUS];

  if (currentStatus < 0 || currentStatus > 5) {
    return { success: false, steps, error: `Invalid battle status: ${currentStatus}` };
  }

  if (currentStatus === BattleStatus.PoolCreated) {
    console.log('✅ Token already has pool created - nothing to do');
    return { success: true, steps: { alreadyComplete: true }, error: 'Pool already created' };
  }

  const solCollected = Number(battleStateAccount.data.readBigUInt64LE(V1_OFFSET_SOL_COLLECTED));
  const totalVolume = Number(battleStateAccount.data.readBigUInt64LE(V1_OFFSET_TOTAL_VOLUME));

  console.log('Current Status:', ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][currentStatus]);

  const opponentBytes = battleStateAccount.data.slice(V1_OFFSET_OPPONENT_MINT, V1_OFFSET_OPPONENT_MINT + 32);
  const opponentMint = new PublicKey(opponentBytes);
  const hasOpponent = !opponentMint.equals(PublicKey.default);

  console.log('Opponent:', hasOpponent ? opponentMint.toString() : 'None');

  // ⭐ STORE ORIGINAL VALUES (before any modifications!)
  const winnerSolBefore = solCollected / 1e9;
  const winnerVolumeBefore = totalVolume / 1e9;

  // ⭐ FIX V6: Read loser SOL BEFORE finalize_duel!
  let loserSolBefore = 0;
  if (hasOpponent) {
    const loserState = await readBattleStateSol(connection, opponentMint);
    if (loserState) {
      loserSolBefore = loserState.solCollected;
      console.log(`📊 Loser SOL BEFORE finalize: ${loserSolBefore.toFixed(4)} SOL`);
    }
  }

  // STEP 1: Check Victory (if InBattle)
  if (currentStatus === BattleStatus.InBattle) {
    if (solCollected < SOL_THRESHOLD || totalVolume < VICTORY_VOLUME_SOL) {
      return { success: false, steps, error: `Victory conditions not met` };
    }

    const victoryResult = await checkVictory(connection, keeper, mint);
    steps.checkVictory = victoryResult;

    if (!victoryResult.success || !victoryResult.victory) {
      return { success: false, steps, error: 'Victory check failed' };
    }

    await sleep(2000);
  } else if (currentStatus !== BattleStatus.VictoryPending && currentStatus !== BattleStatus.Listed) {
    return { success: false, steps, error: `Cannot process token with status ${currentStatus}` };
  }

  // STEP 2: Finalize Duel (if VictoryPending)
  const stateAfterVictory = await connection.getAccountInfo(battleStatePDA);
  const statusAfterVictory = stateAfterVictory?.data[V1_OFFSET_BATTLE_STATUS] ?? currentStatus;

  // ⭐ Calculate expected plunder values BEFORE finalize
  const expectedSpoils = loserSolBefore / 2; // 50% of loser
  const totalAfterPlunder = winnerSolBefore + expectedSpoils;
  const expectedPlatformFee = totalAfterPlunder * (PLATFORM_FEE_BPS / 10000); // 5%
  const expectedWinnerFinal = totalAfterPlunder - expectedPlatformFee;
  const expectedLoserFinal = loserSolBefore - expectedSpoils; // 50% remaining

  let finalizeSignature: string | undefined;

  if (statusAfterVictory === BattleStatus.VictoryPending) {
    if (!hasOpponent) {
      return { success: false, steps, error: 'No opponent found for finalize' };
    }

    console.log('\n💰 PLUNDER PREVIEW:');
    console.log(`   Winner SOL before: ${winnerSolBefore.toFixed(4)} SOL`);
    console.log(`   Loser SOL before:  ${loserSolBefore.toFixed(4)} SOL`);
    console.log(`   Expected spoils:   ${expectedSpoils.toFixed(4)} SOL (50%)`);
    console.log(`   Platform fee:      ${expectedPlatformFee.toFixed(4)} SOL (5%)`);
    console.log(`   Winner should get: ${expectedWinnerFinal.toFixed(4)} SOL`);
    console.log(`   Loser should keep: ${expectedLoserFinal.toFixed(4)} SOL\n`);

    const finalizeResult = await finalizeDuel(connection, keeper, mint, opponentMint);
    steps.finalizeDuel = finalizeResult;
    finalizeSignature = finalizeResult.signature;

    if (!finalizeResult.success) {
      return { success: false, steps, error: 'Finalize duel failed' };
    }

    // ⭐ VERIFY PLUNDER AFTER finalize_duel
    await sleep(2000);

    const winnerStateAfter = await readBattleStateSol(connection, mint);
    const loserStateAfter = await readBattleStateSol(connection, opponentMint);

    const actualWinnerFinal = winnerStateAfter?.solCollected || 0;
    const actualLoserFinal = loserStateAfter?.solCollected || 0;

    const winnerDiscrepancy = Math.abs(actualWinnerFinal - expectedWinnerFinal);
    const loserDiscrepancy = Math.abs(actualLoserFinal - expectedLoserFinal);
    const plunderCorrect = winnerDiscrepancy < 0.01 && loserDiscrepancy < 0.01;

    console.log('\n🔍 PLUNDER VERIFICATION:');
    console.log(`   Winner expected: ${expectedWinnerFinal.toFixed(4)} SOL | actual: ${actualWinnerFinal.toFixed(4)} SOL`);
    console.log(`   Loser expected:  ${expectedLoserFinal.toFixed(4)} SOL | actual: ${actualLoserFinal.toFixed(4)} SOL`);
    console.log(`   ${plunderCorrect ? '✅ PLUNDER CORRECT!' : '⚠️ DISCREPANCY DETECTED!'}\n`);

    steps.plunderVerification = {
      winnerBefore: winnerSolBefore,
      loserBefore: loserSolBefore,
      spoils: expectedSpoils,
      platformFee: expectedPlatformFee,
      winnerExpected: expectedWinnerFinal,
      loserExpected: expectedLoserFinal,
      winnerActual: actualWinnerFinal,
      loserActual: actualLoserFinal,
      correct: plunderCorrect,
    };

    // ⭐ FIX V6: Update loser with CORRECT remaining SOL (50%)
    const loserRemainingLamports = Math.floor(expectedLoserFinal * 1e9);

    console.log(`📝 Updating loser database: sol_collected = ${loserRemainingLamports} (${expectedLoserFinal.toFixed(4)} SOL)`);

    await supabase.from('tokens').update({
      battle_status: BattleStatus.Qualified,
      opponent_mint: null,
      sol_collected: loserRemainingLamports,  // ⭐ CRITICAL: Update SOL to 50%!
      // NOTE: battle_end_timestamp doesn't exist in tokens table
    }).eq('mint', opponentMint.toString());

    // ⭐ FIX V6: Update battles with spoils info
    await supabase.from('battles').update({
      status: 'completed',
      winner_mint: tokenMint,
      ended_at: new Date().toISOString(),
      spoils_transferred: expectedSpoils,  // ⭐ Add spoils amount
      finalize_signature: finalizeSignature,  // ⭐ Add signature
    }).or(`token_a_mint.eq.${tokenMint},token_b_mint.eq.${tokenMint}`);

    console.log('✅ Database updated: loser sol_collected and battles table');
  }

  // STEP 3: Withdraw for Listing
  const stateAfterFinalize = await connection.getAccountInfo(battleStatePDA);
  const statusAfterFinalize = stateAfterFinalize?.data[V1_OFFSET_BATTLE_STATUS] ?? statusAfterVictory;

  let solWithdrawn = 0;
  let withdrawSignature: string | undefined;

  if (statusAfterFinalize === BattleStatus.Listed) {
    const withdrawResult = await withdrawForListing(connection, keeper, mint);
    steps.withdraw = withdrawResult;
    withdrawSignature = withdrawResult.signature;

    if (!withdrawResult.success) {
      return { success: false, steps, error: 'Withdraw failed' };
    }

    solWithdrawn = withdrawResult.solWithdrawn || 0;
    await sleep(2000);
  }

  // STEP 4: Create Raydium Pool
  const solForPool = solWithdrawn > 0 ? solWithdrawn : expectedWinnerFinal;
  const poolResult = await createRaydiumPool(connection, keeper, mint, solForPool);
  steps.createPool = poolResult;

  if (!poolResult.success) {
    return { success: false, steps, error: 'Pool creation failed (token is Listed)' };
  }

  // SUCCESS! Update database
  const raydiumUrl = `https://raydium.io/swap/?inputMint=${tokenMint}&outputMint=sol&cluster=devnet`;

  // ⭐ FIX V6: listing_timestamp is bigint, use unix timestamp in ms
  const listingTimestamp = Date.now();

  await supabase.from('tokens').update({
    battle_status: BattleStatus.PoolCreated,
    raydium_pool_id: poolResult.poolId,
    raydium_url: raydiumUrl,
    listing_timestamp: listingTimestamp,
  }).eq('mint', tokenMint);

  // ═══════════════════════════════════════════════════════════════
  // ⭐ FIX V6: Fetch winner & loser data for winners table
  // ═══════════════════════════════════════════════════════════════

  const { data: winnerData } = await supabase
    .from('tokens')
    .select('name, symbol, image, creator_wallet')
    .eq('mint', tokenMint)
    .single();

  const { data: loserData } = await supabase
    .from('tokens')
    .select('mint, name, symbol, image')
    .eq('mint', opponentMint.toString())
    .single();

  // ⭐ FIX V6: Use pre-calculated values!
  const spoilsSol = expectedSpoils;
  const platformFeeSol = expectedPlatformFee;

  // Build plunder report for API response
  const plunderReport = {
    winnerSolBefore,
    loserSolBefore,
    spoilsSol,
    platformFeeSol,
    winnerFinalSol: expectedWinnerFinal,
    loserFinalSol: expectedLoserFinal,
    solToRaydiumPool: solWithdrawn > 0 ? solWithdrawn : expectedWinnerFinal,
  };

  // ⭐ FIX V6: Insert with CORRECT spoils values (removed non-existent fields)
  await supabase.from('winners').upsert({
    mint: tokenMint,
    name: winnerData?.name || 'Unknown',
    symbol: winnerData?.symbol || '???',
    image: winnerData?.image || null,
    loser_mint: opponentMint.toString(),
    loser_name: loserData?.name || 'Unknown',
    loser_symbol: loserData?.symbol || '???',
    loser_image: loserData?.image || null,
    final_sol_collected: winnerSolBefore,
    final_volume_sol: winnerVolumeBefore,
    final_mc_usd: 0,
    final_volume_usd: 0,
    spoils_sol: spoilsSol,
    platform_fee_sol: platformFeeSol,
    pool_id: poolResult.poolId,
    raydium_url: raydiumUrl,
    victory_timestamp: new Date().toISOString(),
    finalize_signature: finalizeSignature || null,
    withdraw_signature: withdrawSignature || null,
    pool_signature: poolResult.signature || null,
    status: 'pool_created',
    // NOTE: winner_final_sol and loser_final_sol don't exist in winners table
  }, { onConflict: 'mint' });

  console.log('✅ Winner record saved with CORRECT spoils data');
  console.log(`   Spoils: ${spoilsSol.toFixed(4)} SOL (50% of ${loserSolBefore.toFixed(4)})`);
  console.log(`   Platform fee: ${platformFeeSol.toFixed(4)} SOL (5% of ${totalAfterPlunder.toFixed(4)})`);

  // ═══════════════════════════════════════════════════════════════
  // ADD POINTS + CREATE NOTIFICATION FOR WINNER CREATOR
  // ═══════════════════════════════════════════════════════════════
  if (winnerData?.creator_wallet) {
    const creatorWallet = winnerData.creator_wallet;

    // 1. Get current user stats from user_points
    const { data: currentUser } = await supabase
      .from('user_points')
      .select('total_points, wins_count')
      .eq('wallet_address', creatorWallet)
      .single();

    const newTotal = (currentUser?.total_points || 0) + 10000;
    const newWins = (currentUser?.wins_count || 0) + 1;

    // 2. Update user_points with new total and wins count
    await supabase.from('user_points').upsert({
      wallet_address: creatorWallet,
      total_points: newTotal,
      wins_count: newWins,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'wallet_address' });

    // 3. Record in point_transactions for history
    await supabase.from('point_transactions').insert({
      wallet_address: creatorWallet,
      action: 'win_battle',
      points: 10000,
      metadata: {
        token_mint: tokenMint,
        token_symbol: winnerData.symbol || '???',
        token_image: winnerData.image || null,
        pool_id: poolResult.poolId,
        raydium_url: raydiumUrl,
      },
    });

    // 4. CREATE NOTIFICATION for the +10,000 points popup!
    // Using YOUR column names: user_wallet, data (not wallet_address, metadata)
    await supabase.from('notifications').insert({
      user_wallet: creatorWallet,
      type: 'points',
      title: 'Battle Victory!',
      message: `Your token $${winnerData.symbol || '???'} won the battle! +10,000 points`,
      read: false,
      data: {
        action: 'win_battle',
        points: 10000,
        token_mint: tokenMint,
        token_symbol: winnerData.symbol || '???',
        token_image: winnerData.image || null,
        pool_id: poolResult.poolId,
        raydium_url: raydiumUrl,
      },
    });

    console.log('+10,000 points awarded to:', creatorWallet.slice(0, 8) + '...');
    console.log('Notification created for victory!');
    console.log('Wins count updated to:', newWins);
  }

  // ⭐ Log victory to activity feed for popup!
  await supabase.from('activity_feed').insert({
    wallet: winnerData?.creator_wallet || 'system',
    action_type: 'victory',
    token_mint: tokenMint,
    token_symbol: winnerData?.symbol || '???',
    metadata: {
      pool_id: poolResult.poolId,
      raydium_url: raydiumUrl,
      loser_mint: opponentMint.toString(),
      loser_symbol: loserData?.symbol || '???',
      winner_image: winnerData?.image || null,
      spoils_sol: spoilsSol,
      platform_fee_sol: platformFeeSol,
    }
  });

  console.log('\n🎉 AUTO-COMPLETE PIPELINE V6 SUCCESS!');
  console.log('Pool ID:', poolResult.poolId);
  console.log('Plunder Report:', JSON.stringify(plunderReport, null, 2));

  return {
    success: true,
    steps,
    poolId: poolResult.poolId,
    raydiumUrl,
    plunderReport,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SCAN FOR POTENTIAL WINNERS
// ═══════════════════════════════════════════════════════════════════════════

async function scanForWinners(): Promise<{
  scanned: number;
  potentialWinners: string[];
  processed: Array<{ mint: string; success: boolean; poolId?: string; error?: string; plunderReport?: Record<string, any> }>;
}> {
  console.log('\n🔍 Scanning for potential winners...');

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  const { data: tokensToProcess, error } = await supabase
    .from('tokens')
    .select('mint, symbol, sol_collected, total_trade_volume, battle_status')
    .in('battle_status', [BattleStatus.InBattle, BattleStatus.VictoryPending, BattleStatus.Listed]);

  if (error || !tokensToProcess) {
    console.error('Error fetching tokens:', error);
    return { scanned: 0, potentialWinners: [], processed: [] };
  }

  const potentialWinners: string[] = [];
  const processed: Array<{ mint: string; success: boolean; poolId?: string; error?: string; plunderReport?: Record<string, any> }> = [];

  for (const token of tokensToProcess) {
    try {
      const [battleStatePDA] = getBattleStatePDA(new PublicKey(token.mint));
      const account = await connection.getAccountInfo(battleStatePDA);

      if (!account) continue;

      const chainStatus = account.data[V1_OFFSET_BATTLE_STATUS];
      if (chainStatus < 0 || chainStatus > 5) continue;

      // Handle Listed status (needs pool creation)
      if (chainStatus === BattleStatus.Listed) {
        const { data: existingWinner } = await supabase
          .from('winners')
          .select('pool_id')
          .eq('mint', token.mint)
          .single();

        if (existingWinner?.pool_id) continue;

        potentialWinners.push(token.mint);
        const result = await executeFullPipeline(token.mint);
        processed.push({
          mint: token.mint,
          success: result.success,
          poolId: result.poolId,
          error: result.error,
          plunderReport: result.plunderReport,
        });
        continue;
      }

      // Handle VictoryPending status (needs finalize + pool)
      if (chainStatus === BattleStatus.VictoryPending) {
        potentialWinners.push(token.mint);
        const result = await executeFullPipeline(token.mint);
        processed.push({
          mint: token.mint,
          success: result.success,
          poolId: result.poolId,
          error: result.error,
          plunderReport: result.plunderReport,
        });
        continue;
      }

      // Sync database status if different from chain
      if (chainStatus !== BattleStatus.InBattle && chainStatus !== token.battle_status) {
        await supabase.from('tokens').update({ battle_status: chainStatus }).eq('mint', token.mint);
        continue;
      }

      // Check if InBattle token meets victory conditions
      if (chainStatus === BattleStatus.InBattle) {
        const solCollected = Number(account.data.readBigUInt64LE(V1_OFFSET_SOL_COLLECTED));
        const totalVolume = Number(account.data.readBigUInt64LE(V1_OFFSET_TOTAL_VOLUME));

        if (solCollected >= SOL_THRESHOLD && totalVolume >= VICTORY_VOLUME_SOL) {
          potentialWinners.push(token.mint);
          const result = await executeFullPipeline(token.mint);
          processed.push({
            mint: token.mint,
            success: result.success,
            poolId: result.poolId,
            error: result.error,
            plunderReport: result.plunderReport,
          });
        }
      }
    } catch (err) {
      console.error(`Error checking ${token.mint}:`, err);
    }
  }

  return { scanned: tokensToProcess.length, potentialWinners, processed };
}

// ═══════════════════════════════════════════════════════════════════════════
// API HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  // ⭐ SECURITY: Verify authentication (NEW)
  if (!verifyAuth(request)) {
    console.log('❌ Unauthorized POST to auto-complete');
    return NextResponse.json({
      error: 'Unauthorized',
      message: 'Valid CRON_SECRET required'
    }, { status: 401 });
  }

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

export async function GET(request: NextRequest) {
  // ⭐ SECURITY: Verify authentication (NEW)
  if (!verifyAuth(request)) {
    console.log('❌ Unauthorized GET to auto-complete');
    return NextResponse.json({
      error: 'Unauthorized',
      message: 'Valid CRON_SECRET required'
    }, { status: 401 });
  }

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

export const maxDuration = 300; // 5 minutes for full pipeline