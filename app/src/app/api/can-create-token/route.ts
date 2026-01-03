// app/src/app/api/can-create-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MIN_MEMBERS_TO_CREATE = 3; // Commander + 2 soldati

// GET /api/can-create-token?wallet=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Cerca se è un Commander di un'Army attiva
    const { data: army, error: armyError } = await supabase
      .from('armies')
      .select('*')
      .eq('capitano_wallet', wallet)
      .eq('is_active', true)
      .single();

    // NON è un commander
    if (armyError || !army) {
      return NextResponse.json({
        success: true,
        canCreate: false,
        reason: 'NOT_COMMANDER',
        message: 'You need to be an Army Commander to create tokens',
        army: null,
      });
    }

    // È un commander, controlla se ha abbastanza membri
    const hasEnoughMembers = army.member_count >= MIN_MEMBERS_TO_CREATE;

    if (!hasEnoughMembers) {
      return NextResponse.json({
        success: true,
        canCreate: false,
        reason: 'NOT_ENOUGH_MEMBERS',
        message: `Your Army needs at least ${MIN_MEMBERS_TO_CREATE} members (you have ${army.member_count})`,
        army: {
          id: army.id,
          name: army.name,
          ticker: army.ticker || '',
          memberCount: army.member_count,
          minRequired: MIN_MEMBERS_TO_CREATE,
          needed: MIN_MEMBERS_TO_CREATE - army.member_count,
        },
      });
    }

    // ✅ Può creare!
    return NextResponse.json({
      success: true,
      canCreate: true,
      reason: 'ELIGIBLE',
      message: 'You can create tokens!',
      army: {
        id: army.id,
        name: army.name,
        ticker: army.ticker || '',
        memberCount: army.member_count,
      },
    });
  } catch (error: any) {
    console.error('GET /api/can-create-token error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
