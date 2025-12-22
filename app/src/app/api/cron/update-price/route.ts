/**
 * BONK BATTLE - Update SOL Price Oracle
 * GET /api/cron/update-price
 * 
 * Called by Vercel cron every 12 hours to update SOL/USD price
 * Updates BOTH on-chain oracle AND Supabase cache
 */

import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Verify request is from Vercel cron OR has valid Bearer token
function isAuthorized(request: NextRequest): boolean {
    // Vercel cron jobs send this header
    const vercelCron = request.headers.get('x-vercel-cron');
    if (vercelCron === '1') return true;

    // Manual calls with Bearer token
    const auth = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

    return false;
}

export async function GET(request: NextRequest) {
    // Check authorization
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Fetch SOL price from CoinGecko
        const res = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
            { next: { revalidate: 0 } } // No cache
        );

        if (!res.ok) {
            throw new Error(`CoinGecko API error: ${res.status}`);
        }

        const data = await res.json();
        const solPriceUsd = data.solana.usd;
        const solPrice = Math.floor(solPriceUsd * 1_000_000); // 6 decimals

        console.log(`📊 SOL Price: $${solPriceUsd} (${solPrice} with 6 decimals)`);

        // Setup connection
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
        if (!rpcUrl) {
            throw new Error('RPC URL not configured');
        }
        const connection = new Connection(rpcUrl, 'confirmed');

        // Get keeper keypair
        const keeperKeyString = process.env.KEEPER_PRIVATE_KEY;
        if (!keeperKeyString) {
            throw new Error('KEEPER_PRIVATE_KEY not configured');
        }
        const keeperKey = JSON.parse(keeperKeyString);
        const keeper = Keypair.fromSecretKey(new Uint8Array(keeperKey));

        // Get program ID
        const programIdString = process.env.NEXT_PUBLIC_PROGRAM_ID;
        if (!programIdString) {
            throw new Error('PROGRAM_ID not configured');
        }
        const programId = new PublicKey(programIdString);

        // Derive Price Oracle PDA
        const [priceOraclePDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('price_oracle')],
            programId
        );

        // Build instruction data
        // Discriminator for update_sol_price (from IDL)
        const discriminator = Buffer.from([166, 98, 183, 175, 125, 81, 109, 119]);

        // Price as u64 little-endian
        const priceBuffer = Buffer.alloc(8);
        const priceBN = BigInt(solPrice);
        for (let i = 0; i < 8; i++) {
            priceBuffer[i] = Number((priceBN >> BigInt(i * 8)) & BigInt(0xff));
        }

        const instruction = new TransactionInstruction({
            keys: [
                { pubkey: priceOraclePDA, isSigner: false, isWritable: true },
                { pubkey: keeper.publicKey, isSigner: true, isWritable: false },
            ],
            programId,
            data: Buffer.concat([discriminator, priceBuffer]),
        });

        // Build and send transaction
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        const tx = new Transaction({
            feePayer: keeper.publicKey,
            blockhash,
            lastValidBlockHeight,
        }).add(instruction);

        tx.sign(keeper);
        const signature = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

        console.log(`✅ Oracle updated on-chain! TX: ${signature}`);

        // ⭐ NEW: Update Supabase cache
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);

            const now = Math.floor(Date.now() / 1000);
            const nextUpdate = now + (12 * 60 * 60); // 12 hours from now

            // Try to update existing record first
            const { data: existingData, error: selectError } = await supabase
                .from('price_oracle')
                .select('id')
                .limit(1)
                .single();

            if (existingData) {
                // Update existing record
                const { error: updateError } = await supabase
                    .from('price_oracle')
                    .update({
                        sol_price_usd: solPrice, // Store in micro-USD (same as on-chain)
                        last_update_timestamp: now,
                        next_update_timestamp: nextUpdate,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingData.id);

                if (updateError) {
                    console.error('⚠️ Supabase update error:', updateError);
                } else {
                    console.log('✅ Supabase cache updated!');
                }
            } else {
                // Insert new record if none exists
                const { error: insertError } = await supabase
                    .from('price_oracle')
                    .insert({
                        sol_price_usd: solPrice,
                        last_update_timestamp: now,
                        next_update_timestamp: nextUpdate,
                        keeper_authority: keeper.publicKey.toString(),
                        update_count: 1,
                    });

                if (insertError) {
                    console.error('⚠️ Supabase insert error:', insertError);
                } else {
                    console.log('✅ Supabase record created!');
                }
            }
        } else {
            console.warn('⚠️ Supabase not configured, skipping cache update');
        }

        return NextResponse.json({
            success: true,
            price: solPriceUsd,
            priceWithDecimals: solPrice,
            signature,
            timestamp: new Date().toISOString(),
            supabaseUpdated: !!(supabaseUrl && supabaseKey),
        });

    } catch (error: any) {
        console.error('❌ Update price error:', error.message);

        // Handle specific error: too soon (24h limit)
        if (error.message?.includes('PriceUpdateTooSoon') || error.message?.includes('0x1781')) {
            return NextResponse.json({
                success: false,
                error: 'Price update too soon. Contract requires 24 hours between updates.',
                code: 'TOO_SOON',
            }, { status: 429 });
        }

        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
    return GET(request);
}