'use client';

import Image from 'next/image';

interface RaceToken {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  marketCapUsd: number;
}

interface HorizontalRaceProps {
  tokenA: RaceToken;
  tokenB: RaceToken;
  targetMarketCap?: number;
}

export function HorizontalRace({
  tokenA,
  tokenB,
  targetMarketCap = 10_000_000_000
}: HorizontalRaceProps) {

  // Calculate progress (0-100%)
  const progressA = Math.min((tokenA.marketCapUsd / targetMarketCap) * 100, 100);
  const progressB = Math.min((tokenB.marketCapUsd / targetMarketCap) * 100, 100);

  // Determine leader
  const aIsLeading = progressA >= progressB;

  // Format market cap
  const formatMC = (mc: number): string => {
    if (mc >= 1_000_000_000) return `$${(mc / 1_000_000_000).toFixed(2)}B`;
    if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
    if (mc >= 1_000) return `$${(mc / 1_000).toFixed(2)}K`;
    return `$${mc.toFixed(0)}`;
  };

  return (
    <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] rounded-2xl p-5 border border-white/10">

      {/* Title */}
      <div className="text-center mb-5">
        <h3 className="text-2xl font-bold text-white">
          🏆 People Think
        </h3>
        <p className="text-white/50 text-sm mt-1">Who will reach {formatMC(targetMarketCap)} first?</p>
      </div>

      {/* Race Track Container */}
      <div className="relative bg-black/40 rounded-xl p-4">

        {/* Token A Track */}
        <div className="mb-6">
          {/* Token Info */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🥇</span>
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-green-500 shadow-lg shadow-green-500/30">
                <Image
                  src={tokenA.image || '/default-token.png'}
                  alt={tokenA.symbol}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <span className="text-white font-bold">${tokenA.symbol}</span>
            </div>
            <span className="text-green-400 font-bold text-lg">
              {formatMC(tokenA.marketCapUsd)}
            </span>
          </div>

          {/* Track A */}
          <div className="relative h-8 bg-gray-800/50 rounded-full overflow-hidden">
            {/* Progress bar */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(progressA, 5)}%` }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-green-400/30 blur-md" />
            </div>

            {/* Racing dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-green-400 rounded-full border-2 border-white shadow-lg shadow-green-500/50 transition-all duration-1000 flex items-center justify-center"
              style={{ left: `calc(${Math.max(progressA, 2)}% - 12px)` }}
            >
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>

            {/* Percentage */}
            <div
              className="absolute top-1/2 -translate-y-1/2 text-white font-bold text-sm"
              style={{ left: `calc(${Math.max(progressA, 10)}% + 16px)` }}
            >
              {progressA.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Token B Track */}
        <div>
          {/* Token Info */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🥈</span>
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-orange-500 shadow-lg shadow-orange-500/30">
                <Image
                  src={tokenB.image || '/default-token.png'}
                  alt={tokenB.symbol}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <span className="text-white font-bold">${tokenB.symbol}</span>
            </div>
            <span className="text-orange-400 font-bold text-lg">
              {formatMC(tokenB.marketCapUsd)}
            </span>
          </div>

          {/* Track B */}
          <div className="relative h-8 bg-gray-800/50 rounded-full overflow-hidden">
            {/* Progress bar */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(progressB, 5)}%` }}
            >
              <div className="absolute inset-0 bg-orange-400/30 blur-md" />
            </div>

            {/* Racing dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-orange-400 rounded-full border-2 border-white shadow-lg shadow-orange-500/50 transition-all duration-1000 flex items-center justify-center"
              style={{ left: `calc(${Math.max(progressB, 2)}% - 12px)` }}
            >
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>

            {/* Percentage */}
            <div
              className="absolute top-1/2 -translate-y-1/2 text-white font-bold text-sm"
              style={{ left: `calc(${Math.max(progressB, 10)}% + 16px)` }}
            >
              {progressB.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Finish Line */}
        <div className="absolute right-4 top-4 bottom-4 w-1 flex flex-col items-center">
          <div className="h-full w-1 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-400 rounded-full" />
        </div>

        {/* Finish Flag */}
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <span className="text-3xl">🏁</span>
          <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded mt-1 whitespace-nowrap">
            {formatMC(targetMarketCap)}
          </div>
        </div>
      </div>

      {/* Leader announcement */}
      <div className="mt-4 text-center">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full px-4 py-2 border border-yellow-500/30">
          <span className="text-yellow-400 font-bold">
            {aIsLeading ? '🟢' : '🟠'} ${aIsLeading ? tokenA.symbol : tokenB.symbol} is LEADING
          </span>
          <span className="text-white/60">by {Math.abs(progressA - progressB).toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}
