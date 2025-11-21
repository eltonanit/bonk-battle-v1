import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await res.json();
        const solPrice = Math.floor(data.solana.usd * 1_000_000);

        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!);
        const keeperKey = JSON.parse(process.env.KEEPER_PRIVATE_KEY!);
        const keeper = Keypair.fromSecretKey(new Uint8Array(keeperKey));

        const programId = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
        const [priceOraclePDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('price_oracle')],
            programId
        );

        // Discriminator update_sol_price (from IDL)
        const discriminator = Buffer.from([166, 98, 183, 175, 125, 81, 109, 119]);
        const priceBuffer = Buffer.alloc(8);
        for (let i = 0; i < 8; i++) {
            priceBuffer[i] = Number((BigInt(solPrice) >> BigInt(i * 8)) & BigInt(0xff));
        }

        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: priceOraclePDA, isSigner: false, isWritable: true },
                { pubkey: keeper.publicKey, isSigner: true, isWritable: false },
            ],
            programId,
            data: Buffer.concat([discriminator, priceBuffer]),
        });

        const tx = new Transaction().add(instruction);
        tx.feePayer = keeper.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        tx.sign(keeper);
        const signature = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction(signature);

        return NextResponse.json({ success: true, price: data.solana.usd, tx: signature });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}