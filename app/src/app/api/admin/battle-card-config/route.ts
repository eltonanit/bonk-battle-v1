// =================================================================
// FILE: app/src/app/api/admin/battle-card-config/route.ts
// API for Battle Card Configuration (admin editable)
// =================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Default config if none exists
const DEFAULT_CONFIG = {
  id: 'main',
  question: 'Which coin deserves to reach a $10B market cap?',
  target_text: 'First to $10B wins.',
  context_text: 'Buy the token you believe will win the battle.',
  token_a_mint: null,
  token_b_mint: null,
  token_a_link: null,
  token_b_link: null,
  is_active: true,
  network: 'devnet',
};

export async function GET() {
  try {
    // Try to get config from database
    const { data, error } = await supabase
      .from('battle_card_config')
      .select('*')
      .eq('id', 'main')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching battle card config:', error);
    }

    // Return data or default config
    return NextResponse.json(data || DEFAULT_CONFIG);
  } catch (err) {
    console.error('Battle card config API error:', err);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const configData = {
      id: 'main',
      question: body.question || DEFAULT_CONFIG.question,
      target_text: body.target_text || DEFAULT_CONFIG.target_text,
      context_text: body.context_text || DEFAULT_CONFIG.context_text,
      token_a_mint: body.token_a_mint || null,
      token_b_mint: body.token_b_mint || null,
      token_a_link: body.token_a_link || null,
      token_b_link: body.token_b_link || null,
      is_active: body.is_active ?? true,
      network: body.network || 'devnet',
      updated_at: new Date().toISOString(),
    };

    // Upsert config
    const { data, error } = await supabase
      .from('battle_card_config')
      .upsert(configData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error saving battle card config:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Battle card config save error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
