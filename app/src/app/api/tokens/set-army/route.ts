// app/src/app/api/tokens/set-army/route.ts
// ⭐ Salva l'army_id per un token appena creato

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/tokens/set-army
 * Sets the army_id for a token
 */
export async function POST(request: NextRequest) {
    try {
        const { mint, armyId } = await request.json();

        if (!mint || !armyId) {
            return NextResponse.json(
                { success: false, error: 'Missing mint or armyId' },
                { status: 400 }
            );
        }

        console.log(`🛡️ Setting army for ${mint.slice(0, 8)}... → ${armyId}`);

        // Verify army exists
        const { data: army, error: armyError } = await supabase
            .from('armies')
            .select('id, name, ticker')
            .eq('id', armyId)
            .single();

        if (armyError || !army) {
            console.error('❌ Army not found:', armyId);
            return NextResponse.json(
                { success: false, error: 'Army not found' },
                { status: 404 }
            );
        }

        // Update token with army_id
        const { error } = await supabase
            .from('tokens')
            .update({ army_id: armyId })
            .eq('mint', mint);

        if (error) {
            console.error('❌ Error setting army:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        console.log(`✅ Army set: ${army.name} (${army.ticker}) for ${mint.slice(0, 8)}...`);

        return NextResponse.json({
            success: true,
            army: {
                id: army.id,
                name: army.name,
                ticker: army.ticker
            }
        });
    } catch (error) {
        console.error('❌ set-army error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
