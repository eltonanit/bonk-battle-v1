import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Fetch users ordered by total_points descending, limit to top 100
    const { data: users, error } = await supabase
      .from('users')
      .select('wallet, total_points')
      .order('total_points', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return NextResponse.json({ users: [] });
    }

    // Add rank to each user
    const usersWithRank = (users || []).map((user, index) => ({
      wallet: user.wallet,
      totalPoints: user.total_points || 0,
      rank: index + 1
    }));

    return NextResponse.json({ users: usersWithRank });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json({ users: [] });
  }
}
