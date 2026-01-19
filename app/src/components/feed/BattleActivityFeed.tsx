'use client';

import { useActivityFeed, ActivityType } from '@/hooks/useActivityFeed';
import { ActivityItem } from './ActivityItem';
import { useState, useMemo } from 'react';

interface BattleActivityFeedProps {
  tokenAMint: string;
  tokenBMint: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  tokenAImage?: string;
  tokenBImage?: string;
}

export function BattleActivityFeed({
  tokenAMint,
  tokenBMint,
  tokenASymbol,
  tokenBSymbol,
  tokenAImage,
  tokenBImage,
}: BattleActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityType>('all');
  const [tokenFilter, setTokenFilter] = useState<'all' | 'A' | 'B'>('all');

  // Fetch activity for token A
  const { events: eventsA, loading: loadingA, isConnected: connectedA } = useActivityFeed({
    tokenMint: tokenAMint,
    filter,
    limit: 30,
    whaleThresholdUsd: 500,
  });

  // Fetch activity for token B
  const { events: eventsB, loading: loadingB, isConnected: connectedB } = useActivityFeed({
    tokenMint: tokenBMint,
    filter,
    limit: 30,
    whaleThresholdUsd: 500,
  });

  // Combine and sort events
  const combinedEvents = useMemo(() => {
    let events = [...eventsA, ...eventsB];

    // Apply token filter
    if (tokenFilter === 'A') {
      events = eventsA;
    } else if (tokenFilter === 'B') {
      events = eventsB;
    }

    // Sort by timestamp (newest first)
    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  }, [eventsA, eventsB, tokenFilter]);

  // Stats
  const stats = useMemo(() => {
    const txsA = eventsA.length;
    const txsB = eventsB.length;
    const volumeA = eventsA.reduce((sum, e) => sum + e.usdValue, 0);
    const volumeB = eventsB.reduce((sum, e) => sum + e.usdValue, 0);
    return { txsA, txsB, volumeA, volumeB };
  }, [eventsA, eventsB]);

  const loading = loadingA || loadingB;
  const isConnected = connectedA || connectedB;

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-white">Battle Activity</h3>
          {isConnected && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-green-400 text-xs font-medium">LIVE</span>
            </div>
          )}
        </div>

        {/* Stats comparison */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-[#4DB5FF]">
            <span className="font-bold">{tokenASymbol}</span>
            <span>{stats.txsA} txs</span>
            <span className="text-green-400">${stats.volumeA.toFixed(0)}</span>
          </div>
          <span className="text-gray-500">vs</span>
          <div className="flex items-center gap-1.5 text-[#FF5A8E]">
            <span className="font-bold">{tokenBSymbol}</span>
            <span>{stats.txsB} txs</span>
            <span className="text-green-400">${stats.volumeB.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Token Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setTokenFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            tokenFilter === 'all'
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-transparent text-gray-500 border border-transparent hover:text-gray-300'
          }`}
        >
          Both
        </button>
        <button
          onClick={() => setTokenFilter('A')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            tokenFilter === 'A'
              ? 'bg-[#4DB5FF]/20 text-[#4DB5FF] border border-[#4DB5FF]/30'
              : 'bg-transparent text-gray-500 border border-transparent hover:text-gray-300'
          }`}
        >
          {tokenASymbol}
        </button>
        <button
          onClick={() => setTokenFilter('B')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            tokenFilter === 'B'
              ? 'bg-[#FF5A8E]/20 text-[#FF5A8E] border border-[#FF5A8E]/30'
              : 'bg-transparent text-gray-500 border border-transparent hover:text-gray-300'
          }`}
        >
          {tokenBSymbol}
        </button>
      </div>

      {/* Trade Type Filter */}
      <div className="flex gap-2">
        {(['all', 'buys', 'sells', 'whales'] as ActivityType[]).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === type
                ? type === 'buys'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : type === 'sells'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : type === 'whales'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-transparent text-gray-500 border border-transparent hover:text-gray-300'
            }`}
          >
            {type === 'all' && 'All'}
            {type === 'buys' && 'Buys'}
            {type === 'sells' && 'Sells'}
            {type === 'whales' && 'Whales'}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
            <span className="text-gray-500 text-sm">Loading battle activity...</span>
          </div>
        ) : combinedEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">⚔️</div>
            <p className="text-sm">No battle activity yet. Start trading!</p>
          </div>
        ) : (
          combinedEvents.map((event) => {
            // Determine which token this event belongs to
            const isTokenA = event.tokenMint === tokenAMint;

            return (
              <div
                key={event.id}
                className={`border-l-2 ${isTokenA ? 'border-[#4DB5FF]' : 'border-[#FF5A8E]'}`}
              >
                <ActivityItem
                  event={{
                    ...event,
                    tokenSymbol: isTokenA ? tokenASymbol : tokenBSymbol,
                    tokenImage: isTokenA ? tokenAImage : tokenBImage,
                  }}
                  compact={true}
                  showToken={false}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Load more hint */}
      {combinedEvents.length >= 50 && (
        <div className="text-center text-gray-500 text-xs py-2">
          Showing last 50 transactions
        </div>
      )}
    </div>
  );
}
