'use client';
import { UpvoteButton } from '@/components/token/UpvoteButton';
import { useEffect, useState } from 'react';
import { fetchAllTokens, TokenLaunchData } from '@/lib/solana/fetch-all-tokens';
import { Connection, PublicKey } from '@solana/web3.js';
import { RPC_ENDPOINT, PROGRAM_ID } from '@/config/solana';
import Link from 'next/link';
import { useBatchTokenViews, formatViews } from '@/hooks/useBatchTokenViews';

type FilterTab = 'new' | 'win' | 'fire';

const SOL_PRICE_USD = 100;

// ⭐ NEW: Componente per il timer live di ogni card
function LiveTimeAgo({ createdAt }: { createdAt: number }) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = now - createdAt;

      if (diff < 60) {
        setTimeAgo(`${diff}s ago`);
      } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        setTimeAgo(`${minutes}m ago`);
      } else if (diff < 86400) {
        const hours = Math.floor(diff / 3600);
        setTimeAgo(`${hours}h ago`);
      } else {
        const days = Math.floor(diff / 86400);
        setTimeAgo(`${days}d ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return <span>{timeAgo}</span>;
}

export function TokenGrid() {
  const [allTokens, setAllTokens] = useState<TokenLaunchData[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('new');
  const [recentPurchases, setRecentPurchases] = useState<Set<string>>(new Set());

  // ⭐ BATCH FETCH views per tutti i token
  const tokenMints = allTokens.map(t => t.mint.toString());
  const { viewsMap, loading: viewsLoading } = useBatchTokenViews(tokenMints);

  useEffect(() => {
    async function loadTokens() {
      try {
        console.log('📊 TokenGrid: Loading all tokens...');
        const tokens = await fetchAllTokens();
        console.log(`✅ TokenGrid: Found ${tokens.length} tokens from fetch`);
        setAllTokens(tokens);
      } catch (error) {
        console.error('Error loading tokens:', error);
      }
    }

    loadTokens();
    const interval = setInterval(loadTokens, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    let subscriptionId: number | null = null;

    async function subscribeToEvents() {
      try {
        console.log('🔥 TokenGrid: Subscribing to purchase events...');

        subscriptionId = connection.onLogs(
          new PublicKey(PROGRAM_ID),
          (logs) => {
            const logMessages = logs.logs;
            const isPurchaseEvent = logMessages.some(log =>
              log.includes('TokensPurchased') ||
              log.includes('buy_tokens') ||
              log.includes('buy_more_tokens')
            );

            if (isPurchaseEvent) {
              console.log('🔥 Purchase detected in TokenGrid!');
              fetchAllTokens().then(tokens => {
                setAllTokens(tokens);
                const activeMints = new Set(
                  tokens.filter(t => t.solRaised > 0).map(t => t.mint.toString())
                );
                setRecentPurchases(activeMints);
              });
            }
          },
          'confirmed'
        );

        console.log('✅ TokenGrid: Subscribed to events');
      } catch (error) {
        console.error('❌ TokenGrid: Subscribe failed:', error);
      }
    }

    subscribeToEvents();

    return () => {
      if (subscriptionId !== null) {
        connection.removeOnLogsListener(subscriptionId);
        console.log('🔌 TokenGrid: Unsubscribed');
      }
    };
  }, []);

  const getFilteredTokens = (): TokenLaunchData[] => {
    let filtered = [...allTokens];

    switch (activeFilter) {
      case 'new':
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'win':
        filtered = filtered.filter(t => t.progress > 50);
        filtered.sort((a, b) => b.progress - a.progress);
        break;
      case 'fire':
        filtered = filtered.filter(t => t.solRaised > 0);
        filtered.sort((a, b) => {
          const aRecent = recentPurchases.has(a.mint.toString());
          const bRecent = recentPurchases.has(b.mint.toString());
          if (aRecent && !bRecent) return -1;
          if (!aRecent && bRecent) return 1;
          return b.solRaised - a.solRaised;
        });
        break;
    }

    return filtered;
  };

  const filteredTokens = getFilteredTokens();

  const getTokenImage = (metadataUri: string): string => {
    try {
      if (metadataUri.startsWith('{')) {
        const metadata = JSON.parse(metadataUri);
        return metadata.image || '';
      }
    } catch (e) {
      // ignore
    }
    return '';
  };

  const formatTime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getCountdownColor = (timeRemaining: number, tier: number): { color: string; blink: boolean } => {
    const tierDurations: { [key: number]: number } = {
      1: 3 * 24 * 60 * 60,
      2: 7 * 24 * 60 * 60,
      3: 15 * 24 * 60 * 60,
      4: 30 * 24 * 60 * 60,
    };

    const totalDuration = tierDurations[tier] || tierDurations[2];
    const elapsed = totalDuration - timeRemaining;
    const percentElapsed = (elapsed / totalDuration) * 100;

    if (percentElapsed >= 95) {
      return { color: '#ef4444', blink: true };
    } else if (percentElapsed >= 75) {
      return { color: '#fb923c', blink: false };
    } else if (percentElapsed >= 50) {
      return { color: '#fbbf24', blink: false };
    } else {
      return { color: '#10b981', blink: false };
    }
  };

  const formatMarketCap = (virtualSol: number, solRaised: number): string => {
    const mc = (virtualSol + solRaised) * SOL_PRICE_USD;
    if (mc >= 1000000) return `$${(mc / 1000000).toFixed(1)}M`;
    if (mc >= 1000) return `$${(mc / 1000).toFixed(1)}K`;
    return `$${mc.toFixed(0)}`;
  };

  const formatTarget = (targetSol: number): string => {
    const targetUSD = targetSol * SOL_PRICE_USD;
    if (targetUSD >= 1000000) return `$${(targetUSD / 1000000).toFixed(0)}M`;
    if (targetUSD >= 1000) return `$${(targetUSD / 1000).toFixed(0)}K`;
    return `$${targetUSD.toFixed(0)}`;
  };

  return (
    <div className="px-5 lg:px-6 pb-32">
      <style jsx>{`
        @keyframes blinkRed {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        .blink-red {
          animation: blinkRed 0.5s infinite;
        }
      `}</style>

      {/* Filter Tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveFilter('new')}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${activeFilter === 'new'
              ? 'bg-blue-500 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
        >
          📘 New
        </button>

        <button
          onClick={() => setActiveFilter('win')}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${activeFilter === 'win'
              ? 'bg-blue-500 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
        >
          💎 Win
        </button>

        <button
          onClick={() => setActiveFilter('fire')}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${activeFilter === 'fire'
              ? 'bg-orange-500 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
        >
          🔥 Fire
        </button>
      </div>

      {/* Token Grid */}
      {filteredTokens.length === 0 ? (
        <div className="text-center py-12 text-white/60">
          {activeFilter === 'new' && 'No tokens yet. Be the first to launch!'}
          {activeFilter === 'win' && 'No tokens above 50% progress yet.'}
          {activeFilter === 'fire' && 'No tokens with purchases yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTokens.map((token) => {
            const image = getTokenImage(token.metadataUri);
            const marketCap = formatMarketCap(token.virtualSolInit, token.solRaised);
            const target = formatTarget(token.targetSol);
            const timeLeft = formatTime(token.timeRemaining);
            const isFire = recentPurchases.has(token.mint.toString());
            const countdownStyle = getCountdownColor(token.timeRemaining, token.tier);

            // ⭐ Get views from batch map
            const views = viewsMap[token.mint.toString()] || 0;

            return (
              <div
                key={token.mint.toString()}
                className="relative bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all"
              >
                {/* ⭐ Upvote button - LEFT SIDE */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                  <UpvoteButton
                    tokenMint={token.mint.toString()}
                    creatorAddress={token.pubkey.toString()}
                  />
                </div>

                {/* Main content - CLICKABLE */}
                <Link
                  href={`/token/${token.mint.toString()}`}
                  className="block ml-14"
                >
                  <div className="flex items-start gap-4">
                    {/* CENTER: Image */}
                    <div className="flex-shrink-0">
                      {image ? (
                        <img
                          src={image}
                          alt={token.name}
                          className="w-24 h-24 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-5xl">
                          👑
                        </div>
                      )}
                    </div>

                    {/* RIGHT: Token Info */}
                    <div className="flex-1 min-w-0">
                      {/* ⭐ TOP ROW: $SYMBOL | Views | Time */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <h3 className="text-xl font-bold text-white truncate">
                            ${token.symbol}
                          </h3>
                          <span className="text-gray-600">|</span>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
                            <span>👁</span>
                            <span className="font-semibold">
                              Views {viewsLoading ? '...' : formatViews(views)}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded flex-shrink-0 ml-2">
                          <LiveTimeAgo createdAt={token.createdAt} />
                        </span>
                      </div>

                      {/* ⭐ STATS: MC → TARGET and Countdown */}
                      <div className="mb-3 space-y-1.5">
                        <div className="text-sm flex items-center gap-1.5 flex-wrap">
                          <span className="text-gray-500">MC</span>
                          <span className="text-white font-bold">{marketCap}</span>
                          <span className="text-yellow-400 text-xs">→</span>
                          <span className="text-yellow-400 font-bold text-xs">
                            TARGET: {target}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span
                            className={`font-bold flex items-center gap-1 ${countdownStyle.blink ? 'blink-red' : ''
                              }`}
                            style={{ color: countdownStyle.color }}
                          >
                            <span>⏰</span>
                            <span>{timeLeft}</span>
                          </span>
                        </div>
                      </div>

                      {/* ⭐ PROGRESS BAR - only percentage */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Progress</span>
                          <span className="text-green-400 font-bold">
                            {token.progress.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{ width: `${Math.max(token.progress, 2)}%` }}
                          />
                        </div>
                      </div>

                      {/* Fire Badge */}
                      {isFire && activeFilter === 'fire' && (
                        <div className="mt-2 inline-block bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-0.5 rounded">
                          🔥 Hot
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}