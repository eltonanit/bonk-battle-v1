'use client';

import { ActivityStats as StatsType } from '@/hooks/useActivityFeed';

interface ActivityStatsProps {
  stats: StatsType;
  timeWindow?: 'hour' | 'day' | 'week';
  isConnected?: boolean;
}

export function ActivityStats({
  stats,
  timeWindow = 'hour',
  isConnected = false,
}: ActivityStatsProps) {
  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format USD
  const formatUsd = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  // Time window label
  const timeLabel = {
    hour: 'Last hour',
    day: 'Last 24h',
    week: 'Last 7d',
  }[timeWindow];

  return (
    <div className="mt-4 pt-4 border-t border-[#2a3544]">
      {/* Stats Row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Left: Stats */}
        <div className="flex items-center gap-4 text-sm">
          {/* Transactions */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">{timeLabel}:</span>
            <span className="text-white font-semibold">
              {formatNumber(stats.totalTxs)} txs
            </span>
          </div>

          {/* Divider */}
          <span className="text-gray-600">|</span>

          {/* Volume */}
          <div className="flex items-center gap-1.5">
            <span className="text-green-400 font-semibold">
              {formatUsd(stats.totalVolumeUsd)}
            </span>
            <span className="text-gray-500">vol</span>
          </div>

          {/* Divider */}
          <span className="text-gray-600">|</span>

          {/* Users */}
          <div className="flex items-center gap-1.5">
            <span className="text-white font-semibold">
              {formatNumber(stats.uniqueUsers)}
            </span>
            <span className="text-gray-500">users</span>
          </div>

          {/* Whales (if any) */}
          {stats.whaleCount > 0 && (
            <>
              <span className="text-gray-600">|</span>
              <div className="flex items-center gap-1">
                <span>🐋</span>
                <span className="text-purple-400 font-semibold">
                  {stats.whaleCount}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right: Live indicator */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-green-400 text-xs font-medium">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gray-500"></span>
              <span className="text-gray-500 text-xs font-medium">Offline</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT VERSION (for sidebar or small spaces)
// ============================================================================

export function ActivityStatsCompact({
  stats,
  isConnected = false,
}: Omit<ActivityStatsProps, 'timeWindow'>) {
  const formatUsd = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toFixed(0)}`;
  };

  return (
    <div className="flex items-center justify-between text-xs text-gray-500 px-2 py-2 bg-[#12121a] rounded-lg">
      <div className="flex items-center gap-3">
        <span>{stats.totalTxs} txs</span>
        <span className="text-green-400">{formatUsd(stats.totalVolumeUsd)}</span>
        <span>{stats.uniqueUsers} users</span>
      </div>

      {isConnected && (
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-green-400">LIVE</span>
        </div>
      )}
    </div>
  );
}
