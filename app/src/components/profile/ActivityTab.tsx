'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

interface TradeActivity {
  id: string;
  signature: string;
  token_mint: string;
  trade_type: 'buy' | 'sell';
  sol_amount: number;
  token_amount: number;
  block_time: string;
  // Token info
  token_name?: string;
  token_symbol?: string;
  token_image?: string;
}

export function ActivityTab() {
  const { publicKey } = useWallet();
  const [activities, setActivities] = useState<TradeActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    async function fetchActivity() {
      try {
        // Fetch user's trades
        const { data: trades, error: tradesError } = await supabase
          .from('user_trades')
          .select('*')
          .eq('wallet_address', publicKey.toString())
          .order('block_time', { ascending: false })
          .limit(50);

        if (tradesError) {
          console.error('Error fetching trades:', tradesError);
          setLoading(false);
          return;
        }

        if (!trades || trades.length === 0) {
          setActivities([]);
          setLoading(false);
          return;
        }

        // Get unique token mints
        const mints = [...new Set(trades.map(t => t.token_mint))];

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

        // Combine trades with token info
        const activitiesWithTokens = trades.map(trade => {
          const tokenInfo = tokenMap.get(trade.token_mint);
          let solAmount = Number(trade.sol_amount) || 0;
          // Convert from lamports if needed
          if (solAmount > 1000) {
            solAmount = solAmount / 1e9;
          }

          return {
            ...trade,
            sol_amount: solAmount,
            token_name: tokenInfo?.name,
            token_symbol: tokenInfo?.symbol,
            token_image: tokenInfo?.image,
          };
        });

        setActivities(activitiesWithTokens);
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [publicKey]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!publicKey) {
    return (
      <div className="text-center py-12 text-gray-400">
        Connect your wallet to see your activity
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-700 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <div className="text-xl font-bold text-white mb-2">No Activity Yet</div>
        <div className="text-gray-400">
          Your trades and activity will appear here
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <Link
          key={activity.id}
          href={`/token/${activity.token_mint}`}
          className="block bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 hover:border-[#3a4554] transition-colors"
        >
          <div className="flex items-center gap-3">
            {/* Token Image */}
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
              {activity.token_image ? (
                <Image
                  src={activity.token_image}
                  alt={activity.token_symbol || 'Token'}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg">
                  🪙
                </div>
              )}
            </div>

            {/* Activity Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${activity.trade_type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                  {activity.trade_type === 'buy' ? 'Bought' : 'Sold'}
                </span>
                <span className="text-white font-semibold truncate">
                  ${activity.token_symbol}
                </span>
              </div>
              <div className="text-gray-400 text-sm">
                {activity.sol_amount < 0.01
                  ? activity.sol_amount.toFixed(4)
                  : activity.sol_amount.toFixed(2)} SOL
              </div>
            </div>

            {/* Time */}
            <div className="text-gray-500 text-sm flex-shrink-0">
              {formatTime(activity.block_time)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
