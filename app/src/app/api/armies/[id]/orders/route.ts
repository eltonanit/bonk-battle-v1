// app/api/armies/[id]/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/armies/[id]/orders
// Get all orders for an army (newest first)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: orders, error } = await supabase
      .from('army_orders')
      .select('*')
      .eq('army_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/armies/[id]/orders error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/armies/[id]/orders
// Post new order (ONLY CAPITANO)
// Body: { capitano_wallet, message, token_mint? }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { capitano_wallet, message, token_mint } = await request.json();

    // Validazioni
    if (!capitano_wallet) {
      return NextResponse.json(
        { error: 'Capitano wallet is required' },
        { status: 400 }
      );
    }

    if (!message || message.length < 1 || message.length > 500) {
      return NextResponse.json(
        { error: 'Message must be 1-500 characters' },
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
        { error: 'Only the Re-Capitano can post orders' },
        { status: 403 }
      );
    }

    // Crea ordine
    const { data: order, error: orderError } = await supabase
      .from('army_orders')
      .insert({
        army_id: id,
        capitano_wallet,
        message,
        token_mint: token_mint || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    return NextResponse.json(
      {
        order,
        message: 'Order posted successfully!',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/armies/[id]/orders error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
