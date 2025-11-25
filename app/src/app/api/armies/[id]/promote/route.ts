// app/api/armies/[id]/promote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/armies/[id]/promote
// Set promoted token (ONLY CAPITANO)
// Body: { capitano_wallet, token_mint }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { capitano_wallet, token_mint } = await request.json();

    // Validazioni
    if (!capitano_wallet) {
      return NextResponse.json(
        { error: 'Capitano wallet is required' },
        { status: 400 }
      );
    }

    if (!token_mint) {
      return NextResponse.json(
        { error: 'Token mint is required' },
        { status: 400 }
      );
    }

    // Verifica che l'army esista
    const { data: army, error: armyError } = await supabase
      .from('armies')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (armyError || !army) {
      return NextResponse.json(
        { error: 'Army not found or inactive' },
        { status: 404 }
      );
    }

    // Check: è il capitano?
    if (army.capitano_wallet !== capitano_wallet) {
      return NextResponse.json(
        { error: 'Only the Re-Capitano can set promoted token' },
        { status: 403 }
      );
    }

    // Aggiorna promoted_token
    const { error: updateError } = await supabase
      .from('armies')
      .update({ promoted_token_mint: token_mint })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json(
      {
        message: 'Promoted token set successfully!',
        token_mint,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('POST /api/armies/[id]/promote error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
