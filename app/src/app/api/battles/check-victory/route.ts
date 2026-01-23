/**
 * BONK BATTLE - Check Victory Conditions
 *
 * GET  /api/battles/check-victory - Cron job: scans ALL InBattle tokens
 * POST /api/battles/check-victory - Frontend: checks SINGLE token
 *
 * ⚠️ IMPORTANT: Victory requires BOTH conditions (from contract):
 *    1. sol_collected >= 99.99% of TARGET_SOL (VICTORY_TOLERANCE_BPS = 9999)
 *    2. total_volume >= VICTORY_VOLUME_SOL
 *
 * V4 Contract Values (xy=k bonding curve with 1B multiplier):
 * - Devnet TEST:  TARGET=0.103 SOL, VOLUME=0.114 SOL
 * - Mainnet PROD: TARGET=8M SOL, VOLUME=8.8M SOL
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

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ VICTORY THRESHOLDS - V4 CONTRACT VALUES (xy=k with 1B multiplier)
// ═══════════════════════════════════════════════════════════════════════════
//
// Contract uses 99.99% tolerance for SOL (VICTORY_TOLERANCE_BPS = 9999):
// let sol_threshold = TARGET_SOL.checked_mul(9999).unwrap().checked_div(10000).unwrap();
//
const VICTORY_THRESHOLDS = {
    devnet: {
        // V4 TEST TIER from contract
        // Contract: TEST_TARGET_SOL = 103_276_434 (~0.103 SOL)
        // Contract: TEST_VICTORY_VOLUME_SOL = 113_604_077 (~0.114 SOL)
        // Contract: VICTORY_TOLERANCE_BPS = 9999 (99.99%)
        TARGET_SOL_LAMPORTS: 103_276_434,              // ~0.103 SOL
        TARGET_SOL_WITH_TOLERANCE: 103_266_106,        // 103,276,434 * 99.99% = 103,266,106
        VICTORY_VOLUME_LAMPORTS: 113_604_077,          // ~0.114 SOL (NO tolerance)
    },
    mainnet: {
        // V4 PRODUCTION TIER from contract
        // Contract: PROD_TARGET_SOL = 8_000_759_000_000_000 (~8M SOL)
        // Contract: PROD_VICTORY_VOLUME_SOL = 8_800_835_000_000_000 (~8.8M SOL)
        // Contract: VICTORY_TOLERANCE_BPS = 9999 (99.99%)
        TARGET_SOL_LAMPORTS: 8_000_759_000_000_000,     // ~8M SOL
        TARGET_SOL_WITH_TOLERANCE: 7_999_959_000_000_000, // 8M * 99.99%
        VICTORY_VOLUME_LAMPORTS: 8_800_835_000_000_000, // ~8.8M SOL (NO tolerance)
    },
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

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ ACCOUNT DATA OFFSETS - MUST MATCH SMART CONTRACT STRUCT!
// ═══════════════════════════════════════════════════════════════════════════
// TokenBattleState struct layout:
//   discriminator:        8 bytes  (offset 0)
//   mint:                32 bytes  (offset 8)
//   sol_collected:        8 bytes  (offset 40)  ⬅️ u64
//   tokens_sold:          8 bytes  (offset 48)
//   total_trade_volume:   8 bytes  (offset 56)  ⬅️ u64
//   is_active:            1 byte   (offset 64)
//   battle_status:        1 byte   (offset 65)  ⬅️ enum
//   ...

const OFFSET_SOL_COLLECTED = 40;
const OFFSET_TOTAL_VOLUME = 56;
const OFFSET_BATTLE_STATUS = 65;

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
// ⭐ READ ON-CHAIN STATE
// ═══════════════════════════════════════════════════════════════════════════

interface OnChainState {
    solCollected: number;
    totalVolume: number;
    battleStatus: number;
}

function readOnChainState(accountData: Buffer): OnChainState {
    return {
        solCollected: Number(accountData.readBigUInt64LE(OFFSET_SOL_COLLECTED)),
        totalVolume: Number(accountData.readBigUInt64LE(OFFSET_TOTAL_VOLUME)),
        battleStatus: accountData[OFFSET_BATTLE_STATUS],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ CHECK VICTORY CONDITIONS (both SOL and Volume)
// ═══════════════════════════════════════════════════════════════════════════

interface VictoryCheck {
    meetsAllConditions: boolean;
    meetsSolCondition: boolean;
    meetsVolumeCondition: boolean;
    solCollected: number;
    solRequired: number;
    solProgress: number;
    totalVolume: number;
    volumeRequired: number;
    volumeProgress: number;
}

function checkVictoryConditions(
    state: OnChainState,
    thresholds: typeof VICTORY_THRESHOLDS.devnet
): VictoryCheck {
    const meetsSolCondition = state.solCollected >= thresholds.TARGET_SOL_WITH_TOLERANCE;
    const meetsVolumeCondition = state.totalVolume >= thresholds.VICTORY_VOLUME_LAMPORTS;

    return {
        meetsAllConditions: meetsSolCondition && meetsVolumeCondition,
        meetsSolCondition,
        meetsVolumeCondition,
        solCollected: state.solCollected,
        solRequired: thresholds.TARGET_SOL_WITH_TOLERANCE,
        solProgress: (state.solCollected / thresholds.TARGET_SOL_WITH_TOLERANCE) * 100,
        totalVolume: state.totalVolume,
        volumeRequired: thresholds.VICTORY_VOLUME_LAMPORTS,
        volumeProgress: (state.totalVolume / thresholds.VICTORY_VOLUME_LAMPORTS) * 100,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// CALL ON-CHAIN check_victory_conditions
// ═══════════════════════════════════════════════════════════════════════════

async function callCheckVictoryOnChain(
    connection: Connection,
    keeper: Keypair,
    mint: PublicKey,
    tokenSymbol: string
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
        const newStatus = updatedAccount?.data[OFFSET_BATTLE_STATUS];
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
                metadata: { signature },
                created_at: new Date().toISOString()
            }).catch(() => {}); // Ignore if activity_feed doesn't exist
        }

        return { success: true, victory, signature };

    } catch (error: any) {
        console.error(`❌ Check victory failed for ${tokenSymbol}:`, error.message);
        return { success: false, victory: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET HANDLER - Cron job: scans ALL InBattle tokens
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
    const startTime = Date.now();

    // Get network from query param or default to mainnet
    const url = new URL(request.url);
    const network = (url.searchParams.get('network') as 'mainnet' | 'devnet') || 'mainnet';
    const rpcEndpoint = RPC_ENDPOINTS[network];
    const thresholds = VICTORY_THRESHOLDS[network];

    console.log('\n🏆 ═══════════════════════════════════════════════════════');
    console.log('CRON: CHECK VICTORY CONDITIONS (ALL TOKENS)');
    console.log(`Network: ${network}`);
    console.log(`SOL Threshold: ${(thresholds.TARGET_SOL_WITH_TOLERANCE / 1e9).toFixed(6)} SOL (99.99% of ${(thresholds.TARGET_SOL_LAMPORTS / 1e9).toFixed(6)})`);
    console.log(`Volume Threshold: ${(thresholds.VICTORY_VOLUME_LAMPORTS / 1e9).toFixed(6)} SOL`);
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        const connection = new Connection(rpcEndpoint, 'confirmed');
        const keeper = getKeeperKeypair();

        // Get all InBattle tokens from database
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
            solCollectedSol: number;
            volumeSol: number;
            meetsSol: boolean;
            meetsVolume: boolean;
            meetsAll: boolean;
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

                // Read on-chain state
                const state = readOnChainState(account.data);

                // Validate chain status
                if (state.battleStatus !== BattleStatus.InBattle) {
                    console.log(`⏭️ ${token.symbol}: chain status ${state.battleStatus} (not InBattle)`);
                    await supabase.from('tokens').update({ battle_status: state.battleStatus }).eq('mint', token.mint);
                    continue;
                }

                // ⭐ Check BOTH victory conditions
                const check = checkVictoryConditions(state, thresholds);

                console.log(`📊 ${token.symbol}:`);
                console.log(`   SOL: ${(check.solCollected / 1e9).toFixed(6)} / ${(check.solRequired / 1e9).toFixed(6)} (${check.solProgress.toFixed(1)}%) ${check.meetsSolCondition ? '✅' : '❌'}`);
                console.log(`   Vol: ${(check.totalVolume / 1e9).toFixed(6)} / ${(check.volumeRequired / 1e9).toFixed(6)} (${check.volumeProgress.toFixed(1)}%) ${check.meetsVolumeCondition ? '✅' : '❌'}`);

                let victory = false;

                if (check.meetsAllConditions) {
                    console.log(`   🎯 BOTH CONDITIONS MET! Calling on-chain...`);
                    const result = await callCheckVictoryOnChain(connection, keeper, mint, token.symbol);
                    victory = result.victory;
                }

                results.push({
                    mint: token.mint,
                    symbol: token.symbol,
                    solCollectedSol: check.solCollected / 1e9,
                    volumeSol: check.totalVolume / 1e9,
                    meetsSol: check.meetsSolCondition,
                    meetsVolume: check.meetsVolumeCondition,
                    meetsAll: check.meetsAllConditions,
                    victory
                });

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
            network,
            checked: results.length,
            victories,
            results,
            thresholds: {
                solRequired: thresholds.TARGET_SOL_WITH_TOLERANCE / 1e9,
                volumeRequired: thresholds.VICTORY_VOLUME_LAMPORTS / 1e9,
            },
            duration
        });

    } catch (error: any) {
        console.error('❌ GET check-victory error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST HANDLER - Frontend: checks SINGLE token
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
    const startTime = Date.now();

    try {
        const body = await request.json();
        const { tokenMint } = body;

        if (!tokenMint) {
            return NextResponse.json(
                { success: false, error: 'tokenMint is required' },
                { status: 400 }
            );
        }

        console.log('\n🏆 ═══════════════════════════════════════════════════════');
        console.log('POST: CHECK VICTORY FOR SINGLE TOKEN');
        console.log(`Token: ${tokenMint}`);
        console.log('═══════════════════════════════════════════════════════\n');

        // Get token from database to determine network
        const { data: token, error: tokenError } = await supabase
            .from('tokens')
            .select('mint, symbol, network, battle_status')
            .eq('mint', tokenMint)
            .single();

        if (tokenError || !token) {
            return NextResponse.json(
                { success: false, error: 'Token not found in database' },
                { status: 404 }
            );
        }

        // Validate token is in battle
        if (token.battle_status !== BattleStatus.InBattle) {
            return NextResponse.json({
                success: false,
                error: `Token is not in battle (status: ${token.battle_status})`,
                currentStatus: token.battle_status
            }, { status: 400 });
        }

        const network = (token.network as 'mainnet' | 'devnet') || 'mainnet';
        const rpcEndpoint = RPC_ENDPOINTS[network];
        const thresholds = VICTORY_THRESHOLDS[network];

        console.log(`📊 Network: ${network}`);
        console.log(`📊 SOL Threshold: ${(thresholds.TARGET_SOL_WITH_TOLERANCE / 1e9).toFixed(6)} SOL`);
        console.log(`📊 Volume Threshold: ${(thresholds.VICTORY_VOLUME_LAMPORTS / 1e9).toFixed(6)} SOL`);

        const connection = new Connection(rpcEndpoint, 'confirmed');
        const keeper = getKeeperKeypair();
        const mint = new PublicKey(tokenMint);
        const [battleStatePDA] = getBattleStatePDA(mint);

        // Read on-chain state
        const account = await connection.getAccountInfo(battleStatePDA);
        if (!account) {
            return NextResponse.json(
                { success: false, error: 'Battle state not found on-chain' },
                { status: 404 }
            );
        }

        const state = readOnChainState(account.data);

        // Validate chain status
        if (state.battleStatus !== BattleStatus.InBattle) {
            await supabase.from('tokens').update({ battle_status: state.battleStatus }).eq('mint', tokenMint);
            return NextResponse.json({
                success: false,
                error: `Token not in battle on-chain (status: ${state.battleStatus})`,
                chainStatus: state.battleStatus,
                synced: true
            }, { status: 400 });
        }

        // ⭐ Check BOTH victory conditions
        const check = checkVictoryConditions(state, thresholds);

        console.log(`📊 ${token.symbol}:`);
        console.log(`   SOL: ${(check.solCollected / 1e9).toFixed(6)} / ${(check.solRequired / 1e9).toFixed(6)} (${check.solProgress.toFixed(1)}%) ${check.meetsSolCondition ? '✅' : '❌'}`);
        console.log(`   Vol: ${(check.totalVolume / 1e9).toFixed(6)} / ${(check.volumeRequired / 1e9).toFixed(6)} (${check.volumeProgress.toFixed(1)}%) ${check.meetsVolumeCondition ? '✅' : '❌'}`);

        // If conditions not met, return progress info
        if (!check.meetsAllConditions) {
            const missingConditions = [];
            if (!check.meetsSolCondition) missingConditions.push(`SOL (${check.solProgress.toFixed(1)}%)`);
            if (!check.meetsVolumeCondition) missingConditions.push(`Volume (${check.volumeProgress.toFixed(1)}%)`);

            return NextResponse.json({
                success: true,
                victory: false,
                message: `Victory conditions not met: ${missingConditions.join(', ')}`,
                conditions: {
                    sol: {
                        current: check.solCollected / 1e9,
                        required: check.solRequired / 1e9,
                        progress: check.solProgress,
                        met: check.meetsSolCondition,
                    },
                    volume: {
                        current: check.totalVolume / 1e9,
                        required: check.volumeRequired / 1e9,
                        progress: check.volumeProgress,
                        met: check.meetsVolumeCondition,
                    }
                },
                duration: Date.now() - startTime
            });
        }

        // ⭐ BOTH conditions met - call on-chain
        console.log('🎯 BOTH CONDITIONS MET! Calling check_victory_conditions on-chain...');
        const result = await callCheckVictoryOnChain(connection, keeper, mint, token.symbol);

        if (result.victory) {
            console.log(`🏆 VICTORY CONFIRMED for ${token.symbol}!`);
        }

        return NextResponse.json({
            success: result.success,
            victory: result.victory,
            signature: result.signature,
            error: result.error,
            conditions: {
                sol: {
                    current: check.solCollected / 1e9,
                    required: check.solRequired / 1e9,
                    progress: check.solProgress,
                    met: check.meetsSolCondition,
                },
                volume: {
                    current: check.totalVolume / 1e9,
                    required: check.volumeRequired / 1e9,
                    progress: check.volumeProgress,
                    met: check.meetsVolumeCondition,
                }
            },
            duration: Date.now() - startTime
        });

    } catch (error: any) {
        console.error('❌ POST check-victory error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// Vercel Cron config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
