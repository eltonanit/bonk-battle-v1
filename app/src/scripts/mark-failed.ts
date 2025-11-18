import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { StonksFan } from "../target/types/stonks_fan";
import fs from 'fs';

const PROGRAM_ID = "DxchSpAi7A14f9o1LGPr18HikXEjMT6VXj1oy24VXAgN";
const RPC_ENDPOINT = "https://devnet.helius-rpc.com/?api-key=867cca8d-b431-4540-8f55-90c57e3e1c9e";

async function markAsFailed(tokenMintAddress: string) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 MARK TOKEN AS FAILED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Load admin keypair
    const adminKeypairData = JSON.parse(
        fs.readFileSync('./admin-keypair.json', 'utf-8')
    );
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(adminKeypairData));

    console.log('👤 Admin:', adminKeypair.publicKey.toString());

    // Setup provider
    const connection = new anchor.web3.Connection(RPC_ENDPOINT, "confirmed");
    const wallet = new anchor.Wallet(adminKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, {
        commitment: "confirmed",
    });
    anchor.setProvider(provider);

    console.log('📍 Token Mint:', tokenMintAddress);

    // Load program
    const program = anchor.workspace.StonksFan as Program<StonksFan>;

    // Derive TokenLaunch PDA
    const tokenMint = new PublicKey(tokenMintAddress);
    const [tokenLaunchPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("launch"), tokenMint.toBuffer()],
        program.programId
    );

    console.log('📍 TokenLaunch PDA:', tokenLaunchPDA.toString());

    // Fetch account to verify
    try {
        const launchAccount = await program.account.tokenLaunch.fetch(tokenLaunchPDA);
        console.log('✅ Account found');
        console.log('  Name:', launchAccount.name);
        console.log('  Symbol:', launchAccount.symbol);
        console.log('  Status:', launchAccount.status);
        console.log('  SOL Raised:', launchAccount.solRaised.toNumber() / 1e9);
        console.log('  Target SOL:', launchAccount.targetSol.toNumber() / 1e9);
        console.log('  Deadline:', new Date(launchAccount.deadline.toNumber() * 1000));

        // Check if already failed
        if (launchAccount.status.hasOwnProperty('failed')) {
            console.log('⚠️ Token is already marked as Failed!');
            return;
        }

        // Check deadline
        const now = Math.floor(Date.now() / 1000);
        if (now <= launchAccount.deadline.toNumber()) {
            console.log('⚠️ WARNING: Deadline has not passed yet!');
            console.log(`  Time remaining: ${launchAccount.deadline.toNumber() - now} seconds`);
            console.log('  But you are admin, so transaction should work.');
        }

        console.log('\n📤 Sending mark_as_failed transaction...');

        const tx = await program.methods
            .markAsFailed()
            .accounts({
                caller: adminKeypair.publicKey,
                tokenLaunch: tokenLaunchPDA,
            })
            .rpc();

        console.log('✅ Transaction confirmed!');
        console.log('🔗 Signature:', tx);
        console.log('🔗 Solscan:', `https://solscan.io/tx/${tx}?cluster=devnet`);

        // Verify status changed
        const updatedAccount = await program.account.tokenLaunch.fetch(tokenLaunchPDA);
        console.log('\n📊 Updated Status:', updatedAccount.status);

    } catch (error: unknown) {
        // Type-safe error message extraction
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('❌ Error:', errorMessage);

        if (errorMessage.includes('DeadlineNotPassed')) {
            console.error('\n⚠️ ERROR: Deadline has not passed yet!');
        } else if (errorMessage.includes('Unauthorized')) {
            console.error('\n⚠️ ERROR: Not authorized as admin!');
        } else {
            console.error('\nFull error:', error);
        }
    }
}

// Get token mint from command line
const tokenMint = process.argv[2];

if (!tokenMint) {
    console.error('Usage: ts-node scripts/mark-failed.ts <TOKEN_MINT_ADDRESS>');
    console.error('Example: ts-node scripts/mark-failed.ts 8CaAa5jBreQwHHNp59YmWzSr1QJQ7uhcW6ZASJmRQAZU');
    process.exit(1);
}

markAsFailed(tokenMint).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});