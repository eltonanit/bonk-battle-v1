// app/src/app/api/cron/sync-tokens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { syncTokensToSupabase } from '@/lib/indexer/sync-tokens';

/**
 * Cron Job: Full Token Sync
 * 
 * Runs periodic full sync as fallback for webhook
 * 
 * Setup with Vercel Cron:
 * 1. Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-tokens",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 * 
 * Or use external cron service (cron-job.org, EasyCron):
 * - URL: https://your-domain.vercel.app/api/cron/sync-tokens
 * - Method: GET
 * - Schedule: Every 10 minutes (*/10 * * * *)
 * - Authorization: Bearer YOUR_CRON_SECRET
 */

// Cron secret for authorization
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
    const startTime = Date.now();

    try {
        // 1. Verify cron secret
        const authHeader = req.headers.get('authorization');

        if (CRON_SECRET) {
            if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
                console.warn('⚠️ Cron: Invalid authorization');
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                );
            }
        }

        console.log('🔄 Cron: Starting full token sync...');

        // 2. Run full sync
        const result = await syncTokensToSupabase();

        const duration = Date.now() - startTime;

        console.log(`✅ Cron: Sync completed in ${duration}ms`);
        console.log(`📊 Synced ${result.count} tokens`);

        return NextResponse.json({
            success: true,
            tokensSync: result.count,
            duration,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('❌ Cron: Sync failed:', err);

        return NextResponse.json(
            {
                error: err instanceof Error ? err.message : 'Sync failed',
                success: false,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}

// Also support POST for manual triggers
export async function POST(req: NextRequest) {
    return GET(req);
}