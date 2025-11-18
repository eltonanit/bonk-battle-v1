// src/lib/solana/sell-token.ts
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
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { BONK_BATTLE_PROGRAM_ID } from './constants';
import { getBattleStatePDA, getPriceOraclePDA } from './pdas';
import { RPC_ENDPOINT } from '@/config/solana';

/**
 * Discriminator for sell_token instruction
 * From IDL: [109, 61, 40, 187, 230, 176, 135, 174]
 */
const SELL_TOKEN_DISCRIMINATOR = Buffer.from([
  109, 61, 40, 187, 230, 176, 135, 174
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
 * Sell Token Result
 */
export interface SellTokenResult {
  /** Transaction signature */
  signature: string;
  /** Amount of tokens sold (raw amount with decimals) */
  tokenAmount: number;
  /** Estimated SOL received (actual amount determined by bonding curve) */
  estimatedSol?: number;
}

/**
 * Sells tokens back to the BONK BATTLE bonding curve
 *
 * This function:
 * 1. Derives all necessary PDAs (battle_state, user_token_account, price_oracle)
 * 2. Checks user's token balance
 * 3. Builds the sell_token instruction with token amount
 * 4. Burns tokens and transfers SOL back to user
 *
 * The actual SOL received is calculated by the bonding curve formula on-chain
 * based on current supply and virtual reserves. A 2% platform fee is deducted.
 *
 * @param wallet - User's wallet public key (must be connected)
 * @param mint - Token mint address to sell
 * @param tokenAmount - Amount of tokens to sell (in token units with decimals, e.g., 1000000 for 1 token with 6 decimals)
 * @param signTransaction - Function to sign the transaction (from wallet adapter)
 * @returns Promise resolving to transaction signature and amounts
 *
 * @throws Error if insufficient token balance, trading inactive, or transaction fails
 *
 * @example
 * ```typescript
 * const result = await sellToken(
 *   wallet.publicKey,
 *   new PublicKey('mint-address'),
 *   1_000_000, // 1 token (6 decimals)
 *   wallet.signTransaction
 * );
 * console.log('Signature:', result.signature);
 * console.log('Tokens sold:', result.tokenAmount);
 * ```
 */
export async function sellToken(
  wallet: PublicKey,
  mint: PublicKey,
  tokenAmount: number,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<SellTokenResult> {
  console.log('💸 Starting sell token transaction...');
  console.log('📋 Sell Details:');
  console.log('  Wallet:', wallet.toString());
  console.log('  Token Mint:', mint.toString());
  console.log('  Token Amount:', tokenAmount);

  // Validate input
  if (tokenAmount <= 0) {
    throw new Error('Token amount must be greater than 0');
  }

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  try {
    // ========================================================================
    // Step 1: Check user's token balance
    // ========================================================================
    const userTokenAccount = getAssociatedTokenAddressSync(
      mint,
      wallet,
      false
    );

    const userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
    if (!userTokenAccountInfo) {
      throw new Error('You do not own any of these tokens. Token account not found.');
    }

    // Parse token account to get balance (simplified - should use proper parsing)
    // Token account structure: [... 64 bytes, then amount as u64 at offset 64]
    const tokenAccountData = userTokenAccountInfo.data;
    if (tokenAccountData.length < 72) {
      throw new Error('Invalid token account data');
    }

    // Read amount (u64 little-endian at offset 64)
    let userTokenBalance = 0n;
    for (let i = 0; i < 8; i++) {
      userTokenBalance |= BigInt(tokenAccountData[64 + i]) << BigInt(i * 8);
    }

    console.log('💰 User token balance:', userTokenBalance.toString());

    if (userTokenBalance < BigInt(tokenAmount)) {
      throw new Error(
        `Insufficient token balance. Have ${userTokenBalance.toString()}, trying to sell ${tokenAmount}`
      );
    }

    console.log('✅ Balance check passed');

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

    // User Token Account (already fetched above)
    console.log('📍 User Token Account:', userTokenAccount.toString());

    // Price Oracle PDA: seeds = ["price_oracle"]
    const [priceOraclePDA] = getPriceOraclePDA();
    console.log('📍 Price Oracle PDA:', priceOraclePDA.toString());

    // ========================================================================
    // Step 3: Build instruction data
    // ========================================================================
    const tokenAmountData = serializeU64(tokenAmount);

    const instructionData = Buffer.concat([
      SELL_TOKEN_DISCRIMINATOR,
      tokenAmountData,
    ]);

    console.log('📦 Instruction data size:', instructionData.length, 'bytes');
    console.log('📦 Token amount:', tokenAmount);

    // ========================================================================
    // Step 4: Build accounts array (order must match IDL)
    // ========================================================================
    const keys = [
      { pubkey: battleStatePDA, isSigner: false, isWritable: true },          // token_battle_state
      { pubkey: mint, isSigner: false, isWritable: true },                    // mint
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },        // user_token_account
      { pubkey: priceOraclePDA, isSigner: false, isWritable: false },         // price_oracle
      { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true },         // treasury_wallet
      { pubkey: wallet, isSigner: true, isWritable: true },                   // user
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },// system_program
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },       // token_program
    ];

    const sellInstruction = new TransactionInstruction({
      keys,
      programId: BONK_BATTLE_PROGRAM_ID,
      data: instructionData,
    });

    console.log('✅ Sell instruction built');

    // ========================================================================
    // Step 5: Build transaction with compute budget
    // ========================================================================
    const instructions = [];

    // Add compute budget (selling involves bonding curve calculations)
    instructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
    );
    console.log('✅ Added compute budget (400k units)');

    // Add sell instruction
    instructions.push(sellInstruction);

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
    console.log('💸 Tokens sold successfully!');

    return {
      signature,
      tokenAmount,
    };

  } catch (error: unknown) {
    console.error('❌ Sell token error:', error);

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
        tokenAmount,
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
    } else if (errorMessage.includes('0x1778')) { // 6008
      throw new Error('Insufficient liquidity in pool');
    } else if (errorMessage.includes('0x1779')) { // 6009
      throw new Error('Insufficient token balance');
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
 * Helper function to estimate SOL received for selling tokens
 *
 * NOTE: This is a client-side estimation. Actual amount is calculated on-chain
 * by the bonding curve and may differ slightly. Also accounts for 2% platform fee.
 *
 * @param connection - Solana connection
 * @param mint - Token mint address
 * @param tokenAmount - Amount of tokens to sell
 * @returns Estimated SOL to receive (after fees)
 */
export async function estimateSolReceived(
  connection: Connection,
  mint: PublicKey,
  tokenAmount: number
): Promise<number> {
  try {
    const [battleStatePDA] = getBattleStatePDA(mint);
    const battleStateInfo = await connection.getAccountInfo(battleStatePDA);

    if (!battleStateInfo) {
      throw new Error('Token not found');
    }

    // TODO: Parse battle state and calculate based on bonding curve formula
    // For now, return a placeholder
    console.warn('SOL estimation not yet implemented - using placeholder');
    return 0;

  } catch (error) {
    console.error('Error estimating SOL:', error);
    return 0;
  }
}

/**
 * Helper function to get user's token balance
 *
 * @param connection - Solana connection
 * @param wallet - User's wallet public key
 * @param mint - Token mint address
 * @returns Token balance (raw amount with decimals)
 */
export async function getUserTokenBalance(
  connection: Connection,
  wallet: PublicKey,
  mint: PublicKey
): Promise<number> {
  try {
    const userTokenAccount = getAssociatedTokenAddressSync(mint, wallet, false);
    const accountInfo = await connection.getAccountInfo(userTokenAccount);

    if (!accountInfo) {
      return 0;
    }

    // Parse amount from token account data (u64 at offset 64)
    const data = accountInfo.data;
    if (data.length < 72) {
      return 0;
    }

    let balance = 0n;
    for (let i = 0; i < 8; i++) {
      balance |= BigInt(data[64 + i]) << BigInt(i * 8);
    }

    return Number(balance);

  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
}
