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
  formatHolders,
  type RankedToken
} from '@/hooks/useRankings';

type TabType = 'lastTrade' | 'marketCap' | 'lastCreated';

export function LiveRankingsHome() {
  const [activeTab, setActiveTab] = useState<TabType>('lastTrade');

  const { data, loading, error, refresh } = useRankings({
    limit: 10,
    sortBy: activeTab,
    refreshInterval: activeTab === 'lastTrade' ? 2000 : activeTab === 'lastCreated' ? 10000 : 5000,
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
      <div className="mb-6 lg:flex lg:justify-center">
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
    <div className="mb-6">
      <div className="w-full">
        <div className="bg-[#0a1628] border border-[#1e3a5a] rounded-xl overflow-hidden">
          {/* Header with Tabs */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3a5a]">
            {/* Left: Icon + Tabs */}
            <div className="flex items-center gap-3">
              <span className="text-xl">🏆</span>
              <div className="flex bg-bonk-dark rounded-lg p-0.5">
                <button
                  onClick={() => setActiveTab('lastCreated')}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'lastCreated'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  New
                </button>
                <button
                  onClick={() => setActiveTab('lastTrade')}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'lastTrade'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Last Trade
                </button>
                <button
                  onClick={() => setActiveTab('marketCap')}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
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
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">Live</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Header */}
              <thead>
                <tr className="text-gray-500 text-xs border-b border-[#1e3a5a]/50">
                  <th className="text-left py-3 px-4 font-medium w-10">#</th>
                  <th className="text-left py-3 px-4 font-medium min-w-[160px]">Name</th>
                  <th className="text-right py-3 px-4 font-medium">Price</th>
                  <th className="text-right py-3 px-4 font-medium">1h %</th>
                  <th className="text-right py-3 px-4 font-medium hidden sm:table-cell">24h %</th>
                  <th className="text-right py-3 px-4 font-medium hidden md:table-cell">7d %</th>
                  <th className="text-right py-3 px-4 font-medium">Market Cap</th>
                  <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">Holders</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {data.tokens.map((token) => (
                  <TokenRow
                    key={token.mint}
                    token={token}
                    isAnimating={animatingTokens.has(token.mint)}
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
}: {
  token: RankedToken;
  isAnimating: boolean;
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
      <td className="py-4 px-4">
        <div className="flex items-center gap-1">
          <span className={`
            text-sm font-semibold tabular-nums
            ${token.rank === 1 ? 'text-yellow-400' :
              token.rank === 2 ? 'text-gray-400' :
              token.rank === 3 ? 'text-orange-500' :
              'text-gray-500'}
          `}>
            {token.rank}
          </span>
          {isAnimating && (
            <span className={`text-xs ${token.isMovingUp ? 'text-green-400' : 'text-red-400'}`}>
              {token.isMovingUp ? '▲' : '▼'}
            </span>
          )}
        </div>
      </td>

      {/* Token Name */}
      <td className="py-4 px-4">
        <Link
          href={`/token/${token.mint}`}
          className="flex items-center gap-3 group"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1e3a5a] flex-shrink-0">
            {token.image ? (
              <Image
                src={token.image}
                alt={token.symbol}
                width={36}
                height={36}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                {token.symbol.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate max-w-[140px]">
              {token.name}
            </span>
            <span className="text-xs text-gray-500">
              {token.symbol}
            </span>
          </div>
        </Link>
      </td>

      {/* Price */}
      <td className="py-4 px-4 text-right">
        <span className="text-white text-sm font-medium">
          {formatPrice(token.priceUsd)}
        </span>
      </td>

      {/* 1h Change */}
      <td className="py-4 px-4 text-right">
        <span className={`text-sm font-medium ${
          token.change1h > 0 ? 'text-green-400' :
          token.change1h < 0 ? 'text-red-400' :
          'text-gray-500'
        }`}>
          {formatChange(token.change1h)}
        </span>
      </td>

      {/* 24h Change */}
      <td className="py-4 px-4 text-right hidden sm:table-cell">
        <span className={`text-sm font-medium ${
          token.change24h > 0 ? 'text-green-400' :
          token.change24h < 0 ? 'text-red-400' :
          'text-gray-500'
        }`}>
          {formatChange(token.change24h)}
        </span>
      </td>

      {/* 7d Change */}
      <td className="py-4 px-4 text-right hidden md:table-cell">
        <span className={`text-sm font-medium ${
          token.change7d > 0 ? 'text-green-400' :
          token.change7d < 0 ? 'text-red-400' :
          'text-gray-500'
        }`}>
          {formatChange(token.change7d)}
        </span>
      </td>

      {/* Market Cap */}
      <td className="py-4 px-4 text-right">
        <span className="text-white text-sm font-semibold">
          {formatMarketCap(token.marketCapUsd)}
        </span>
      </td>

      {/* Holders */}
      <td className="py-4 px-4 text-right hidden lg:table-cell">
        <span className="text-white text-sm">
          {formatHolders(token.holders)}
        </span>
      </td>
    </tr>
  );
}

export default LiveRankingsHome;
