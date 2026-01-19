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
  change24h: number;
  change7d: number;
  holders: number;
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

type SortBy = 'lastTrade' | 'marketCap' | 'lastCreated';
type NetworkType = 'mainnet' | 'devnet';

interface UseRankingsOptions {
  limit?: number;
  sortBy?: SortBy;
  refreshInterval?: number;
  enabled?: boolean;
  network?: NetworkType; // ⭐ Optional network override
}

interface UseRankingsReturn {
  data: RankingsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Get current network from localStorage
 */
function getCurrentNetwork(): NetworkType {
  if (typeof window === 'undefined') return 'mainnet';
  const saved = localStorage.getItem('bonk-network');
  return (saved === 'devnet' || saved === 'mainnet') ? saved : 'mainnet';
}

export function useRankings(options: UseRankingsOptions = {}): UseRankingsReturn {
  const {
    limit = 10,
    sortBy = 'lastTrade',
    refreshInterval = 2000,
    enabled = true,
    network: networkOverride,
  } = options;

  const [data, setData] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>('mainnet');

  const previousPositions = useRef<Map<string, number>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ⭐ Track network changes from localStorage
  useEffect(() => {
    const updateNetwork = () => {
      const network = networkOverride || getCurrentNetwork();
      setCurrentNetwork(network);
    };

    updateNetwork();

    // Listen for storage changes (network toggle)
    window.addEventListener('storage', updateNetwork);

    // Also poll for changes (same-tab updates)
    const pollInterval = setInterval(updateNetwork, 1000);

    return () => {
      window.removeEventListener('storage', updateNetwork);
      clearInterval(pollInterval);
    };
  }, [networkOverride]);

  const fetchRankings = useCallback(async () => {
    if (!enabled) return;

    try {
      const network = networkOverride || getCurrentNetwork();
      const params = new URLSearchParams({
        limit: limit.toString(),
        sortBy: sortBy,
        network: network, // ⭐ Pass network to API
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
  }, [enabled, limit, sortBy, networkOverride]);

  // Initial fetch and refetch on network change
  useEffect(() => {
    if (enabled) {
      // Clear previous positions when network changes
      previousPositions.current.clear();
      setLoading(true);
      fetchRankings();
    }
  }, [enabled, sortBy, currentNetwork]);

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

export function formatHolders(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}
