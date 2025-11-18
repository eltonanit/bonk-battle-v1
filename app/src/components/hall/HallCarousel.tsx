'use client';

import { HallToken } from '@/lib/hall/mock-data';

interface HallCarouselProps {
  tokens: HallToken[];
}

export function HallCarousel({ tokens }: HallCarouselProps) {
  return (
    <div className="mb-16 overflow-hidden">
      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
        {tokens.map((token) => {
          const percentage = ((token.mcap / token.target) * 100).toFixed(2);
          
          return (
            <div
              key={token.id}
              className="flex-shrink-0 w-[420px] bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/8 hover:border-white/20 transition-all cursor-pointer"
            >
              <div className="flex gap-4">
                <div
                  className="w-32 h-32 rounded-xl flex items-center justify-center text-6xl flex-shrink-0"
                  style={{ background: token.gradient }}
                >
                  {token.emoji}
                </div>
                <div className="flex-1 flex flex-col justify-center gap-1.5">
                  <div className="text-lg font-extrabold">{token.name}</div>
                  <div className="text-sm font-extrabold text-yellow-400 uppercase tracking-wide">
                    Target → {token.targetFormatted}
                  </div>
                  <div className="text-sm text-blue-400 font-semibold">
                    Holders: {token.holders.toLocaleString()}
                  </div>
                  <div className="text-xl font-extrabold text-green-400">
                    +{percentage}%
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
