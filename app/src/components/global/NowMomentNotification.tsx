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
  reason: 'underbought' | 'increasing_activity';
}

export function NowMomentNotification() {
  const [moment, setMoment] = useState<NowMoment | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

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
          setIsVisible(false);
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

          // If significant imbalance (30%+ difference), show NOW moment
          const total = tokenReserves + opponentReserves;
          if (total === 0) continue;

          const tokenPercent = (tokenReserves / total) * 100;
          const opponentPercent = (opponentReserves / total) * 100;

          // Token is underbought if it has significantly less
          if (tokenPercent < 40) {
            setMoment({
              tokenMint: token.mint,
              tokenSymbol: token.symbol || 'TOKEN',
              tokenImage: token.image,
              opponentSymbol: opponent.symbol || 'OPPONENT',
              battleId: pairKey,
              reason: 'underbought',
            });
            setIsVisible(true);
            return;
          } else if (opponentPercent < 40) {
            setMoment({
              tokenMint: opponent.mint,
              tokenSymbol: opponent.symbol || 'TOKEN',
              tokenImage: opponent.image,
              opponentSymbol: token.symbol || 'OPPONENT',
              battleId: pairKey,
              reason: 'underbought',
            });
            setIsVisible(true);
            return;
          }
        }

        setIsVisible(false);
      } catch (error) {
        console.error('Error detecting NOW moment:', error);
        setIsVisible(false);
      }
    }

    detectNowMoment();
    const interval = setInterval(detectNowMoment, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    setTimeout(() => setIsDismissed(false), 60000); // Show again after 1 minute
  };

  if (!isVisible || !moment || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-orange-900/95 to-amber-900/95 backdrop-blur-lg border border-orange-500/50 rounded-xl shadow-2xl shadow-orange-500/20 overflow-hidden">
        {/* Header */}
        <div className="bg-orange-500/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <span className="text-orange-400 font-bold text-sm uppercase tracking-wider">NOW Moment Active</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {moment.tokenImage && (
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 border-2 border-orange-500/50">
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
            <div>
              <p className="text-white font-semibold">
                <span className="text-orange-400">{moment.tokenSymbol}</span> is still underbought.
              </p>
              <p className="text-gray-300 text-sm">
                Buying activity is increasing right now.
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-2">
            <Link
              href={`/battle/${moment.battleId}`}
              className="flex-1 bg-transparent border border-orange-500/50 text-orange-400 font-semibold py-2 rounded-lg text-center text-sm hover:bg-orange-500/10 transition-colors"
            >
              View Battle
            </Link>
            <Link
              href={`/token/${moment.tokenMint}`}
              className="flex-1 bg-orange-500 text-black font-bold py-2 rounded-lg text-center text-sm hover:bg-orange-400 transition-colors"
            >
              Enter Now
            </Link>
          </div>
        </div>

        {/* Micro-copy */}
        <div className="px-4 pb-3">
          <p className="text-gray-500 text-[10px] text-center">
            Timing signal based on live activity.
          </p>
        </div>
      </div>
    </div>
  );
}
