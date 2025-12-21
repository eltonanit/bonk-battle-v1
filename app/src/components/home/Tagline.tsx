'use client';
// ⭐ UPDATED: Uses token's tier to get correct targets

import { useEffect, useState, useRef, useMemo } from 'react';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import Link from 'next/link';
import Image from 'next/image';
import { ParsedTokenBattleState, BattleStatus, BattleTier } from '@/types/bonk';
import { BattleCard } from '@/components/shared/BattleCard';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { lamportsToSol } from '@/lib/solana/constants';

// ⭐ TIER TARGETS - Must match smart contract!
const TIER_TARGETS = {
  [BattleTier.Test]: {
    TARGET_SOL: 6,
    VICTORY_VOLUME_SOL: 6.6,
  },
  [BattleTier.Production]: {
    TARGET_SOL: 37.7,
    VICTORY_VOLUME_SOL: 41.5,
  },
} as const;

// ⭐ Helper to get tier-specific targets
function getTierTargets(tier: BattleTier | number | undefined) {
  const tierValue = tier ?? BattleTier.Test;
  const targets = TIER_TARGETS[tierValue as BattleTier] ?? TIER_TARGETS[BattleTier.Test];
  return {
    targetSol: targets.TARGET_SOL,
    victoryVolumeSol: targets.VICTORY_VOLUME_SOL,
  };
}

interface TaglineToken {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string;
  progress: number;
  marketCap: number;
  tier: number;
}

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
            break;
          }
        }

        const taglineTokens: TaglineToken[] = allTokens.slice(0, 15).map((token) => {
          // ✅ FIX: Use realSolReserves (lamports) and convert to SOL
          const solCollected = lamportsToSol(token.realSolReserves ?? 0);
          const marketCap = solCollected * 100 * (solPriceUsd || 100);

          return {
            mint: token.mint.toString(),
            name: token.name || token.mint.toString().substring(0, 8),
            symbol: token.symbol || 'UNK',
            imageUrl: token.image || '',
            progress: (solCollected / 85) * 100,
            marketCap,
            tier: token.tier ?? 0,
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

  // Convert token to BattleCard format (SOL-based!)
  const toBattleToken = (token: ParsedTokenBattleState) => ({
    mint: token.mint.toString(),
    name: token.name || 'Unknown',
    symbol: token.symbol || '???',
    image: token.image || null,
    marketCapUsd: calculateMarketCapUsd(token),
    solCollected: lamportsToSol(token.realSolReserves ?? 0),
    totalVolumeSol: lamportsToSol(token.totalTradeVolume ?? 0),
  });

  // ⭐ Get tier targets for the battle (use tokenA's tier, both should match)
  const battleTargets = useMemo(() => {
    if (!latestBattle) return { targetSol: 6, victoryVolumeSol: 6.6 };
    return getTierTargets(latestBattle.tokenA.tier);
  }, [latestBattle]);

  // 🔍 DEBUG: Log per vedere cosa sta succedendo
  console.log('🎯 Tagline battleTargets:', {
    hasLatestBattle: !!latestBattle,
    tier: latestBattle?.tokenA.tier,
    targetSol: battleTargets.targetSol,
    victoryVolumeSol: battleTargets.victoryVolumeSol,
  });

  return (
    <div
      className="py-5 px-5 lg:px-6 lg:py-6"
      style={{
        background: '#1C032B',
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

        {/* ===== LEFT SIDE - COLOSSEUM (visible on all screens) ===== */}
        <div className="order-1 lg:order-1">
          {/* ⭐ THE COLOSSEUM - Visible on ALL screens */}
          <div>
            {/* Titolo THE COLOSSEUM - CENTRATO */}
            <h2
              className="text-2xl sm:text-3xl lg:text-5xl font-extrabold mb-2 flex items-center justify-center gap-2 lg:gap-4"
              style={{
                color: '#a855f7',
                textShadow: '0 0 20px rgba(168, 85, 247, 0.6)'
              }}
            >
              <span className="text-2xl sm:text-3xl lg:text-5xl">⚔️</span>
              THE COLOSSEUM
              <span className="text-2xl sm:text-3xl lg:text-5xl">⚔️</span>
            </h2>

            {/* About to Win - Leading Token - RIGHT UNDER TITLE */}
            {latestBattle && (() => {
              const tokenAVolume = lamportsToSol(latestBattle.tokenA.totalTradeVolume ?? 0);
              const tokenBVolume = lamportsToSol(latestBattle.tokenB.totalTradeVolume ?? 0);
              const tokenASol = lamportsToSol(latestBattle.tokenA.realSolReserves ?? 0);
              const tokenBSol = lamportsToSol(latestBattle.tokenB.realSolReserves ?? 0);

              // ⭐ Use tier-specific targets for progress calculation
              const { targetSol, victoryVolumeSol } = battleTargets;
              const tokenAProgress = ((tokenASol / targetSol) + (tokenAVolume / victoryVolumeSol)) / 2;
              const tokenBProgress = ((tokenBSol / targetSol) + (tokenBVolume / victoryVolumeSol)) / 2;

              const leadingToken = tokenAProgress >= tokenBProgress ? latestBattle.tokenA : latestBattle.tokenB;

              return (
                <div className="flex items-center justify-center gap-3 mb-4 bg-black/40 rounded-xl py-2 px-4 mx-auto w-fit">
                  <span className="text-black font-bold bg-yellow-400 px-2 py-0.5 rounded text-sm">About to win</span>
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-yellow-400">
                    <Image
                      src={leadingToken.image || '/default-token.png'}
                      alt={leadingToken.symbol || 'Leading'}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="text-yellow-400 font-bold text-sm">${leadingToken.symbol}</span>
                </div>
              );
            })()}

            {/* ⭐ BattleCard - Uses token's tier for correct targets */}
            {latestBattle ? (
              <>
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
                    {/* ⭐ KEY FIX: Pass tier-specific targets */}
                    <BattleCard
                      tokenA={toBattleToken(latestBattle.tokenA)}
                      tokenB={toBattleToken(latestBattle.tokenB)}
                      targetSol={battleTargets.targetSol}
                      targetVolumeSol={battleTargets.victoryVolumeSol}
                      isEpicBattle={true}
                    />
                  </div>
                </div>

                {/* Prize description */}
                <p className="text-center mt-4 text-lg lg:text-xl font-bold" style={{ color: '#c084fc', textShadow: '0 0 15px rgba(192, 132, 252, 0.6)' }}>
                  Winner gets listed on DEX + 50% liquidity of loser
                </p>
              </>
            ) : (
              <>
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
                {/* Prize description */}
                <p className="text-center mt-4 text-lg lg:text-xl font-bold" style={{ color: '#c084fc', textShadow: '0 0 15px rgba(192, 132, 252, 0.6)' }}>
                  Winner gets listed on DEX + 50% liquidity of loser
                </p>
              </>
            )}
          </div>
        </div>

        {/* ===== RIGHT SIDE - SLIDER IMMAGINI (DESKTOP ONLY) ===== */}
        <div className="hidden lg:block order-2">
          <h3 className="text-xl lg:text-2xl font-bold mb-3" style={{ color: '#FF8A5B' }}>
            ✨CLASH OF MEMES: YOUR TOKEN VS MY TOKEN
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