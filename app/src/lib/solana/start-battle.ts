/**
 * BONK BATTLE V2 - Start Battle Function
 * KEEPER ONLY: Requires KEEPER_AUTHORITY to sign
 * 
 * FIXED: Added price_oracle account required by deployed contract
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';

const BONK_BATTLE_PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');
const KEEPER_AUTHORITY = new PublicKey('753pndtcJx31bTXJNQPYvnesghXyQpBwTaYEACz7wQE3');
// Anchor discriminator for start_battle
const START_BATTLE_DISCRIMINATOR = Buffer.from([87, 12, 31, 196, 33, 191, 140, 147]);

// V2 ACCOUNT STRUCTURE OFFSETS
const OFFSET_TIER = 40;
const OFFSET_BATTLE_STATUS = 90;

export interface StartBattleResult {
  success: boolean;
  signature: string;
  tokenA: PublicKey;
  tokenB: PublicKey;
  error?: string;
}

function getBattleStatePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('battle_state'), mint.toBuffer()],
    BONK_BATTLE_PROGRAM_ID
  );
}

function getPriceOraclePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('price_oracle')],
    BONK_BATTLE_PROGRAM_ID
  );
}

function parseTokenState(data: Buffer): {
  tier: number;
  battleStatus: number;
  isActive: boolean;
} {
  return {
    tier: data[OFFSET_TIER],
    battleStatus: data[OFFSET_BATTLE_STATUS],
    isActive: data[89] === 1,
  };
}

/**
 * Start a battle between two tokens
 * KEEPER ONLY - requires keeper private key
 */
export async function startBattle(
  connection: Connection,
  keeperKeypair: Keypair,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): Promise<StartBattleResult> {
  console.log('⚔️ START BATTLE');
  console.log('Token A:', tokenAMint.toString());
  console.log('Token B:', tokenBMint.toString());

  // Verify keeper authority
  if (!keeperKeypair.publicKey.equals(KEEPER_AUTHORITY)) {
    return {
      success: false,
      signature: '',
      tokenA: tokenAMint,
      tokenB: tokenBMint,
      error: `Invalid keeper authority. Expected ${KEEPER_AUTHORITY.toString()}, got ${keeperKeypair.publicKey.toString()}`,
    };
  }

  // Cannot battle self
  if (tokenAMint.equals(tokenBMint)) {
    return {
      success: false,
      signature: '',
      tokenA: tokenAMint,
      tokenB: tokenBMint,
      error: 'Cannot battle against self',
    };
  }

  try {
    const [tokenAStatePDA] = getBattleStatePDA(tokenAMint);
    const [tokenBStatePDA] = getBattleStatePDA(tokenBMint);
    const [priceOraclePDA] = getPriceOraclePDA();

    console.log('Token A PDA:', tokenAStatePDA.toString());
    console.log('Token B PDA:', tokenBStatePDA.toString());
    console.log('Price Oracle PDA:', priceOraclePDA.toString());

    // Fetch all accounts
    const [tokenAInfo, tokenBInfo, priceOracleInfo] = await Promise.all([
      connection.getAccountInfo(tokenAStatePDA),
      connection.getAccountInfo(tokenBStatePDA),
      connection.getAccountInfo(priceOraclePDA),
    ]);

    if (!tokenAInfo) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: `Token A state not found on-chain` };
    }
    if (!tokenBInfo) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: `Token B state not found on-chain` };
    }
    if (!priceOracleInfo) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: `Price oracle not found on-chain` };
    }

    // Parse states with V2 offsets
    const stateA = parseTokenState(tokenAInfo.data as Buffer);
    const stateB = parseTokenState(tokenBInfo.data as Buffer);

    console.log('Token A state:', stateA);
    console.log('Token B state:', stateB);

    // Validate battle conditions
    if (stateA.battleStatus !== 1) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: `Token A not qualified (status: ${stateA.battleStatus})` };
    }
    if (stateB.battleStatus !== 1) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: `Token B not qualified (status: ${stateB.battleStatus})` };
    }
    if (stateA.tier !== stateB.tier) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: `Tier mismatch: A=${stateA.tier}, B=${stateB.tier}` };
    }
    if (!stateA.isActive || !stateB.isActive) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: 'One or both tokens are not active' };
    }

    // Build instruction with price_oracle
    // Account order must match the contract's StartBattle struct:
    // 1. token_a_state
    // 2. token_b_state
    // 3. price_oracle
    // 4. keeper_authority
    // 5. system_program
    const keys = [
      { pubkey: tokenAStatePDA, isSigner: false, isWritable: true },
      { pubkey: tokenBStatePDA, isSigner: false, isWritable: true },
      { pubkey: priceOraclePDA, isSigner: false, isWritable: false },
      { pubkey: keeperKeypair.publicKey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    const instruction = new TransactionInstruction({
      keys,
      programId: BONK_BATTLE_PROGRAM_ID,
      data: START_BATTLE_DISCRIMINATOR,
    });

    // Send transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: keeperKeypair.publicKey,
      blockhash,
      lastValidBlockHeight,
    }).add(instruction);

    console.log('📤 Sending start_battle transaction...');

    const signature = await connection.sendTransaction(transaction, [keeperKeypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('⏳ Confirming transaction:', signature);

    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    console.log('✅ BATTLE STARTED! Signature:', signature);
    console.log(`🔗 https://solscan.io/tx/${signature}?cluster=devnet`);

    return { success: true, signature, tokenA: tokenAMint, tokenB: tokenBMint };

  } catch (error) {
    console.error('❌ Start battle failed:', error);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;

      // Parse common Anchor errors
      if (errorMessage.includes('0x1770') || errorMessage.includes('NotQualified')) {
        errorMessage = 'Token not qualified for battle';
      } else if (errorMessage.includes('0x1771') || errorMessage.includes('AlreadyInBattle')) {
        errorMessage = 'Token already in battle';
      } else if (errorMessage.includes('0x1772') || errorMessage.includes('TierMismatch')) {
        errorMessage = 'Tokens must be same tier to battle';
      } else if (errorMessage.includes('0x1773') || errorMessage.includes('UnfairMatch')) {
        errorMessage = 'Market cap difference too large (unfair match)';
      } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('0x1774')) {
        errorMessage = 'Unauthorized: Only keeper can start battles';
      } else if (errorMessage.includes('AccountOwnedByWrongProgram')) {
        errorMessage = 'Account ownership mismatch - check price_oracle PDA';
      }
    }

    return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: errorMessage };
  }
}

/**
 * Check if two tokens can battle each other
 */
export async function canTokensBattle(
  connection: Connection,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): Promise<{ canBattle: boolean; reason?: string; details?: { tierA: number; tierB: number; statusA: number; statusB: number } }> {
  try {
    const [tokenAStatePDA] = getBattleStatePDA(tokenAMint);
    const [tokenBStatePDA] = getBattleStatePDA(tokenBMint);

    const [tokenAInfo, tokenBInfo] = await Promise.all([
      connection.getAccountInfo(tokenAStatePDA),
      connection.getAccountInfo(tokenBStatePDA),
    ]);

    if (!tokenAInfo || !tokenBInfo) {
      return { canBattle: false, reason: 'One or both tokens do not exist on-chain' };
    }

    // Parse with V2 offsets
    const stateA = parseTokenState(tokenAInfo.data as Buffer);
    const stateB = parseTokenState(tokenBInfo.data as Buffer);

    const details = {
      tierA: stateA.tier,
      tierB: stateB.tier,
      statusA: stateA.battleStatus,
      statusB: stateB.battleStatus,
    };

    console.log(`🔍 canTokensBattle check:`, details);

    // Check battle status (1 = Qualified)
    if (stateA.battleStatus !== 1) {
      return { canBattle: false, reason: `Token A not qualified (status: ${stateA.battleStatus})`, details };
    }
    if (stateB.battleStatus !== 1) {
      return { canBattle: false, reason: `Token B not qualified (status: ${stateB.battleStatus})`, details };
    }

    // Check same tier
    if (stateA.tier !== stateB.tier) {
      return { canBattle: false, reason: `Tier mismatch: Token A is tier ${stateA.tier}, Token B is tier ${stateB.tier}`, details };
    }

    // Check active
    if (!stateA.isActive || !stateB.isActive) {
      return { canBattle: false, reason: 'One or both tokens are not active', details };
    }

    return { canBattle: true, details };
  } catch (error) {
    return { canBattle: false, reason: `Error checking battle eligibility: ${error}` };
  }
}

export { getBattleStatePDA, BONK_BATTLE_PROGRAM_ID, KEEPER_AUTHORITY };