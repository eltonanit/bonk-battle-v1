// app/src/app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .select('wallet_address, username, avatar_url')
      .eq('wallet_address', wallet)
      .single();

    if (error) {
      // User not found - return empty profile
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          profile: null
        });
      }

      console.error('❌ Profile fetch error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Map wallet_address to wallet for frontend compatibility
    return NextResponse.json({
      success: true,
      profile: data ? {
        wallet: data.wallet_address,
        username: data.username,
        avatar_url: data.avatar_url
      } : null
    });

  } catch (error) {
    console.error('❌ Profile GET exception:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update user profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, username, avatar_url } = body;

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet address required' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (username !== undefined) {
      // Validate username
      if (username && username.length > 20) {
        return NextResponse.json(
          { success: false, error: 'Username must be 20 characters or less' },
          { status: 400 }
        );
      }
      updates.username = username || null;
    }

    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url || null;
    }

    // If no updates provided, just return success
    if (Object.keys(updates).length === 0) {
      const { data } = await supabase
        .from('users')
        .select('wallet_address, username, avatar_url')
        .eq('wallet_address', wallet)
        .single();

      return NextResponse.json({
        success: true,
        profile: data ? {
          wallet: data.wallet_address,
          username: data.username,
          avatar_url: data.avatar_url
        } : null
      });
    }

    // Upsert user profile (insert if not exists, update if exists)
    const upsertData = {
      wallet_address: wallet,
      ...updates
    };

    const { data, error } = await supabase
      .from('users')
      .upsert(upsertData, { onConflict: 'wallet_address' })
      .select('wallet_address, username, avatar_url')
      .single();

    if (error) {
      console.error('❌ Profile update error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Profile updated: ${wallet.slice(0, 6)}...`);

    return NextResponse.json({
      success: true,
      profile: data ? {
        wallet: data.wallet_address,
        username: data.username,
        avatar_url: data.avatar_url
      } : null
    });

  } catch (error) {
    console.error('❌ Profile POST exception:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
