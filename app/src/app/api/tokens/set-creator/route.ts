// app/src/app/api/tokens/set-creator/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/tokens/set-creator
 * Sets the creator wallet for a token
 */
export async function POST(request: NextRequest) {
    try {
        const { mint, creator } = await request.json();

        if (!mint || !creator) {
            return NextResponse.json(
                { success: false, error: 'Missing mint or creator' },
                { status: 400 }
            );
        }

        console.log(`👤 Setting creator for ${mint.slice(0, 8)}... → ${creator.slice(0, 8)}...`);

        // Update both fields for compatibility
        const { error } = await supabase
            .from('tokens')
            .update({
                creator: creator,
                creator_wallet: creator
            })
            .eq('mint', mint);

        if (error) {
            console.error('❌ Error setting creator:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        console.log(`✅ Creator set: ${creator.slice(0, 8)}... for ${mint.slice(0, 8)}...`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('❌ set-creator error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
