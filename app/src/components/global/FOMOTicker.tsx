'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { TinyGradientAvatar } from '@/components/ui/GradientAvatar';

interface RealTradeEvent {
  id: string;
  signature: string;
  mint: string;
  type: 'buy' | 'sell';
  walletShort: string;
  walletFull: string;
  username?: string;
  userAvatar?: string;
  tokenName: string;
  tokenSymbol: string;
  tokenImage?: string;
  solAmount: number;
  timestamp: number;
}

// 3 colori: Verde, Giallo, Blu (BUY)
const TICKER_COLORS = [
  '#A4F4B6',  // Verde
  '#EFFE16',  // Giallo
  '#93EAEB'   // Blu
];

// Colore per SELL
const SELL_COLOR = '#FAA8A2'; // Rosa/Rosso chiaro

function isValidImageUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/');
}

export function FOMOTicker() {
  const [events, setEvents] = useState<RealTradeEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch real trades from Supabase
  useEffect(() => {
    async function fetchRealTrades() {
      try {
        // 1. Fetch recent trades from user_trades table
        const { data: trades, error: tradesError } = await supabase
          .from('user_trades')
          .select('*')
          .order('block_time', { ascending: false })
          .limit(20);

        if (tradesError) {
          console.error('Error fetching trades:', tradesError);
        }

        // 2. Fetch token info for each unique mint (ONLY MAINNET)
        const mintSet = new Set<string>();
        trades?.forEach(t => mintSet.add(t.token_mint));
        const mints = Array.from(mintSet);

        const { data: tokens, error: tokensError } = await supabase
          .from('tokens')
          .select('mint, name, symbol, image')
          .in('mint', mints)
          .eq('network', 'mainnet');

        if (tokensError) {
          console.error('Error fetching tokens:', tokensError);
        }

        // Create token lookup map
        const tokenMap = new Map<string, { name: string; symbol: string; image?: string }>();
        tokens?.forEach(t => {
          tokenMap.set(t.mint, {
            name: t.name || t.mint.slice(0, 8),
            symbol: t.symbol || 'UNK',
            image: t.image,
          });
        });

        // 2.5. Fetch user avatars for traders
        const walletSet = new Set<string>();
        trades?.forEach(t => walletSet.add(t.wallet_address));
        const wallets = Array.from(walletSet);

        const { data: users } = await supabase
          .from('users')
          .select('wallet_address, avatar_url, username')
          .in('wallet_address', wallets);

        // Map per avatar e username degli utenti
        const userMap = new Map<string, { avatar?: string; username?: string }>();
        users?.forEach(u => {
          userMap.set(u.wallet_address, {
            avatar: u.avatar_url || undefined,
            username: u.username || undefined,
          });
        });

        // 3. Convert trades to events (only for mainnet tokens)
        const tradeEvents: RealTradeEvent[] = (trades || [])
          .filter(trade => tokenMap.has(trade.token_mint)) // Only mainnet tokens
          .map(trade => {
            const tokenInfo = tokenMap.get(trade.token_mint);
            const userInfo = userMap.get(trade.wallet_address);

            // Handle sol_amount - check if already in SOL or in lamports
            let solAmount = Number(trade.sol_amount) || 0;
            // If the value looks like lamports (> 1000), convert to SOL
            if (solAmount > 1000) {
              solAmount = solAmount / 1e9;
            }

            return {
              id: trade.id,
              signature: trade.signature,
              mint: trade.token_mint,
              type: trade.trade_type === 'buy' ? 'buy' : 'sell',
              walletShort: trade.wallet_address.slice(0, 5),
              walletFull: trade.wallet_address,
              username: userInfo?.username,
              userAvatar: userInfo?.avatar,
              tokenName: tokenInfo?.name || trade.token_mint.slice(0, 8),
              tokenSymbol: tokenInfo?.symbol || 'UNK',
              tokenImage: tokenInfo?.image,
              solAmount,
              timestamp: new Date(trade.block_time).getTime(),
            };
          });

        // Only show buy/sell events
        const allEvents = [...tradeEvents];

        // Sort by timestamp (newest first)
        allEvents.sort((a, b) => b.timestamp - a.timestamp);

        setEvents(allEvents.slice(0, 50)); // Keep max 50 events
      } catch (error) {
        console.error('Error in fetchRealTrades:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRealTrades();

    // Refresh every 30 seconds
    const refreshInterval = setInterval(fetchRealTrades, 30000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Subscribe to real-time trades
  useEffect(() => {
    const channel = supabase
      .channel('fomo-trades')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_trades',
        },
        async (payload) => {
          const trade = payload.new as any;

          // Fetch token info (only mainnet)
          const { data: tokenInfo } = await supabase
            .from('tokens')
            .select('name, symbol, image, network')
            .eq('mint', trade.token_mint)
            .eq('network', 'mainnet')
            .single();

          // Skip if token is not mainnet
          if (!tokenInfo) return;

          // Fetch user info (avatar + username)
          const { data: userInfo } = await supabase
            .from('users')
            .select('avatar_url, username')
            .eq('wallet_address', trade.wallet_address)
            .single();

          // Handle sol_amount - check if already in SOL or in lamports
          let solAmount = Number(trade.sol_amount) || 0;
          if (solAmount > 1000) {
            solAmount = solAmount / 1e9;
          }

          const newEvent: RealTradeEvent = {
            id: trade.id,
            signature: trade.signature,
            mint: trade.token_mint,
            type: trade.trade_type === 'buy' ? 'buy' : 'sell',
            walletShort: trade.wallet_address.slice(0, 5),
            walletFull: trade.wallet_address,
            username: userInfo?.username || undefined,
            userAvatar: userInfo?.avatar_url || undefined,
            tokenName: tokenInfo?.name || trade.token_mint.slice(0, 8),
            tokenSymbol: tokenInfo?.symbol || 'UNK',
            tokenImage: tokenInfo?.image,
            solAmount,
            timestamp: new Date(trade.block_time).getTime(),
          };

          setEvents(prev => [newEvent, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Rotate ticker
  useEffect(() => {
    if (events.length === 0) return;

    const interval = setInterval(() => {
      setShake(true);
      setCurrentIndex(prev => (prev + 1) % events.length);
      setTimeout(() => setShake(false), 600);
    }, 900); // 0.9 seconds per event

    return () => clearInterval(interval);
  }, [events.length]);

  if (loading) {
    return (
      <div className="mb-2 lg:mb-0">
        <div className="px-0 lg:px-0 py-0 lg:py-0">
          <div
            className="px-2 py-0.5 lg:px-1.5 lg:py-0.5 text-base lg:text-sm text-black font-normal animate-pulse"
            style={{ backgroundColor: '#3b82f6', borderRadius: 0 }}
          >
            Loading trades...
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="mb-2 lg:mb-0">
        <div className="px-0 lg:px-0 py-0 lg:py-0">
          <Link href="/create">
            <div
              className="px-2 py-0.5 lg:px-1.5 lg:py-0.5 text-base lg:text-sm text-black font-normal hover:opacity-80 transition-opacity cursor-pointer"
              style={{ backgroundColor: '#3b82f6', borderRadius: 0 }}
            >
              No trades yet. Create first token!
            </div>
          </Link>
        </div>
      </div>
    );
  }

  const currentEvent = events[currentIndex];

  // Guard against undefined currentEvent
  if (!currentEvent) {
    return null;
  }

  // Determine color based on event type (buy = rotating colors, sell = pink)
  const color = currentEvent.type === 'sell'
    ? SELL_COLOR
    : TICKER_COLORS[currentIndex % TICKER_COLORS.length];

  return (
    <div className="mb-2 lg:mb-0">
      <div className="px-0 lg:px-0 py-0 lg:py-0">
        <div className="flex justify-center lg:justify-start items-center">
          <Link
            href={`/token/${currentEvent.mint}`}
            className={`ticker-content flex items-center gap-1.5 lg:gap-1 px-2 lg:px-1.5 py-0.5 lg:py-0.5 text-base lg:text-sm text-black font-normal hover:opacity-90 transition-opacity cursor-pointer ${shake ? 'ticker-shake' : ''}`}
            style={{ backgroundColor: color, borderRadius: 0 }}
          >
            {/* User Avatar */}
            <TinyGradientAvatar
              walletAddress={currentEvent.walletFull}
              avatarUrl={currentEvent.userAvatar}
              className="flex-shrink-0 border border-black/30"
            />

            {/* Username or Wallet */}
            <span className="whitespace-nowrap font-bold uppercase underline">
              {currentEvent.username || currentEvent.walletShort}
            </span>

            {/* Action: bought / sold */}
            <span className="whitespace-nowrap font-normal">
              {currentEvent.type === 'buy' ? 'bought' : 'sold'}
            </span>

            {/* Amount */}
            <span className="whitespace-nowrap font-normal">
              {currentEvent.solAmount < 0.01
                ? currentEvent.solAmount.toFixed(4)
                : currentEvent.solAmount.toFixed(2)} SOL
            </span>

            {/* Symbol */}
            <span className="whitespace-nowrap font-normal uppercase">
              ${currentEvent.tokenSymbol}
            </span>

            {/* Token Image */}
            {isValidImageUrl(currentEvent.tokenImage) && (
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-black/30">
                <Image
                  src={currentEvent.tokenImage!}
                  alt={currentEvent.tokenSymbol}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}