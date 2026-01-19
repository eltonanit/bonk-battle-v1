'use client';

import { useState } from 'react';
import { useActivityFeed, ActivityType } from '@/hooks/useActivityFeed';
import { ActivityItem, ActivityItemSkeleton } from './ActivityItem';
import { ActivityFilters, ActivityFiltersCompact } from './ActivityFilters';
import { ActivityStats, ActivityStatsCompact } from './ActivityStats';

// ============================================================================
// TYPES
// ============================================================================

interface ActivityFeedProps {
  /** Filter by specific token mint */
  tokenMint?: string;
  /** Number of events to show */
  limit?: number;
  /** Use compact layout */
  compact?: boolean;
  /** Show token info in items (set false when on token page) */
  showTokenInfo?: boolean;
  /** Custom title */
  title?: string;
  /** Show header */
  showHeader?: boolean;
  /** Show filters */
  showFilters?: boolean;
  /** Show stats footer */
  showStats?: boolean;
  /** Custom empty message */
  emptyMessage?: string;
  /** Max height with scroll */
  maxHeight?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ActivityFeed({
  tokenMint,
  limit = 50,
  compact = false,
  showTokenInfo = true,
  title = '🔴 Live Activity',
  showHeader = true,
  showFilters = true,
  showStats = true,
  emptyMessage = 'No activity yet. Be the first to trade!',
  maxHeight,
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityType>('all');

  const { events, stats, loading, isConnected } = useActivityFeed({
    filter,
    tokenMint,
    limit,
  });

  // Compact layout
  if (compact) {
    return (
      <div className="bg-[#0d1520] border border-[#2a3544] rounded-xl overflow-hidden">
        {/* Compact Header */}
        {showHeader && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3544]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{title}</span>
              {isConnected && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-green-400 text-xs">LIVE</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Compact Filters */}
        {showFilters && (
          <div className="px-4 py-2 border-b border-[#2a3544]">
            <ActivityFiltersCompact
              currentFilter={filter}
              onFilterChange={setFilter}
            />
          </div>
        )}

        {/* Events List */}
        <div
          className="divide-y divide-[#2a3544] overflow-y-auto"
          style={{ maxHeight: maxHeight || '400px' }}
        >
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3">
                <ActivityItemSkeleton />
              </div>
            ))
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-3xl mb-2">📊</div>
              <p>{emptyMessage}</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="p-3">
                <ActivityItem event={event} showToken={showTokenInfo} />
              </div>
            ))
          )}
        </div>

        {/* Compact Stats */}
        {showStats && events.length > 0 && (
          <div className="border-t border-[#2a3544]">
            <ActivityStatsCompact stats={stats} isConnected={isConnected} />
          </div>
        )}
      </div>
    );
  }

  // Full layout
  return (
    <div className="bg-[#0d1520] border border-[#2a3544] rounded-2xl p-6">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {isConnected ? (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-green-400 text-xs font-medium">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-500/20 rounded-full">
                <span className="h-2 w-2 rounded-full bg-gray-500"></span>
                <span className="text-gray-500 text-xs font-medium">Connecting...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mb-4">
          <ActivityFilters
            currentFilter={filter}
            onFilterChange={setFilter}
            counts={{
              all: stats.totalTxs,
              whales: stats.whaleCount,
            }}
          />
        </div>
      )}

      {/* Events List */}
      <div
        className="space-y-3 overflow-y-auto"
        style={{ maxHeight: maxHeight || '600px' }}
      >
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <ActivityItemSkeleton key={i} />
          ))
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📊</div>
            <div className="text-xl font-bold text-white mb-2">No Activity Yet</div>
            <div className="text-gray-400">{emptyMessage}</div>
          </div>
        ) : (
          events.map((event) => (
            <ActivityItem key={event.id} event={event} showToken={showTokenInfo} />
          ))
        )}
      </div>

      {/* Stats Footer */}
      {showStats && events.length > 0 && (
        <ActivityStats
          stats={stats}
          timeWindow="hour"
          isConnected={isConnected}
        />
      )}
    </div>
  );
}

// ============================================================================
// EXPORT SUB-COMPONENTS
// ============================================================================

export { ActivityItem, ActivityItemSkeleton } from './ActivityItem';
export { ActivityFilters, ActivityFiltersCompact } from './ActivityFilters';
export { ActivityStats, ActivityStatsCompact } from './ActivityStats';
