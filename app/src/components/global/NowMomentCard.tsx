'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

interface NowMoment {
  tokenMint: string;
  tokenSymbol: string;
  tokenImage?: string;
  opponentSymbol: string;
  battleId: string;
  percentBehind: number;
}

export function NowMomentCard() {
  const [moment, setMoment] = useState<NowMoment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function detectNowMoment() {
      try {
        // Get tokens in battle
        const { data: battlingTokens } = await supabase
          .from('tokens')
          .select('mint, symbol, image, opponent_mint, real_sol_reserves')
          .eq('battle_status', 2)
          .eq('network', 'mainnet')
          .not('opponent_mint', 'is', null);

        if (!battlingTokens || battlingTokens.length === 0) {
          setMoment(null);
          setLoading(false);
          return;
        }

        // Find underbought token in a battle
        const processedPairs = new Set<string>();

        for (const token of battlingTokens) {
          const pairKey = [token.mint, token.opponent_mint].sort().join('-');
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          const opponent = battlingTokens.find(t => t.mint === token.opponent_mint);
          if (!opponent) continue;

          // Compare reserves - the one with lower reserves is "underbought"
          const tokenReserves = Number(token.real_sol_reserves || 0);
          const opponentReserves = Number(opponent.real_sol_reserves || 0);

          const total = tokenReserves + opponentReserves;
          if (total === 0) continue;

          const tokenPercent = (tokenReserves / total) * 100;
          const opponentPercent = (opponentReserves / total) * 100;

          // Token is underbought if it has significantly less (< 40%)
          if (tokenPercent < 40) {
            setMoment({
              tokenMint: token.mint,
              tokenSymbol: token.symbol || 'TOKEN',
              tokenImage: token.image,
              opponentSymbol: opponent.symbol || 'OPPONENT',
              battleId: pairKey,
              percentBehind: Math.round(50 - tokenPercent),
            });
            setLoading(false);
            return;
          } else if (opponentPercent < 40) {
            setMoment({
              tokenMint: opponent.mint,
              tokenSymbol: opponent.symbol || 'TOKEN',
              tokenImage: opponent.image,
              opponentSymbol: token.symbol || 'OPPONENT',
              battleId: pairKey,
              percentBehind: Math.round(50 - opponentPercent),
            });
            setLoading(false);
            return;
          }
        }

        setMoment(null);
      } catch (error) {
        console.error('Error detecting NOW moment:', error);
        setMoment(null);
      } finally {
        setLoading(false);
      }
    }

    detectNowMoment();
    const interval = setInterval(detectNowMoment, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-orange-900/50 to-amber-900/50 border border-orange-500/30 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-orange-500/20 rounded w-24 mb-2"></div>
        <div className="h-6 bg-orange-500/20 rounded w-32"></div>
      </div>
    );
  }

  if (!moment) {
    return (
      <div className="bg-gradient-to-r from-[#0f1a2e] to-[#1a2744] border border-gray-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-500 text-xs uppercase tracking-wider">NOW Moment</span>
        </div>
        <p className="text-gray-400 text-sm">No active opportunities right now.</p>
        <p className="text-gray-500 text-xs mt-2">Check back when battles are live.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-orange-900/40 to-amber-900/40 border border-orange-500/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-orange-500/20 px-4 py-2 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
        </span>
        <span className="text-orange-400 font-bold text-xs uppercase tracking-wider">NOW Moment</span>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          {moment.tokenImage && (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 border-2 border-orange-500/50 flex-shrink-0">
              <Image
                src={moment.tokenImage}
                alt={moment.tokenSymbol}
                width={40}
                height={40}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">
              <span className="text-orange-400">{moment.tokenSymbol}</span> is underbought
            </p>
            <p className="text-gray-400 text-xs">
              {moment.percentBehind}% behind vs {moment.opponentSymbol}
            </p>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/token/${moment.tokenMint}`}
          className="block w-full bg-orange-500 text-black font-bold py-2 rounded-lg text-center text-sm hover:bg-orange-400 transition-colors"
        >
          Enter Now
        </Link>
      </div>

      {/* Micro-copy */}
      <div className="px-4 pb-3">
        <p className="text-gray-500 text-[10px] text-center">
          Timing signal based on live activity.
        </p>
      </div>
    </div>
  );
}
