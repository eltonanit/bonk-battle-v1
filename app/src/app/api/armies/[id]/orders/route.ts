// app/src/app/api/armies/[id]/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/armies/[id]/orders
// Query params: ?type=order | ?type=comment | (nessuno = tutti)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'order' | 'comment' | null

    let query = supabase
      .from('army_orders')
      .select('*')
      .eq('army_id', id)
      .order('created_at', { ascending: true }) // Cronologico (vecchi prima)
      .limit(100);

    // Filtra per tipo se specificato
    if (type === 'order') {
      // Orders tab: mostra orders + joined events
      query = query.in('type', ['order', 'joined']);
    } else if (type === 'comment') {
      // Comments tab: mostra solo comments
      query = query.eq('type', 'comment');
    }
    // Se type non specificato, ritorna tutto

    const { data: orders, error } = await query;

    if (error) throw error;

    return NextResponse.json({ orders: orders || [] }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/armies/[id]/orders error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/armies/[id]/orders
// Body: { wallet_address, message, type?, token_mint? }
// type: 'order' (solo commander) | 'comment' (tutti i membri)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { wallet_address, message, type = 'comment', token_mint } = await request.json();

    // Validazioni
    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!message || message.length < 1 || message.length > 500) {
      return NextResponse.json(
        { error: 'Message must be 1-500 characters' },
        { status: 400 }
      );
    }

    if (!['order', 'comment'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "order" or "comment"' },
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

    // Se tipo = 'order', deve essere il commander
    if (type === 'order' && army.capitano_wallet !== wallet_address) {
      return NextResponse.json(
        { error: 'Only the Commander can post orders' },
        { status: 403 }
      );
    }

    // Se tipo = 'comment', deve essere un membro
    if (type === 'comment') {
      const { data: member } = await supabase
        .from('army_members')
        .select('id')
        .eq('army_id', id)
        .eq('wallet_address', wallet_address)
        .single();

      if (!member) {
        return NextResponse.json(
          { error: 'You must be a member to comment' },
          { status: 403 }
        );
      }
    }

    // Crea messaggio
    const { data: order, error: orderError } = await supabase
      .from('army_orders')
      .insert({
        army_id: id,
        capitano_wallet: wallet_address,
        message,
        type,
        token_mint: token_mint || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    return NextResponse.json(
      {
        order,
        message: type === 'order' ? 'Order posted!' : 'Comment posted!',
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
