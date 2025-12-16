// app/src/app/api/points/award/route.ts
/**
 * POST /api/points/award
 * Award points to a user for various actions
 *
 * Uses YOUR database structure:
 * - user_points: wallet_address, total_points, wins_count
 * - point_transactions: wallet_address, action, points, metadata
 * - notifications: user_wallet, type, title, message, data, read
 *
 * Body: {
 *   wallet_address: string,
 *   action: 'share_victory' | 'referral' | 'bonus' | etc,
 *   points: number,
 *   token_mint?: string,
 *   token_symbol?: string,
 *   metadata?: object
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Allowed actions and their max points (to prevent abuse)
const ALLOWED_ACTIONS: Record<string, { maxPoints: number; cooldownMinutes?: number }> = {
  share_victory: { maxPoints: 2000, cooldownMinutes: 60 }, // Can only share once per hour per token
  share_battle: { maxPoints: 500, cooldownMinutes: 30 },
  referral_bonus: { maxPoints: 5000 },
  welcome_bonus: { maxPoints: 1000 },
  daily_login: { maxPoints: 100, cooldownMinutes: 1440 }, // Once per day
  win_battle: { maxPoints: 10000 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, action, points, token_mint, token_symbol, metadata } = body;

    // Validate required fields
    if (!wallet_address || !action || !points) {
      return NextResponse.json(
        { error: 'Missing required fields: wallet_address, action, points' },
        { status: 400 }
      );
    }

    // Validate action
    const actionConfig = ALLOWED_ACTIONS[action];
    if (!actionConfig) {
      return NextResponse.json(
        { error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    // Validate points amount
    if (points <= 0 || points > actionConfig.maxPoints) {
      return NextResponse.json(
        { error: `Invalid points amount. Max for ${action}: ${actionConfig.maxPoints}` },
        { status: 400 }
      );
    }

    // Check cooldown if applicable
    if (actionConfig.cooldownMinutes) {
      const cooldownTime = new Date(Date.now() - actionConfig.cooldownMinutes * 60 * 1000).toISOString();

      // Build query - check point_transactions for recent same action
      let query = supabase
        .from('point_transactions')
        .select('id, created_at')
        .eq('wallet_address', wallet_address)
        .eq('action', action)
        .gte('created_at', cooldownTime);

      // If token-specific action, check cooldown for that specific token
      if (token_mint) {
        query = query.contains('metadata', { token_mint });
      }

      const { data: recentAction } = await query.limit(1).single();

      if (recentAction) {
        const cooldownRemaining = Math.ceil(
          (new Date(recentAction.created_at).getTime() + actionConfig.cooldownMinutes * 60 * 1000 - Date.now()) / 60000
        );

        return NextResponse.json(
          {
            error: 'Cooldown active',
            message: `You already earned points for ${action} recently. Try again in ${cooldownRemaining} minutes.`,
            cooldown_remaining_minutes: cooldownRemaining
          },
          { status: 429 }
        );
      }
    }

    // 1. Record the points transaction in point_transactions
    const { error: insertError } = await supabase.from('point_transactions').insert({
      wallet_address,
      action,
      points,
      metadata: {
        token_mint: token_mint || null,
        token_symbol: token_symbol || null,
        ...metadata,
      },
    });

    if (insertError) {
      console.error('Error inserting point_transactions:', insertError);
      return NextResponse.json(
        { error: 'Failed to record points' },
        { status: 500 }
      );
    }

    // 2. Update user_points total
    const { data: currentUser } = await supabase
      .from('user_points')
      .select('total_points, wins_count')
      .eq('wallet_address', wallet_address)
      .single();

    const newTotal = (currentUser?.total_points || 0) + points;
    const newWins = action === 'win_battle'
      ? (currentUser?.wins_count || 0) + 1
      : (currentUser?.wins_count || 0);

    const { error: upsertError } = await supabase.from('user_points').upsert({
      wallet_address,
      total_points: newTotal,
      wins_count: newWins,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'wallet_address' });

    if (upsertError) {
      console.error('Error upserting user_points:', upsertError);
      // Don't fail - points were recorded, just total wasn't updated
    }

    // 3. Create notification for the user (using YOUR column names)
    const notificationTitle = getNotificationTitle(action, points);
    const notificationMessage = getNotificationMessage(action, points, token_symbol);

    await supabase.from('notifications').insert({
      user_wallet: wallet_address,  // YOUR column name
      type: 'points',
      title: notificationTitle,
      message: notificationMessage,
      read: false,
      data: {  // YOUR column name (not 'metadata')
        action,
        points,
        token_mint,
        token_symbol,
        ...metadata,
      },
    });

    console.log(`Awarded ${points} points to ${wallet_address.slice(0, 8)}... for ${action}`);

    return NextResponse.json({
      success: true,
      points_awarded: points,
      new_total: newTotal,
      action,
      message: `+${points.toLocaleString()} points awarded!`,
    });

  } catch (error) {
    console.error('Points award error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper functions for notifications
function getNotificationTitle(action: string, points: number): string {
  switch (action) {
    case 'share_victory':
      return 'Shared on X!';
    case 'share_battle':
      return 'Battle Shared!';
    case 'referral_bonus':
      return 'Referral Bonus!';
    case 'welcome_bonus':
      return 'Welcome Bonus!';
    case 'daily_login':
      return 'Daily Login!';
    case 'win_battle':
      return 'Battle Victory!';
    default:
      return `+${points.toLocaleString()} Points!`;
  }
}

function getNotificationMessage(action: string, points: number, tokenSymbol?: string): string {
  switch (action) {
    case 'share_victory':
      return `You earned +${points.toLocaleString()} points for sharing ${tokenSymbol ? `$${tokenSymbol}'s` : 'your'} victory on X!`;
    case 'share_battle':
      return `Thanks for spreading the word! +${points.toLocaleString()} points`;
    case 'referral_bonus':
      return `Your referral joined! +${points.toLocaleString()} bonus points`;
    case 'welcome_bonus':
      return `Welcome to BONK Battle! Here's ${points.toLocaleString()} points to get started`;
    case 'daily_login':
      return `Daily login reward: +${points.toLocaleString()} points`;
    case 'win_battle':
      return `Your token $${tokenSymbol || '???'} won the battle! +${points.toLocaleString()} points`;
    default:
      return `You earned +${points.toLocaleString()} points!`;
  }
}
