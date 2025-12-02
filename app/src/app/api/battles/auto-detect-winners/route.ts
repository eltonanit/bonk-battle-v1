/**
 * BONK BATTLE - Auto Detect Winners
 * GET /api/battles/auto-detect-winners
 *
 * Scans all tokens InBattle and checks if any have reached victory conditions.
 * If found, triggers the complete-victory flow automatically.
 *
 * This should be called periodically (e.g., every 30 seconds via cron or webhook).
 */

import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';

const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');

// Victory thresholds (3x test mode)
const VICTORY_MC_USD = 1200;    // $1,200
const VICTORY_VOLUME_USD = 200; // $200

// Battle status enum
const BattleStatus = {
  Created: 0,
  Qualified: 1,
  InBattle: 2,
  VictoryPending: 3,
  Listed: 4,
  PoolCreated: 5,
};

// Get SOL price from oracle or fallback
async function getSolPrice(): Promise<number> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await response.json();
    return data.solana?.usd || 230; // Fallback to $230
  } catch {
    return 230;
  }
}

export async function GET() {
  console.log('\n🔍 AUTO DETECT WINNERS - Scanning for victories...');

  const results = {
    scanned: 0,
    potentialWinners: [] as any[],
    triggered: [] as any[],
    errors: [] as string[],
  };

  try {
    // 1. Fetch all tokens InBattle from database
    const { data: battlingTokens, error: fetchError } = await supabase
      .from('tokens')
      .select('*')
      .eq('battle_status', BattleStatus.InBattle);

    if (fetchError) {
      console.error('Error fetching tokens:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!battlingTokens || battlingTokens.length === 0) {
      console.log('No tokens currently in battle');
      return NextResponse.json({
        message: 'No tokens currently in battle',
        ...results,
      });
    }

    results.scanned = battlingTokens.length;
    console.log(`Found ${battlingTokens.length} tokens in battle`);

    // 2. Get current SOL price
    const solPrice = await getSolPrice();
    console.log(`SOL Price: $${solPrice}`);

    // 3. Check each token for victory conditions
    for (const token of battlingTokens) {
      try {
        // Calculate MC and Volume in USD
        const solCollected = Number(token.real_sol_reserves || 0) / 1e9;
        const totalVolume = Number(token.total_trade_volume || 0) / 1e9;

        const mcUsd = solCollected * solPrice;
        const volumeUsd = totalVolume * solPrice;

        console.log(`\n📊 ${token.symbol}:`);
        console.log(`   MC: $${mcUsd.toFixed(2)} / $${VICTORY_MC_USD} (${(mcUsd / VICTORY_MC_USD * 100).toFixed(1)}%)`);
        console.log(`   VOL: $${volumeUsd.toFixed(2)} / $${VICTORY_VOLUME_USD} (${(volumeUsd / VICTORY_VOLUME_USD * 100).toFixed(1)}%)`);

        // Check if victory conditions met
        const mcReached = mcUsd >= VICTORY_MC_USD;
        const volReached = volumeUsd >= VICTORY_VOLUME_USD;

        if (mcReached && volReached) {
          console.log(`   🏆 VICTORY CONDITIONS MET!`);

          results.potentialWinners.push({
            mint: token.mint,
            symbol: token.symbol,
            mcUsd,
            volumeUsd,
          });

          // 4. Trigger complete-victory flow
          try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                           process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                           'http://localhost:3000';

            const response = await fetch(`${baseUrl}/api/battles/complete-victory`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ winnerMint: token.mint }),
            });

            const result = await response.json();

            if (result.success) {
              console.log(`   ✅ Victory flow triggered successfully!`);
              results.triggered.push({
                mint: token.mint,
                symbol: token.symbol,
                signatures: result.signatures,
              });
            } else {
              console.log(`   ⚠️ Victory flow returned:`, result);
              results.errors.push(`${token.symbol}: ${result.error || 'Unknown error'}`);
            }
          } catch (triggerError: any) {
            console.error(`   ❌ Error triggering victory:`, triggerError);
            results.errors.push(`${token.symbol}: ${triggerError.message}`);
          }
        }
      } catch (tokenError: any) {
        console.error(`Error processing ${token.symbol}:`, tokenError);
        results.errors.push(`${token.symbol}: ${tokenError.message}`);
      }
    }

    // 5. Return results
    console.log('\n📋 SCAN COMPLETE');
    console.log(`   Scanned: ${results.scanned}`);
    console.log(`   Potential Winners: ${results.potentialWinners.length}`);
    console.log(`   Triggered: ${results.triggered.length}`);
    console.log(`   Errors: ${results.errors.length}`);

    return NextResponse.json({
      success: true,
      message: `Scanned ${results.scanned} tokens, found ${results.potentialWinners.length} winners`,
      solPrice,
      victoryThresholds: {
        mcUsd: VICTORY_MC_USD,
        volumeUsd: VICTORY_VOLUME_USD,
      },
      ...results,
    });

  } catch (error: any) {
    console.error('Auto detect winners error:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
      ...results,
    }, { status: 500 });
  }
}
