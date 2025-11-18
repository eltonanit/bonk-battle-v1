// src/lib/solana/buy-token.ts
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { BONK_BATTLE_PROGRAM_ID } from './constants';
import { getBattleStatePDA, getPriceOraclePDA } from './pdas';
import { RPC_ENDPOINT } from '@/config/solana';

/**
 * Discriminator for buy_token instruction
 * From IDL: [138, 127, 14, 91, 38, 87, 115, 105]
 */
const BUY_TOKEN_DISCRIMINATOR = Buffer.from([
  138, 127, 14, 91, 38, 87, 115, 105
]);

/**
 * Treasury wallet address (hardcoded in smart contract)
 */
const TREASURY_WALLET = new PublicKey('5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf');

/**
 * Serializes a u64 value to little-endian bytes
 */
function serializeU64(value: number): Buffer {
  const buf = Buffer.alloc(8);
  const bigValue = BigInt(Math.floor(value));

  for (let i = 0; i < 8; i++) {
    buf[i] = Number((bigValue >> BigInt(i * 8)) & BigInt(0xff));
  }

  return buf;
}

/**
 * Buy Token Result
 */
export interface BuyTokenResult {
  /** Transaction signature */
  signature: string;
  /** Amount of SOL spent (in lamports) */
  solAmount: number;
  /** Estimated tokens received (actual amount determined by bonding curve) */
  estimatedTokens?: number;
}

/**
 * Buys tokens from the BONK BATTLE bonding curve
 *
 * This function:
 * 1. Derives all necessary PDAs (battle_state, contract_token_account, user_token_account, price_oracle)
 * 2. Builds the buy_token instruction with SOL amount
 * 3. Creates user's token account if needed (init_if_needed)
 * 4. Executes the transaction and transfers tokens to user
 *
 * The actual number of tokens received is calculated by the bonding curve formula on-chain
 * based on current supply and virtual reserves.
 *
 * @param wallet - User's wallet public key (must be connected)
 * @param mint - Token mint address to buy
 * @param solAmount - Amount of SOL to spend (in SOL, e.g., 0.1 for 0.1 SOL)
 * @param signTransaction - Function to sign the transaction (from wallet adapter)
 * @returns Promise resolving to transaction signature and amounts
 *
 * @throws Error if validation fails, insufficient balance, or transaction fails
 *
 * @example
 * ```typescript
 * const result = await buyToken(
 *   wallet.publicKey,
 *   new PublicKey('mint-address'),
 *   0.1, // 0.1 SOL
 *   wallet.signTransaction
 * );
 * console.log('Signature:', result.signature);
 * console.log('Spent:', result.solAmount / 1e9, 'SOL');
 * ```
 */
export async function buyToken(
  wallet: PublicKey,
  mint: PublicKey,
  solAmount: number,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<BuyTokenResult> {
  console.log('💰 Starting buy token transaction...');
  console.log('📋 Buy Details:');
  console.log('  Wallet:', wallet.toString());
  console.log('  Token Mint:', mint.toString());
  console.log('  SOL Amount:', solAmount, 'SOL');

  // Validate input
  if (solAmount <= 0) {
    throw new Error('SOL amount must be greater than 0');
  }

  if (solAmount < 0.001) {
    throw new Error('Minimum buy amount is 0.001 SOL');
  }

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const lamports = Math.floor(solAmount * 1e9);

  try {
    // ========================================================================
    // Step 1: Check user balance
    // ========================================================================
    const userBalance = await connection.getBalance(wallet);
    const requiredBalance = lamports + 0.01 * 1e9; // SOL amount + buffer for fees

    if (userBalance < requiredBalance) {
      throw new Error(
        `Insufficient balance. Have ${userBalance / 1e9} SOL, need ${requiredBalance / 1e9} SOL`
      );
    }

    console.log('✅ Balance check passed:', userBalance / 1e9, 'SOL available');

    // ========================================================================
    // Step 2: Derive PDAs
    // ========================================================================

    // Battle State PDA: seeds = ["battle_state", mint]
    const [battleStatePDA] = getBattleStatePDA(mint);
    console.log('📍 Battle State PDA:', battleStatePDA.toString());

    // Check if battle state exists
    const battleStateInfo = await connection.getAccountInfo(battleStatePDA);
    if (!battleStateInfo) {
      throw new Error('Token not found. Battle state does not exist for this mint.');
    }

    // Contract Token Account (ATA of battle_state)
    const [contractTokenAccount] = PublicKey.findProgramAddressSync(
      [
        battleStatePDA.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log('📍 Contract Token Account:', contractTokenAccount.toString());

    // User Token Account (ATA of user)
    const userTokenAccount = getAssociatedTokenAddressSync(
      mint,
      wallet,
      false // allowOwnerOffCurve
    );
    console.log('📍 User Token Account:', userTokenAccount.toString());

    // Price Oracle PDA: seeds = ["price_oracle"]
    const [priceOraclePDA] = getPriceOraclePDA();
    console.log('📍 Price Oracle PDA:', priceOraclePDA.toString());

    // ========================================================================
    // Step 3: Build instruction data
    // ========================================================================
    const solAmountData = serializeU64(lamports);

    const instructionData = Buffer.concat([
      BUY_TOKEN_DISCRIMINATOR,
      solAmountData,
    ]);

    console.log('📦 Instruction data size:', instructionData.length, 'bytes');
    console.log('📦 SOL amount (lamports):', lamports);

    // ========================================================================
    // Step 4: Build accounts array (order must match IDL)
    // ========================================================================
    const keys = [
      { pubkey: battleStatePDA, isSigner: false, isWritable: true },          // token_battle_state
      { pubkey: mint, isSigner: false, isWritable: true },                    // mint
      { pubkey: contractTokenAccount, isSigner: false, isWritable: true },    // contract_token_account
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },        // user_token_account
      { pubkey: priceOraclePDA, isSigner: false, isWritable: false },         // price_oracle
      { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true },         // treasury_wallet
      { pubkey: wallet, isSigner: true, isWritable: true },                   // user
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },// system_program
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },       // token_program
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // associated_token_program
    ];

    const buyInstruction = new TransactionInstruction({
      keys,
      programId: BONK_BATTLE_PROGRAM_ID,
      data: instructionData,
    });

    console.log('✅ Buy instruction built');

    // ========================================================================
    // Step 5: Build transaction with compute budget
    // ========================================================================
    const instructions = [];

    // Add compute budget (buying involves bonding curve calculations)
    instructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
    );
    console.log('✅ Added compute budget (400k units)');

    // Add buy instruction
    instructions.push(buyInstruction);

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

    // Build versioned transaction
    const messageV0 = new TransactionMessage({
      payerKey: wallet,
      recentBlockhash: blockhash,
      instructions: instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    // ========================================================================
    // Step 6: Sign and send transaction
    // ========================================================================
    console.log('📤 Requesting signature from wallet...');

    const signedTx = await signTransaction(transaction);
    console.log('✅ Transaction signed!');

    console.log('📤 Sending transaction to RPC...');

    const rawTransaction = signedTx.serialize();
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });

    console.log('✅ Transaction sent!');
    console.log('📝 Signature:', signature);
    console.log('🔗 Solscan:', `https://solscan.io/tx/${signature}?cluster=devnet`);

    // ========================================================================
    // Step 7: Wait for confirmation
    // ========================================================================
    console.log('⏳ Waiting for confirmation...');

    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed');

    if (confirmation.value.err) {
      console.error('❌ Transaction failed:', confirmation.value.err);
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('✅ Transaction confirmed!');
    console.log('💰 Tokens purchased successfully!');

    return {
      signature,
      solAmount: lamports,
    };

  } catch (error: unknown) {
    console.error('❌ Buy token error:', error);

    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : '';
    const errorLogs = (error && typeof error === 'object' && 'logs' in error)
      ? (error as { logs?: string[] }).logs
      : undefined;

    if (errorLogs) {
      console.error('📋 Program logs:', errorLogs);
    }

    // Handle "already processed" (success case)
    if (errorMessage.includes('already been processed')) {
      console.log('✅ Transaction was already processed successfully!');
      return {
        signature: 'already_processed_success',
        solAmount: lamports,
      };
    }

    // User cancelled
    if (errorMessage.includes('User rejected')) {
      throw new Error('Transaction cancelled by user');
    }

    // BONK BATTLE specific errors (from IDL)
    if (errorMessage.includes('0x1773')) { // 6003
      throw new Error('Amount too small: minimum transaction required');
    } else if (errorMessage.includes('0x1774')) { // 6004
      throw new Error('Amount too large: maximum transaction exceeded');
    } else if (errorMessage.includes('0x1775')) { // 6005
      throw new Error('Trading is inactive for this token');
    } else if (errorMessage.includes('0x1776')) { // 6006
      throw new Error('Insufficient output from bonding curve');
    } else if (errorMessage.includes('0x1777')) { // 6007
      throw new Error('Exceeds available token supply');
    } else if (errorMessage.includes('0x1778')) { // 6008
      throw new Error('Insufficient liquidity in pool');
    } else if (errorMessage.includes('0x1781')) { // 6017
      throw new Error('Invalid treasury wallet address');
    } else if (errorMessage.includes('0x1783')) { // 6019
      throw new Error('Mathematical overflow in calculation');
    } else if (errorMessage.includes('0x1784')) { // 6020
      throw new Error('Invalid bonding curve state');
    } else if (errorMessage.includes('custom program error')) {
      const errorCode = errorMessage.match(/0x[0-9a-fA-F]+/)?.[0];
      throw new Error(`Program error ${errorCode}. Check Solscan for details.`);
    }

    // Re-throw original error if not handled
    throw error;
  }
}

/**
 * Helper function to estimate tokens received for a given SOL amount
 *
 * NOTE: This is a client-side estimation. Actual amount is calculated on-chain
 * by the bonding curve and may differ slightly.
 *
 * @param connection - Solana connection
 * @param mint - Token mint address
 * @param solAmount - Amount of SOL to spend (in SOL)
 * @returns Estimated tokens to receive
 */
export async function estimateTokensReceived(
  connection: Connection,
  mint: PublicKey,
  solAmount: number
): Promise<number> {
  try {
    const [battleStatePDA] = getBattleStatePDA(mint);
    const battleStateInfo = await connection.getAccountInfo(battleStatePDA);

    if (!battleStateInfo) {
      throw new Error('Token not found');
    }

    // TODO: Parse battle state and calculate based on bonding curve formula
    // For now, return a placeholder
    console.warn('Token estimation not yet implemented - using placeholder');
    return 0;

  } catch (error) {
    console.error('Error estimating tokens:', error);
    return 0;
  }
}
