// =================================================================
// FILE: app/src/components/home/LiveRankingsHome.tsx
// LIVE RANKINGS FOR HOMEPAGE - CMC style, same styling as HowItWorks
// =================================================================

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  useRankings,
  formatPrice,
  formatMarketCap,
  formatVolume,
  formatTimeAgo,
  formatChange,
  type RankedToken
} from '@/hooks/useRankings';

type TabType = 'lastTrade' | 'marketCap';

export function LiveRankingsHome() {
  const [activeTab, setActiveTab] = useState<TabType>('lastTrade');

  const { data, loading, error, refresh } = useRankings({
    limit: 10,
    sortBy: activeTab,
    refreshInterval: activeTab === 'lastTrade' ? 2000 : 5000,
  });

  // Track animating tokens
  const [animatingTokens, setAnimatingTokens] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!data?.tokens) return;

    const moved = new Set<string>();
    data.tokens.forEach(token => {
      if (token.justMoved) {
        moved.add(token.mint);
      }
    });

    if (moved.size > 0) {
      setAnimatingTokens(moved);
      const timer = setTimeout(() => setAnimatingTokens(new Set()), 600);
      return () => clearTimeout(timer);
    }
  }, [data?.tokens]);

  // Loading state
  if (loading && !data) {
    return (
      <div className="px-5 lg:px-6 mb-6 lg:flex lg:justify-center">
        <div className="w-full lg:w-[480px]">
          <div className="bg-[#0a1628] border border-[#1e3a5a] rounded-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-400 text-xs">Loading rankings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if error or no data
  if (error && !data) return null;
  if (!data?.tokens || data.tokens.length === 0) return null;

  return (
    <div className="px-5 lg:px-6 mb-6 lg:flex lg:justify-center">
      <div className="w-full lg:w-[480px]">
        <div className="bg-[#0a1628] border border-[#1e3a5a] rounded-xl overflow-hidden">
          {/* Header with Tabs */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e3a5a]">
            {/* Left: Icon + Tabs */}
            <div className="flex items-center gap-2">
              <span className="text-base">🏆</span>
              <div className="flex bg-bonk-dark rounded-lg p-0.5">
                <button
                  onClick={() => setActiveTab('lastTrade')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-200 ${
                    activeTab === 'lastTrade'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Last Trade
                </button>
                <button
                  onClick={() => setActiveTab('marketCap')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-200 ${
                    activeTab === 'marketCap'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Market Cap
                </button>
              </div>
            </div>

            {/* Right: Live indicator */}
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">Live</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Header */}
              <thead>
                <tr className="text-gray-500 text-[9px] border-b border-[#1e3a5a]/50">
                  <th className="text-left py-1.5 px-2.5 font-medium w-6">#</th>
                  <th className="text-left py-1.5 px-2.5 font-medium">Token</th>
                  <th className="text-right py-1.5 px-2.5 font-medium">1h</th>
                  <th className="text-right py-1.5 px-2.5 font-medium">MC</th>
                  {activeTab === 'lastTrade' && (
                    <th className="text-right py-1.5 px-2.5 font-medium">Trade</th>
                  )}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {data.tokens.map((token) => (
                  <TokenRow
                    key={token.mint}
                    token={token}
                    isAnimating={animatingTokens.has(token.mint)}
                    showLastTrade={activeTab === 'lastTrade'}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TOKEN ROW
// ============================================================================

function TokenRow({
  token,
  isAnimating,
  showLastTrade,
}: {
  token: RankedToken;
  isAnimating: boolean;
  showLastTrade: boolean;
}) {
  const highlightClass = isAnimating
    ? token.isMovingUp
      ? 'bg-green-500/10'
      : token.isMovingDown
        ? 'bg-red-500/5'
        : ''
    : '';

  return (
    <tr
      className={`
        border-b border-[#1e3a5a]/30 last:border-b-0
        hover:bg-[#1e3a5a]/30
        transition-all duration-500 ease-out
        ${highlightClass}
      `}
    >
      {/* Rank */}
      <td className="py-2 px-2.5">
        <div className="flex items-center gap-0.5">
          <span className={`
            text-[10px] font-semibold tabular-nums
            ${token.rank === 1 ? 'text-yellow-400' :
              token.rank === 2 ? 'text-gray-400' :
              token.rank === 3 ? 'text-orange-500' :
              'text-gray-500'}
          `}>
            {token.rank}
          </span>
          {isAnimating && (
            <span className={`text-[7px] ${token.isMovingUp ? 'text-green-400' : 'text-red-400'}`}>
              {token.isMovingUp ? '▲' : '▼'}
            </span>
          )}
        </div>
      </td>

      {/* Token */}
      <td className="py-2 px-2.5">
        <Link
          href={`/token/${token.mint}`}
          className="flex items-center gap-1.5 group"
        >
          <div className="w-5 h-5 rounded-full overflow-hidden bg-[#1e3a5a] flex-shrink-0">
            {token.image ? (
              <Image
                src={token.image}
                alt={token.symbol}
                width={20}
                height={20}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-500">
                {token.symbol.charAt(0)}
              </div>
            )}
          </div>
          <span className="text-[10px] font-semibold text-white group-hover:text-blue-400 transition-colors truncate max-w-[80px]">
            {token.symbol}
          </span>
        </Link>
      </td>

      {/* 1h Change */}
      <td className="py-2 px-2.5 text-right">
        <span className={`text-[10px] font-medium ${
          token.change1h > 0 ? 'text-green-400' :
          token.change1h < 0 ? 'text-red-400' :
          'text-gray-500'
        }`}>
          {formatChange(token.change1h)}
        </span>
      </td>

      {/* Market Cap */}
      <td className="py-2 px-2.5 text-right">
        <span className="text-white text-[10px]">
          {formatMarketCap(token.marketCapUsd)}
        </span>
      </td>

      {/* Last Trade */}
      {showLastTrade && (
        <td className="py-2 px-2.5 text-right">
          <div className="flex flex-col items-end">
            <span className={`text-[9px] font-medium ${
              token.lastTradeType === 'buy' ? 'text-green-400' :
              token.lastTradeType === 'sell' ? 'text-red-400' :
              'text-gray-500'
            }`}>
              {token.lastTradeAmountUsd > 0
                ? formatVolume(token.lastTradeAmountUsd)
                : '—'
              }
            </span>
            <span className="text-[8px] text-gray-600">
              {token.lastTradeSecondsAgo < 86400
                ? formatTimeAgo(token.lastTradeSecondsAgo)
                : '—'
              }
            </span>
          </div>
        </td>
      )}
    </tr>
  );
}

export default LiveRankingsHome;
