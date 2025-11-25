// app/api/armies/[id]/join/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/armies/[id]/join
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

    // Verifica che l'army esista ed sia attiva
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

    // Check se già membro
    const { data: existingMember } = await supabase
      .from('army_members')
      .select('id')
      .eq('army_id', id)
      .eq('wallet_address', wallet_address)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: 'Already a member of this army' },
        { status: 409 }
      );
    }

    // Aggiungi membro
    const { error: memberError } = await supabase
      .from('army_members')
      .insert({
        army_id: id,
        wallet_address,
      });

    if (memberError) throw memberError;

    // Incrementa member_count
    const newMemberCount = army.member_count + 1;
    const membersSinceCheckpoint = newMemberCount - army.member_count_checkpoint;

    let updateData: any = {
      member_count: newMemberCount,
      last_join_at: new Date().toISOString(),
    };

    // Se abbiamo raggiunto multiplo di 10, aggiorna checkpoint (ON FIRE trigger)
    if (membersSinceCheckpoint >= 10) {
      updateData.member_count_checkpoint = newMemberCount;
    }

    const { error: updateError } = await supabase
      .from('armies')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    const onFireTriggered = membersSinceCheckpoint >= 10;

    return NextResponse.json(
      {
        message: 'Successfully joined army!',
        member_count: newMemberCount,
        on_fire_triggered: onFireTriggered,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('POST /api/armies/[id]/join error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
