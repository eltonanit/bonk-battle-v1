/**
 * ========================================================================
 * API: /api/holders/update
 * ========================================================================
 *
 * Updates holder_count for all active tokens in the database.
 * Call this endpoint periodically (cron job) or manually.
 *
 * GET /api/holders/update - Update all active tokens
 * GET /api/holders/update?mint=xxx - Update specific token
 *
 * ========================================================================
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchRealHolders } from '@/lib/helius/fetch-holders';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const specificMint = searchParams.get('mint');

    // If specific mint provided, update only that token
    if (specificMint) {
      const holderCount = await fetchRealHolders(specificMint);

      const { error } = await supabase
        .from('tokens')
        .update({ holder_count: holderCount })
        .eq('mint', specificMint);

      if (error) {
        console.error('Error updating holder count:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        mint: specificMint,
        holderCount,
      });
    }

    // Update all active tokens
    const { data: tokens, error: fetchError } = await supabase
      .from('tokens')
      .select('mint')
      .eq('is_active', true)
      .limit(100);

    if (fetchError || !tokens) {
      console.error('Error fetching tokens:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
    }

    const results: Array<{ mint: string; holders: number; error?: string }> = [];

    // Process tokens sequentially to avoid rate limits
    for (const token of tokens) {
      try {
        const holderCount = await fetchRealHolders(token.mint);

        await supabase
          .from('tokens')
          .update({ holder_count: holderCount })
          .eq('mint', token.mint);

        results.push({ mint: token.mint, holders: holderCount });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error(`Error updating ${token.mint}:`, err);
        results.push({ mint: token.mint, holders: 0, error: 'Failed' });
      }
    }

    return NextResponse.json({
      success: true,
      updated: results.length,
      results,
    });
  } catch (error) {
    console.error('Holders update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
