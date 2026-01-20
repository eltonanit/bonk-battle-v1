// =================================================================
// FILE: app/src/components/home/BattleGrid.tsx
// BATTLE GRID - Shows tokens currently in battle
// =================================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { KalshiBattleCard } from '@/components/shared/KalshiBattleCard';

interface BattleToken {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  marketCapUsd: number;
  solCollected: number;
  opponentMint: string | null;
}

interface BattlePair {
  tokenA: BattleToken;
  tokenB: BattleToken;
}

export function BattleGrid() {
  const [battles, setBattles] = useState<BattlePair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBattles() {
      try {
        const res = await fetch('/api/battles');
        if (res.ok) {
          const data = await res.json();
          setBattles(data.battles || []);
        }
      } catch (err) {
        console.error('Error fetching battles:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBattles();
    const interval = setInterval(fetchBattles, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Loading active battles...</p>
      </div>
    );
  }

  if (battles.length === 0) {
    return (
      <div className="bg-[#0a1628] border border-[#1e3a5a] rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">⚔️</div>
        <h3 className="text-xl font-bold text-white mb-2">No Active Battles</h3>
        <p className="text-gray-400 text-sm">
          Battles start when two qualified tokens are matched.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Battle Count Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg">⚔️</span>
        <span className="text-white font-bold">{battles.length} Active Battle{battles.length > 1 ? 's' : ''}</span>
        <span className="flex items-center gap-1 ml-auto">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-gray-500 font-mono uppercase">Live</span>
        </span>
      </div>

      {/* Battle Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {battles.map((battle, index) => (
          <div key={`${battle.tokenA.mint}-${battle.tokenB.mint}`} className="flex justify-center">
            <KalshiBattleCard
              tokenA={{
                mint: battle.tokenA.mint,
                name: battle.tokenA.name,
                symbol: battle.tokenA.symbol,
                image: battle.tokenA.image,
                marketCapUsd: battle.tokenA.marketCapUsd,
                solCollected: battle.tokenA.solCollected,
              }}
              tokenB={{
                mint: battle.tokenB.mint,
                name: battle.tokenB.name,
                symbol: battle.tokenB.symbol,
                image: battle.tokenB.image,
                marketCapUsd: battle.tokenB.marketCapUsd,
                solCollected: battle.tokenB.solCollected,
              }}
              config={{
                question: '',
                target_text: 'First to win takes all.',
                context_text: '',
                token_a_link: `/token/${battle.tokenA.mint}`,
                token_b_link: `/token/${battle.tokenB.mint}`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default BattleGrid;
