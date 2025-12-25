/**
 * BONK BATTLE V1 - Start Battle Function
 * KEEPER ONLY: Requires KEEPER_AUTHORITY to sign
 * 
 * ⚠️ FIXED: Uses V1 struct offsets matching deployed contract
 * The deployed contract does NOT have tier field!
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';
import { getSolscanUrl, BONK_BATTLE_PROGRAM_ID } from './constants';
const KEEPER_AUTHORITY = new PublicKey('65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea');
// Anchor discriminator for start_battle
const START_BATTLE_DISCRIMINATOR = Buffer.from([87, 12, 31, 196, 33, 191, 140, 147]);

// ═══════════════════════════════════════════════════════════════════════════
// V1 ACCOUNT STRUCTURE OFFSETS (DEPLOYED CONTRACT)
// ═══════════════════════════════════════════════════════════════════════════
// pub struct TokenBattleState {
//     pub mint: Pubkey,                    // 32 bytes (offset 8-40)
//     pub sol_collected: u64,              // 8 bytes  (offset 40-48)
//     pub tokens_sold: u64,                // 8 bytes  (offset 48-56)
//     pub total_trade_volume: u64,         // 8 bytes  (offset 56-64)
//     pub is_active: bool,                 // 1 byte   (offset 64)
//     pub battle_status: BattleStatus,     // 1 byte   (offset 65)
//     pub opponent_mint: Pubkey,           // 32 bytes (offset 66-98)
//     ... timestamps and strings follow
// }
// ═══════════════════════════════════════════════════════════════════════════

const OFFSET_IS_ACTIVE = 64;      // V1: is_active at offset 64
const OFFSET_BATTLE_STATUS = 65;  // V1: battle_status at offset 65

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

// Note: StartBattle does NOT require price_oracle account

/**
 * Parse V1 token state from account data
 * V1 does NOT have tier field - all tokens are implicitly TEST tier
 */
function parseTokenStateV1(data: Buffer): {
  battleStatus: number;
  isActive: boolean;
} {
  // Skip 8-byte discriminator
  const isActive = data[OFFSET_IS_ACTIVE] === 1;
  const battleStatus = data[OFFSET_BATTLE_STATUS];

  return {
    battleStatus,
    isActive,
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
  console.log('⚔️ START BATTLE (V1)');
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

    console.log('Token A PDA:', tokenAStatePDA.toString());
    console.log('Token B PDA:', tokenBStatePDA.toString());

    // Fetch token accounts (StartBattle does NOT require price_oracle)
    const [tokenAInfo, tokenBInfo] = await Promise.all([
      connection.getAccountInfo(tokenAStatePDA),
      connection.getAccountInfo(tokenBStatePDA),
    ]);

    if (!tokenAInfo) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: `Token A state not found on-chain` };
    }
    if (!tokenBInfo) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: `Token B state not found on-chain` };
    }

    // Parse states with V1 offsets
    const stateA = parseTokenStateV1(tokenAInfo.data as Buffer);
    const stateB = parseTokenStateV1(tokenBInfo.data as Buffer);

    console.log('Token A state (V1):', stateA);
    console.log('Token B state (V1):', stateB);

    // Validate battle conditions
    // BattleStatus: 0=Created, 1=Qualified, 2=InBattle, 3=VictoryPending, 4=Won, 5=Lost
    if (stateA.battleStatus !== 1) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: `Token A not qualified (status: ${stateA.battleStatus})` };
    }
    if (stateB.battleStatus !== 1) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: `Token B not qualified (status: ${stateB.battleStatus})` };
    }
    // V1: No tier check needed - all tokens are same tier (TEST)
    if (!stateA.isActive || !stateB.isActive) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: 'One or both tokens are not active' };
    }

    // Build instruction - NO price_oracle needed for StartBattle!
    // Account order must match the contract's StartBattle struct:
    // 1. token_a_state (writable)
    // 2. token_b_state (writable)
    // 3. keeper_authority (signer)
    // 4. system_program
    const keys = [
      { pubkey: tokenAStatePDA, isSigner: false, isWritable: true },
      { pubkey: tokenBStatePDA, isSigner: false, isWritable: true },
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
    console.log('🔗', getSolscanUrl('tx', signature));

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
        errorMessage = 'Account ownership mismatch - check PDA derivation';
      }
    }

    return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: errorMessage };
  }
}

/**
 * Check if two tokens can battle each other (V1 version)
 */
export async function canTokensBattle(
  connection: Connection,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): Promise<{ canBattle: boolean; reason?: string; details?: { statusA: number; statusB: number; activeA: boolean; activeB: boolean } }> {
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

    // Parse with V1 offsets
    const stateA = parseTokenStateV1(tokenAInfo.data as Buffer);
    const stateB = parseTokenStateV1(tokenBInfo.data as Buffer);

    const details = {
      statusA: stateA.battleStatus,
      statusB: stateB.battleStatus,
      activeA: stateA.isActive,
      activeB: stateB.isActive,
    };

    console.log(`🔍 canTokensBattle V1 check:`, details);

    // Check battle status (1 = Qualified)
    if (stateA.battleStatus !== 1) {
      return { canBattle: false, reason: `Token A not qualified (status: ${stateA.battleStatus})`, details };
    }
    if (stateB.battleStatus !== 1) {
      return { canBattle: false, reason: `Token B not qualified (status: ${stateB.battleStatus})`, details };
    }

    // V1: No tier check - all tokens are implicitly TEST tier

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