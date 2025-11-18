'use client';

import { useState, useEffect } from 'react';
import { HallToken, formatMcap, getPercentage } from '@/lib/hall/mock-data';

interface HallRankingProps {
  initialTokens: HallToken[];
}

export function HallRanking({ initialTokens }: HallRankingProps) {
  const [tokens, setTokens] = useState<HallToken[]>(initialTokens);
  const [flashingId, setFlashingId] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTokens((prev) => {
        const updated = [...prev];
        
        // Random token purchase
        const randomIndex = Math.floor(Math.random() * updated.length);
        const token = updated[randomIndex];
        
        // Increase mcap (10M to 150M)
        const purchaseAmount = Math.random() * 140_000_000 + 10_000_000;
        token.mcap += purchaseAmount;
        
        // Increase holders (1 to 50)
        token.holders += Math.floor(Math.random() * 50) + 1;
        
        // Set lastPurchase timestamp
        token.lastPurchase = Date.now();
        
        // Sort by lastPurchase (most recent first)
        updated.sort((a, b) => b.lastPurchase - a.lastPurchase);
        
        // Flash the #1 position
        setFlashingId(updated[0].id);
        setTimeout(() => setFlashingId(null), 800);
        
        return updated;
      });
    }, Math.random() * 2000 + 3000); // 3-5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2 className="text-3xl font-extrabold text-center mb-10 text-yellow-400 uppercase tracking-widest">
        Live Rankings
      </h2>
      <div className="space-y-6">
        {tokens.map((token) => {
          const percentage = getPercentage(token.mcap, token.target);
          const progressWidth = Math.min(parseFloat(percentage), 100);
          const isFlashing = flashingId === token.id;

          return (
            <div
              key={token.id}
              className={`bg-white/5 border-2 border-white/10 rounded-3xl p-5 transition-all duration-300 ${
                isFlashing
                  ? 'animate-shake-yellow bg-yellow-400 border-yellow-400'
                  : ''
              }`}
            >
              <div className="flex gap-5 flex-col lg:flex-row">
                <div
                  className="w-full lg:w-52 h-40 rounded-2xl flex items-center justify-center text-8xl flex-shrink-0"
                  style={{ background: token.gradient }}
                >
                  {token.emoji}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className={`text-3xl font-extrabold mb-1 ${isFlashing ? 'text-black' : 'text-white'}`}>
                      {token.name}
                    </div>
                    <div className={`text-sm mb-3 ${isFlashing ? 'text-black/60' : 'text-white/50'}`}>
                      Target: {token.targetFormatted}
                    </div>
                    <div className={`text-sm mb-2 ${isFlashing ? 'text-black/60' : 'text-white/60'}`}>
                      🏛️ The Hall • Genesis Token
                    </div>
                    <div className={`text-base font-bold mb-3 ${isFlashing ? 'text-black' : 'text-green-400'}`}>
                      ⏰ 180d 0h 0m
                    </div>
                    <div className={`text-2xl font-bold mb-1 ${isFlashing ? 'text-black' : 'text-white'}`}>
                      MC {formatMcap(token.mcap)}
                    </div>
                    <div className={`text-sm mb-4 ${isFlashing ? 'text-black/60' : 'text-white/50'}`}>
                      Holders: {token.holders.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className={`text-sm ${isFlashing ? 'text-black/60' : 'text-white/60'}`}>
                        {formatMcap(token.mcap)} / {token.targetFormatted}
                      </div>
                      <div className={`text-lg font-bold ${isFlashing ? 'text-black' : 'text-green-400'}`}>
                        {percentage}%
                      </div>
                    </div>
                    <div className="bg-white/10 h-3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full transition-all duration-700"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
