// src/lib/solana/transactions/buy-tokens.ts
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { PROGRAM_ID, RPC_ENDPOINT, TREASURY, getSolscanUrl } from '@/config/solana';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

// Discriminators corretti
const BUY_TOKENS_DISCRIMINATOR = Buffer.from([
  0xbd, 0x15, 0xe6, 0x85, 0xf7, 0x02, 0x6e, 0x2a
]);

const BUY_MORE_TOKENS_DISCRIMINATOR = Buffer.from([
  0xf0, 0x83, 0x40, 0xf1, 0x14, 0x05, 0x13, 0xb8
]);

function serializeU64(value: number): Buffer {
  const buf = Buffer.alloc(8);
  const bigValue = BigInt(Math.floor(value));

  for (let i = 0; i < 8; i++) {
    buf[i] = Number((bigValue >> BigInt(i * 8)) & BigInt(0xff));
  }

  return buf;
}

export async function buyTokens(
  wallet: PublicKey,
  tokenMint: PublicKey,
  solAmount: number,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<string> {
  console.log('🚀 Starting buy transaction...');
  console.log('Wallet:', wallet.toString());
  console.log('Token Mint:', tokenMint.toString());
  console.log('SOL Amount:', solAmount);

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const programId = new PublicKey(PROGRAM_ID);

  try {
    // Derive PDAs
    const [tokenLaunchPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('launch'), tokenMint.toBuffer()],
      programId
    );

    const [buyerRecordPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('buyer'),
        tokenLaunchPDA.toBuffer(),
        wallet.toBuffer(),
      ],
      programId
    );

    // Buyer's token account
    const buyerTokenAccount = getAssociatedTokenAddressSync(
      tokenMint,
      wallet,
      false
    );

    console.log('📍 Accounts:');
    console.log('  TokenLaunch PDA:', tokenLaunchPDA.toString());
    console.log('  BuyerRecord PDA:', buyerRecordPDA.toString());
    console.log('  Buyer Token Account:', buyerTokenAccount.toString());

    // Check se è primo acquisto
    const buyerRecordInfo = await connection.getAccountInfo(buyerRecordPDA);
    const isFirstBuy = !buyerRecordInfo;

    console.log('Is First Buy:', isFirstBuy);

    // Check balance utente
    const userBalance = await connection.getBalance(wallet);
    const requiredBalance = solAmount * 1e9 + 0.01 * 1e9;

    if (userBalance < requiredBalance) {
      throw new Error(`Insufficient balance. Have ${userBalance / 1e9} SOL, need ${requiredBalance / 1e9} SOL`);
    }

    // Converti SOL in lamports
    const lamports = Math.floor(solAmount * 1e9);
    const minTokensOut = 0;

    // Serialize instruction data
    const discriminator = isFirstBuy ? BUY_TOKENS_DISCRIMINATOR : BUY_MORE_TOKENS_DISCRIMINATOR;
    const solAmountBuf = serializeU64(lamports);
    const minTokensOutBuf = serializeU64(minTokensOut);

    const instructionData = Buffer.concat([
      discriminator,
      solAmountBuf,
      minTokensOutBuf,
    ]);

    // Build accounts array - ORDINE CORRETTO DAL CONTRATTO
    const keys = isFirstBuy ? [
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: tokenLaunchPDA, isSigner: false, isWritable: true },
      { pubkey: buyerRecordPDA, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: true },
      { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: new PublicKey(TREASURY), isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
    ] : [
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: tokenLaunchPDA, isSigner: false, isWritable: true },
      { pubkey: buyerRecordPDA, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: true },
      { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: new PublicKey(TREASURY), isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    const buyInstruction = new TransactionInstruction({
      keys,
      programId,
      data: instructionData,
    });

    console.log('✅ Buy instruction created');

    // Build instructions array
    const instructions = [];

    // Add compute budget
    instructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
    );
    // ✅ ADD PRIORITY FEE - Fix for "Block Height Exceeded"
    instructions.push(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 })
    );
    console.log('✅ Added compute budget (400k units + 100k microLamports priority fee)');

    // Add buy instruction (smart contract crea ATA automaticamente!)
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

    console.log('📤 Requesting signature from wallet...');

    // Sign with wallet
    const signedTx = await signTransaction(transaction);

    console.log('✅ Transaction signed!');
    console.log('📤 Sending signed transaction to RPC...');

    // Send directly to RPC
    const rawTransaction = signedTx.serialize();
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('✅ Transaction sent!');
    console.log('📝 Signature:', signature);
    console.log('🔗 Solscan:', getSolscanUrl('tx', signature));

    // Wait for confirmation
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
    return signature;

  } catch (error: unknown) {
    console.error('❌ Transaction error:', error);

    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : '';
    const errorLogs = (error && typeof error === 'object' && 'logs' in error)
      ? (error as { logs?: string[] }).logs
      : undefined;

    if (errorLogs) {
      console.error('Program logs:', errorLogs);
    }

    // ⭐ Handle "already processed" (success case!)
    if (errorMessage.includes('already been processed')) {
      console.log('✅ Transaction was already processed successfully!');
      // NON throw error! Return success indicator
      return 'already_processed_success';
    }

    // User cancelled
    if (errorMessage.includes('User rejected')) {
      throw new Error('Transaction cancelled by user');
    }

    // Smart contract errors
    if (errorMessage.includes('0x1771')) {
      throw new Error('Deadline passed. This token launch has expired.');
    } else if (errorMessage.includes('0x1772')) {
      throw new Error('Amount too small. Minimum is 0.01 SOL');
    } else if (errorMessage.includes('0x1773')) {
      throw new Error('Amount too large. Maximum is 10 SOL per transaction');
    } else if (errorMessage.includes('custom program error')) {
      const errorCode = errorMessage.match(/0x[0-9a-fA-F]+/)?.[0];
      throw new Error(`Program error ${errorCode}. Check Solscan for details.`);
    }

    throw error;
  }
} 