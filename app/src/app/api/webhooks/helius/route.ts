// app/src/app/api/webhooks/helius/route.ts
// FIXED: Immediate response + background sync to avoid Helius timeout

import { NextRequest, NextResponse } from 'next/server';
import { syncSingleToken } from '@/lib/indexer/sync-single-token';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq';

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
 * POST /api/webhooks/helius
 * Receives real-time events from Helius when tokens are created/traded
 * 
 * CRITICAL: Responds immediately to avoid Helius timeout!
 * Sync happens in background.
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Verify authorization (optional)
        const authHeader = request.headers.get('authorization');
        const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET;

        if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
            // Log but don't block - Helius might not send auth
            console.warn('⚠️ Webhook auth mismatch (continuing anyway)');
        }

        // Parse payload
        const payload = await request.json() as HeliusWebhookEvent[];

        if (!Array.isArray(payload) || payload.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Invalid payload'
            }, { status: 400 });
        }

        console.log(`📥 Webhook received ${payload.length} event(s)`);

        // Extract unique mint addresses from events
        const mints = new Set<string>();

        for (const event of payload) {
            // From tokenTransfers
            if (event.tokenTransfers) {
                for (const transfer of event.tokenTransfers) {
                    if (transfer.mint) {
                        mints.add(transfer.mint);
                    }
                }
            }

            // From accountData tokenBalanceChanges
            if (event.accountData) {
                for (const account of event.accountData) {
                    if (account.tokenBalanceChanges) {
                        for (const change of account.tokenBalanceChanges) {
                            if (change.mint) {
                                mints.add(change.mint);
                            }
                        }
                    }
                }
            }

            // Detect event type for logging
            const eventType = detectEventType(event);
            console.log(`🔍 Event type: ${eventType}`);
        }

        const mintArray = Array.from(mints);

        if (mintArray.length === 0) {
            console.log('⚠️ No mints found in payload');
            return NextResponse.json({
                success: true,
                message: 'No mints to sync',
                duration: Date.now() - startTime
            });
        }

        console.log(`🪙 Mints to sync: ${mintArray.join(', ')}`);

        // ============================================
        // Sync tokens (await to ensure completion on Vercel)
        // ============================================

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

        // Respond with sync results
        const duration = Date.now() - startTime;
        console.log(`⚡ Webhook completed in ${duration}ms`);

        return NextResponse.json({
            success: true,
            synced: successCount,
            total: mintArray.length,
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
 * GET /api/webhooks/helius
 * Health check endpoint
 */
export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        endpoint: 'helius-webhook',
        program: PROGRAM_ID,
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