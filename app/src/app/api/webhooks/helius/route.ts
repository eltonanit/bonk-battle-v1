// app/src/app/api/webhooks/helius/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncSingleToken } from '@/lib/indexer/sync-single-token';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';

/**
 * Helius Webhook Handler
 * 
 * Receives real-time notifications from Helius when:
 * - Token created (createBattleToken)
 * - Token bought (buyToken)
 * - Token sold (sellToken)
 * - Battle started (startBattle)
 * - Battle won (finalizeDuel)
 * 
 * Configuration:
 * 1. Go to https://dashboard.helius.dev
 * 2. Create webhook with URL: https://your-domain.vercel.app/api/webhooks/helius
 * 3. Select "Account" webhook type
 * 4. Add program ID: 6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq
 * 5. Select events: all (or specific: accountUpdate)
 */

// Webhook secret for verification (optional but recommended)
const WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET;

interface HeliusWebhookEvent {
    accountData: Array<{
        account: string;
        nativeBalanceChange: number;
        tokenBalanceChanges: Array<{
            mint: string;
            rawTokenAmount: {
                tokenAmount: string;
                decimals: number;
            };
            userAccount: string;
        }>;
    }>;
    description: string;
    type: string;
    source: string;
    fee: number;
    feePayer: string;
    signature: string;
    slot: number;
    timestamp: number;
    nativeTransfers: Array<{
        fromUserAccount: string;
        toUserAccount: string;
        amount: number;
    }>;
    tokenTransfers: Array<{
        fromUserAccount: string;
        toUserAccount: string;
        fromTokenAccount: string;
        toTokenAccount: string;
        tokenAmount: number;
        mint: string;
    }>;
    events: any;
}

/**
 * Extract mint address from webhook event
 */
function extractMintAddresses(event: HeliusWebhookEvent): string[] {
    const mints = new Set<string>();

    // From token balance changes
    event.accountData?.forEach(account => {
        account.tokenBalanceChanges?.forEach(change => {
            if (change.mint) {
                mints.add(change.mint);
            }
        });
    });

    // From token transfers
    event.tokenTransfers?.forEach(transfer => {
        if (transfer.mint) {
            mints.add(transfer.mint);
        }
    });

    return Array.from(mints);
}

/**
 * Detect event type from transaction
 */
function detectEventType(event: HeliusWebhookEvent): string {
    const description = event.description?.toLowerCase() || '';

    if (description.includes('create') || description.includes('initialize')) {
        return 'token_created';
    }
    if (description.includes('buy') || description.includes('purchase')) {
        return 'token_bought';
    }
    if (description.includes('sell')) {
        return 'token_sold';
    }
    if (description.includes('battle') && description.includes('start')) {
        return 'battle_started';
    }
    if (description.includes('battle') && description.includes('won')) {
        return 'battle_won';
    }

    return 'unknown';
}

export async function POST(req: NextRequest) {
    const startTime = Date.now();

    try {
        // 1. Verify webhook secret (if configured)
        if (WEBHOOK_SECRET) {
            const authHeader = req.headers.get('authorization');
            if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
                console.warn('⚠️ Webhook: Invalid authorization');
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                );
            }
        }

        // 2. Parse webhook payload
        const events: HeliusWebhookEvent[] = await req.json();

        console.log(`📥 Webhook received ${events.length} event(s)`);

        if (!Array.isArray(events) || events.length === 0) {
            console.warn('⚠️ Webhook: Empty or invalid payload');
            return NextResponse.json(
                { error: 'Invalid payload' },
                { status: 400 }
            );
        }

        // 3. Process each event
        const results = [];

        for (const event of events) {
            try {
                // Extract mint addresses
                const mints = extractMintAddresses(event);

                if (mints.length === 0) {
                    console.log('ℹ️ No mints found in event, skipping');
                    continue;
                }

                const eventType = detectEventType(event);

                console.log(`🔍 Event type: ${eventType}`);
                console.log(`🪙 Mints to sync: ${mints.join(', ')}`);

                // Sync each mint
                for (const mint of mints) {
                    const result = await syncSingleToken(mint);

                    results.push({
                        mint,
                        eventType,
                        signature: event.signature,
                        success: result.success,
                        error: result.error
                    });

                    if (result.success) {
                        console.log(`✅ Synced ${mint}`);
                    } else {
                        console.error(`❌ Failed to sync ${mint}: ${result.error}`);
                    }
                }

            } catch (eventErr) {
                console.error('❌ Error processing event:', eventErr);
                results.push({
                    error: eventErr instanceof Error ? eventErr.message : 'Unknown error',
                    success: false
                });
            }
        }

        const duration = Date.now() - startTime;

        console.log(`✅ Webhook processed in ${duration}ms`);
        console.log(`📊 Results: ${results.filter(r => r.success).length}/${results.length} succeeded`);

        return NextResponse.json({
            success: true,
            processed: events.length,
            results,
            duration
        });

    } catch (err) {
        console.error('❌ Webhook handler error:', err);

        return NextResponse.json(
            {
                error: err instanceof Error ? err.message : 'Internal server error',
                success: false
            },
            { status: 500 }
        );
    }
}

// Health check endpoint
export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        endpoint: 'helius-webhook',
        program: BONK_BATTLE_PROGRAM_ID.toString(),
        timestamp: new Date().toISOString()
    });
}