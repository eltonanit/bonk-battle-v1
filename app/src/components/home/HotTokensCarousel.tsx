'use client';

import { useEffect, useState, useRef } from 'react';
import { fetchAllTokens } from '@/lib/solana/fetch-all-tokens';
import { Connection, PublicKey } from '@solana/web3.js';
import { RPC_ENDPOINT, PROGRAM_ID } from '@/config/solana';
import Link from 'next/link';

interface HotToken {
  mint: string;
  name: string;
  symbol: string;
  metadataUri: string;
  progress: number;
  solRaised: number;
  targetSol: number;
  virtualSolInit: number;
  marketCap: number;
}

const SOL_PRICE_USD = 100;

export function HotTokensCarousel() {
  const [tokens, setTokens] = useState<HotToken[]>([]);
  const [flashingIndices, setFlashingIndices] = useState<number[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    async function loadTokens() {
      try {
        console.log('🔥 Loading hot tokens...');

        const allTokens = await fetchAllTokens();

        if (allTokens.length === 0) {
          console.log('No tokens found');
          return;
        }

        const hotTokens: HotToken[] = allTokens.map((token) => {
          const marketCap = (token.virtualSolInit + token.solRaised) * SOL_PRICE_USD;

          return {
            mint: token.mint.toString(),
            name: token.name,
            symbol: token.symbol,
            metadataUri: token.metadataUri,
            progress: token.progress,
            solRaised: token.solRaised,
            targetSol: token.targetSol,
            virtualSolInit: token.virtualSolInit,
            marketCap,
          };
        });

        setTokens(hotTokens);
        console.log(`✅ Hot tokens loaded: ${hotTokens.length}`);
      } catch (error) {
        console.error('Error loading hot tokens:', error);
      }
    }

    loadTokens();
    const interval = setInterval(loadTokens, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tokens.length === 0) return;

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    let subscriptionId: number | null = null;

    async function subscribeToEvents() {
      try {
        console.log('🎧 HotTokens: Subscribing to purchase events...');

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
              console.log('💰 Purchase detected! Flashing carousel...');

              const numFlashing = Math.floor(Math.random() * 2) + 1;
              const indices: number[] = [];

              for (let i = 0; i < numFlashing; i++) {
                const randomIndex = Math.floor(Math.random() * tokens.length);
                if (!indices.includes(randomIndex)) {
                  indices.push(randomIndex);
                }
              }

              setFlashingIndices(indices);
              setTimeout(() => setFlashingIndices([]), 600);

              fetchAllTokens().then(allTokens => {
                if (allTokens.length > 0) {
                  const hotTokens: HotToken[] = allTokens.map((token) => {
                    const marketCap = (token.virtualSolInit + token.solRaised) * SOL_PRICE_USD;
                    return {
                      mint: token.mint.toString(),
                      name: token.name,
                      symbol: token.symbol,
                      metadataUri: token.metadataUri,
                      progress: token.progress,
                      solRaised: token.solRaised,
                      targetSol: token.targetSol,
                      virtualSolInit: token.virtualSolInit,
                      marketCap,
                    };
                  });
                  setTokens(hotTokens);
                }
              });
            }
          },
          'confirmed'
        );

        console.log('✅ HotTokens: Subscribed');
      } catch (error) {
        console.error('❌ Subscribe failed:', error);
      }
    }

    subscribeToEvents();

    return () => {
      if (subscriptionId !== null) {
        connection.removeOnLogsListener(subscriptionId);
        console.log('🔌 HotTokens: Unsubscribed');
      }
    };
  }, [tokens]);

  useEffect(() => {
    if (!scrollRef.current || isHovering) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft += 0.5;
        if (
          scrollRef.current.scrollLeft >=
          scrollRef.current.scrollWidth - scrollRef.current.clientWidth
        ) {
          scrollRef.current.scrollLeft = 0;
        }
      }
    }, 30);
    return () => clearInterval(interval);
  }, [isHovering]);

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

  const formatMarketCap = (mc: number): string => {
    if (mc >= 1000000) return `$${(mc / 1000000).toFixed(2)}M`;
    if (mc >= 1000) return `$${(mc / 1000).toFixed(2)}K`;
    return `$${mc.toFixed(2)}`;
  };

  if (tokens.length === 0) {
    return (
      <div className="px-4 lg:px-6 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">🔥 Hot Tokens</h2>
          <p className="text-gray-400">Loading tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mb-8">
      {/* ⭐ FIX: Rimosso px-5 lg:px-6 da qui */}
      <div className="px-4 lg:px-6">
        <h2 className="text-xl font-bold mb-4">🔥 Hot Tokens</h2>
      </div>

      <style jsx>{`
        .carousel-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* ⭐ FIX: Rimosso -mx-5 lg:-mx-6 che causava overflow */}
      <div className="w-full overflow-x-hidden">
        <div
          ref={scrollRef}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className="carousel-scroll flex gap-4 overflow-x-auto px-4 lg:px-6 pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {tokens.map((token, index) => {
            const image = getTokenImage(token.metadataUri);
            const isFlashing = flashingIndices.includes(index);

            return (
              <Link
                key={token.mint}
                href={`/token/${token.mint}`}
                className={`flex-shrink-0 w-[260px] lg:min-w-[280px] rounded-xl p-4 transition-all cursor-pointer ${isFlashing
                    ? 'bg-yellow-400 border-2 border-yellow-400 scale-105 shadow-lg shadow-yellow-400/50'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                style={{
                  transition: isFlashing ? 'all 0.6s ease' : 'all 0.2s ease',
                }}
              >
                {/* ⭐ FIX: Ridotto width su mobile da 280px a 260px */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    {image ? (
                      <img
                        src={image}
                        alt={token.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                        💎
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-base mb-1 truncate ${isFlashing ? 'text-black' : 'text-white'}`}>
                      {token.name}
                    </div>

                    <div className={`text-sm font-semibold mb-2 ${isFlashing ? 'text-black' : 'text-green-400'}`}>
                      MC: {formatMarketCap(token.marketCap)}
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className={isFlashing ? 'text-black/70' : 'text-white/60'}>
                          Progress
                        </span>
                        <span className={`font-bold ${isFlashing ? 'text-black' : 'text-green-400'}`}>
                          {token.progress.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isFlashing ? 'bg-black' : 'bg-green-400'}`}
                          style={{ width: `${Math.min(token.progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}