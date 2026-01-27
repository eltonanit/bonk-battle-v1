/**
 * BONK BATTLE - Finalize Duel (CRON 2)
 * GET /api/battles/finalize-duel
 *
 * Scans VictoryPending tokens and finalizes the duel.
 * Transfers spoils from loser to winner.
 * Updates: VictoryPending → Listed
 *
 * Run every 2 minutes via Vercel Cron
 *
 * ⭐ SECURITY FIX: Added CRON_SECRET authentication
 * ⭐ POTENTIALS.FUN: This route is DISABLED via feature flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { FEATURES } from '@/config/features';
import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    Keypair,
    SystemProgram,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const PROGRAM_ID = new PublicKey('F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD');
const TREASURY_WALLET = new PublicKey('5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
const V1_OFFSET_BATTLE_STATUS = 65;
const V1_OFFSET_OPPONENT_MINT = 66;

// Anchor discriminator for finalize_duel
const FINALIZE_DUEL_DISCRIMINATOR = Buffer.from([57, 165, 69, 195, 50, 206, 212, 134]);

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ SECURITY: Authentication Check (NEW)
// ═══════════════════════════════════════════════════════════════════════════

function verifyAuth(request: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;

    // If no CRON_SECRET configured, allow requests (backward compatible)
    // ⚠️ Set CRON_SECRET in production!
    if (!cronSecret) {
        console.warn('⚠️ CRON_SECRET not configured - allowing request');
        return true;
    }

    // Check Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader === `Bearer ${cronSecret}`) {
        return true;
    }

    // Check Vercel Cron header (automatically added by Vercel Cron)
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    if (vercelCronHeader === '1') {
        return true;
    }

    return false;
}

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

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function finalizeDuelForToken(
    connection: Connection,
    keeper: Keypair,
    winnerMint: PublicKey,
    loserMint: PublicKey,
    winnerSymbol: string,
    loserSymbol: string
): Promise<{ success: boolean; signature?: string; error?: string }> {

    const [winnerStatePDA] = getBattleStatePDA(winnerMint);
    const [loserStatePDA] = getBattleStatePDA(loserMint);

    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: winnerStatePDA, isSigner: false, isWritable: true },
            { pubkey: loserStatePDA, isSigner: false, isWritable: true },
            { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true },
            { pubkey: keeper.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: FINALIZE_DUEL_DISCRIMINATOR,
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

        console.log(`⚔️ Duel finalized! ${winnerSymbol} defeated ${loserSymbol}`);
        console.log(`   Signature: ${signature}`);

        // Update WINNER in database: VictoryPending → Listed
        await supabase.from('tokens').update({
            battle_status: BattleStatus.Listed,
            listing_timestamp: new Date().toISOString(),
        }).eq('mint', winnerMint.toString());

        // Update LOSER in database: → Qualified (can battle again)
        await supabase.from('tokens').update({
            battle_status: BattleStatus.Qualified,
            opponent_mint: null,
            battle_end_timestamp: new Date().toISOString(),
        }).eq('mint', loserMint.toString());

        // Update battles table
        await supabase.from('battles').update({
            status: 'completed',
            winner_mint: winnerMint.toString(),
            ended_at: new Date().toISOString(),
        }).or(`token_a_mint.eq.${winnerMint.toString()},token_b_mint.eq.${winnerMint.toString()}`);

        // Log activity - Battle Won
        await supabase.from('activity_feed').insert({
            wallet: 'system',
            action_type: 'battle_win',
            token_mint: winnerMint.toString(),
            token_symbol: winnerSymbol,
            opponent_mint: loserMint.toString(),
            opponent_symbol: loserSymbol,
            metadata: { signature },
            created_at: new Date().toISOString()
        });

        return { success: true, signature };

    } catch (error: any) {
        console.error(`❌ Finalize duel failed:`, error.message);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
    const startTime = Date.now();

    // ⭐ POTENTIALS.FUN: Feature disabled
    if (!FEATURES.SHOW_FINALIZE_DUEL_API) {
        console.log('⚠️ finalize-duel API is disabled (POTENTIALS.FUN mode)');
        return NextResponse.json({
            success: false,
            error: 'Feature disabled',
            message: 'Battles are not active in this version. Single token graduation is used instead.'
        }, { status: 404 });
    }

    // ⭐ SECURITY: Verify authentication (NEW)
    if (!verifyAuth(request)) {
        console.log('❌ Unauthorized access attempt to finalize-duel');
        return NextResponse.json({
            error: 'Unauthorized',
            message: 'Valid CRON_SECRET required'
        }, { status: 401 });
    }

    console.log('\n⚔️ ═══════════════════════════════════════════════════════');
    console.log('CRON 2: FINALIZE DUEL');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const keeper = getKeeperKeypair();

        // Get all VictoryPending tokens from database
        const { data: victoryPendingTokens, error } = await supabase
            .from('tokens')
            .select('mint, symbol, opponent_mint')
            .eq('battle_status', BattleStatus.VictoryPending);

        if (error || !victoryPendingTokens?.length) {
            console.log('📭 No VictoryPending tokens found');
            return NextResponse.json({
                success: true,
                message: 'No VictoryPending tokens to finalize',
                processed: 0,
                duration: Date.now() - startTime
            });
        }

        console.log(`📊 Processing ${victoryPendingTokens.length} VictoryPending token(s)...`);

        const results: Array<{
            winner: string;
            loser: string;
            success: boolean;
            error?: string;
        }> = [];

        for (const token of victoryPendingTokens) {
            try {
                const winnerMint = new PublicKey(token.mint);

                // Get opponent from chain (more reliable than DB)
                const [battleStatePDA] = getBattleStatePDA(winnerMint);
                const account = await connection.getAccountInfo(battleStatePDA);

                if (!account) {
                    console.warn(`⚠️ No battle state for ${token.symbol}`);
                    continue;
                }

                // Validate chain status
                const chainStatus = account.data[V1_OFFSET_BATTLE_STATUS];
                if (chainStatus !== BattleStatus.VictoryPending) {
                    console.log(`⏭️ ${token.symbol}: chain status ${chainStatus} (not VictoryPending)`);
                    await supabase.from('tokens').update({ battle_status: chainStatus }).eq('mint', token.mint);
                    continue;
                }

                // Get opponent mint from chain
                const opponentBytes = account.data.slice(V1_OFFSET_OPPONENT_MINT, V1_OFFSET_OPPONENT_MINT + 32);
                const loserMint = new PublicKey(opponentBytes);

                if (loserMint.equals(PublicKey.default)) {
                    console.warn(`⚠️ ${token.symbol}: No opponent found`);
                    continue;
                }

                // Get loser symbol from DB
                const { data: loserData } = await supabase
                    .from('tokens')
                    .select('symbol')
                    .eq('mint', loserMint.toString())
                    .single();

                const loserSymbol = loserData?.symbol || 'UNKNOWN';

                console.log(`⚔️ Finalizing: ${token.symbol} vs ${loserSymbol}...`);

                const result = await finalizeDuelForToken(
                    connection,
                    keeper,
                    winnerMint,
                    loserMint,
                    token.symbol,
                    loserSymbol
                );

                results.push({
                    winner: token.symbol,
                    loser: loserSymbol,
                    success: result.success,
                    error: result.error
                });

                // Small delay to avoid rate limits
                await sleep(500);

            } catch (err: any) {
                console.error(`❌ Error processing ${token.symbol}:`, err.message);
                results.push({
                    winner: token.symbol,
                    loser: 'UNKNOWN',
                    success: false,
                    error: err.message
                });
            }
        }

        const successful = results.filter(r => r.success).length;
        const duration = Date.now() - startTime;

        console.log(`\n✅ Finalize complete: ${successful}/${results.length} duels in ${duration}ms`);

        return NextResponse.json({
            success: true,
            message: successful > 0 ? `${successful} duel(s) finalized!` : 'No duels finalized',
            processed: results.length,
            successful,
            results,
            duration
        });

    } catch (error: any) {
        console.error('❌ CRON 2 Error:', error);
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