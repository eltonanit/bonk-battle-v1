// app/src/app/api/webhooks/helius/route.ts
// ═══════════════════════════════════════════════════════════════════════════
// BONK BATTLE V2 - Helius Webhook Handler
// Fixed: Detect buy/sell from transfers, not description
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { syncSingleToken } from '@/lib/indexer/sync-single-token';
import { createClient } from '@supabase/supabase-js';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq';
const TREASURY_WALLET = '5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf';

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
    instructions?: Array<{
        programId: string;
        accounts: string[];
        data: string;
    }>;
}

/**
 * Registra attività nel feed sociale
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
        console.log(`💾 Attempting to save trade: ${params.tradeType} ${params.tokenMint.slice(0, 8)}...`);

        let solPriceUsd = 240;
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
                signal: AbortSignal.timeout(3000)
            });
            const data = await res.json();
            solPriceUsd = data?.solana?.usd || 240;
        } catch {
            console.log('⚠️ Using fallback SOL price: $240');
        }

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

        if (error) {
            if (error.code === '23505') {
                console.log(`⚠️ Trade already exists: ${params.signature.slice(0, 8)}...`);
            } else {
                console.error('❌ Error saving trade:', error);
            }
        } else {
            console.log(`✅ Trade saved: ${params.tradeType.toUpperCase()} ${params.tokenMint.slice(0, 8)}... | ${(params.solAmount / 1e9).toFixed(4)} SOL | $${tradeValueUsd.toFixed(2)}`);
        }

        return !error || error.code === '23505';
    } catch (err) {
        console.error('❌ saveUserTrade error:', err);
        return false;
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
 * Detect event type from transfers (more reliable than description)
 */
function detectEventType(event: HeliusWebhookEvent): {
    type: 'buy' | 'sell' | 'create' | 'unknown';
    tokenMint: string | null;
    solAmount: number;
    tokenAmount: number;
} {
    const result = {
        type: 'unknown' as 'buy' | 'sell' | 'create' | 'unknown',
        tokenMint: null as string | null,
        solAmount: 0,
        tokenAmount: 0,
    };

    // Check if this involves our program
    const involvesProgram = event.instructions?.some(ix => ix.programId === PROGRAM_ID) ||
        event.accountData?.some(ad => ad.tokenBalanceChanges?.length > 0);

    if (!involvesProgram && !event.tokenTransfers?.length) {
        return result;
    }

    // Get token transfer info
    const tokenTransfer = event.tokenTransfers?.[0];
    if (tokenTransfer) {
        result.tokenMint = tokenTransfer.mint;
        result.tokenAmount = Math.floor(tokenTransfer.tokenAmount * 1e9); // Convert to base units
    }

    // Get SOL transfer info
    const feePayer = event.feePayer;

    // Look for SOL transfer FROM user (buy) or TO user (sell)
    const solTransferOut = event.nativeTransfers?.find(nt =>
        nt.fromUserAccount === feePayer &&
        nt.toUserAccount !== feePayer &&
        nt.amount > 0
    );

    const solTransferIn = event.nativeTransfers?.find(nt =>
        nt.toUserAccount === feePayer &&
        nt.fromUserAccount !== feePayer &&
        nt.amount > 0
    );

    // Determine if buy or sell based on SOL flow
    if (solTransferOut && tokenTransfer) {
        // User sent SOL and received tokens = BUY
        // Exclude treasury fee transfers
        if (solTransferOut.toUserAccount !== TREASURY_WALLET) {
            result.type = 'buy';
            result.solAmount = solTransferOut.amount;
            console.log(`🔍 Detected BUY: ${feePayer.slice(0, 6)}... sent ${(solTransferOut.amount / 1e9).toFixed(4)} SOL`);
        }
    } else if (solTransferIn && tokenTransfer) {
        // User received SOL (from selling tokens) = SELL
        result.type = 'sell';
        result.solAmount = solTransferIn.amount;
        console.log(`🔍 Detected SELL: ${feePayer.slice(0, 6)}... received ${(solTransferIn.amount / 1e9).toFixed(4)} SOL`);
    } else if (tokenTransfer && !solTransferOut && !solTransferIn) {
        // Token transfer without SOL = might be create (minting)
        const desc = event.description?.toLowerCase() || '';
        if (desc.includes('create') || desc.includes('initialize') || desc.includes('mint')) {
            result.type = 'create';
            console.log(`🔍 Detected CREATE: ${result.tokenMint?.slice(0, 8)}...`);
        }
    }

    // Fallback: check description
    if (result.type === 'unknown') {
        const desc = event.description?.toLowerCase() || '';
        if (desc.includes('buy') || desc.includes('purchase')) {
            result.type = 'buy';
        } else if (desc.includes('sell')) {
            result.type = 'sell';
        } else if (desc.includes('create') || desc.includes('initialize')) {
            result.type = 'create';
        }
    }

    return result;
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
            console.log(`📋 Processing event: ${event.signature.slice(0, 8)}... | Type: ${event.type} | Desc: ${event.description?.slice(0, 50) || 'none'}`);

            // Detect event type from transfers
            const detected = detectEventType(event);
            console.log(`🔍 Event detected as: ${detected.type} | Mint: ${detected.tokenMint?.slice(0, 8) || 'none'} | SOL: ${(detected.solAmount / 1e9).toFixed(4)}`);

            // Collect mints for sync
            if (detected.tokenMint) {
                mints.add(detected.tokenMint);
            }
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

            // Get token info for activity feed
            let tokenInfo: { symbol: string; image: string } | null = null;
            if (detected.tokenMint) {
                tokenInfo = await getTokenInfo(detected.tokenMint);
            }

            // Process based on detected type
            if (detected.type === 'buy' && detected.tokenMint) {
                // Log activity
                await logActivity({
                    wallet: event.feePayer,
                    actionType: 'buy',
                    tokenMint: detected.tokenMint,
                    tokenSymbol: tokenInfo?.symbol,
                    tokenImage: tokenInfo?.image,
                    metadata: {
                        signature: event.signature,
                        sol_amount: detected.solAmount
                    }
                });
                activitiesLogged++;

                // Save trade
                const saved = await saveUserTrade({
                    walletAddress: event.feePayer,
                    tokenMint: detected.tokenMint,
                    signature: event.signature,
                    tradeType: 'buy',
                    solAmount: detected.solAmount,
                    tokenAmount: detected.tokenAmount,
                    slot: event.slot,
                    timestamp: event.timestamp,
                });
                if (saved) tradesSaved++;
            }

            if (detected.type === 'sell' && detected.tokenMint) {
                // Log activity
                await logActivity({
                    wallet: event.feePayer,
                    actionType: 'sell',
                    tokenMint: detected.tokenMint,
                    tokenSymbol: tokenInfo?.symbol,
                    tokenImage: tokenInfo?.image,
                    metadata: {
                        signature: event.signature,
                        sol_amount: detected.solAmount
                    }
                });
                activitiesLogged++;

                // Save trade
                const saved = await saveUserTrade({
                    walletAddress: event.feePayer,
                    tokenMint: detected.tokenMint,
                    signature: event.signature,
                    tradeType: 'sell',
                    solAmount: detected.solAmount,
                    tokenAmount: detected.tokenAmount,
                    slot: event.slot,
                    timestamp: event.timestamp,
                });
                if (saved) tradesSaved++;
            }

            if (detected.type === 'create' && detected.tokenMint) {
                await logActivity({
                    wallet: event.feePayer,
                    actionType: 'create_token',
                    tokenMint: detected.tokenMint,
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
                        console.log(`✅ Synced: ${mint.slice(0, 8)}...`);
                    } else {
                        console.error(`❌ Failed: ${mint.slice(0, 8)}... - ${result.error}`);
                    }
                    return { mint, success: result.success };
                } catch (err) {
                    console.error(`❌ Error syncing ${mint.slice(0, 8)}...:`, err);
                    return { mint, success: false };
                }
            })
        );

        const successCount = results.filter(r => r.success).length;
        const duration = Date.now() - startTime;

        console.log(`⚡ Webhook completed in ${duration}ms | Synced: ${successCount}/${mintArray.length} | Activities: ${activitiesLogged} | Trades: ${tradesSaved}`);

        // 🏆 Auto-detect winners after trades
        if (tradesSaved > 0) {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

                // Fire and forget - non blocca il webhook
                fetch(`${baseUrl}/api/battles/auto-detect-winners`, { method: 'GET' })
                    .then(res => res.json())
                    .then(data => {
                        if (data.potentialWinners?.length > 0) {
                            console.log(`🏆 Found ${data.potentialWinners.length} winner(s)!`);
                        }
                    })
                    .catch(err => console.error('⚠️ Auto-detect winners error:', err.message));
            } catch {
                // Silently fail - non deve bloccare il webhook
            }
        }

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
        endpoint: 'helius-webhook-v2',
        program: PROGRAM_ID,
        features: ['token-sync', 'trade-tracking', 'activity-feed'],
        timestamp: new Date().toISOString()
    });
}