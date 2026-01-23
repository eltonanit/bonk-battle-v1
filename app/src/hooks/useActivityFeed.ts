'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type ActivityType = 'all' | 'buys' | 'sells' | 'whales';

export interface ActivityEvent {
  id: string;
  signature: string;
  walletAddress: string;
  walletShort: string;
  username?: string;
  avatarUrl?: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  tokenImage?: string;
  tradeType: 'buy' | 'sell';
  solAmount: number;
  usdValue: number;
  tokenAmount: number;
  isWhale: boolean;
  timestamp: number;
  timeAgo: string;
}

export interface ActivityStats {
  totalTxs: number;
  totalVolumeUsd: number;
  uniqueUsers: number;
  whaleCount: number;
}

interface UseActivityFeedOptions {
  filter?: ActivityType;
  tokenMint?: string; // For single token activity
  limit?: number;
  whaleThresholdUsd?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LIMIT = 50;
const DEFAULT_WHALE_THRESHOLD = 500; // $500 USD
const REFRESH_INTERVAL = 30000; // 30 seconds

// ⭐ Helper to get current network from localStorage (matches network.ts)
function getCurrentNetworkDB(): 'mainnet' | 'devnet' {
  if (typeof window === 'undefined') return 'mainnet';
  const saved = localStorage.getItem('bonk-network');
  return (saved === 'devnet' || saved === 'mainnet') ? saved : 'mainnet';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 5) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ============================================================================
// HOOK
// ============================================================================

export function useActivityFeed(options: UseActivityFeedOptions = {}) {
  const {
    filter = 'all',
    tokenMint,
    limit = DEFAULT_LIMIT,
    whaleThresholdUsd = DEFAULT_WHALE_THRESHOLD,
  } = options;

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<ActivityStats>({
    totalTxs: 0,
    totalVolumeUsd: 0,
    uniqueUsers: 0,
    whaleCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch events from API/Supabase
  const fetchEvents = useCallback(async () => {
    try {
      // ⭐ Get current network dynamically (reads from localStorage)
      const networkDb = getCurrentNetworkDB();

      // Build query
      let query = supabase
        .from('user_trades')
        .select('*')
        .eq('network', networkDb) // ⭐ Filter by current network
        .order('block_time', { ascending: false })
        .limit(limit);

      // Filter by token if specified
      if (tokenMint) {
        query = query.eq('token_mint', tokenMint);
      }

      // Filter by trade type
      if (filter === 'buys') {
        query = query.eq('trade_type', 'buy');
      } else if (filter === 'sells') {
        query = query.eq('trade_type', 'sell');
      }
      // Note: 'whales' filter is applied client-side after USD calculation

      const { data: trades, error: tradesError } = await query;

      if (tradesError) {
        console.error('Error fetching trades:', tradesError);
        return;
      }

      if (!trades || trades.length === 0) {
        setEvents([]);
        setStats({ totalTxs: 0, totalVolumeUsd: 0, uniqueUsers: 0, whaleCount: 0 });
        return;
      }

      // Get unique mints and wallets
      const mints = [...new Set(trades.map(t => t.token_mint))];
      const wallets = [...new Set(trades.map(t => t.wallet_address))];

      // Fetch token info
      const { data: tokens } = await supabase
        .from('tokens')
        .select('mint, name, symbol, image')
        .in('mint', mints);

      const tokenMap = new Map<string, { name: string; symbol: string; image?: string }>();
      tokens?.forEach(t => {
        tokenMap.set(t.mint, {
          name: t.name || t.mint.slice(0, 8),
          symbol: t.symbol || 'UNK',
          image: t.image,
        });
      });

      // Fetch user info
      const { data: users } = await supabase
        .from('users')
        .select('wallet_address, username, avatar_url')
        .in('wallet_address', wallets);

      const userMap = new Map<string, { username?: string; avatarUrl?: string }>();
      users?.forEach(u => {
        userMap.set(u.wallet_address, {
          username: u.username || undefined,
          avatarUrl: u.avatar_url || undefined,
        });
      });

      // Transform trades to events
      let transformedEvents: ActivityEvent[] = trades.map(trade => {
        const tokenInfo = tokenMap.get(trade.token_mint);
        const userInfo = userMap.get(trade.wallet_address);

        // Handle sol_amount - convert from lamports if needed
        let solAmount = Number(trade.sol_amount) || 0;
        if (solAmount > 1000) {
          solAmount = solAmount / 1e9;
        }

        // Calculate USD value
        const solPriceUsd = Number(trade.sol_price_usd) || 240;
        const usdValue = solAmount * solPriceUsd;

        const timestamp = new Date(trade.block_time).getTime();

        return {
          id: trade.id,
          signature: trade.signature,
          walletAddress: trade.wallet_address,
          walletShort: trade.wallet_address.slice(0, 4) + '...' + trade.wallet_address.slice(-4),
          username: userInfo?.username,
          avatarUrl: userInfo?.avatarUrl,
          tokenMint: trade.token_mint,
          tokenSymbol: tokenInfo?.symbol || 'UNK',
          tokenName: tokenInfo?.name || trade.token_mint.slice(0, 8),
          tokenImage: tokenInfo?.image,
          tradeType: trade.trade_type as 'buy' | 'sell',
          solAmount,
          usdValue,
          tokenAmount: Number(trade.token_amount) || 0,
          isWhale: usdValue >= whaleThresholdUsd,
          timestamp,
          timeAgo: formatTimeAgo(timestamp),
        };
      });

      // Apply whale filter if needed
      if (filter === 'whales') {
        transformedEvents = transformedEvents.filter(e => e.isWhale);
      }

      // Calculate stats
      const uniqueWallets = new Set(transformedEvents.map(e => e.walletAddress));
      const totalVolume = transformedEvents.reduce((sum, e) => sum + e.usdValue, 0);
      const whaleCount = transformedEvents.filter(e => e.isWhale).length;

      setEvents(transformedEvents);
      setStats({
        totalTxs: transformedEvents.length,
        totalVolumeUsd: totalVolume,
        uniqueUsers: uniqueWallets.size,
        whaleCount,
      });

    } catch (error) {
      console.error('Error in fetchEvents:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, tokenMint, limit, whaleThresholdUsd]);

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(fetchEvents, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Real-time subscription
  useEffect(() => {
    // ⭐ Get current network at subscription time
    const networkDb = getCurrentNetworkDB();
    const channelName = tokenMint ? `activity-${tokenMint}-${networkDb}` : `activity-global-${networkDb}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_trades',
          filter: tokenMint
            ? `token_mint=eq.${tokenMint},network=eq.${networkDb}`
            : `network=eq.${networkDb}`,
        },
        async (payload) => {
          const trade = payload.new as any;

          // ⭐ Double-check network filter (in case realtime filter doesn't work)
          if (trade.network !== networkDb) return;

          // Apply trade type filter
          if (filter === 'buys' && trade.trade_type !== 'buy') return;
          if (filter === 'sells' && trade.trade_type !== 'sell') return;

          // Fetch token info
          const { data: tokenInfo } = await supabase
            .from('tokens')
            .select('name, symbol, image')
            .eq('mint', trade.token_mint)
            .single();

          // Fetch user info
          const { data: userInfo } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('wallet_address', trade.wallet_address)
            .single();

          // Handle sol_amount
          let solAmount = Number(trade.sol_amount) || 0;
          if (solAmount > 1000) {
            solAmount = solAmount / 1e9;
          }

          const solPriceUsd = Number(trade.sol_price_usd) || 240;
          const usdValue = solAmount * solPriceUsd;
          const isWhale = usdValue >= whaleThresholdUsd;

          // Apply whale filter
          if (filter === 'whales' && !isWhale) return;

          const timestamp = new Date(trade.block_time).getTime();

          const newEvent: ActivityEvent = {
            id: trade.id,
            signature: trade.signature,
            walletAddress: trade.wallet_address,
            walletShort: trade.wallet_address.slice(0, 4) + '...' + trade.wallet_address.slice(-4),
            username: userInfo?.username || undefined,
            avatarUrl: userInfo?.avatar_url || undefined,
            tokenMint: trade.token_mint,
            tokenSymbol: tokenInfo?.symbol || 'UNK',
            tokenName: tokenInfo?.name || trade.token_mint.slice(0, 8),
            tokenImage: tokenInfo?.image,
            tradeType: trade.trade_type as 'buy' | 'sell',
            solAmount,
            usdValue,
            tokenAmount: Number(trade.token_amount) || 0,
            isWhale,
            timestamp,
            timeAgo: formatTimeAgo(timestamp),
          };

          // Add to beginning, keep max limit
          setEvents(prev => [newEvent, ...prev].slice(0, limit));

          // Update stats
          setStats(prev => ({
            totalTxs: prev.totalTxs + 1,
            totalVolumeUsd: prev.totalVolumeUsd + usdValue,
            uniqueUsers: prev.uniqueUsers, // Would need to recalculate properly
            whaleCount: isWhale ? prev.whaleCount + 1 : prev.whaleCount,
          }));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter, tokenMint, limit, whaleThresholdUsd]);

  // Update timeAgo every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev =>
        prev.map(event => ({
          ...event,
          timeAgo: formatTimeAgo(event.timestamp),
        }))
      );
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    events,
    stats,
    loading,
    isConnected,
    refetch: fetchEvents,
  };
}
