// app/src/app/api/points/claim-welcome/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { wallet } = await request.json();

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Chiama la funzione Supabase per claim bonus
    const { data, error } = await supabase.rpc('claim_welcome_bonus', {
      p_wallet: wallet
    });

    if (error) {
      console.error('❌ Claim welcome bonus error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // data è il JSONB restituito dalla funzione
    if (data.success === false) {
      return NextResponse.json(
        { success: false, error: data.error, alreadyClaimed: data.error === 'already_claimed' },
        { status: 400 }
      );
    }

    console.log(`✅ Welcome bonus claimed for ${wallet}: +${data.points} pts (total: ${data.total})`);

    return NextResponse.json({
      success: true,
      points: data.points,
      total: data.total
    });

  } catch (error) {
    console.error('❌ Claim welcome bonus exception:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
