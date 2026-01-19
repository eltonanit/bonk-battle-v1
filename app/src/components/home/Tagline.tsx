'use client';
// ⭐ UPDATED: Uses token's tier to get correct targets

import { useEffect, useState, useRef, useMemo } from 'react';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import Link from 'next/link';
import Image from 'next/image';
import { ParsedTokenBattleState, BattleStatus, BattleTier } from '@/types/bonk';
import { BattleCard } from '@/components/shared/BattleCard';
import { KalshiChart } from '@/components/shared/KalshiChart';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { lamportsToSol } from '@/lib/solana/constants';
import { supabase } from '@/lib/supabase';
import { FEATURES } from '@/config/features';
import { calculateMarketCapUsd as calcMcUsd } from '@/config/tier-config';

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
  // ⭐ Creator profiles cache (wallet -> avatar_url)
  const [creatorAvatars, setCreatorAvatars] = useState<Record<string, string | null>>({});

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

  // ⭐ Fetch creator profiles for avatar photos
  useEffect(() => {
    async function fetchCreatorProfiles() {
      if (!latestBattle) return;

      const creatorWallets = [
        latestBattle.tokenA.creator?.toString(),
        latestBattle.tokenB.creator?.toString(),
      ].filter((w): w is string => !!w);

      if (creatorWallets.length === 0) return;

      const { data: profiles, error } = await supabase
        .from('users')
        .select('wallet_address, avatar_url')
        .in('wallet_address', creatorWallets);

      if (error) {
        console.error('❌ Error fetching creator profiles:', error);
        return;
      }

      const avatarMap: Record<string, string | null> = {};
      profiles?.forEach(p => {
        if (p.avatar_url) {
          avatarMap[p.wallet_address] = p.avatar_url;
        }
      });

      setCreatorAvatars(avatarMap);
    }

    fetchCreatorProfiles();
  }, [latestBattle]);

  const formatMarketCap = (mc: number): string => {
    if (mc >= 1000000) return `$${(mc / 1000000).toFixed(2)}M`;
    if (mc >= 1000) return `$${(mc / 1000).toFixed(2)}K`;
    return `$${mc.toFixed(2)}`;
  };

  // Helper to calculate MC using correct bonding curve formula
  const calculateMarketCapUsd = (token: ParsedTokenBattleState): number => {
    const solCollected = lamportsToSol(token.realSolReserves ?? 0);
    return calcMcUsd(solCollected, solPriceUsd || 0);
  };

  // Convert token to BattleCard format (SOL-based!)
  const toBattleToken = (token: ParsedTokenBattleState) => {
    const creatorWallet = token.creator?.toString() || null;
    return {
      mint: token.mint.toString(),
      name: token.name || 'Unknown',
      symbol: token.symbol || '???',
      image: token.image || null,
      marketCapUsd: calculateMarketCapUsd(token),
      solCollected: lamportsToSol(token.realSolReserves ?? 0),
      totalVolumeSol: lamportsToSol(token.totalTradeVolume ?? 0),
      // ⭐ Pass creator wallet and avatar for BattleCard
      creatorWallet,
      creatorAvatarUrl: creatorWallet ? creatorAvatars[creatorWallet] || null : null,
    };
  };

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
      className="py-5 px-2 lg:px-6 lg:py-6"
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

      {/* ⭐ LAYOUT: Mobile stack, Desktop full width when ARMIES hidden */}
      <div className={`flex flex-col gap-6 ${FEATURES.SHOW_ARMIES ? 'lg:grid lg:grid-cols-2' : ''}`}>

        {/* ===== LEFT SIDE - COLOSSEUM (visible on all screens) ===== */}
        <div className="order-1 lg:order-1">
          {/* ⭐ Battle Section */}
          <div>
            {/* ⭐ BattleCard + Race - SIDE BY SIDE on desktop */}
            {latestBattle ? (
              <>
                <div className="flex flex-col lg:flex-row lg:items-start lg:gap-4">
                  {/* LEFT: Title + BattleCard */}
                  <div className="flex-shrink-0">
                    {/* Title at same height row as chart */}
                    <h2 className="text-center lg:text-left text-xl lg:text-2xl font-bold text-white mb-4">
                      Who will get more liquidity?
                    </h2>
                    <BattleCard
                      tokenA={toBattleToken(latestBattle.tokenA)}
                      tokenB={toBattleToken(latestBattle.tokenB)}
                      targetSol={battleTargets.targetSol}
                      targetVolumeSol={battleTargets.victoryVolumeSol}
                      isEpicBattle={true}
                    />
                  </div>

                  {/* RIGHT: Kalshi Chart */}
                  <div className="mt-4 lg:mt-0 flex-1 min-w-0">
                    <KalshiChart
                      tokenA={{
                        mint: latestBattle.tokenA.mint.toString(),
                        name: latestBattle.tokenA.name || 'Unknown',
                        symbol: latestBattle.tokenA.symbol || '???',
                        image: latestBattle.tokenA.image || null,
                        marketCapUsd: calculateMarketCapUsd(latestBattle.tokenA),
                      }}
                      tokenB={{
                        mint: latestBattle.tokenB.mint.toString(),
                        name: latestBattle.tokenB.name || 'Unknown',
                        symbol: latestBattle.tokenB.symbol || '???',
                        image: latestBattle.tokenB.image || null,
                        marketCapUsd: calculateMarketCapUsd(latestBattle.tokenB),
                      }}
                      targetMarketCap={10_000_000_000}
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
                <div className="clash-royale-border transform scale-100 lg:scale-90 origin-top">
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

        {/* ===== RIGHT SIDE - SLIDER IMMAGINI (DESKTOP ONLY) - HIDDEN IN SEASON 1 ===== */}
        {FEATURES.SHOW_ARMIES && (
          <div className="hidden lg:block order-2">
            {/* DONT TRADE ALONE JOIN AN ARMY */}
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mt-6 mb-4 flex items-center justify-center gap-2"
              style={{
                color: '#FACC15',
                textShadow: '0 0 15px rgba(250, 204, 21, 0.4)'
              }}
            >
              DONT TRADE ALONE JOIN AN ARMY
            </h2>

            {/* JOIN ARMY TO BATTLE Button */}
            <div className="flex justify-center mb-4">
              <Link
                href="/armies"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-colors"
              >
              <svg viewBox="0 0 640 640" fill="currentColor" className="w-5 h-5">
                <path d="M320 80C377.4 80 424 126.6 424 184C424 241.4 377.4 288 320 288C262.6 288 216 241.4 216 184C216 126.6 262.6 80 320 80zM96 152C135.8 152 168 184.2 168 224C168 263.8 135.8 296 96 296C56.2 296 24 263.8 24 224C24 184.2 56.2 152 96 152zM0 480C0 409.3 57.3 352 128 352C140.8 352 153.2 353.9 164.9 357.4C132 394.2 112 442.8 112 496L112 512C112 523.4 114.4 534.2 118.7 544L32 544C14.3 544 0 529.7 0 512L0 480zM521.3 544C525.6 534.2 528 523.4 528 512L528 496C528 442.8 508 394.2 475.1 357.4C486.8 353.9 499.2 352 512 352C582.7 352 640 409.3 640 480L640 512C640 529.7 625.7 544 608 544L521.3 544zM472 224C472 184.2 504.2 152 544 152C583.8 152 616 184.2 616 224C616 263.8 583.8 296 544 296C504.2 296 472 263.8 472 224zM160 496C160 407.6 231.6 336 320 336C408.4 336 480 407.6 480 496L480 512C480 529.7 465.7 544 448 544L192 544C174.3 544 160 529.7 160 512L160 496z"/>
              </svg>
              JOIN ARMY TO BATTLE
              </Link>
            </div>

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

            {/* Purple text below slides */}
            <p className="text-center mt-4 text-lg font-bold uppercase tracking-wide" style={{ color: '#a855f7', textShadow: '0 0 15px rgba(168, 85, 247, 0.5)' }}>
              BATTLECOIN MARKET IS WHERE COMMUNITIES TURN IN TO ARMIES
            </p>
          </div>
        )}
      </div>
    </div>
  );
}