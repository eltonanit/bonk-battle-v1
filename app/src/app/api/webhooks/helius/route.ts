// app/src/app/api/webhooks/helius/route.ts
// UPDATED: Added Activity Feed tracking for social feed

import { NextRequest, NextResponse } from 'next/server';
import { syncSingleToken } from '@/lib/indexer/sync-single-token';
import { createClient } from '@supabase/supabase-js';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface HeliusWebhookEvent {
    accountData?: {
        account: string;
        nativeBalanceChange: number;
        tokenBalanceChanges: Array<{
            mint: string;
            rawTokenAmount: {
                decimals: number;
                tokenAmount: string;
            };
            tokenAccount: string;
            userAccount: string;
        }>;
    }[];
    description: string;
    type: string;
    source: string;
    fee: number;
    feePayer: string;
    signature: string;
    slot: number;
    timestamp: number;
    nativeTransfers?: Array<{
        amount: number;
        fromUserAccount: string;
        toUserAccount: string;
    }>;
    tokenTransfers?: Array<{
        fromTokenAccount: string;
        fromUserAccount: string;
        mint: string;
        toTokenAccount: string;
        toUserAccount: string;
        tokenAmount: number;
        tokenStandard: string;
    }>;
    events?: Record<string, unknown>;
}

/**
 * ⭐ Registra attività nel feed sociale
 */
async function logActivity(params: {
    wallet: string;
    actionType: 'create_token' | 'buy' | 'sell' | 'qualify' | 'battle_start' | 'battle_win';
    tokenMint: string;
    tokenSymbol?: string;
    tokenImage?: string;
    opponentMint?: string;
    opponentSymbol?: string;
    metadata?: Record<string, unknown>;
}) {
    try {
        const { error } = await supabase.from('activity_feed').insert({
            wallet: params.wallet,
            action_type: params.actionType,
            token_mint: params.tokenMint,
            token_symbol: params.tokenSymbol || null,
            token_image: params.tokenImage || null,
            opponent_mint: params.opponentMint || null,
            opponent_symbol: params.opponentSymbol || null,
            metadata: params.metadata || null
        });

        if (error && error.code !== '23505') {
            console.error('❌ Activity log error:', error);
        } else if (!error) {
            console.log(`📢 Activity: ${params.wallet.slice(0, 6)}... ${params.actionType} ${params.tokenSymbol || params.tokenMint.slice(0, 8)}`);
        }
    } catch (err) {
        console.error('❌ logActivity error:', err);
    }
}

/**
 * Salva un trade nel database per P/L tracking
 */
async function saveUserTrade(params: {
    walletAddress: string;
    tokenMint: string;
    signature: string;
    tradeType: 'buy' | 'sell';
    solAmount: number;
    tokenAmount: number;
    slot: number;
    timestamp: number;
}) {
    try {
        let solPriceUsd = 240;
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await res.json();
            solPriceUsd = data?.solana?.usd || 240;
        } catch { /* use fallback */ }

        const tradeValueUsd = (params.solAmount / 1e9) * solPriceUsd;
        const tokenPriceSol = params.tokenAmount > 0 ? params.solAmount / params.tokenAmount : 0;

        const { error } = await supabase.from('user_trades').insert({
            wallet_address: params.walletAddress,
            token_mint: params.tokenMint,
            signature: params.signature,
            trade_type: params.tradeType,
            sol_amount: params.solAmount,
            token_amount: params.tokenAmount,
            sol_price_usd: solPriceUsd,
            token_price_sol: tokenPriceSol,
            trade_value_usd: tradeValueUsd,
            block_time: new Date(params.timestamp * 1000),
            slot: params.slot,
        });

        if (error && error.code !== '23505') {
            console.error('❌ Error saving trade:', error);
        } else if (!error) {
            console.log(`💾 Trade saved: ${params.tradeType.toUpperCase()} ${params.tokenMint.slice(0, 8)}... | ${(params.solAmount / 1e9).toFixed(4)} SOL | $${tradeValueUsd.toFixed(2)}`);
        }
    } catch (err) {
        console.error('❌ saveUserTrade error:', err);
    }
}

/**
 * Fetch token info from DB for activity feed
 */
async function getTokenInfo(mint: string): Promise<{ symbol: string; image: string } | null> {
    try {
        const { data } = await supabase
            .from('tokens')
            .select('symbol, image')
            .eq('mint', mint)
            .single();
        return data;
    } catch {
        return null;
    }
}

/**
 * POST /api/webhooks/helius
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const authHeader = request.headers.get('authorization');
        const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET;

        if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
            console.warn('⚠️ Webhook auth mismatch (continuing anyway)');
        }

        const payload = await request.json() as HeliusWebhookEvent[];

        if (!Array.isArray(payload) || payload.length === 0) {
            return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
        }

        console.log(`📥 Webhook received ${payload.length} event(s)`);

        const mints = new Set<string>();
        let tradesSaved = 0;
        let activitiesLogged = 0;

        for (const event of payload) {
            // Collect mints
            if (event.tokenTransfers) {
                for (const transfer of event.tokenTransfers) {
                    if (transfer.mint) mints.add(transfer.mint);
                }
            }
            if (event.accountData) {
                for (const account of event.accountData) {
                    if (account.tokenBalanceChanges) {
                        for (const change of account.tokenBalanceChanges) {
                            if (change.mint) mints.add(change.mint);
                        }
                    }
                }
            }

            const eventType = detectEventType(event);
            console.log(`🔍 Event type: ${eventType} | Signature: ${event.signature.slice(0, 8)}...`);

            // Get token info for activity feed
            const tokenMint = event.tokenTransfers?.[0]?.mint;
            let tokenInfo: { symbol: string; image: string } | null = null;

            if (tokenMint) {
                tokenInfo = await getTokenInfo(tokenMint);
            }

            // ⭐ LOG ACTIVITIES TO FEED
            if (eventType === 'token_created' && tokenMint) {
                await logActivity({
                    wallet: event.feePayer,
                    actionType: 'create_token',
                    tokenMint: tokenMint,
                    tokenSymbol: tokenInfo?.symbol,
                    tokenImage: tokenInfo?.image,
                    metadata: { signature: event.signature }
                });
                activitiesLogged++;
            }

            if (eventType === 'token_bought' && tokenMint) {
                const solTransfer = event.nativeTransfers?.find(nt => nt.fromUserAccount === event.feePayer);

                await logActivity({
                    wallet: event.feePayer,
                    actionType: 'buy',
                    tokenMint: tokenMint,
                    tokenSymbol: tokenInfo?.symbol,
                    tokenImage: tokenInfo?.image,
                    metadata: {
                        signature: event.signature,
                        sol_amount: solTransfer?.amount || 0
                    }
                });
                activitiesLogged++;

                // Save trade for P/L
                if (solTransfer && event.tokenTransfers?.[0]) {
                    await saveUserTrade({
                        walletAddress: event.feePayer,
                        tokenMint: tokenMint,
                        signature: event.signature,
                        tradeType: 'buy',
                        solAmount: Math.abs(solTransfer.amount),
                        tokenAmount: Math.floor(event.tokenTransfers[0].tokenAmount * 1e6),
                        slot: event.slot,
                        timestamp: event.timestamp,
                    });
                    tradesSaved++;
                }
            }

            if (eventType === 'token_sold' && tokenMint) {
                const solTransfer = event.nativeTransfers?.find(nt => nt.toUserAccount === event.feePayer);

                await logActivity({
                    wallet: event.feePayer,
                    actionType: 'sell',
                    tokenMint: tokenMint,
                    tokenSymbol: tokenInfo?.symbol,
                    tokenImage: tokenInfo?.image,
                    metadata: {
                        signature: event.signature,
                        sol_amount: solTransfer?.amount || 0
                    }
                });
                activitiesLogged++;

                // Save trade for P/L
                if (solTransfer && event.tokenTransfers?.[0]) {
                    await saveUserTrade({
                        walletAddress: event.feePayer,
                        tokenMint: tokenMint,
                        signature: event.signature,
                        tradeType: 'sell',
                        solAmount: Math.abs(solTransfer.amount),
                        tokenAmount: Math.floor(event.tokenTransfers[0].tokenAmount * 1e6),
                        slot: event.slot,
                        timestamp: event.timestamp,
                    });
                    tradesSaved++;
                }
            }

            if (eventType === 'battle_event' && tokenMint) {
                // TODO: Parse opponent from event when battle system is complete
                await logActivity({
                    wallet: event.feePayer,
                    actionType: 'battle_start',
                    tokenMint: tokenMint,
                    tokenSymbol: tokenInfo?.symbol,
                    tokenImage: tokenInfo?.image,
                    metadata: { signature: event.signature }
                });
                activitiesLogged++;
            }
        }

        const mintArray = Array.from(mints);

        if (mintArray.length === 0) {
            console.log('⚠️ No mints found in payload');
            return NextResponse.json({
                success: true,
                message: 'No mints to sync',
                activitiesLogged,
                tradesSaved,
                duration: Date.now() - startTime
            });
        }

        console.log(`🪙 Mints to sync: ${mintArray.join(', ')}`);

        // Sync tokens
        const results = await Promise.all(
            mintArray.map(async (mint) => {
                try {
                    const result = await syncSingleToken(mint);
                    if (result.success) {
                        console.log(`✅ Synced: ${mint}`);
                    } else {
                        console.error(`❌ Failed: ${mint} - ${result.error}`);
                    }
                    return { mint, success: result.success };
                } catch (err) {
                    console.error(`❌ Error syncing ${mint}:`, err);
                    return { mint, success: false };
                }
            })
        );

        const successCount = results.filter(r => r.success).length;
        const duration = Date.now() - startTime;

        console.log(`⚡ Webhook completed in ${duration}ms | Activities: ${activitiesLogged} | Trades: ${tradesSaved}`);

        return NextResponse.json({
            success: true,
            synced: successCount,
            total: mintArray.length,
            activitiesLogged,
            tradesSaved,
            mints: mintArray,
            duration
        });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

/**
 * GET /api/webhooks/helius - Health check
 */
export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        endpoint: 'helius-webhook',
        program: PROGRAM_ID,
        features: ['token-sync', 'pl-tracking', 'activity-feed'],
        timestamp: new Date().toISOString()
    });
}

/**
 * Detect the type of event
 */
function detectEventType(event: HeliusWebhookEvent): string {
    const desc = event.description?.toLowerCase() || '';

    if (desc.includes('create') || desc.includes('initialize')) {
        return 'token_created';
    }
    if (desc.includes('buy') || desc.includes('purchase')) {
        return 'token_bought';
    }
    if (desc.includes('sell')) {
        return 'token_sold';
    }
    if (desc.includes('battle')) {
        return 'battle_event';
    }

    return 'unknown';
}