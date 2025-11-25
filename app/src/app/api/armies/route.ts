// app/api/armies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/armies
// Query params: ?sort=top | ?sort=onfire | ?wallet=xxx (my armies)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'top'; // 'top' | 'onfire'
    const wallet = searchParams.get('wallet'); // optional: filter by member wallet

    let query = supabase
      .from('armies')
      .select(`
        *,
        army_members(count)
      `)
      .eq('is_active', true);

    // Se cerchiamo le army di un wallet specifico
    if (wallet) {
      query = query
        .select(`
          *,
          army_members!inner(wallet_address)
        `)
        .eq('army_members.wallet_address', wallet);
    }

    // Sorting
    if (sort === 'top') {
      // TOP: Ordinato per member_count discendente
      query = query.order('member_count', { ascending: false });
      query = query.limit(50);

      const { data, error } = await query;
      if (error) throw error;

      return NextResponse.json({ armies: data }, { status: 200 });
    } else if (sort === 'onfire') {
      // ON FIRE: Fetch tutte e filtra in JavaScript
      // (Supabase non supporta espressioni matematiche in .gte())
      const { data: allArmies, error } = await supabase
        .from('armies')
        .select('*')
        .eq('is_active', true)
        .order('last_join_at', { ascending: false });

      if (error) throw error;

      // Filtra: solo army con almeno 10 nuovi membri
      const onFireArmies = allArmies?.filter(
        army => (army.member_count - army.member_count_checkpoint) >= 10
      ) || [];

      return NextResponse.json({ armies: onFireArmies }, { status: 200 });
    }

    // Default: top sort
    query = query.order('member_count', { ascending: false });
    query = query.limit(50);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ armies: data }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/armies error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/armies
// Body: { name, icon, image_url, twitter_url?, telegram_url?, capitano_wallet }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, icon, image_url, twitter_url, telegram_url, capitano_wallet } = body;

    // Validazioni
    if (!name || name.length < 1 || name.length > 50) {
      return NextResponse.json(
        { error: 'Name must be 1-50 characters' },
        { status: 400 }
      );
    }

    if (!icon || icon.length < 1 || icon.length > 10) {
      return NextResponse.json(
        { error: 'Icon must be 1-10 characters' },
        { status: 400 }
      );
    }

    if (!image_url || image_url.length < 1 || image_url.length > 200) {
      return NextResponse.json(
        { error: 'Image URL must be 1-200 characters' },
        { status: 400 }
      );
    }

    if (twitter_url && twitter_url.length > 100) {
      return NextResponse.json(
        { error: 'Twitter URL must be <= 100 characters' },
        { status: 400 }
      );
    }

    if (telegram_url && telegram_url.length > 100) {
      return NextResponse.json(
        { error: 'Telegram URL must be <= 100 characters' },
        { status: 400 }
      );
    }

    if (!capitano_wallet) {
      return NextResponse.json(
        { error: 'Capitano wallet is required' },
        { status: 400 }
      );
    }

    // Check: nome già esistente?
    const { data: existing } = await supabase
      .from('armies')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Army name already exists' },
        { status: 409 }
      );
    }

    // Crea army
    const { data: army, error: armyError } = await supabase
      .from('armies')
      .insert({
        name,
        icon,
        image_url,
        twitter_url: twitter_url || null,
        telegram_url: telegram_url || null,
        capitano_wallet,
        member_count: 1, // Capitano è il primo membro
        member_count_checkpoint: 0,
        is_active: true,
      })
      .select()
      .single();

    if (armyError) throw armyError;

    // Aggiungi il capitano come primo membro
    const { error: memberError } = await supabase
      .from('army_members')
      .insert({
        army_id: army.id,
        wallet_address: capitano_wallet,
      });

    if (memberError) throw memberError;

    return NextResponse.json(
      {
        army,
        message: 'Army created successfully!'
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/armies error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
