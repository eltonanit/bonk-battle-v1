import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram
} from '@solana/web3.js';
import { readFileSync } from 'fs';

async function main() {
    console.log('🔄 Initializing Price Oracle (Raw Transaction)...');
    console.log('═'.repeat(60));

    // 1. Fetch SOL price
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data: any = await res.json();
    const solPrice = data.solana.usd;
    const priceMicro = Math.floor(solPrice * 1_000_000);

    console.log(`💰 Current SOL price: $${solPrice}`);
    console.log(`📊 Formatted: ${priceMicro} micro-USD`);

    // 2. Setup connection
    const connection = new Connection(
        'https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f',
        'confirmed'
    );

    // 3. Load wallet
    const WALLET_PATH = 'C:\\Users\\Elton\\.config\\solana\\id.json';
    const keypairData = JSON.parse(readFileSync(WALLET_PATH, 'utf-8'));
    const keeper = Keypair.fromSecretKey(new Uint8Array(keypairData));

    console.log(`🔑 Keeper: ${keeper.publicKey.toString()}`);

    // 4. PDAs
    const programId = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');
    const [priceOraclePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('price_oracle')],
        programId
    );

    console.log(`📍 Price Oracle PDA: ${priceOraclePDA.toString()}`);

    // 5. Build instruction data
    // Discriminator hash("global:initialize_price_oracle")
    const discriminator = Buffer.from([0xf4, 0x84, 0xc0, 0x75, 0x12, 0x4e, 0x6c, 0xa5]);

    // initial_sol_price (u64 little-endian)
    const priceBuffer = Buffer.alloc(8);
    priceBuffer.writeBigUInt64LE(BigInt(priceMicro));

    const instructionData = Buffer.concat([discriminator, priceBuffer]);

    console.log(`📦 Instruction data: ${instructionData.toString('hex')}`);

    // 6. Build instruction
    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: priceOraclePDA, isSigner: false, isWritable: true },
            { pubkey: keeper.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId,
        data: instructionData,
    });

    // 7. Send transaction
    console.log('📤 Sending transaction...');

    const transaction = new Transaction().add(instruction);
    const signature = await connection.sendTransaction(transaction, [keeper], {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
    });

    console.log(`⏳ Confirming transaction: ${signature}`);
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('═'.repeat(60));
    console.log('✅ Price Oracle initialized successfully!');
    console.log(`   Transaction: ${signature}`);
    console.log(`   Solscan: https://solscan.io/tx/${signature}?cluster=devnet`);
    console.log('═'.repeat(60));
}

main().catch(console.error);