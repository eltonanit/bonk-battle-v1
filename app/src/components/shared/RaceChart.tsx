'use client';

import { useMemo } from 'react';
import Image from 'next/image';

interface RaceToken {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  marketCapUsd: number;
  solCollected: number;
}

interface RaceChartProps {
  tokenA: RaceToken;
  tokenB: RaceToken;
  targetMarketCap?: number; // Default $10B
  // Optional: historical data for the chart lines
  historyA?: number[]; // Array of MC percentages over time
  historyB?: number[];
}

export function RaceChart({
  tokenA,
  tokenB,
  targetMarketCap = 10_000_000_000,
  historyA,
  historyB
}: RaceChartProps) {

  // Calculate progress percentages
  const progressA = Math.min((tokenA.marketCapUsd / targetMarketCap) * 100, 100);
  const progressB = Math.min((tokenB.marketCapUsd / targetMarketCap) * 100, 100);

  // Determine leader
  const aIsLeading = progressA >= progressB;

  // Format market cap
  const formatMC = (mc: number): string => {
    if (mc >= 1_000_000_000) return `$${(mc / 1_000_000_000).toFixed(2)}B`;
    if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
    if (mc >= 1_000) return `$${(mc / 1_000).toFixed(2)}K`;
    return `$${mc.toFixed(2)}`;
  };

  // Generate mock history if not provided (for demo)
  const mockHistory = useMemo(() => {
    if (historyA && historyB) return { a: historyA, b: historyB };

    // Generate smooth racing lines
    const points = 50;
    const a: number[] = [];
    const b: number[] = [];

    let valA = 5 + Math.random() * 10;
    let valB = 5 + Math.random() * 10;

    for (let i = 0; i < points; i++) {
      // Add some randomness but trend toward current values
      const targetA = progressA;
      const targetB = progressB;

      valA += (targetA - valA) * 0.1 + (Math.random() - 0.5) * 3;
      valB += (targetB - valB) * 0.1 + (Math.random() - 0.5) * 3;

      valA = Math.max(0, Math.min(100, valA));
      valB = Math.max(0, Math.min(100, valB));

      a.push(valA);
      b.push(valB);
    }

    // Ensure last points match current progress
    a[points - 1] = progressA;
    b[points - 1] = progressB;

    return { a, b };
  }, [progressA, progressB, historyA, historyB]);

  // Generate SVG path from history
  const generatePath = (history: number[], height: number, width: number): string => {
    if (history.length === 0) return '';

    const points = history.map((val, i) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - (val / 100) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const chartWidth = 400;
  const chartHeight = 150;

  return (
    <div className="bg-[#0d0d0d] rounded-2xl p-4 border border-white/10">
      {/* Header: "People think" */}
      <div className="text-center mb-4">
        <h3 className="text-white/60 text-sm uppercase tracking-wider">People think</h3>
        <p className="text-white/40 text-xs mt-1">Based on market momentum</p>
      </div>

      {/* Token Pills - Kalshi Style */}
      <div className="flex justify-center gap-4 mb-4">
        {/* Token A */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ backgroundColor: aIsLeading ? '#22c55e' : '#22c55e40' }}
        >
          <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/20">
            <Image
              src={tokenA.image || '/default-token.png'}
              alt={tokenA.symbol}
              width={24}
              height={24}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <span className="text-white font-bold">{tokenA.symbol}</span>
          <span className="text-white font-bold">{progressA.toFixed(0)}%</span>
        </div>

        {/* Token B */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ backgroundColor: !aIsLeading ? '#f97316' : '#f9731640' }}
        >
          <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/20">
            <Image
              src={tokenB.image || '/default-token.png'}
              alt={tokenB.symbol}
              width={24}
              height={24}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <span className="text-white font-bold">{tokenB.symbol}</span>
          <span className="text-white font-bold">{progressB.toFixed(0)}%</span>
        </div>
      </div>

      {/* Race Chart SVG */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-[150px]"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Percentage labels on Y axis */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <text
              key={pct}
              x="5"
              y={chartHeight - (pct / 100) * chartHeight + 4}
              fill="rgba(255,255,255,0.3)"
              fontSize="10"
            >
              {pct}%
            </text>
          ))}

          {/* Token A Line (Green) */}
          <path
            d={generatePath(mockHistory.a, chartHeight, chartWidth)}
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Token B Line (Orange) */}
          <path
            d={generatePath(mockHistory.b, chartHeight, chartWidth)}
            fill="none"
            stroke="#f97316"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current position dots */}
          <circle
            cx={chartWidth}
            cy={chartHeight - (progressA / 100) * chartHeight}
            r="6"
            fill="#22c55e"
            stroke="white"
            strokeWidth="2"
          />
          <circle
            cx={chartWidth}
            cy={chartHeight - (progressB / 100) * chartHeight}
            r="6"
            fill="#f97316"
            stroke="white"
            strokeWidth="2"
          />

          {/* Current percentage labels at end of lines */}
          <text
            x={chartWidth - 45}
            y={chartHeight - (progressA / 100) * chartHeight - 10}
            fill="#22c55e"
            fontSize="14"
            fontWeight="bold"
          >
            {tokenA.symbol} {progressA.toFixed(1)}%
          </text>
          <text
            x={chartWidth - 45}
            y={chartHeight - (progressB / 100) * chartHeight + 20}
            fill="#f97316"
            fontSize="14"
            fontWeight="bold"
          >
            {tokenB.symbol} {progressB.toFixed(1)}%
          </text>
        </svg>

        {/* Finish line indicator */}
        <div className="absolute top-0 right-0 h-full w-[2px] bg-white/20" />
        <div className="absolute -top-2 right-[-10px] text-white/40 text-xs">🏁</div>
      </div>

      {/* Market Cap Info */}
      <div className="flex justify-between mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-white/60">{tokenA.symbol}:</span>
          <span className="text-green-400 font-bold">{formatMC(tokenA.marketCapUsd)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-white/60">{tokenB.symbol}:</span>
          <span className="text-orange-400 font-bold">{formatMC(tokenB.marketCapUsd)}</span>
        </div>
      </div>

      {/* Target info */}
      <div className="text-center mt-3 pt-3 border-t border-white/10">
        <span className="text-white/40 text-xs">Target: </span>
        <span className="text-yellow-400 font-bold text-sm">{formatMC(targetMarketCap)}</span>
        <span className="text-white/40 text-xs"> Market Cap</span>
      </div>
    </div>
  );
}
