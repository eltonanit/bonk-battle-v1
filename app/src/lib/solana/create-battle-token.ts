// src/lib/solana/create-battle-token.ts
// BONK BATTLE V2 - Con supporto Tier
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
  Keypair,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BONK_BATTLE_PROGRAM_ID } from './constants';
import { getBattleStatePDA, getPriceOraclePDA } from './pdas';
import { RPC_ENDPOINT } from '@/config/solana';

/**
 * Discriminator for create_battle_token instruction
 * From IDL: [251, 0, 33, 123, 229, 128, 151, 242]
 */
const CREATE_BATTLE_TOKEN_DISCRIMINATOR = Buffer.from([
  251, 0, 33, 123, 229, 128, 151, 242
]);

/**
 * Battle Tier enum
 * Must match the on-chain Rust enum
 */
export enum BattleTier {
  Test = 0,        // Devnet testing - lower thresholds
  Production = 1,  // Mainnet - full thresholds
}

/**
 * Tier configuration details
 */
export const TIER_CONFIG = {
  [BattleTier.Test]: {
    name: 'Test',
    description: 'For testing on devnet',
    initialMcUsd: 280,
    victoryMcUsd: 5500,
    victoryVolumeUsd: 200,
    targetSol: 28,
  },
  [BattleTier.Production]: {
    name: 'Production',
    description: 'For mainnet battles',
    initialMcUsd: 1270,
    victoryMcUsd: 25000,
    victoryVolumeUsd: 20000,
    targetSol: 127,
  },
};

/**
 * Serializes a string with 4-byte length prefix (Rust String format)
 */
function serializeString(str: string): Buffer {
  const strBuf = Buffer.from(str, 'utf8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strBuf.length, 0);
  return Buffer.concat([lenBuf, strBuf]);
}

/**
 * Validates token metadata according to BONK BATTLE requirements
 */
function validateTokenMetadata(name: string, symbol: string, uri: string): void {
  if (!name || name.length < 1 || name.length > 50) {
    throw new Error('InvalidTokenName: must be 1-50 characters');
  }
  if (!symbol || symbol.length < 1 || symbol.length > 10) {
    throw new Error('InvalidTokenSymbol: must be 1-10 characters');
  }
  if (!uri || uri.length > 200) {
    throw new Error('InvalidTokenUri: must be <= 200 characters');
  }
}

/**
 * Validates tier value
 */
function validateTier(tier: number): void {
  if (tier !== 0 && tier !== 1) {
    throw new Error('InvalidTier: must be 0 (Test) or 1 (Production)');
  }
}

/**
 * Create Battle Token Response
 */
export interface CreateBattleTokenResult {
  /** Transaction signature */
  signature: string;
  /** The newly created token mint address */
  mint: PublicKey;
  /** The battle state PDA address */
  battleState: PublicKey;
  /** The mint keypair (useful for further operations) */
  mintKeypair: Keypair;
  /** The tier used for this token */
  tier: BattleTier;
}

/**
 * Creates a new BONK BATTLE token on-chain
 *
 * This function:
 * 1. Generates a new mint keypair
 * 2. Derives all necessary PDAs (battle_state, contract_token_account, price_oracle)
 * 3. Builds and sends the create_battle_token instruction
 * 4. Returns the transaction signature and mint details
 *
 * @param wallet - User's wallet public key (must be connected)
 * @param name - Token name (1-50 characters)
 * @param symbol - Token symbol (1-10 characters)
 * @param uri - Token metadata URI (max 200 characters)
 * @param signTransaction - Function to sign the transaction (from wallet adapter)
 * @param tier - Battle tier: 0 = Test (devnet), 1 = Production (mainnet)
 * @returns Promise resolving to transaction signature, mint, and battle state
 *
 * @throws Error if validation fails or transaction fails
 *
 * @example
 * ```typescript
 * const result = await createBattleToken(
 *   wallet.publicKey,
 *   'My Battle Token',
 *   'BATTLE',
 *   'https://arweave.net/...',
 *   wallet.signTransaction,
 *   BattleTier.Test  // or 0
 * );
 * console.log('Mint:', result.mint.toString());
 * console.log('Signature:', result.signature);
 * ```
 */
export async function createBattleToken(
  wallet: PublicKey,
  name: string,
  symbol: string,
  uri: string,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
  tier: number = BattleTier.Test  // Default: Test tier
): Promise<CreateBattleTokenResult> {
  console.log('🎮 Starting create battle token transaction...');
  console.log('📋 Token Details:');
  console.log('  Name:', name);
  console.log('  Symbol:', symbol);
  console.log('  URI:', uri);
  console.log('  Creator:', wallet.toString());
  console.log('  Tier:', tier === 0 ? '🧪 Test' : '🚀 Production');

  const tierConfig = TIER_CONFIG[tier as BattleTier];
  console.log('📊 Tier Config:');
  console.log('  Initial MC:', `$${tierConfig.initialMcUsd}`);
  console.log('  Victory MC:', `$${tierConfig.victoryMcUsd}`);
  console.log('  Victory Volume:', `$${tierConfig.victoryVolumeUsd}`);

  // Validate input
  try {
    validateTokenMetadata(name, symbol, uri);
    validateTier(tier);
  } catch (error) {
    console.error('❌ Validation error:', error);
    throw error;
  }

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  try {
    // ========================================================================
    // Step 1: Generate mint keypair
    // ========================================================================
    const mintKeypair = Keypair.generate();
    console.log('🔑 Generated mint keypair:', mintKeypair.publicKey.toString());

    // ========================================================================
    // Step 2: Derive PDAs
    // ========================================================================

    // Battle State PDA: seeds = ["battle_state", mint]
    const [battleStatePDA, battleStateBump] = getBattleStatePDA(mintKeypair.publicKey);
    console.log('📍 Battle State PDA:', battleStatePDA.toString(), `(bump: ${battleStateBump})`);

    // Contract Token Account (ATA of battle_state)
    // This is derived using the ATA program with seeds: [battle_state, token_program, mint]
    const [contractTokenAccount] = PublicKey.findProgramAddressSync(
      [
        battleStatePDA.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    console.log('📍 Contract Token Account:', contractTokenAccount.toString());

    // Price Oracle PDA: seeds = ["price_oracle"]
    const [priceOraclePDA, priceOracleBump] = getPriceOraclePDA();
    console.log('📍 Price Oracle PDA:', priceOraclePDA.toString(), `(bump: ${priceOracleBump})`);

    // ========================================================================
    // Step 3: Build instruction data (V2 - includes tier!)
    // ========================================================================
    const nameData = serializeString(name);
    const symbolData = serializeString(symbol);
    const uriData = serializeString(uri);
    const tierData = Buffer.from([tier]); // u8: 0 = Test, 1 = Production

    const instructionData = Buffer.concat([
      CREATE_BATTLE_TOKEN_DISCRIMINATOR,
      nameData,
      symbolData,
      uriData,
      tierData,  // NEW in V2!
    ]);

    console.log('📦 Instruction data size:', instructionData.length, 'bytes');

    // ========================================================================
    // Step 4: Build accounts array (order must match IDL)
    // ========================================================================
    const keys = [
      { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },      // mint
      { pubkey: battleStatePDA, isSigner: false, isWritable: true },            // token_battle_state
      { pubkey: contractTokenAccount, isSigner: false, isWritable: true },      // contract_token_account
      { pubkey: priceOraclePDA, isSigner: false, isWritable: false },           // price_oracle
      { pubkey: wallet, isSigner: true, isWritable: true },                     // user
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },  // system_program
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },         // token_program
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // associated_token_program
    ];

    const createInstruction = new TransactionInstruction({
      keys,
      programId: BONK_BATTLE_PROGRAM_ID,
      data: instructionData,
    });

    console.log('✅ Create instruction built');

    // ========================================================================
    // Step 5: Build transaction with compute budget
    // ========================================================================
    const instructions = [];

    // Add compute budget (token creation is compute-intensive)
    instructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 })
    );
    console.log('✅ Added compute budget (500k units)');

    // Add create instruction
    instructions.push(createInstruction);

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
    // Step 6: Sign transaction with both wallet and mint keypair
    // ========================================================================
    console.log('📤 Requesting signature from wallet...');

    // First, sign with mint keypair
    transaction.sign([mintKeypair]);
    console.log('✅ Transaction signed with mint keypair');

    // Then, sign with wallet (this will be done by wallet adapter)
    const signedTx = await signTransaction(transaction);
    console.log('✅ Transaction signed with wallet!');

    // ========================================================================
    // Step 7: Send transaction
    // ========================================================================
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
    console.log('🔗 Token Mint:', `https://solscan.io/token/${mintKeypair.publicKey.toString()}?cluster=devnet`);

    // ========================================================================
    // Step 8: Wait for confirmation
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
    console.log('🎮 Battle token created successfully!');
    console.log(`⚔️ Tier: ${tier === 0 ? 'Test' : 'Production'}`);

    return {
      signature,
      mint: mintKeypair.publicKey,
      battleState: battleStatePDA,
      mintKeypair,
      tier: tier as BattleTier,
    };

  } catch (error: unknown) {
    console.error('❌ Create battle token error:', error);

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
      throw new Error('Transaction already processed - token may have been created');
    }

    // User cancelled
    if (errorMessage.includes('User rejected')) {
      throw new Error('Transaction cancelled by user');
    }

    // BONK BATTLE specific errors (from IDL V2)
    if (errorMessage.includes('0x1770')) { // 6000
      throw new Error('Invalid token name: must be 1-50 characters');
    } else if (errorMessage.includes('0x1771')) { // 6001
      throw new Error('Invalid token symbol: must be 1-10 characters');
    } else if (errorMessage.includes('0x1772')) { // 6002
      throw new Error('Invalid token URI: must be <= 200 characters');
    } else if (errorMessage.includes('0x1773')) { // 6003
      throw new Error('Invalid tier: must be 0 (Test) or 1 (Production)');
    } else if (errorMessage.includes('0x1774')) { // 6004
      throw new Error('Tier mismatch: both tokens must be same tier');
    } else if (errorMessage.includes('0x1785')) { // 6021
      throw new Error('Unauthorized: invalid keeper authority');
    } else if (errorMessage.includes('custom program error')) {
      const errorCode = errorMessage.match(/0x[0-9a-fA-F]+/)?.[0];
      throw new Error(`Program error ${errorCode}. Check Solscan for details.`);
    }

    // Re-throw original error if not handled
    throw error;
  }
}

/**
 * Helper function to estimate rent for battle token creation
 *
 * @param connection - Solana connection
 * @returns Estimated rent in SOL
 */
export async function estimateCreateBattleTokenRent(
  connection: Connection
): Promise<number> {
  // Battle State account size V2 (with new fields)
  const BATTLE_STATE_SIZE = 8 + 32 + 1 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 54 + 14 + 204; // ~400 bytes
  const rentExemption = await connection.getMinimumBalanceForRentExemption(BATTLE_STATE_SIZE);

  // Add mint account rent + ATA rent + buffer
  const totalRent = rentExemption + 0.002 * 1e9 + 0.002 * 1e9; // ~0.006 SOL

  return totalRent / 1e9;
}