'use client';

import { useMemo, useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

// Get current network for filtering
const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta';
const CURRENT_NETWORK_DB = SOLANA_NETWORK === 'mainnet-beta' ? 'mainnet' : 'devnet';

interface BattleToken {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  marketCapUsd: number;
}

interface BuyEvent {
  id: string;
  amount: number; // USD
  tokenMint: string;
  timestamp: number;
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
  // BUY FEED STATE
  // =============================================
  const [buyEvents, setBuyEvents] = useState<BuyEvent[]>([]);

  // Fetch recent buys for both tokens
  useEffect(() => {
    async function fetchRecentBuys() {
      const { data, error } = await supabase
        .from('user_trades')
        .select('signature, trade_value_usd, token_mint, block_time')
        .in('token_mint', [tokenA.mint, tokenB.mint])
        .eq('trade_type', 'buy')
        .eq('network', CURRENT_NETWORK_DB)
        .order('block_time', { ascending: false })
        .limit(15);

      if (error) {
        console.error('Error fetching buys:', error);
        return;
      }

      if (data) {
        const events: BuyEvent[] = data.map((trade: any) => ({
          id: trade.signature,
          amount: trade.trade_value_usd || 0,
          tokenMint: trade.token_mint,
          timestamp: new Date(trade.block_time).getTime(),
        }));
        setBuyEvents(events);
      }
    }

    fetchRecentBuys();

    // Real-time subscription for new buys
    const channel = supabase
      .channel(`kalshi-buys-${tokenA.mint.slice(0, 8)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_trades',
        },
        (payload) => {
          const trade = payload.new as any;
          if (trade.trade_type !== 'buy') return;
          if (trade.network !== CURRENT_NETWORK_DB) return;
          if (trade.token_mint !== tokenA.mint && trade.token_mint !== tokenB.mint) return;

          const newEvent: BuyEvent = {
            id: trade.signature,
            amount: trade.trade_value_usd || 0,
            tokenMint: trade.token_mint,
            timestamp: new Date(trade.block_time).getTime(),
          };

          setBuyEvents(prev => [newEvent, ...prev].slice(0, 15));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tokenA.mint, tokenB.mint]);

  // =============================================
  // PERCENTAGE CALCULATION
  // =============================================

  const progressA = (tokenA.marketCapUsd / targetMarketCap) * 100;
  const progressB = (tokenB.marketCapUsd / targetMarketCap) * 100;

  const totalProgress = progressA + progressB;
  let percentA = totalProgress > 0 ? (progressA / totalProgress) * 100 : 50;
  let percentB = totalProgress > 0 ? (progressB / totalProgress) * 100 : 50;

  if (percentA === 50 && percentB === 50) {
    percentA = 51;
    percentB = 49;
  }

  // =============================================
  // FORMAT MARKET CAP FOR SCORE DISPLAY
  // =============================================
  const formatMcScore = (mc: number): string => {
    if (mc >= 1_000_000_000) return `$${(mc / 1_000_000_000).toFixed(1)}B`;
    if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(1)}M`;
    if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K`;
    return `$${mc.toFixed(0)}`;
  };

  // =============================================
  // GENERATE CHART DATA
  // =============================================

  const chartData = useMemo(() => {
    const points = 40;
    const data: { time: string; percentA: number; percentB: number }[] = [];

    let pA = 45 + Math.random() * 10;
    const now = new Date();

    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      const targetA = percentA;

      const volatility = 3 + progress * 5;
      const noise = (Math.random() - 0.5) * volatility;
      pA = pA + (targetA - pA) * 0.12 + noise;
      pA = Math.max(25, Math.min(75, pA));

      const timeOffset = (points - 1 - i) * 3;
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

  const chartWidth = 600;
  const chartHeight = 220;
  const paddingLeft = 55;
  const paddingRight = 85;
  const paddingTop = 15;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const allValues = chartData.flatMap(d => [d.percentA, d.percentB]);
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const yMin = Math.max(0, Math.floor(dataMin / 10) * 10 - 5);
  const yMax = Math.min(100, Math.ceil(dataMax / 10) * 10 + 5);
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
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
    return `$${n}`;
  };

  const colorA = '#1E40AF'; // Blue
  const colorB = '#EA580C'; // Orange

  // Format buy amount
  const formatBuyAmount = (amount: number): string => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    if (amount >= 1) return `$${amount.toFixed(0)}`;
    return `$${amount.toFixed(2)}`;
  };

  // Get display buys (use placeholders if no real data)
  const displayBuys = buyEvents.length > 0 ? buyEvents : [
    { id: '1', amount: 16, tokenMint: tokenA.mint, timestamp: 0 },
    { id: '2', amount: 5, tokenMint: tokenB.mint, timestamp: 0 },
    { id: '3', amount: 21, tokenMint: tokenA.mint, timestamp: 0 },
    { id: '4', amount: 111, tokenMint: tokenB.mint, timestamp: 0 },
    { id: '5', amount: 13, tokenMint: tokenA.mint, timestamp: 0 },
    { id: '6', amount: 43, tokenMint: tokenB.mint, timestamp: 0 },
    { id: '7', amount: 266, tokenMint: tokenA.mint, timestamp: 0 },
    { id: '8', amount: 8, tokenMint: tokenB.mint, timestamp: 0 },
  ];

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 w-full shadow-sm">

      {/* ===== HEADER - Score Display ===== */}
      <div className="bg-[#0f172a] px-4 py-3 border-b border-gray-700">
        {/* Title Badge */}
        <div className="flex items-center justify-center mb-3">
          <div className="bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
            Who will reach {formatTarget(targetMarketCap)} first?
          </div>
        </div>

        {/* Score: Token Photos + Market Cap */}
        <div className="flex items-center justify-center gap-6">
          {/* Token A */}
          <div className="w-14 h-14 rounded-full overflow-hidden border-[3px] border-blue-600 shadow-lg">
            <Image
              src={tokenA.image || '/default-token.png'}
              alt={tokenA.symbol}
              width={56}
              height={56}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>

          {/* Score Display */}
          <div className="text-center">
            <div className="text-4xl font-black text-white tracking-tight">
              {formatMcScore(tokenA.marketCapUsd)}
              <span className="text-gray-500 text-2xl mx-3">-</span>
              {formatMcScore(tokenB.marketCapUsd)}
            </div>
          </div>

          {/* Token B */}
          <div className="w-14 h-14 rounded-full overflow-hidden border-[3px] border-orange-500 shadow-lg">
            <Image
              src={tokenB.image || '/default-token.png'}
              alt={tokenB.symbol}
              width={56}
              height={56}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* ===== CHART AREA - All overlaid ===== */}
      <div className="relative bg-white p-3">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-[240px]"
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
                stroke="#E5E7EB"
                strokeWidth="1"
              />
            );
          })}

          {/* Y-axis labels (right side) */}
          {[...Array(5)].map((_, i) => {
            const pct = yMax - (i / 4) * yRange;
            const y = paddingTop + (i / 4) * innerHeight;
            return (
              <text
                key={i}
                x={paddingLeft + innerWidth + 5}
                y={y + 4}
                fill="#9CA3AF"
                fontSize="10"
                textAnchor="start"
              >
                {pct.toFixed(0)}%
              </text>
            );
          })}

          {/* Token A Line (Blue) */}
          <path
            d={generatePath('percentA')}
            fill="none"
            stroke={colorA}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Token B Line (Orange) */}
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
                <circle cx={xEnd} cy={yA} r="4" fill={colorA} />
                <circle cx={xEnd} cy={yB} r="4" fill={colorB} />
              </>
            );
          })()}

          {/* X-axis time labels */}
          {[0, Math.floor(chartData.length / 3), Math.floor(chartData.length * 2 / 3), chartData.length - 1].map((i) => {
            const x = paddingLeft + (i / (chartData.length - 1)) * innerWidth;
            return (
              <text
                key={i}
                x={x}
                y={chartHeight - 5}
                fill="#9CA3AF"
                fontSize="10"
                textAnchor="middle"
              >
                {chartData[i]?.time}
              </text>
            );
          })}

          {/* ===== BUY FEED - Overlaid on left side of chart ===== */}
          {displayBuys.slice(0, 8).map((event, i) => {
            const isTokenA = event.tokenMint === tokenA.mint;
            const yPos = paddingTop + 12 + (i * 24);

            return (
              <text
                key={event.id + i}
                x={6}
                y={yPos}
                fill={isTokenA ? colorA : colorB}
                fontSize="13"
                fontWeight="bold"
                fontFamily="system-ui, sans-serif"
              >
                + {formatBuyAmount(event.amount)}
              </text>
            );
          })}

          {/* ===== PERCENTAGES - Overlaid on right side of chart ===== */}
          {/* Token A */}
          <text
            x={chartWidth - 6}
            y={paddingTop + 50}
            fill={colorA}
            fontSize="15"
            fontWeight="bold"
            textAnchor="end"
          >
            {tokenA.symbol}
          </text>
          <text
            x={chartWidth - 6}
            y={paddingTop + 80}
            fill={colorA}
            fontSize="32"
            fontWeight="900"
            textAnchor="end"
          >
            {percentA.toFixed(0)}%
          </text>

          {/* Token B */}
          <text
            x={chartWidth - 6}
            y={paddingTop + 130}
            fill={colorB}
            fontSize="15"
            fontWeight="bold"
            textAnchor="end"
          >
            {tokenB.symbol}
          </text>
          <text
            x={chartWidth - 6}
            y={paddingTop + 160}
            fill={colorB}
            fontSize="32"
            fontWeight="900"
            textAnchor="end"
          >
            {percentB.toFixed(0)}%
          </text>
        </svg>
      </div>

      {/* ===== FOOTER - Dots ===== */}
      <div className="flex items-center justify-center gap-1.5 py-2 bg-gray-50 border-t border-gray-100">
        <span className="w-2 h-2 rounded-full bg-orange-500" />
        <span className="w-2 h-2 rounded-full bg-gray-300" />
        <span className="w-2 h-2 rounded-full bg-gray-300" />
        <span className="w-2 h-2 rounded-full bg-gray-300" />
        <span className="w-2 h-2 rounded-full bg-gray-300" />
      </div>
    </div>
  );
}
