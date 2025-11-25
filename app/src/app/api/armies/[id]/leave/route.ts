// app/api/armies/[id]/leave/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/armies/[id]/leave
// Body: { wallet_address }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { wallet_address } = await request.json();

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Verifica che l'army esista
    const { data: army, error: armyError } = await supabase
      .from('armies')
      .select('*')
      .eq('id', id)
      .single();

    if (armyError || !army) {
      return NextResponse.json(
        { error: 'Army not found' },
        { status: 404 }
      );
    }

    // Check: è il capitano?
    if (army.capitano_wallet === wallet_address) {
      return NextResponse.json(
        { error: 'Capitano cannot leave the army. Transfer leadership first or disband army.' },
        { status: 403 }
      );
    }

    // Verifica che sia membro
    const { data: membership, error: memberError } = await supabase
      .from('army_members')
      .select('id')
      .eq('army_id', id)
      .eq('wallet_address', wallet_address)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'Not a member of this army' },
        { status: 404 }
      );
    }

    // Rimuovi membro
    const { error: deleteError } = await supabase
      .from('army_members')
      .delete()
      .eq('id', membership.id);

    if (deleteError) throw deleteError;

    // Decrementa member_count
    const newMemberCount = Math.max(0, army.member_count - 1);

    const { error: updateError } = await supabase
      .from('armies')
      .update({ member_count: newMemberCount })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json(
      {
        message: 'Successfully left army!',
        member_count: newMemberCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('POST /api/armies/[id]/leave error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
