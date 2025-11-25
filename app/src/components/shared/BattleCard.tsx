// app/src/components/shared/BattleCard.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';

interface BattleToken {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  marketCapUsd: number;
  volumeUsd: number;
  solCollected: number;
}

interface BattleCardProps {
  tokenA: BattleToken;
  tokenB: BattleToken;
  targetMC?: number;
  targetVol?: number;
}

export function BattleCard({
  tokenA,
  tokenB,
  targetMC = 5500,  // Per devnet: $5,500
  targetVol = 100    // Per devnet: $100
}: BattleCardProps) {

  // Calcola progress percentuali
  const mcProgressA = Math.min((tokenA.marketCapUsd / targetMC) * 100, 100);
  const mcProgressB = Math.min((tokenB.marketCapUsd / targetMC) * 100, 100);
  const volProgressA = Math.min((tokenA.volumeUsd / targetVol) * 100, 100);
  const volProgressB = Math.min((tokenB.volumeUsd / targetVol) * 100, 100);

  // Calcola score (chi ha raggiunto più obiettivi)
  const scoreA = (mcProgressA >= 100 ? 1 : 0) + (volProgressA >= 100 ? 1 : 0);
  const scoreB = (mcProgressB >= 100 ? 1 : 0) + (volProgressB >= 100 ? 1 : 0);

  // Format currency
  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Default image
  const getTokenImage = (token: BattleToken) => {
    return token.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${token.symbol}`;
  };

  return (
    <div className="bg-[#1d2531] rounded-xl overflow-hidden border border-[#2a3544] hover:border-orange-500 transition-all cursor-pointer">
      {/* Battle Header */}
      <div className="bg-[#5b6e6b99] px-2 py-2 lg:px-4 lg:py-3 border-b border-[#2a3544]">
        <div className="flex items-center justify-between">
          {/* Token A Image */}
          <Link href={`/token/${tokenA.mint}`}>
            <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-lg overflow-hidden bg-[#2a3544] flex-shrink-0">
              <Image
                src={getTokenImage(tokenA)}
                alt={tokenA.symbol}
                width={56}
                height={56}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          </Link>

          {/* Score Center */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] lg:text-xs text-white/70 font-semibold mb-0.5 lg:mb-1">SCORE</span>
            <div className="flex items-center gap-1.5 lg:gap-3">
              <span className="text-xs lg:text-lg font-bold text-orange-400">{tokenA.symbol}</span>
              <span className="text-lg lg:text-2xl font-black text-yellow-400 mx-1 lg:mx-2">
                {scoreA} - {scoreB}
              </span>
              <span className="text-xs lg:text-lg font-bold text-orange-400">{tokenB.symbol}</span>
            </div>
          </div>

          {/* Token B Image */}
          <Link href={`/token/${tokenB.mint}`}>
            <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-lg overflow-hidden bg-[#2a3544] flex-shrink-0">
              <Image
                src={getTokenImage(tokenB)}
                alt={tokenB.symbol}
                width={56}
                height={56}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          </Link>
        </div>
      </div>

      {/* Battle Content */}
      <div className="bg-[#232a36] p-2 lg:p-4">
        <div className="flex items-start justify-between">
          {/* Left Token Stats */}
          <div className="flex-1 pr-2 lg:pr-4">
            <Link href={`/token/${tokenA.mint}`}>
              <p className="text-xs lg:text-sm text-white/90 font-medium mb-2 lg:mb-3 truncate hover:text-orange-400 transition-colors">
                {tokenA.name}
              </p>
            </Link>

            {/* MC Row */}
            <div className="flex items-center gap-1 lg:gap-2 mb-1.5 lg:mb-2">
              <span className="text-[9px] lg:text-[11px] font-bold text-gray-400 w-6 lg:w-8">MC</span>
              <div className="flex-1 h-1.5 lg:h-2 bg-[#3b415a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    mcProgressA >= 100
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                      : 'bg-gradient-to-r from-green-400 to-green-600'
                  }`}
                  style={{ width: `${mcProgressA}%` }}
                />
              </div>
              <span className="text-[10px] lg:text-xs font-semibold text-white min-w-[40px] lg:min-w-[50px] text-right">
                {formatUsd(tokenA.marketCapUsd)}
              </span>
            </div>

            {/* VOL Row */}
            <div className="flex items-center gap-1 lg:gap-2">
              <span className="text-[9px] lg:text-[11px] font-bold text-gray-400 w-6 lg:w-8">VOL</span>
              <div className="flex-1 h-1.5 lg:h-2 bg-[#3b415a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    volProgressA >= 100
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                      : 'bg-gradient-to-r from-green-400 to-green-600'
                  }`}
                  style={{ width: `${volProgressA}%` }}
                />
              </div>
              <span className="text-[10px] lg:text-xs font-semibold text-white min-w-[40px] lg:min-w-[50px] text-right">
                {formatUsd(tokenA.volumeUsd)}
              </span>
            </div>
          </div>

          {/* Center Target */}
          <div className="flex flex-col items-center px-2 lg:px-4 border-x border-[#3b415a]">
            <span className="text-[9px] lg:text-xs text-gray-500 font-medium mb-1 lg:mb-2">TARGET</span>
            <span className="text-[9px] lg:text-[11px] text-gray-400 mb-0.5 lg:mb-1">MC {formatUsd(targetMC)}</span>
            <span className="text-[9px] lg:text-[11px] text-gray-400">VOL {formatUsd(targetVol)}</span>
          </div>

          {/* Right Token Stats */}
          <div className="flex-1 pl-2 lg:pl-4">
            <Link href={`/token/${tokenB.mint}`}>
              <p className="text-xs lg:text-sm text-white/90 font-medium mb-2 lg:mb-3 truncate text-right hover:text-orange-400 transition-colors">
                {tokenB.name}
              </p>
            </Link>

            {/* MC Row */}
            <div className="flex items-center gap-1 lg:gap-2 mb-1.5 lg:mb-2">
              <span className="text-[10px] lg:text-xs font-semibold text-white min-w-[40px] lg:min-w-[50px]">
                {formatUsd(tokenB.marketCapUsd)}
              </span>
              <div className="flex-1 h-1.5 lg:h-2 bg-[#3b415a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    mcProgressB >= 100
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-400'
                      : 'bg-gradient-to-r from-green-600 to-green-400'
                  }`}
                  style={{ width: `${mcProgressB}%` }}
                />
              </div>
              <span className="text-[9px] lg:text-[11px] font-bold text-gray-400 w-6 lg:w-8 text-right">MC</span>
            </div>

            {/* VOL Row */}
            <div className="flex items-center gap-1 lg:gap-2">
              <span className="text-[10px] lg:text-xs font-semibold text-white min-w-[40px] lg:min-w-[50px]">
                {formatUsd(tokenB.volumeUsd)}
              </span>
              <div className="flex-1 h-1.5 lg:h-2 bg-[#3b415a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    volProgressB >= 100
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-400'
                      : 'bg-gradient-to-r from-green-600 to-green-400'
                  }`}
                  style={{ width: `${volProgressB}%` }}
                />
              </div>
              <span className="text-[9px] lg:text-[11px] font-bold text-gray-400 w-6 lg:w-8 text-right">VOL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
