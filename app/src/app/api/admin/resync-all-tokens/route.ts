// app/src/app/api/admin/resync-all-tokens/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { syncSingleToken } from '@/lib/indexer/sync-single-token';

export async function GET() {
    try {
        console.log('🔄 Starting full resync...');

        // Get all token mints from database
        const { data: tokens, error } = await supabase
            .from('tokens')
            .select('mint');

        if (error || !tokens) {
            return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
        }

        console.log(`📦 Found ${tokens.length} tokens to resync`);

        let success = 0;
        let failed = 0;

        for (const token of tokens) {
            const result = await syncSingleToken(token.mint);
            if (result.success) {
                success++;
            } else {
                failed++;
            }
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        console.log(`✅ Resync complete: ${success} success, ${failed} failed`);

        return NextResponse.json({
            success: true,
            total: tokens.length,
            synced: success,
            failed: failed
        });

    } catch (err) {
        console.error('❌ Resync error:', err);
        return NextResponse.json({
            error: err instanceof Error ? err.message : 'Unknown error'
        }, { status: 500 });
    }
}
