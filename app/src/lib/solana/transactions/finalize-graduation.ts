import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { PROGRAM_ID, RPC_ENDPOINT, TREASURY } from '@/config/solana';

/**
 * ⭐ FINALIZE GRADUATION V2 - 2 TRANSACTIONS
 * Step 1: Transfer SOL
 * Step 2: Mint tokens + revoke authorities
 */

// Discriminators
const STEP1_DISCRIMINATOR = Buffer.from([
    0xad, 0x19, 0x0e, 0x42, 0xa8, 0x0d, 0xaf, 0x51
]);

const STEP2_DISCRIMINATOR = Buffer.from([
    0xd2, 0xcd, 0x94, 0xf9, 0xab, 0x80, 0xc1, 0x49
]);

export async function finalizeGraduationStep1(
    caller: PublicKey,
    tokenMint: PublicKey,
    signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
    console.log('🚀 STEP 1: Transferring SOL...');
    console.log('  Caller:', caller.toString());
    console.log('  Token Mint:', tokenMint.toString());

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const programId = new PublicKey(PROGRAM_ID);

    try {
        // Derive accounts
        const [tokenLaunchPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('launch'), tokenMint.toBuffer()],
            programId
        );
        console.log('  TokenLaunch PDA:', tokenLaunchPDA.toString());

        const [poolSolVault] = PublicKey.findProgramAddressSync(
            [Buffer.from('sol_vault'), tokenMint.toBuffer()],
            programId
        );
        console.log('  Pool SOL Vault:', poolSolVault.toString());

        const treasury = new PublicKey(TREASURY);
        console.log('  Treasury:', treasury.toString());

        // Build instruction
        const keys = [
            { pubkey: caller, isSigner: true, isWritable: true },              // 0. caller
            { pubkey: tokenLaunchPDA, isSigner: false, isWritable: true },     // 1. tokenLaunch
            { pubkey: treasury, isSigner: false, isWritable: true },           // 2. treasury
            { pubkey: poolSolVault, isSigner: false, isWritable: true },       // 3. poolSolVault
        ];

        const instruction = new TransactionInstruction({
            keys,
            programId,
            data: STEP1_DISCRIMINATOR,
        });

        console.log('✅ Step 1 instruction built!');

        // Create & send transaction
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        const tx = new Transaction().add(instruction);
        tx.recentBlockhash = blockhash;
        tx.feePayer = caller;

        console.log('📤 Signing & sending...');
        const signedTx = await signTransaction(tx);
        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            preflightCommitment: 'confirmed',
        });

        console.log('⏳ Confirming...');
        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        }, 'confirmed');

        if (confirmation.value.err) {
            throw new Error(`Step 1 failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log('✅ STEP 1 COMPLETE!');
        console.log('🔗 https://solscan.io/tx/' + signature + '?cluster=devnet');

        return signature;
    } catch (error: unknown) {
        console.error('❌ Step 1 error:', error);

        // Type-safe error message extraction
        const errorMessage = error instanceof Error ? error.message : 'Unknown error in Step 1';

        throw new Error(`Step 1 failed: ${errorMessage}`);
    }
}

export async function finalizeGraduationStep2(
    caller: PublicKey,
    tokenMint: PublicKey,
    signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
    console.log('🚀 STEP 2: Minting tokens & revoking authorities...');
    console.log('  Caller:', caller.toString());
    console.log('  Token Mint:', tokenMint.toString());

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const programId = new PublicKey(PROGRAM_ID);

    try {
        // Derive accounts
        const [tokenLaunchPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('launch'), tokenMint.toBuffer()],
            programId
        );

        const poolTokenVault = await getAssociatedTokenAddress(
            tokenMint,
            tokenLaunchPDA,
            true
        );

        // Check if ATA exists, create if needed
        const poolTokenVaultInfo = await connection.getAccountInfo(poolTokenVault);
        if (!poolTokenVaultInfo) {
            console.log('⚠️ Creating pool_token_vault...');
            const createATAIx = createAssociatedTokenAccountInstruction(
                caller,
                poolTokenVault,
                tokenLaunchPDA,
                tokenMint
            );

            const { blockhash: ataBlockhash, lastValidBlockHeight: ataLastValidBlockHeight } =
                await connection.getLatestBlockhash('confirmed');
            const createATATx = new Transaction().add(createATAIx);
            createATATx.recentBlockhash = ataBlockhash;
            createATATx.feePayer = caller;

            const signedATATx = await signTransaction(createATATx);
            const ataSignature = await connection.sendRawTransaction(signedATATx.serialize());

            await connection.confirmTransaction({
                signature: ataSignature,
                blockhash: ataBlockhash,
                lastValidBlockHeight: ataLastValidBlockHeight,
            }, 'confirmed');

            console.log('✅ Pool Token Vault created!');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const [meteoraPool] = PublicKey.findProgramAddressSync(
            [Buffer.from('meteora_pool'), tokenMint.toBuffer()],
            programId
        );

        // Build instruction
        const keys = [
            { pubkey: caller, isSigner: true, isWritable: true },              // 0. caller
            { pubkey: tokenLaunchPDA, isSigner: false, isWritable: true },     // 1. tokenLaunch
            { pubkey: tokenMint, isSigner: false, isWritable: true },          // 2. mint
            { pubkey: meteoraPool, isSigner: false, isWritable: true },        // 3. meteoraPool
            { pubkey: poolTokenVault, isSigner: false, isWritable: true },     // 4. poolTokenVault
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },  // 5. tokenProgram
        ];

        const instruction = new TransactionInstruction({
            keys,
            programId,
            data: STEP2_DISCRIMINATOR,
        });

        console.log('✅ Step 2 instruction built!');

        // Create & send transaction
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        const tx = new Transaction().add(instruction);
        tx.recentBlockhash = blockhash;
        tx.feePayer = caller;

        console.log('📤 Signing & sending...');
        const signedTx = await signTransaction(tx);
        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            preflightCommitment: 'confirmed',
        });

        console.log('⏳ Confirming...');
        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        }, 'confirmed');

        if (confirmation.value.err) {
            throw new Error(`Step 2 failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        console.log('✅ STEP 2 COMPLETE!');
        console.log('🎉 GRADUATION FINISHED!');
        console.log('🔗 https://solscan.io/tx/' + signature + '?cluster=devnet');

        return signature;
    } catch (error: unknown) {
        console.error('❌ Step 2 error:', error);

        // Type-safe error message extraction
        const errorMessage = error instanceof Error ? error.message : 'Unknown error in Step 2';

        throw new Error(`Step 2 failed: ${errorMessage}`);
    }
} 