/**
 * BONK BATTLE - Check Victory Conditions (CRON 1)
 * GET /api/battles/check-victory
 * 
 * Scans InBattle tokens and triggers victory when conditions are met.
 * Updates: InBattle → VictoryPending
 * 
 * Run every 2 minutes via Vercel Cron
 */

import { NextResponse } from 'next/server';
import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    Keypair,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const PROGRAM_ID = new PublicKey('F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD');

// Network-aware RPC endpoints
const RPC_ENDPOINTS = {
    mainnet: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=8c51da3b-f506-42bb-9000-1cf7724b3846',
    devnet: 'https://devnet.helius-rpc.com/?api-key=8c51da3b-f506-42bb-9000-1cf7724b3846',
};

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Victory thresholds by network (must match contract constants)
const VICTORY_THRESHOLDS = {
    // TEST tier (devnet): 0.114 SOL
    devnet: 113_604_077, // TEST_VICTORY_VOLUME_SOL from contract
    // PROD tier (mainnet): ~8.8M SOL
    mainnet: 8_800_835_000_000_000, // PROD_VICTORY_VOLUME_SOL from contract
};

// Battle status enum
const BattleStatus = {
    Created: 0,
    Qualified: 1,
    InBattle: 2,
    VictoryPending: 3,
    Listed: 4,
    PoolCreated: 5,
};

// V1 Struct offsets
const V1_OFFSET_TOTAL_VOLUME = 56;
const V1_OFFSET_BATTLE_STATUS = 65;

// Anchor discriminator for check_victory_conditions
const CHECK_VICTORY_DISCRIMINATOR = Buffer.from([176, 199, 31, 103, 154, 28, 170, 98]);

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getKeeperKeypair(): Keypair {
    const privateKeyString = process.env.KEEPER_PRIVATE_KEY;
    if (!privateKeyString) throw new Error('KEEPER_PRIVATE_KEY not configured');
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(privateKeyString)));
}

function getBattleStatePDA(mint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('battle_state'), mint.toBuffer()],
        PROGRAM_ID
    );
}

function getPriceOraclePDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('price_oracle')],
        PROGRAM_ID
    );
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function checkVictoryForToken(
    connection: Connection,
    keeper: Keypair,
    mint: PublicKey,
    tokenSymbol: string,
    victoryThreshold: number
): Promise<{ success: boolean; victory: boolean; signature?: string; error?: string }> {

    const [battleStatePDA] = getBattleStatePDA(mint);
    const [priceOraclePDA] = getPriceOraclePDA();

    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: battleStatePDA, isSigner: false, isWritable: true },
            { pubkey: priceOraclePDA, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: CHECK_VICTORY_DISCRIMINATOR,
    });

    try {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        const transaction = new Transaction({
            feePayer: keeper.publicKey,
            blockhash,
            lastValidBlockHeight,
        }).add(instruction);

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [keeper],
            { commitment: 'confirmed' }
        );

        // Check if status changed to VictoryPending
        await sleep(1000);
        const updatedAccount = await connection.getAccountInfo(battleStatePDA);
        const newStatus = updatedAccount?.data[V1_OFFSET_BATTLE_STATUS];
        const victory = newStatus === BattleStatus.VictoryPending;

        if (victory) {
            console.log(`🏆 VICTORY! ${tokenSymbol} (${mint.toString().slice(0, 8)}...) → VictoryPending`);

            // Update database
            await supabase.from('tokens').update({
                battle_status: BattleStatus.VictoryPending,
                victory_detected_at: new Date().toISOString(),
            }).eq('mint', mint.toString());

            // Log activity
            await supabase.from('activity_feed').insert({
                wallet: 'system',
                action_type: 'victory_detected',
                token_mint: mint.toString(),
                token_symbol: tokenSymbol,
                metadata: { signature, volume_threshold: victoryThreshold / 1e9 },
                created_at: new Date().toISOString()
            });
        }

        return { success: true, victory, signature };

    } catch (error: any) {
        console.error(`❌ Check victory failed for ${tokenSymbol}:`, error.message);
        return { success: false, victory: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
    const startTime = Date.now();

    // Get network from query param or default to mainnet
    const url = new URL(request.url);
    const network = (url.searchParams.get('network') as 'mainnet' | 'devnet') || 'mainnet';
    const rpcEndpoint = RPC_ENDPOINTS[network];
    const victoryThreshold = VICTORY_THRESHOLDS[network];

    console.log('\n🏆 ═══════════════════════════════════════════════════════');
    console.log('CRON 1: CHECK VICTORY CONDITIONS');
    console.log(`Network: ${network}`);
    console.log(`Threshold: Volume >= ${victoryThreshold / 1e9} SOL`);
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        const connection = new Connection(rpcEndpoint, 'confirmed');
        const keeper = getKeeperKeypair();

        // Get all InBattle tokens from database (filtered by network)
        const { data: inBattleTokens, error } = await supabase
            .from('tokens')
            .select('mint, symbol, network')
            .eq('battle_status', BattleStatus.InBattle)
            .eq('network', network);

        if (error || !inBattleTokens?.length) {
            console.log('📭 No InBattle tokens found');
            return NextResponse.json({
                success: true,
                message: 'No InBattle tokens to check',
                checked: 0,
                victories: 0,
                duration: Date.now() - startTime
            });
        }

        console.log(`📊 Checking ${inBattleTokens.length} InBattle token(s)...`);

        const results: Array<{
            mint: string;
            symbol: string;
            volumeSol: number;
            meetsThreshold: boolean;
            victory: boolean;
        }> = [];

        for (const token of inBattleTokens) {
            try {
                const mint = new PublicKey(token.mint);
                const [battleStatePDA] = getBattleStatePDA(mint);
                const account = await connection.getAccountInfo(battleStatePDA);

                if (!account) {
                    console.warn(`⚠️ No battle state for ${token.symbol}`);
                    continue;
                }

                // Validate chain status
                const chainStatus = account.data[V1_OFFSET_BATTLE_STATUS];
                if (chainStatus !== BattleStatus.InBattle) {
                    console.log(`⏭️ ${token.symbol}: chain status ${chainStatus} (not InBattle)`);
                    // Sync DB with chain
                    await supabase.from('tokens').update({ battle_status: chainStatus }).eq('mint', token.mint);
                    continue;
                }

                const totalVolume = Number(account.data.readBigUInt64LE(V1_OFFSET_TOTAL_VOLUME));
                const volumeSol = totalVolume / 1e9;
                const meetsThreshold = totalVolume >= victoryThreshold;

                console.log(`📊 ${token.symbol}: ${volumeSol.toFixed(4)} SOL (${meetsThreshold ? '✅ READY' : '⏳ ' + ((totalVolume / victoryThreshold) * 100).toFixed(1) + '%'})`);

                if (meetsThreshold) {
                    const result = await checkVictoryForToken(connection, keeper, mint, token.symbol, victoryThreshold);
                    results.push({
                        mint: token.mint,
                        symbol: token.symbol,
                        volumeSol,
                        meetsThreshold: true,
                        victory: result.victory
                    });
                } else {
                    results.push({
                        mint: token.mint,
                        symbol: token.symbol,
                        volumeSol,
                        meetsThreshold: false,
                        victory: false
                    });
                }

                // Small delay to avoid rate limits
                await sleep(200);

            } catch (err: any) {
                console.error(`❌ Error checking ${token.symbol}:`, err.message);
            }
        }

        const victories = results.filter(r => r.victory).length;
        const duration = Date.now() - startTime;

        console.log(`\n✅ Check complete: ${victories} victory/ies detected in ${duration}ms`);

        return NextResponse.json({
            success: true,
            message: victories > 0 ? `${victories} victory detected!` : 'No victories yet',
            checked: inBattleTokens.length,
            victories,
            threshold: victoryThreshold / 1e9,
            network,
            results,
            duration
        });

    } catch (error: any) {
        console.error('❌ CRON 1 Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// Vercel Cron config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;