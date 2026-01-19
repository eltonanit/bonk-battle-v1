// =================================================================
// FILE: app/src/hooks/useRankings.ts
// LIVE RANKINGS HOOK - Position tracking for animations
// =================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

export interface RankedToken {
  rank: number;
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  priceUsd: number;
  marketCapUsd: number;
  volume24hUsd: number;
  change1h: number;
  lastTradeAmountUsd: number;
  lastTradeSecondsAgo: number;
  lastTradeType: 'buy' | 'sell' | null;
  activityScore: number;
  battleStatus: number;
  solCollected: number;
  // Animation state
  previousRank?: number;
  isMovingUp?: boolean;
  isMovingDown?: boolean;
  justMoved?: boolean;
}

export interface RankingsData {
  tokens: RankedToken[];
  updatedAt: string;
  totalTokens: number;
}

type SortBy = 'lastTrade' | 'marketCap';

interface UseRankingsOptions {
  limit?: number;
  sortBy?: SortBy;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseRankingsReturn {
  data: RankingsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRankings(options: UseRankingsOptions = {}): UseRankingsReturn {
  const {
    limit = 10,
    sortBy = 'lastTrade',
    refreshInterval = 2000,
    enabled = true,
  } = options;

  const [data, setData] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const previousPositions = useRef<Map<string, number>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRankings = useCallback(async () => {
    if (!enabled) return;

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        sortBy: sortBy,
      });

      const response = await fetch(`/api/rankings?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: RankingsData = await response.json();

      // Calculate position changes
      const tokensWithAnimation = result.tokens.map(token => {
        const previousRank = previousPositions.current.get(token.mint);
        const isMovingUp = previousRank !== undefined && token.rank < previousRank;
        const isMovingDown = previousRank !== undefined && token.rank > previousRank;
        const justMoved = previousRank !== undefined && previousRank !== token.rank;

        return {
          ...token,
          previousRank,
          isMovingUp,
          isMovingDown,
          justMoved,
        };
      });

      // Update previous positions
      previousPositions.current.clear();
      result.tokens.forEach(token => {
        previousPositions.current.set(token.mint, token.rank);
      });

      setData({
        ...result,
        tokens: tokensWithAnimation,
      });
      setError(null);

    } catch (err) {
      console.error('❌ Rankings fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [enabled, limit, sortBy]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchRankings();
    }
  }, [enabled, sortBy]);

  // Auto-refresh
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    intervalRef.current = setInterval(fetchRankings, refreshInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refreshInterval, fetchRankings]);

  return { data, loading, error, refresh: fetchRankings };
}

// ============================================================================
// FORMATTERS
// ============================================================================

export function formatPrice(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.000001) return `$${value.toExponential(2)}`;
  if (value < 0.01) return `$${value.toFixed(6)}`;
  if (value < 1) return `$${value.toFixed(4)}`;
  if (value < 100) return `$${value.toFixed(2)}`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatMarketCap(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatVolume(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatTimeAgo(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
