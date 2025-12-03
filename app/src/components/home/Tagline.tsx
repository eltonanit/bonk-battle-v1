'use client';

import { useEffect, useState, useRef } from 'react';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import Link from 'next/link';
import Image from 'next/image';
import { ParsedTokenBattleState, BattleStatus } from '@/types/bonk';
import { BattleCard } from '@/components/shared/BattleCard';
import { usePriceOracle } from '@/hooks/usePriceOracle';

interface TaglineToken {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string;
  progress: number;
  marketCap: number;
  tier: number;
}

// Victory targets (devnet)
const VICTORY_MC_USD = 5500;
const VICTORY_VOLUME_USD = 100;

const FEATURED_IMAGES = [
  '/tagline/1.png',
  '/3.png',
  '/4.png',
];

interface BattlePair {
  tokenA: ParsedTokenBattleState;
  tokenB: ParsedTokenBattleState;
}

export function Tagline() {
  const [tokens, setTokens] = useState<TaglineToken[]>([]);
  const [latestBattle, setLatestBattle] = useState<BattlePair | null>(null);
  const tokenScrollRef = useRef<HTMLDivElement>(null);
  const [isHoveringTokens, setIsHoveringTokens] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { solPriceUsd } = usePriceOracle();

  useEffect(() => {
    async function loadTokens() {
      try {
        // Use the new BONK fetcher
        const allTokens = await fetchAllBonkTokens();

        if (allTokens.length === 0) return;

        // Find the most recent battle (InBattle status)
        const battlingTokens = allTokens.filter(t => t.battleStatus === BattleStatus.InBattle);
        const processed = new Set<string>();

        for (const token of battlingTokens) {
          const mintStr = token.mint.toString();
          if (processed.has(mintStr)) continue;

          const opponentMint = token.opponentMint?.toString();
          if (!opponentMint || opponentMint === '11111111111111111111111111111111') continue;

          const opponent = allTokens.find(t => t.mint.toString() === opponentMint);
          if (opponent) {
            setLatestBattle({ tokenA: token, tokenB: opponent });
            processed.add(mintStr);
            processed.add(opponentMint);
            break; // Only need the first/most recent battle
          }
        }

        const taglineTokens: TaglineToken[] = allTokens.slice(0, 15).map((token) => {
          const marketCap = (token.solCollected / 1e9) * 100 * (solPriceUsd || 100);

          return {
            mint: token.mint.toString(),
            name: token.name || token.mint.toString().substring(0, 8),
            symbol: token.symbol || 'UNK',
            imageUrl: token.image || '',
            progress: (token.solCollected / 1e9 / 85) * 100,
            marketCap,
            tier: 1,
          };
        });

        setTokens(taglineTokens);
      } catch (error) {
        console.error('Error loading tagline tokens:', error);
      }
    }

    loadTokens();
  }, [solPriceUsd]);

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

  // Helper to calculate MC using bonding curve
  const calculateMarketCapUsd = (token: ParsedTokenBattleState): number => {
    const virtualSol = token.virtualSolReserves ?? 0;
    const virtualToken = token.virtualTokenReserves ?? 0;
    if (virtualToken === 0 || !solPriceUsd) return 0;
    const TOTAL_SUPPLY = 1_000_000_000;
    const mcInLamports = (virtualSol * TOTAL_SUPPLY) / (virtualToken / 1e9);
    return (mcInLamports / 1e9) * solPriceUsd;
  };

  // Helper to convert lamports to USD
  const lamportsToUsd = (lamports: number): number => {
    if (!solPriceUsd) return 0;
    return (lamports / 1e9) * solPriceUsd;
  };

  // Convert token to BattleCard format
  const toBattleToken = (token: ParsedTokenBattleState) => ({
    mint: token.mint.toString(),
    name: token.name || 'Unknown',
    symbol: token.symbol || '???',
    image: token.image || null,
    marketCapUsd: calculateMarketCapUsd(token),
    volumeUsd: lamportsToUsd(token.totalTradeVolume ?? 0),
    solCollected: (token.realSolReserves ?? 0) / 1e9
  });

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

        @keyframes electric-border {
          0%, 100% {
            box-shadow: 0 0 5px #9333ea, 0 0 10px #9333ea, 0 0 15px #a855f7, 0 0 20px #a855f7;
          }
          50% {
            box-shadow: 0 0 10px #a855f7, 0 0 20px #a855f7, 0 0 30px #c084fc, 0 0 40px #c084fc;
          }
        }

        .electric-border {
          animation: electric-border 1.5s ease-in-out infinite;
          border: 2px solid #9333ea;
        }

        @keyframes electric-pulse {
          0%, 100% {
            box-shadow:
              0 0 4px #a855f7,
              0 0 8px #c084fc,
              0 0 12px #c084fc;
          }
          50% {
            box-shadow:
              0 0 6px #c084fc,
              0 0 12px #a855f7,
              0 0 18px #9333ea;
          }
        }

        @keyframes spark-flash {
          0%, 100% { opacity: 0; transform: scale(0.8); }
          10%, 30% { opacity: 1; transform: scale(1.2); }
          50% { opacity: 0.3; transform: scale(1); }
          70%, 90% { opacity: 1; transform: scale(1.3); }
        }

        .clash-royale-border {
          background: linear-gradient(180deg, #d8b4fe 0%, #c084fc 15%, #a855f7 35%, #9333ea 55%, #7c3aed 75%, #6d28d9 100%);
          padding: 4px;
          border-radius: 16px;
          animation: electric-pulse 1.5s ease-in-out infinite;
          position: relative;
        }

        .clash-royale-border::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: transparent;
          box-shadow:
            inset 2px 0 8px rgba(255, 255, 255, 0.3),
            inset -2px 0 8px rgba(255, 255, 255, 0.3),
            inset 0 2px 8px rgba(255, 255, 255, 0.3),
            inset 0 -2px 8px rgba(255, 255, 255, 0.3);
          pointer-events: none;
        }

        .clash-royale-inner {
          background: linear-gradient(180deg, #1e1245 0%, #120a2e 50%, #0a0618 100%);
          border-radius: 12px;
          padding: 16px;
          position: relative;
          overflow: hidden;
        }

        /* Spark particles */
        .spark {
          position: absolute;
          width: 6px;
          height: 6px;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 0 8px #fff, 0 0 15px #c084fc, 0 0 25px #a855f7;
          animation: spark-flash 0.6s ease-in-out infinite;
        }
      `}</style>

      {/* ⭐ LAYOUT: Mobile stack (images first), Desktop grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">

        {/* ===== LEFT SIDE (Order 2 mobile, 1 desktop) ===== */}
        <div className="order-2 lg:order-1">
          {/* ⭐ DESKTOP ONLY - EPIC BATTLE with BattleCard */}
          <div className="hidden lg:block">
            {/* Titolo EPIC BATTLE - CENTRATO */}
            <h2
              className="text-4xl lg:text-5xl font-extrabold mb-6 flex items-center justify-center gap-4"
              style={{
                color: '#a855f7',
                textShadow: '0 0 20px rgba(168, 85, 247, 0.6)'
              }}
            >
              <span className="text-4xl lg:text-5xl">⚔️</span>
              THE COLOSSEUM
              <span className="text-4xl lg:text-5xl">⚔️</span>
            </h2>

            {/* BattleCard - Most Recent Battle - Clash Royale Border with Electric Sparks */}
            {latestBattle ? (
              <div className="clash-royale-border transform scale-90 origin-top">
                {/* Electric Sparks */}
                <div className="spark" style={{ top: '10%', left: '-2px', animationDelay: '0s' }} />
                <div className="spark" style={{ top: '50%', right: '-2px', animationDelay: '0.2s' }} />
                <div className="spark" style={{ bottom: '20%', left: '30%', animationDelay: '0.4s' }} />
                <div className="spark" style={{ top: '-2px', left: '60%', animationDelay: '0.6s' }} />
                <div className="spark" style={{ bottom: '-2px', right: '40%', animationDelay: '0.3s' }} />
                <div className="spark" style={{ top: '30%', left: '-2px', animationDelay: '0.5s' }} />
                <div className="spark" style={{ bottom: '10%', right: '-2px', animationDelay: '0.1s' }} />
                <div className="spark" style={{ top: '-2px', left: '20%', animationDelay: '0.7s' }} />

                <div className="clash-royale-inner !p-0">
                  <BattleCard
                    tokenA={toBattleToken(latestBattle.tokenA)}
                    tokenB={toBattleToken(latestBattle.tokenB)}
                    targetMC={VICTORY_MC_USD}
                    targetVol={VICTORY_VOLUME_USD}
                    isEpicBattle={true}
                  />
                </div>
              </div>
            ) : (
              <div className="clash-royale-border transform scale-90 origin-top">
                {/* Electric Sparks */}
                <div className="spark" style={{ top: '10%', left: '-2px', animationDelay: '0s' }} />
                <div className="spark" style={{ top: '50%', right: '-2px', animationDelay: '0.3s' }} />
                <div className="spark" style={{ bottom: '-2px', left: '50%', animationDelay: '0.5s' }} />
                <div className="spark" style={{ top: '-2px', right: '30%', animationDelay: '0.2s' }} />

                <div className="clash-royale-inner text-center">
                  <div className="text-3xl mb-2">⚔️</div>
                  <div className="text-base font-bold text-white mb-1">No Active Battles</div>
                  <div className="text-gray-400 text-xs">
                    Battles start when two qualified tokens are matched.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT SIDE - SLIDER IMMAGINI (Order 1 mobile, 2 desktop) ===== */}
        <div className="order-1 lg:order-2">
          <h3 className="text-base lg:text-lg font-bold mb-3" style={{ color: '#FF8A5B' }}>
            ✨CLASH OF MEMES: ENTER THE ARENA
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
                    ? 'bg-yellow-400 w-6'
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