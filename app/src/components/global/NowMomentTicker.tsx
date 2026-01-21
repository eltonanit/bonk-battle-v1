'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

interface TokenBuyerData {
  mint: string;
  symbol: string;
  image?: string;
  buyerCount: number;
  opponentSymbol?: string;
}

type TickerPhase = 'countdown' | 'showing';

export function NowMomentTicker() {
  const [phase, setPhase] = useState<TickerPhase>('countdown');
  const [countdown, setCountdown] = useState(15);
  const [showTimer, setShowTimer] = useState(10);
  const [tokenData, setTokenData] = useState<TokenBuyerData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch token with most buyers in last 5 minutes
  const fetchMostBoughtToken = useCallback(async () => {
    try {
      // Get tokens in battle (mainnet only)
      const { data: battlingTokens } = await supabase
        .from('tokens')
        .select('mint, symbol, image, opponent_mint')
        .eq('battle_status', 2)
        .eq('network', 'mainnet')
        .not('opponent_mint', 'is', null);

      if (!battlingTokens || battlingTokens.length === 0) {
        setTokenData(null);
        return;
      }

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      let bestToken: TokenBuyerData | null = null;
      let maxBuyers = 0;

      // Check each token's buyer count
      for (const token of battlingTokens) {
        // Count UNIQUE buyers (distinct wallet addresses)
        const { data: trades } = await supabase
          .from('user_trades')
          .select('wallet_address')
          .eq('token_mint', token.mint)
          .eq('trade_type', 'buy')
          .gte('block_time', fiveMinutesAgo);

        // Count unique wallets
        const uniqueWallets = new Set(trades?.map(t => t.wallet_address) || []);
        const buyerCount = uniqueWallets.size;

        if (buyerCount > maxBuyers) {
          maxBuyers = buyerCount;
          const opponent = battlingTokens.find(t => t.mint === token.opponent_mint);
          bestToken = {
            mint: token.mint,
            symbol: token.symbol || 'TOKEN',
            image: token.image,
            buyerCount,
            opponentSymbol: opponent?.symbol,
          };
        }
      }

      setTokenData(bestToken);
    } catch (error) {
      console.error('Error fetching most bought token:', error);
      setTokenData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMostBoughtToken();
  }, [fetchMostBoughtToken]);

  // Phase management: countdown (15s) -> showing (10s) -> countdown...
  useEffect(() => {
    const timer = setInterval(() => {
      if (phase === 'countdown') {
        if (countdown > 1) {
          setCountdown(prev => prev - 1);
        } else {
          // Fetch new data and switch to showing
          fetchMostBoughtToken();
          setPhase('showing');
          setShowTimer(10);
        }
      } else if (phase === 'showing') {
        if (showTimer > 1) {
          setShowTimer(prev => prev - 1);
        } else {
          // Back to countdown
          setPhase('countdown');
          setCountdown(15);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, countdown, showTimer, fetchMostBoughtToken]);

  if (loading) {
    return (
      <div className="px-2 py-0.5 lg:px-1.5 lg:py-0.5 text-base lg:text-sm text-black font-normal animate-pulse"
           style={{ backgroundColor: '#FF8A5B', borderRadius: 0 }}>
        Loading...
      </div>
    );
  }

  // Countdown phase
  if (phase === 'countdown') {
    return (
      <div
        className="px-2 py-0.5 lg:px-1.5 lg:py-0.5 text-base lg:text-sm text-black font-normal flex items-center gap-1.5"
        style={{ backgroundColor: '#FF8A5B', borderRadius: 0 }}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black/30 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-black/50"></span>
        </span>
        <span className="font-bold uppercase">NOW</span>
        <span className="font-mono">{countdown}s</span>
      </div>
    );
  }

  // Showing phase - display token with buyer count
  if (!tokenData || tokenData.buyerCount === 0) {
    return (
      <div
        className="px-2 py-0.5 lg:px-1.5 lg:py-0.5 text-base lg:text-sm text-black font-normal flex items-center gap-1.5"
        style={{ backgroundColor: '#FF8A5B', borderRadius: 0 }}
      >
        <span className="font-bold uppercase">NOW</span>
        <span>No active buyers</span>
        <span className="font-mono text-xs opacity-70">{showTimer}s</span>
      </div>
    );
  }

  return (
    <Link
      href={`/token/${tokenData.mint}`}
      className="px-2 py-0.5 lg:px-1.5 lg:py-0.5 text-base lg:text-sm text-black font-normal flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
      style={{ backgroundColor: '#FF8A5B', borderRadius: 0 }}
    >
      {/* Live indicator */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-600 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>

      {/* NOW label */}
      <span className="font-bold uppercase">NOW</span>

      {/* Buyer count */}
      <span className="font-bold">{tokenData.buyerCount}</span>
      <span>buying</span>

      {/* Token symbol */}
      <span className="font-bold uppercase">${tokenData.symbol}</span>

      {/* Token image */}
      {tokenData.image && (
        <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-black/30">
          <Image
            src={tokenData.image}
            alt={tokenData.symbol}
            width={20}
            height={20}
            className="w-full h-full object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Timer */}
      <span className="font-mono text-xs opacity-70">{showTimer}s</span>
    </Link>
  );
}
