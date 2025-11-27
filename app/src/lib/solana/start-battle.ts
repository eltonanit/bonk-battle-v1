/**
 * BONK BATTLE - Start Battle Function
 * KEEPER ONLY: Requires KEEPER_AUTHORITY to sign
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

const START_BATTLE_DISCRIMINATOR = Buffer.from([87, 12, 31, 196, 33, 191, 140, 147]);

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

export async function startBattle(
  connection: Connection,
  keeperKeypair: Keypair,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): Promise<StartBattleResult> {
  console.log('⚔️ START BATTLE');
  console.log('Token A:', tokenAMint.toString());
  console.log('Token B:', tokenBMint.toString());

  if (!keeperKeypair.publicKey.equals(KEEPER_AUTHORITY)) {
    return {
      success: false,
      signature: '',
      tokenA: tokenAMint,
      tokenB: tokenBMint,
      error: `Invalid keeper authority`,
    };
  }

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

    const [tokenAInfo, tokenBInfo] = await Promise.all([
      connection.getAccountInfo(tokenAStatePDA),
      connection.getAccountInfo(tokenBStatePDA),
    ]);

    if (!tokenAInfo) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: `Token A not found` };
    }
    if (!tokenBInfo) {
      return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: `Token B not found` };
    }

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

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: keeperKeypair.publicKey,
      blockhash,
      lastValidBlockHeight,
    }).add(instruction);

    const signature = await connection.sendTransaction(transaction, [keeperKeypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    console.log('✅ BATTLE STARTED! Signature:', signature);

    return { success: true, signature, tokenA: tokenAMint, tokenB: tokenBMint };

  } catch (error) {
    console.error('❌ Start battle failed:', error);
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (errorMessage.includes('NotQualified')) errorMessage = 'Token not qualified';
      if (errorMessage.includes('UnfairMatch')) errorMessage = 'Market cap difference too large';
    }
    return { success: false, signature: '', tokenA: tokenAMint, tokenB: tokenBMint, error: errorMessage };
  }
}

export async function canTokensBattle(
  connection: Connection,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): Promise<{ canBattle: boolean; reason?: string }> {
  try {
    const [tokenAStatePDA] = getBattleStatePDA(tokenAMint);
    const [tokenBStatePDA] = getBattleStatePDA(tokenBMint);

    const [tokenAInfo, tokenBInfo] = await Promise.all([
      connection.getAccountInfo(tokenAStatePDA),
      connection.getAccountInfo(tokenBStatePDA),
    ]);

    if (!tokenAInfo || !tokenBInfo) {
      return { canBattle: false, reason: 'One or both tokens do not exist' };
    }

    // Correct offset: battle_status is at byte 97
    const STATUS_OFFSET = 97;
    const statusA = tokenAInfo.data[STATUS_OFFSET];
    const statusB = tokenBInfo.data[STATUS_OFFSET];

    console.log(`Token A status: ${statusA}, Token B status: ${statusB}`);

    if (statusA !== 1) return { canBattle: false, reason: `Token A not qualified (status: ${statusA})` };
    if (statusB !== 1) return { canBattle: false, reason: `Token B not qualified (status: ${statusB})` };

    return { canBattle: true };
  } catch (error) {
    return { canBattle: false, reason: `Error: ${error}` };
  }
}

export { getBattleStatePDA, BONK_BATTLE_PROGRAM_ID, KEEPER_AUTHORITY };
