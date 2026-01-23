// ═══════════════════════════════════════════════════════════════════════════════
// Manual Token Sync API - For debugging when webhooks don't work
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { syncSingleToken, NetworkType } from '@/lib/indexer/sync-single-token';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ mint: string }> }
) {
    const { mint } = await params;

    if (!mint || mint.length < 32) {
        return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 });
    }

    // ⭐ FIX: Read network from query params (default to mainnet)
    const url = new URL(request.url);
    const network = (url.searchParams.get('network') as NetworkType) || 'mainnet';

    console.log(`🔄 Manual sync requested for: ${mint} (network: ${network})`);

    try {
        // ⭐ FIX: Pass network option to syncSingleToken
        const result = await syncSingleToken(mint, { network });

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: `Token ${mint.slice(0, 8)}... synced successfully on ${network}`,
                mint,
                network
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error,
                mint,
                network
            }, { status: 500 });
        }
    } catch (error) {
        console.error('❌ Manual sync error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            mint,
            network
        }, { status: 500 });
    }
}