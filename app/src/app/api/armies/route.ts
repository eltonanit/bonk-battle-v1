// app/src/app/api/armies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/armies
// Query params: ?sort=top | ?sort=onfire | ?sort=leaderboard | ?wallet=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get('sort') || 'top';
    const wallet = searchParams.get('wallet');

    // Se cerchiamo le army di un wallet specifico
    if (wallet) {
      const { data, error } = await supabase
        .from('armies')
        .select('*')
        .eq('is_active', true)
        .or(`capitano_wallet.eq.${wallet}`);

      if (error) throw error;
      return NextResponse.json({ armies: data }, { status: 200 });
    }

    // SORT: TOP - Per member_count
    if (sort === 'top') {
      const { data, error } = await supabase
        .from('armies')
        .select('*')
        .eq('is_active', true)
        .order('member_count', { ascending: false })
        .limit(50);

      if (error) throw error;
      return NextResponse.json({ armies: data }, { status: 200 });
    }

    // SORT: ON FIRE - Per nuovi membri recenti
    if (sort === 'onfire') {
      const { data: allArmies, error } = await supabase
        .from('armies')
        .select('*')
        .eq('is_active', true)
        .order('last_join_at', { ascending: false });

      if (error) throw error;

      // Ordina per nuovi membri (member_count - member_count_checkpoint)
      const sortedArmies = allArmies?.sort((a, b) => {
        const aNew = (a.member_count || 0) - (a.member_count_checkpoint || 0);
        const bNew = (b.member_count || 0) - (b.member_count_checkpoint || 0);
        return bNew - aNew;
      }) || [];

      return NextResponse.json({ armies: sortedArmies }, { status: 200 });
    }

    // SORT: LEADERBOARD - Per total_wins
    if (sort === 'leaderboard') {
      const { data, error } = await supabase
        .from('armies')
        .select('*')
        .eq('is_active', true)
        .order('total_wins', { ascending: false })
        .order('total_battles', { ascending: false })
        .limit(50);

      if (error) throw error;
      return NextResponse.json({ armies: data }, { status: 200 });
    }

    // SORT: ULTRA - Highest level armies
    if (sort === 'ultra') {
      const { data, error } = await supabase
        .from('armies')
        .select('*')
        .eq('is_active', true)
        .order('level', { ascending: false })
        .order('season_points', { ascending: false })
        .order('total_wins', { ascending: false })
        .limit(50);

      if (error) throw error;
      return NextResponse.json({ armies: data }, { status: 200 });
    }

    // Default: top
    const { data, error } = await supabase
      .from('armies')
      .select('*')
      .eq('is_active', true)
      .order('member_count', { ascending: false })
      .limit(50);

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
// Body: { name, icon, description, image_url, twitter_url?, telegram_url?, capitano_wallet }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, icon, description, image_url, twitter_url, telegram_url, capitano_wallet } = body;

    // Validazioni
    if (!name || name.length < 3 || name.length > 30) {
      return NextResponse.json(
        { error: 'Name must be 3-30 characters' },
        { status: 400 }
      );
    }

    // Validazione nome: solo lettere, numeri, spazi
    const nameRegex = /^[a-zA-Z0-9\s]+$/;
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        { error: 'Name can only contain letters, numbers and spaces' },
        { status: 400 }
      );
    }

    if (!icon || icon.length < 1 || icon.length > 10) {
      return NextResponse.json(
        { error: 'Icon is required' },
        { status: 400 }
      );
    }

    if (!description || description.length < 10 || description.length > 200) {
      return NextResponse.json(
        { error: 'Description must be 10-200 characters' },
        { status: 400 }
      );
    }

    if (!image_url) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    if (!capitano_wallet) {
      return NextResponse.json(
        { error: 'Wallet is required' },
        { status: 400 }
      );
    }

    // Check: nome già esistente?
    const { data: existing } = await supabase
      .from('armies')
      .select('id')
      .ilike('name', name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Army name already exists' },
        { status: 409 }
      );
    }

    // Check: wallet ha già un'armata?
    const { data: existingWallet } = await supabase
      .from('armies')
      .select('id, name')
      .eq('capitano_wallet', capitano_wallet)
      .eq('is_active', true)
      .single();

    if (existingWallet) {
      return NextResponse.json(
        { error: `You already have an army: ${existingWallet.name}` },
        { status: 409 }
      );
    }

    // Genera invite_code unico
    const invite_code = nanoid(8).toLowerCase();

    // Crea army
    const { data: army, error: armyError } = await supabase
      .from('armies')
      .insert({
        name: name.trim(),
        icon,
        description: description.trim(),
        image_url,
        twitter_url: twitter_url || null,
        telegram_url: telegram_url || null,
        capitano_wallet,
        invite_code,
        member_count: 1,
        member_count_checkpoint: 0,
        level: 1,
        level_wins: 0,
        total_wins: 0,
        total_losses: 0,
        total_battles: 0,
        season_points: 0,
        follower_count: 0,
        is_eligible_to_create: false,
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
        invite_link: `https://bonkbattle.lol/join/${invite_code}`,
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