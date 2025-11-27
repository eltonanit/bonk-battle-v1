// app/src/app/api/user/register/route.ts
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

    // Chiama la funzione Supabase per registrare l'utente se nuovo
    const { data, error } = await supabase.rpc('register_user_if_new', {
      p_wallet: wallet
    });

    if (error) {
      console.error('❌ Register user error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // data contiene { is_new: boolean }
    const isNew = data?.is_new ?? false;

    console.log(`✅ User ${isNew ? 'registered' : 'already exists'}: ${wallet.slice(0, 6)}...`);

    return NextResponse.json({
      success: true,
      isNew,
      wallet: data.wallet || wallet
    });

  } catch (error) {
    console.error('❌ Register user exception:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
