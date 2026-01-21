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
  type: 'buy' | 'sell' | 'created' | 'battle' | 'won' | 'defeated';
  walletShort: string;
  walletFull: string;
  username?: string; // Username dell'utente dal database
  userAvatar?: string; // Avatar dell'utente dal database
  tokenName: string;
  tokenSymbol: string;
  tokenImage?: string;
  solAmount: number;
  timestamp: number;
  // For battle events
  opponentMint?: string;
  opponentSymbol?: string;
  opponentImage?: string;
}

// 3 colori: Verde, Giallo, Blu
const TICKER_COLORS = [
  '#A4F4B6',  // Verde
  '#EFFE16',  // Giallo
  '#93EAEB'   // Blu
];

// Colore speciale per Winners
const WINNER_COLOR = '#FFD700'; // Oro

// Colore per SELL e DEFEATED
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
          .select('mint, name, symbol, image, battle_status, opponent_mint')
          .in('mint', mints)
          .eq('network', 'mainnet');

        if (tokensError) {
          console.error('Error fetching tokens:', tokensError);
        }

        // Create token lookup map
        const tokenMap = new Map<string, { name: string; symbol: string; image?: string; battleStatus: number; opponentMint?: string }>();
        tokens?.forEach(t => {
          tokenMap.set(t.mint, {
            name: t.name || t.mint.slice(0, 8),
            symbol: t.symbol || 'UNK',
            image: t.image,
            battleStatus: t.battle_status || 0,
            opponentMint: t.opponent_mint,
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

          // Debug: log raw sol_amount to check format
          console.log(`📊 Trade ${trade.signature?.slice(0,8)}: raw sol_amount=${trade.sol_amount}, type=${typeof trade.sol_amount}`);

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

        // 4. Fetch recently created tokens (ONLY MAINNET)
        const { data: recentTokens, error: recentError } = await supabase
          .from('tokens')
          .select('*')
          .eq('network', 'mainnet')
          .order('creation_timestamp', { ascending: false })
          .limit(10);

        if (recentError) {
          console.error('Error fetching recent tokens:', recentError);
        }

        const createEvents: RealTradeEvent[] = (recentTokens || []).map(token => ({
          id: `created-${token.mint}`,
          signature: token.mint,
          mint: token.mint,
          type: 'created' as const,
          walletShort: token.mint.slice(0, 5),
          walletFull: token.mint,
          tokenName: token.name || token.mint.slice(0, 8),
          tokenSymbol: token.symbol || 'UNK',
          tokenImage: token.image,
          solAmount: Number(token.real_sol_reserves || 0) / 1e9,
          timestamp: (token.creation_timestamp || 0) * 1000,
        }));

        // 5. Fetch battle events (tokens currently in battle - ONLY MAINNET)
        const { data: battlingTokens, error: battleError } = await supabase
          .from('tokens')
          .select('*')
          .eq('battle_status', 2) // InBattle
          .eq('network', 'mainnet')
          .not('opponent_mint', 'is', null)
          .limit(10);

        if (battleError) {
          console.error('Error fetching battles:', battleError);
        }

        // Get opponent info
        const opponentMints = battlingTokens?.map(t => t.opponent_mint).filter(Boolean) || [];
        const { data: opponents } = await supabase
          .from('tokens')
          .select('mint, symbol, image')
          .in('mint', opponentMints);

        const opponentMap = new Map<string, { symbol: string; image?: string }>();
        opponents?.forEach(o => opponentMap.set(o.mint, { symbol: o.symbol || 'UNK', image: o.image }));

        const battleEvents: RealTradeEvent[] = [];
        const processedBattles = new Set<string>();

        (battlingTokens || []).forEach(token => {
          const pairKey = [token.mint, token.opponent_mint].sort().join('-');
          if (processedBattles.has(pairKey)) return;
          processedBattles.add(pairKey);

          const opponentInfo = opponentMap.get(token.opponent_mint);
          battleEvents.push({
            id: `battle-${pairKey}`,
            signature: pairKey,
            mint: token.mint,
            type: 'battle',
            walletShort: 'BATTLE',
            walletFull: 'BATTLE',
            tokenName: token.name || token.mint.slice(0, 8),
            tokenSymbol: token.symbol || 'UNK',
            tokenImage: token.image,
            solAmount: 0,
            timestamp: (token.battle_start_timestamp || Date.now() / 1000) * 1000,
            opponentMint: token.opponent_mint,
            opponentSymbol: opponentInfo?.symbol || 'UNK',
            opponentImage: opponentInfo?.image,
          });
        });

        // 6. Fetch winners from winners table
        const { data: winners, error: winnersError } = await supabase
          .from('winners')
          .select('*')
          .order('victory_timestamp', { ascending: false })
          .limit(10);

        if (winnersError) {
          console.error('Error fetching winners:', winnersError);
        }

        const winnerEvents: RealTradeEvent[] = (winners || []).map(winner => ({
          id: `won-${winner.mint}`,
          signature: winner.victory_signature || winner.mint,
          mint: winner.mint,
          type: 'won' as const,
          walletShort: '🏆',
          walletFull: winner.mint,
          tokenName: winner.name || winner.mint.slice(0, 8),
          tokenSymbol: winner.symbol || 'UNK',
          tokenImage: winner.image,
          solAmount: Number(winner.spoils_sol || 0),
          timestamp: new Date(winner.victory_timestamp).getTime(),
          opponentMint: winner.loser_mint,
          opponentSymbol: winner.loser_symbol,
          opponentImage: winner.loser_image,
        }));

        // 6.5 Create DEFEATED events from losers
        const defeatedEvents: RealTradeEvent[] = (winners || [])
          .filter(winner => winner.loser_mint && winner.loser_symbol)
          .map(winner => ({
            id: `defeated-${winner.loser_mint}`,
            signature: winner.victory_signature || winner.loser_mint,
            mint: winner.loser_mint,
            type: 'defeated' as const,
            walletShort: '💀',
            walletFull: winner.loser_mint,
            tokenName: winner.loser_name || winner.loser_mint?.slice(0, 8) || 'Unknown',
            tokenSymbol: winner.loser_symbol || 'UNK',
            tokenImage: winner.loser_image,
            solAmount: 0,
            timestamp: new Date(winner.victory_timestamp).getTime() - 1, // Just before winner
            opponentMint: winner.mint,
            opponentSymbol: winner.symbol,
            opponentImage: winner.image,
          }));

        // 7. SEASON 1: Only show buy/sell events (no winners, defeated, battles, created)
        const allEvents = [
          ...tradeEvents, // Only buy/sell events
        ];

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

  // Determine color based on event type
  const getEventColor = () => {
    if (currentEvent.type === 'won') return WINNER_COLOR;
    if (currentEvent.type === 'defeated' || currentEvent.type === 'sell') return SELL_COLOR;
    return TICKER_COLORS[currentIndex % TICKER_COLORS.length];
  };
  const color = getEventColor();

  // WINNER and DEFEATED are taller
  const isSpecialEvent = currentEvent.type === 'won' || currentEvent.type === 'defeated';

  return (
    <div className="mb-2 lg:mb-0">
      <div className="px-0 lg:px-0 py-0 lg:py-0">
        <div className="flex justify-center lg:justify-start items-center">
          <Link
            href={`/token/${currentEvent.mint}`}
            className={`ticker-content flex items-center gap-1.5 lg:gap-1 px-2 lg:px-1.5 text-black font-normal hover:opacity-90 transition-opacity cursor-pointer ${shake ? 'ticker-shake' : ''} ${isSpecialEvent ? 'py-1 lg:py-0.5 text-base lg:text-sm' : 'py-0.5 lg:py-0.5 text-base lg:text-sm'}`}
            style={{ backgroundColor: color, borderRadius: 0 }}
          >
            {currentEvent.type === 'won' ? (
              <>
                <span className="whitespace-nowrap uppercase font-bold">
                  🏆 WINNER:
                </span>
                {isValidImageUrl(currentEvent.tokenImage) && (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-yellow-600">
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
                <span className="font-bold">{currentEvent.tokenSymbol}</span>
              </>
            ) : currentEvent.type === 'defeated' ? (
              <>
                <span className="whitespace-nowrap uppercase font-bold">
                  💀 DEFEATED:
                </span>
                {isValidImageUrl(currentEvent.tokenImage) && (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border border-red-600 grayscale opacity-80">
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
                <span className="font-bold line-through">{currentEvent.tokenSymbol}</span>
              </>
            ) : currentEvent.type === 'battle' ? (
              <>
                <span className="whitespace-nowrap text-base lg:text-sm uppercase font-bold">
                  ⚔️ BATTLE:
                </span>
                {isValidImageUrl(currentEvent.tokenImage) && (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-white/20">
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
                <span className="font-bold">VS</span>
                {isValidImageUrl(currentEvent.opponentImage) && (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-white/20">
                    <Image
                      src={currentEvent.opponentImage!}
                      alt={currentEvent.opponentSymbol || 'Opponent'}
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* BUY/SELL: User Avatar - Gradient fallback */}
                <TinyGradientAvatar
                  walletAddress={currentEvent.walletFull}
                  avatarUrl={currentEvent.userAvatar}
                  className="flex-shrink-0 border border-black/30"
                />

                {/* Username o Wallet - BOLD + UNDERLINED */}
                <span className="whitespace-nowrap font-bold uppercase text-base lg:text-sm underline">
                  {currentEvent.username || currentEvent.walletShort}
                </span>

                {/* Action */}
                <span className="whitespace-nowrap text-base lg:text-sm font-normal">
                  {currentEvent.type === 'buy' ? 'bought' : 'sold'}
                </span>

                {/* Amount - Show up to 4 decimals for small amounts */}
                <span className="whitespace-nowrap font-normal text-base lg:text-sm">
                  {currentEvent.solAmount < 0.01
                    ? currentEvent.solAmount.toFixed(4)
                    : currentEvent.solAmount.toFixed(2)} SOL
                </span>

                {/* Symbol */}
                <span className="whitespace-nowrap font-normal uppercase text-base lg:text-sm">
                  ${currentEvent.tokenSymbol}
                </span>

                {/* Token Image - LAST */}
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
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}