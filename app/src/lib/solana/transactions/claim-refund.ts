import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
} from '@solana/web3.js';
import { PROGRAM_ID, RPC_ENDPOINT, TREASURY } from '@/config/solana';

interface ClaimRefundResult {
    signature: string;
    markedAsFailed: boolean;
}

export async function claimRefund(
    wallet: PublicKey,
    tokenMint: PublicKey,
    signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<ClaimRefundResult> {
    console.log('💰 Starting refund claim...');
    console.log('  Wallet:', wallet.toString());
    console.log('  Token Mint:', tokenMint.toString());

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    // Derive TokenLaunch PDA
    const [tokenLaunchPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('launch'), tokenMint.toBuffer()],
        new PublicKey(PROGRAM_ID)
    );

    console.log('  TokenLaunch PDA:', tokenLaunchPDA.toString());

    // Derive BuyerRecord PDA
    const [buyerRecordPDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('buyer'),
            tokenLaunchPDA.toBuffer(),
            wallet.toBuffer(),
        ],
        new PublicKey(PROGRAM_ID)
    );

    console.log('  BuyerRecord PDA:', buyerRecordPDA.toString());

    // Verify accounts exist
    const launchAccount = await connection.getAccountInfo(tokenLaunchPDA);
    if (!launchAccount) {
        throw new Error('TokenLaunch account not found');
    }

    const buyerAccount = await connection.getAccountInfo(buyerRecordPDA);
    if (!buyerAccount) {
        throw new Error('BuyerRecord not found - you may not have bought this token');
    }

    // Check status and deadline
    const status = launchAccount.data.readUInt8(121);
    const deadline = Number(launchAccount.data.readBigInt64LE(105));
    const now = Math.floor(Date.now() / 1000);
    const deadlinePassed = now > deadline;

    console.log('  Status:', status === 0 ? 'Active' : status === 3 ? 'Failed' : 'Other');
    console.log('  Deadline passed:', deadlinePassed);

    // Check if already claimed
    const refundClaimed = buyerAccount.data.readUInt8(88) === 1;
    if (refundClaimed) {
        throw new Error('Refund already claimed!');
    }

    // Build transaction with auto-mark logic
    const tx = new Transaction();
    let needsMarkAsFailed = false;

    // AUTO-MARK: If Active but deadline passed, mark as failed first
    if (status === 0 && deadlinePassed) {
        console.log('🔧 Auto-marking as failed...');

        const markFailedDiscriminator = Buffer.from('e0addfacd5459c7b', 'hex');

        const markFailedIx = new TransactionInstruction({
            keys: [
                { pubkey: wallet, isSigner: true, isWritable: false },
                { pubkey: tokenLaunchPDA, isSigner: false, isWritable: true },
            ],
            programId: new PublicKey(PROGRAM_ID),
            data: markFailedDiscriminator,
        });

        tx.add(markFailedIx);
        needsMarkAsFailed = true;
    } else if (status !== 3) {
        throw new Error('Token is not failed and deadline has not passed');
    }

    // Build claim_refund instruction
    const claimRefundDiscriminator = Buffer.from('0f101ea1ffe4613c', 'hex');

    const claimRefundIx = new TransactionInstruction({
        keys: [
            { pubkey: wallet, isSigner: true, isWritable: true },
            { pubkey: tokenLaunchPDA, isSigner: false, isWritable: true },
            { pubkey: buyerRecordPDA, isSigner: false, isWritable: true },
            { pubkey: new PublicKey(TREASURY), isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: new PublicKey(PROGRAM_ID),
        data: claimRefundDiscriminator,
    });

    tx.add(claimRefundIx);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet;

    console.log('📤 Requesting signature from wallet...');

    // Sign transaction
    const signedTx = await signTransaction(tx);

    console.log('✅ Transaction signed!');
    console.log('📤 Sending to RPC...');

    // ⭐ NEW: Wrap in try-catch to handle "already processed" gracefully
    try {
        // Send transaction
        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });

        console.log('✅ Transaction sent! Signature:', signature);
        console.log('⏳ Waiting for confirmation...');

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');

        console.log('✅ Refund claimed successfully!');

        return {
            signature,
            markedAsFailed: needsMarkAsFailed,
        };
    } catch (error: unknown) {
        // Type-safe error message extraction
        const errorMessage = error instanceof Error ? error.message : '';

        // ⭐ Handle "already processed" error (transaction likely succeeded!)
        if (errorMessage.includes('already been processed')) {
            console.log('⚠️ Transaction already processed - verifying success...');

            // Wait a bit for network to settle
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if BuyerRecord was closed (= refund succeeded)
            const buyerAccountAfter = await connection.getAccountInfo(buyerRecordPDA);

            if (!buyerAccountAfter || buyerAccountAfter.lamports === 0) {
                console.log('✅ Refund was successful! (BuyerRecord closed)');
                return {
                    signature: 'success-verified-onchain',
                    markedAsFailed: needsMarkAsFailed,
                };
            }

            // If account still exists, the transaction might have failed
            console.log('⚠️ BuyerRecord still exists - transaction may have failed');
        }

        // Re-throw error if not "already processed" or verification failed
        throw error;
    }
} 