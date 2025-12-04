// ═══════════════════════════════════════════════════════════════════════════════
// Manual Token Sync API - For debugging when webhooks don't work
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { syncSingleToken } from '@/lib/indexer/sync-single-token';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ mint: string }> }
) {
    const { mint } = await params;

    if (!mint || mint.length < 32) {
        return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 });
    }

    console.log(`🔄 Manual sync requested for: ${mint}`);

    try {
        const result = await syncSingleToken(mint);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: `Token ${mint.slice(0, 8)}... synced successfully`,
                mint
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error,
                mint
            }, { status: 500 });
        }
    } catch (error) {
        console.error('❌ Manual sync error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            mint
        }, { status: 500 });
    }
}
