import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { followerWallet, followingWallet, action } = await request.json();

    if (!followerWallet || !followingWallet) {
      return NextResponse.json(
        { success: false, error: 'Both wallets required' },
        { status: 400 }
      );
    }

    if (action === 'unfollow') {
      // Unfollow
      const { data, error } = await supabase.rpc('unfollow_user', {
        p_follower: followerWallet,
        p_following: followingWallet
      });

      if (error) {
        console.error('❌ Unfollow error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      console.log(`✅ ${followerWallet.slice(0,6)} unfollowed ${followingWallet.slice(0,6)}`);
      return NextResponse.json({ success: true, action: 'unfollowed' });

    } else {
      // Follow
      const { data, error } = await supabase.rpc('follow_user', {
        p_follower: followerWallet,
        p_following: followingWallet
      });

      if (error) {
        console.error('❌ Follow error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      if (data.success === false) {
        return NextResponse.json({ success: false, error: data.error }, { status: 400 });
      }

      // Aggiungi punti a chi viene seguito (+25)
      await supabase.rpc('add_points', {
        p_wallet: followingWallet,
        p_action: 'new_follower',
        p_points: 25,
        p_description: `New follower: ${followerWallet.slice(0,4)}...${followerWallet.slice(-4)}`,
        p_metadata: { follower_wallet: followerWallet }
      });

      console.log(`✅ ${followerWallet.slice(0,6)} followed ${followingWallet.slice(0,6)}`);
      return NextResponse.json({ success: true, action: 'followed' });
    }

  } catch (error) {
    console.error('❌ Follow/Unfollow exception:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
