'use client';

import { useMemo } from 'react';
import Image from 'next/image';

interface BattleToken {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  marketCapUsd: number;
}

interface KalshiChartProps {
  tokenA: BattleToken;
  tokenB: BattleToken;
  targetMarketCap?: number;
}

export function KalshiChart({
  tokenA,
  tokenB,
  targetMarketCap = 10_000_000_000,
}: KalshiChartProps) {

  // =============================================
  // POLYMARKET-STYLE PERCENTAGE CALCULATION
  // A + B = 100% sempre!
  // =============================================

  const progressA = (tokenA.marketCapUsd / targetMarketCap) * 100;
  const progressB = (tokenB.marketCapUsd / targetMarketCap) * 100;

  const totalProgress = progressA + progressB;
  let percentA = totalProgress > 0 ? (progressA / totalProgress) * 100 : 50;
  let percentB = totalProgress > 0 ? (progressB / totalProgress) * 100 : 50;

  // Se entrambi sono 50%, mostra 51-49 per sembrare più reale
  if (percentA === 50 && percentB === 50) {
    percentA = 51;
    percentB = 49;
  }

  // =============================================
  // GENERATE CHART DATA
  // =============================================

  const chartData = useMemo(() => {
    const points = 30;
    const data: { time: string; percentA: number; percentB: number }[] = [];

    let pA = 45 + Math.random() * 10;
    const now = new Date();

    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      const targetA = percentA;

      const volatility = 3 + progress * 5;
      const noise = (Math.random() - 0.5) * volatility;
      pA = pA + (targetA - pA) * 0.12 + noise;
      pA = Math.max(15, Math.min(85, pA));

      const timeOffset = (points - 1 - i) * 4;
      const time = new Date(now.getTime() - timeOffset * 60000);
      const timeStr = time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      data.push({
        time: timeStr,
        percentA: pA,
        percentB: 100 - pA,
      });
    }

    data[data.length - 1] = {
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      percentA: percentA,
      percentB: percentB,
    };

    return data;
  }, [percentA, percentB]);

  // =============================================
  // SVG CONFIGURATION
  // =============================================

  const chartWidth = 400;
  const chartHeight = 180;
  const paddingLeft = 35;
  const paddingRight = 10;
  const paddingTop = 10;
  const paddingBottom = 20;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const allValues = chartData.flatMap(d => [d.percentA, d.percentB]);
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const yMin = Math.max(0, Math.floor(dataMin / 10) * 10 - 10);
  const yMax = Math.min(100, Math.ceil(dataMax / 10) * 10 + 10);
  const yRange = yMax - yMin;

  const generatePath = (dataKey: 'percentA' | 'percentB'): string => {
    const points = chartData.map((d, i) => {
      const x = paddingLeft + (i / (chartData.length - 1)) * innerWidth;
      const val = d[dataKey];
      const y = paddingTop + innerHeight - ((val - yMin) / yRange) * innerHeight;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const formatTarget = (n: number): string => {
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(0)}B`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
    return `$${n}`;
  };

  const colorA = '#FF6B35';
  const colorB = '#A855F7';

  return (
    <div className="bg-bonk-card rounded-xl overflow-hidden border border-bonk-border w-full h-full">

      {/* ===== HEADER ===== */}
      <div className="bg-bonk-dark px-3 py-2 border-b border-bonk-border">
        <div className="flex items-center justify-between gap-2">
          {/* Title */}
          <div className="bg-bonk-purple/20 text-bonk-purple text-xs font-medium px-2 py-1 rounded-full border border-bonk-purple/30 whitespace-nowrap">
            Who reaches {formatTarget(targetMarketCap)} first?
          </div>

          {/* Score Display */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-bonk-orange">
              <Image
                src={tokenA.image || '/default-token.png'}
                alt={tokenA.symbol}
                width={24}
                height={24}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <span className="text-lg font-bold text-white">
              {percentA.toFixed(0)} <span className="text-bonk-text text-sm">-</span> {percentB.toFixed(0)}
            </span>
            <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-bonk-purple">
              <Image
                src={tokenB.image || '/default-token.png'}
                alt={tokenB.symbol}
                width={24}
                height={24}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== CHART AREA ===== */}
      <div className="flex p-3 gap-2">

        {/* CENTER: SVG Chart */}
        <div className="flex-1 relative min-w-0">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-[180px]"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Grid lines */}
            {[...Array(5)].map((_, i) => {
              const y = paddingTop + innerHeight - (i / 4) * innerHeight;
              return (
                <line
                  key={i}
                  x1={paddingLeft}
                  x2={paddingLeft + innerWidth}
                  y1={y}
                  y2={y}
                  stroke="#2A3142"
                  strokeDasharray="3,3"
                />
              );
            })}

            {/* Y-axis labels */}
            {[...Array(5)].map((_, i) => {
              const pct = yMax - (i / 4) * yRange;
              const y = paddingTop + (i / 4) * innerHeight;
              return (
                <text
                  key={i}
                  x={paddingLeft - 5}
                  y={y + 4}
                  fill="#B8BFCC"
                  fontSize="9"
                  textAnchor="end"
                >
                  {pct.toFixed(0)}%
                </text>
              );
            })}

            {/* Token A Line (Orange) */}
            <path
              d={generatePath('percentA')}
              fill="none"
              stroke={colorA}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Token B Line (Purple) */}
            <path
              d={generatePath('percentB')}
              fill="none"
              stroke={colorB}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current position dots */}
            {(() => {
              const xEnd = paddingLeft + innerWidth;
              const yA = paddingTop + innerHeight - ((Math.max(yMin, Math.min(yMax, percentA)) - yMin) / yRange) * innerHeight;
              const yB = paddingTop + innerHeight - ((Math.max(yMin, Math.min(yMax, percentB)) - yMin) / yRange) * innerHeight;

              return (
                <>
                  <circle cx={xEnd} cy={yA} r="5" fill={colorA} stroke="#0C1426" strokeWidth="2" />
                  <circle cx={xEnd} cy={yB} r="5" fill={colorB} stroke="#0C1426" strokeWidth="2" />
                </>
              );
            })()}

            {/* X-axis time labels */}
            {[0, Math.floor(chartData.length / 2), chartData.length - 1].map((i) => {
              const x = paddingLeft + (i / (chartData.length - 1)) * innerWidth;
              return (
                <text
                  key={i}
                  x={x}
                  y={chartHeight - 3}
                  fill="#B8BFCC"
                  fontSize="9"
                  textAnchor="middle"
                >
                  {chartData[i]?.time}
                </text>
              );
            })}
          </svg>
        </div>

        {/* RIGHT: Percentage Labels */}
        <div className="w-20 flex flex-col justify-center gap-4">
          {/* Token A */}
          <div className="text-right">
            <div className="text-bonk-orange font-bold text-xs">
              {tokenA.symbol}
            </div>
            <div className="text-bonk-orange font-black text-2xl">
              {percentA.toFixed(0)}%
            </div>
          </div>

          {/* Token B */}
          <div className="text-right">
            <div className="text-bonk-purple font-bold text-xs">
              {tokenB.symbol}
            </div>
            <div className="text-bonk-purple font-black text-2xl">
              {percentB.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <div className="flex items-center justify-center gap-1.5 py-2 border-t border-bonk-border">
        <span className="w-1.5 h-1.5 rounded-full bg-bonk-orange" />
        <span className="w-1.5 h-1.5 rounded-full bg-bonk-border" />
        <span className="w-1.5 h-1.5 rounded-full bg-bonk-border" />
        <span className="w-1.5 h-1.5 rounded-full bg-bonk-border" />
        <span className="w-1.5 h-1.5 rounded-full bg-bonk-border" />
      </div>
    </div>
  );
}
