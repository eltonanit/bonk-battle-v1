// app/src/app/api/armies/my/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/armies/my?wallet=xxx
// Ritorna le armate dove il wallet è membro
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet is required' },
        { status: 400 }
      );
    }

    // Trova tutte le armate dove il wallet è membro
    const { data: memberships, error: memberError } = await supabase
      .from('army_members')
      .select('army_id')
      .eq('wallet_address', wallet);

    if (memberError) throw memberError;

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ armies: [] }, { status: 200 });
    }

    const armyIds = memberships.map(m => m.army_id);

    // Fetch le armate
    const { data: armies, error: armiesError } = await supabase
      .from('armies')
      .select('*')
      .in('id', armyIds)
      .eq('is_active', true);

    if (armiesError) throw armiesError;

    return NextResponse.json({ armies: armies || [] }, { status: 200 });

  } catch (error: any) {
    console.error('GET /api/armies/my error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
