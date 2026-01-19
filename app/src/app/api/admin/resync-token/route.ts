// app/src/app/api/admin/resync-token/route.ts
// ═══════════════════════════════════════════════════════════════════════════
// Manual re-sync endpoint for debugging
// Usage: POST /api/admin/resync-token with { "mint": "...", "network": "mainnet" | "devnet" }
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { syncSingleToken, NetworkType } from '@/lib/indexer/sync-single-token';

// Default network from env
const DEFAULT_NETWORK: NetworkType = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? 'devnet' : 'mainnet';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { mint, network: networkParam } = body;

        if (!mint || typeof mint !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'Missing or invalid mint address'
            }, { status: 400 });
        }

        // ⭐ Network from body or default
        const network: NetworkType = (networkParam === 'mainnet' || networkParam === 'devnet')
            ? networkParam
            : DEFAULT_NETWORK;

        console.log(`🔄 Manual re-sync requested for: ${mint} (network: ${network})`);

        const result = await syncSingleToken(mint, { network });

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: `Token ${mint} synced successfully`,
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
        console.error('❌ Re-sync error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        endpoint: 'resync-token',
        usage: 'POST with { "mint": "TOKEN_MINT_ADDRESS" }',
        description: 'Manually re-sync a token from on-chain data to Supabase'
    });
}