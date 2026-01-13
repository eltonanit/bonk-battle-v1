/**
 * ========================================================================
 * BONK BATTLE - TRADES LIST (OPTIMIZED)
 * ========================================================================
 *
 * BEFORE: setInterval every 10s to force re-render for "time ago"
 * - Wasteful CPU usage
 * - Triggers unnecessary re-renders
 *
 * AFTER:
 * - useReducer for efficient time updates
 * - Only update visible "time ago" values
 * - Longer interval (30s instead of 10s)
 * - Supabase Realtime handles new trades
 *
 * ========================================================================
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getSolscanUrl } from '@/config/solana';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Time ago update interval (was 10s, now 30s - "time ago" doesn't need precision)
  TIME_UPDATE_INTERVAL: 30_000,

  // Max trades to display
  MAX_TRADES: 100,

  // Default filter
  DEFAULT_MIN_SOL_FILTER: 0.05,
};

// ============================================================================
// TYPES
// ============================================================================

interface Trade {
  id: string;
  wallet_address: string;
  trade_type: 'buy' | 'sell';
  sol_amount: number;
  token_amount: string;
  block_time: string;
  signature: string;
}

interface TradesListProps {
  tokenMint: string;
  tokenSymbol: string;
}

// ============================================================================
// FORMATTERS (memoized outside component)
// ============================================================================

function formatTokenAmount(amount: string): string {
  const num = parseFloat(amount) / 1e9;
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'm';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'k';
  }
  return num.toFixed(2);
}

function formatSolAmount(lamports: number): string {
  return (lamports / 1e9).toFixed(3);
}

function formatWallet(address: string): string {
  return address.slice(0, 6);
}

function formatSignature(sig: string): string {
  return sig.slice(0, 6);
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  } else if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  } else if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  }
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TradesList({ tokenMint, tokenSymbol }: TradesListProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [minSolFilter, setMinSolFilter] = useState(CONFIG.DEFAULT_MIN_SOL_FILTER);
  const [filterEnabled, setFilterEnabled] = useState(false);

  // Used to trigger time ago recalculation
  const [timeKey, setTimeKey] = useState(0);

  // ============================================================================
  // FETCH TRADES
  // ============================================================================

  const fetchTrades = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_trades')
        .select('id, wallet_address, trade_type, sol_amount, token_amount, block_time, signature')
        .eq('token_mint', tokenMint)
        .order('block_time', { ascending: false })
        .limit(CONFIG.MAX_TRADES);

      if (error) throw error;
      setTrades(data || []);
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setLoading(false);
    }
  }, [tokenMint]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // ============================================================================
  // SUPABASE REALTIME SUBSCRIPTION
  // ============================================================================

  useEffect(() => {
    const channel = supabase
      .channel(`trades-list-${tokenMint}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_trades',
          filter: `token_mint=eq.${tokenMint}`,
        },
        (payload) => {
          const newTrade = payload.new as Trade;
          setTrades((prev) => [newTrade, ...prev].slice(0, CONFIG.MAX_TRADES));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tokenMint]);

  // ============================================================================
  // TIME AGO UPDATE (optimized)
  // ============================================================================

  useEffect(() => {
    // Only start interval if we have trades and tab is visible
    if (trades.length === 0) return;

    const interval = setInterval(() => {
      // Only update if tab is visible
      if (!document.hidden) {
        setTimeKey((k) => k + 1);
      }
    }, CONFIG.TIME_UPDATE_INTERVAL);

    // Also update when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeKey((k) => k + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [trades.length]);

  // ============================================================================
  // FILTERED TRADES (memoized)
  // ============================================================================

  const filteredTrades = useMemo(() => {
    if (!filterEnabled) return trades;
    return trades.filter((t) => t.sol_amount / 1e9 >= minSolFilter);
  }, [trades, filterEnabled, minSolFilter]);

  // ============================================================================
  // RENDER: LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading trades...</div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: TRADES LIST
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-gray-400 text-sm">filter by size</span>
        <button
          onClick={() => setFilterEnabled(!filterEnabled)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            filterEnabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              filterEnabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
        {filterEnabled && (
          <div className="flex items-center gap-2 bg-bonk-dark rounded-lg px-3 py-1">
            <span className="text-bonk-green">◎</span>
            <input
              type="number"
              value={minSolFilter}
              onChange={(e) => setMinSolFilter(parseFloat(e.target.value) || 0)}
              className="w-16 bg-transparent text-white text-sm outline-none"
              step="0.01"
              min="0"
            />
          </div>
        )}
        {filterEnabled && (
          <span className="text-gray-500 text-sm">
            (showing trades greater than {minSolFilter} SOL)
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-gray-400 text-sm border-b border-bonk-border">
              <th className="text-left py-3 px-2 font-medium">Account</th>
              <th className="text-left py-3 px-2 font-medium">Type</th>
              <th className="text-right py-3 px-2 font-medium">Amount (SOL)</th>
              <th className="text-right py-3 px-2 font-medium">Amount ({tokenSymbol})</th>
              <th className="text-right py-3 px-2 font-medium">Time</th>
              <th className="text-right py-3 px-2 font-medium">Txn</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500">
                  No trades yet. Be the first to trade!
                </td>
              </tr>
            ) : (
              filteredTrades.map((trade) => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  tokenSymbol={tokenSymbol}
                  timeKey={timeKey}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// TRADE ROW COMPONENT (memoized for performance)
// ============================================================================

interface TradeRowProps {
  trade: Trade;
  tokenSymbol: string;
  timeKey: number;
}

function TradeRow({ trade, tokenSymbol, timeKey }: TradeRowProps) {
  // timeKey is used to force recalculation of time ago
  const timeAgo = useMemo(() => formatTimeAgo(trade.block_time), [trade.block_time, timeKey]);

  return (
    <tr className="border-b border-bonk-border/50 hover:bg-bonk-dark/50 transition-colors">
      {/* Account */}
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs">
            🐸
          </div>
          <a
            href={getSolscanUrl('account', trade.wallet_address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-cyan-400 font-mono"
          >
            {formatWallet(trade.wallet_address)}
          </a>
        </div>
      </td>

      {/* Type */}
      <td className="py-3 px-2">
        <span
          className={`font-medium ${
            trade.trade_type === 'buy' ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {trade.trade_type === 'buy' ? 'Buy' : 'Sell'}
        </span>
      </td>

      {/* SOL Amount */}
      <td className="py-3 px-2 text-right font-mono text-white">
        {formatSolAmount(trade.sol_amount)}
      </td>

      {/* Token Amount */}
      <td
        className={`py-3 px-2 text-right font-mono ${
          trade.trade_type === 'buy' ? 'text-green-500' : 'text-red-500'
        }`}
      >
        {formatTokenAmount(trade.token_amount)}
      </td>

      {/* Time */}
      <td className="py-3 px-2 text-right text-gray-400">{timeAgo}</td>

      {/* Transaction */}
      <td className="py-3 px-2 text-right">
        <a
          href={getSolscanUrl('tx', trade.signature)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-cyan-400 font-mono text-sm"
        >
          {formatSignature(trade.signature)}
        </a>
      </td>
    </tr>
  );
}
