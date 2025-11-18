'use client';

import { useEffect, useState, useRef } from 'react';
import { fetchAllTokens } from '@/lib/solana/fetch-all-tokens';
import Link from 'next/link';
import Image from 'next/image';

interface TaglineToken {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string;
  progress: number;
  marketCap: number;
  tier: number;
}

const SOL_PRICE_USD = 100;

const FEATURED_IMAGES = [
  '/tagline/1.png',
  '/tagline/2.png',
  '/tagline/3.png',
];

export function Tagline() {
  const [tokens, setTokens] = useState<TaglineToken[]>([]);
  const tokenScrollRef = useRef<HTMLDivElement>(null);
  const [isHoveringTokens, setIsHoveringTokens] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    async function loadTokens() {
      try {
        const allTokens = await fetchAllTokens();

        if (allTokens.length === 0) return;

        const taglineTokens: TaglineToken[] = allTokens.slice(0, 15).map((token) => {
          const marketCap = (token.virtualSolInit + token.solRaised) * SOL_PRICE_USD;

          let imageUrl = '';
          try {
            if (token.metadataUri.startsWith('{')) {
              const metadata = JSON.parse(token.metadataUri);
              imageUrl = metadata.image || '';
            }
          } catch (e) {
            // ignore
          }

          return {
            mint: token.mint.toString(),
            name: token.name,
            symbol: token.symbol,
            imageUrl,
            progress: token.progress,
            marketCap,
            tier: token.tier,
          };
        });

        setTokens(taglineTokens);
      } catch (error) {
        console.error('Error loading tagline tokens:', error);
      }
    }

    loadTokens();
    const interval = setInterval(loadTokens, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!tokenScrollRef.current || isHoveringTokens || tokens.length === 0) return;

    const interval = setInterval(() => {
      if (tokenScrollRef.current) {
        tokenScrollRef.current.scrollLeft += 0.5;
        if (
          tokenScrollRef.current.scrollLeft >=
          tokenScrollRef.current.scrollWidth - tokenScrollRef.current.clientWidth
        ) {
          tokenScrollRef.current.scrollLeft = 0;
        }
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isHoveringTokens, tokens.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % FEATURED_IMAGES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const formatMarketCap = (mc: number): string => {
    if (mc >= 1000000) return `$${(mc / 1000000).toFixed(2)}M`;
    if (mc >= 1000) return `$${(mc / 1000).toFixed(2)}K`;
    return `$${mc.toFixed(2)}`;
  };

  return (
    <div
      className="py-5 px-5 lg:px-6 lg:py-6"
      style={{
        background: 'rgba(10, 10, 10, 0.9)',
        borderBottom: '0.5px solid rgba(255, 255, 255, 0.05)'
      }}
    >
      <style jsx>{`
        .carousel-scroll::-webkit-scrollbar {
          display: none;
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.02);
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
      `}</style>

      {/* ⭐ LAYOUT: Mobile stack (images first), Desktop grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">

        {/* ===== LEFT SIDE (Order 2 mobile, 1 desktop) ===== */}
        <div className="order-2 lg:order-1">
          {/* ⭐ HEADER DESKTOP ONLY - CENTRATO */}
          <div className="hidden lg:flex flex-col items-center justify-center text-center mb-8">
            {/* Titolo principale - VERDE LUMINOSO */}
            <h2
              className="text-4xl font-extrabold mb-3 flex items-center gap-2"
              style={{
                color: '#00FF88',
                textShadow: '0 0 20px rgba(16, 185, 129, 0.5)'
              }}
            >
              WE MOON OR WE REFUND
              <span className="text-4xl">🔥</span>
            </h2>

            {/* Sottotitolo - GIALLO ANIMATO */}
            <p className="text-xl font-semibold mb-4 text-[#fbbf24] animate-pulse-glow">
              The GameStop of memecoins
            </p>

            {/* Bottone verde */}
            <Link href="/create">
              <button className="bg-[#14D99E] text-black px-7 py-2 rounded-xl font-bold text-lg hover:bg-[#12c08d] transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl">
                Launch a Coin
              </button>
            </Link>
          </div>

          {/* Titolo carousel */}
          <h3 className="text-base lg:text-lg font-bold text-green-400 mb-1">
            🔥 Trending Tokens
          </h3>

          {/* Carousel tokens */}
          <div className="w-full overflow-x-hidden">
            <div
              ref={tokenScrollRef}
              onMouseEnter={() => setIsHoveringTokens(true)}
              onMouseLeave={() => setIsHoveringTokens(false)}
              className="carousel-scroll flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {tokens.length > 0 ? (
                tokens.map((token) => {
                  const tierTargets: Record<number, string> = {
                    1: '$5.5K',
                    2: '$50K',
                    3: '$250K',
                    4: '$1M'
                  };
                  const target = tierTargets[token.tier] || '$50K';

                  return (
                    <Link
                      key={token.mint}
                      href={`/token/${token.mint}`}
                      className="flex-shrink-0 w-[240px] bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-green-400/30 transition-all"
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          {token.imageUrl ? (
                            <img
                              src={token.imageUrl}
                              alt={token.name}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                              💎
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="font-bold text-base truncate text-white">
                            {token.name}
                          </div>

                          <div className="text-green-400 font-bold text-sm">
                            {token.progress.toFixed(1)}%
                          </div>

                          <div className="text-white/80 text-sm font-semibold">
                            MC: {formatMarketCap(token.marketCap)}
                          </div>

                          <div className="text-[#fbbf24] text-sm font-bold">
                            Target → {target}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="text-white/60 text-sm">Loading tokens...</div>
              )}
            </div>
          </div>
        </div>

        {/* ===== RIGHT SIDE - SLIDER IMMAGINI (Order 1 mobile, 2 desktop) ===== */}
        <div className="order-1 lg:order-2">
          <h3 className="text-base lg:text-lg font-bold text-green-400 mb-3">
            ✨ The GameStop of memecoins
          </h3>

          {/* ⭐ Container slider - ALTEZZA RIDOTTA per matchare sinistra */}
          <div className="relative w-full h-[180px] lg:h-[280px] bg-black border border-white/10 rounded-xl overflow-hidden">
            {/* Immagini */}
            {FEATURED_IMAGES.map((imgSrc, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-500 ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                  }`}
              >
                <Image
                  src={imgSrc}
                  alt={`Featured ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                  onError={(e) => {
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600 text-white text-4xl font-bold">
                          🚀
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            ))}

            {/* ⭐ PALLINI INDICATORI */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {FEATURED_IMAGES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-2 rounded-full transition-all ${index === currentImageIndex
                      ? 'bg-green-400 w-6'
                      : 'bg-white/40 hover:bg-white/60 w-2'
                    }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}