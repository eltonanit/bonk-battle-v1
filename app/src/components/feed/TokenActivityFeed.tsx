'use client';

import { useActivityFeed, ActivityType } from '@/hooks/useActivityFeed';
import { ActivityItem } from './ActivityItem';
import { useState } from 'react';

interface TokenActivityFeedProps {
  tokenMint: string;
  tokenSymbol: string;
  tokenImage?: string;
}

export function TokenActivityFeed({
  tokenMint,
  tokenSymbol,
  tokenImage,
}: TokenActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityType>('all');

  const { events, stats, loading, isConnected } = useActivityFeed({
    tokenMint,
    filter,
    limit: 50,
    whaleThresholdUsd: 500,
  });

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-white">Recent Activity</h3>
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

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>{stats.totalTxs} txs</span>
          <span className="text-green-400">${stats.totalVolumeUsd.toFixed(0)} vol</span>
          {stats.whaleCount > 0 && (
            <span className="text-purple-400">{stats.whaleCount} whales</span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
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
                  : 'bg-white/10 text-white border border-white/20'
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
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
            <span className="text-gray-500 text-sm">Loading activity...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">
              {filter === 'whales' ? '🐋' : '📭'}
            </div>
            <p className="text-sm">
              {filter === 'all' && 'No activity yet for this token'}
              {filter === 'buys' && 'No buys yet'}
              {filter === 'sells' && 'No sells yet'}
              {filter === 'whales' && 'No whale trades yet'}
            </p>
          </div>
        ) : (
          events.map((event) => (
            <ActivityItem
              key={event.id}
              event={{
                ...event,
                // Override with provided token info since we know it
                tokenSymbol: tokenSymbol,
                tokenImage: tokenImage,
              }}
              compact={true}
            />
          ))
        )}
      </div>

      {/* Load more hint */}
      {events.length >= 50 && (
        <div className="text-center text-gray-500 text-xs py-2">
          Showing last 50 transactions
        </div>
      )}
    </div>
  );
}
