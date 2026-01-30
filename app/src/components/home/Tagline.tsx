'use client';
// ⭐ UPDATED: Uses token's tier to get correct targets

import { useEffect, useState, useRef, useMemo } from 'react';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import Link from 'next/link';
import { ParsedTokenBattleState, BattleStatus, BattleTier } from '@/types/bonk';
import { BattleCard } from '@/components/shared/BattleCard';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { lamportsToSol } from '@/lib/solana/constants';
import { calculateMarketCapUsd as calcMcUsd } from '@/config/tier-config';
import Image from 'next/image';

// ⭐ TIER TARGETS - Must match smart contract & constants.ts!
// Contract: PROD_TARGET_SOL = 14_586_338_000_000_000 lamports (~$2.07B @ $142/SOL)
// Contract: PROD_VICTORY_VOLUME_SOL = 16_044_972_000_000_000 lamports
const TIER_TARGETS = {
  [BattleTier.Test]: {
    TARGET_SOL: 6,
    VICTORY_VOLUME_SOL: 6.6,
  },
  [BattleTier.Production]: {
    TARGET_SOL: 14_586_338,      // ~$2.07B to fill curve
    VICTORY_VOLUME_SOL: 16_044_972, // Volume needed for victory
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

interface BattlePair {
  tokenA: ParsedTokenBattleState;
  tokenB: ParsedTokenBattleState;
}

export function Tagline() {
  const [tokens, setTokens] = useState<TaglineToken[]>([]);
  const [latestBattle, setLatestBattle] = useState<BattlePair | null>(null);
  const tokenScrollRef = useRef<HTMLDivElement>(null);
  const [isHoveringTokens, setIsHoveringTokens] = useState(false);
  const { solPriceUsd } = usePriceOracle();

  // Top Armies
  const [topArmies, setTopArmies] = useState<{ id: string; name: string; image_url: string | null; icon: string; member_count: number }[]>([]);

  useEffect(() => {
    async function fetchTopArmies() {
      try {
        const res = await fetch('/api/armies?sort=top');
        if (res.ok) {
          const data = await res.json();
          setTopArmies((data.armies || []).slice(0, 4));
        }
      } catch (err) {
        console.error('Error fetching top armies:', err);
      }
    }
    fetchTopArmies();
  }, []);

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
        background: '#0C1426',
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
            box-shadow: 0 0 5px #0ea5e9, 0 0 10px #0ea5e9, 0 0 15px #38bdf8, 0 0 20px #38bdf8;
          }
          50% {
            box-shadow: 0 0 10px #38bdf8, 0 0 20px #38bdf8, 0 0 30px #7dd3fc, 0 0 40px #7dd3fc;
          }
        }

        .electric-border {
          animation: electric-border 1.5s ease-in-out infinite;
          border: 2px solid #0ea5e9;
        }

        @keyframes electric-pulse {
          0%, 100% {
            box-shadow:
              0 0 4px #38bdf8,
              0 0 8px #7dd3fc,
              0 0 12px #7dd3fc;
          }
          50% {
            box-shadow:
              0 0 6px #7dd3fc,
              0 0 12px #38bdf8,
              0 0 18px #0ea5e9;
          }
        }

        @keyframes spark-flash {
          0%, 100% { opacity: 0; transform: scale(0.8); }
          10%, 30% { opacity: 1; transform: scale(1.2); }
          50% { opacity: 0.3; transform: scale(1); }
          70%, 90% { opacity: 1; transform: scale(1.3); }
        }

        .clash-royale-border {
          background: linear-gradient(180deg, #bae6fd 0%, #7dd3fc 15%, #38bdf8 35%, #0ea5e9 55%, #0284c7 75%, #0369a1 100%);
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
          background: linear-gradient(180deg, #0f2744 0%, #0a1a30 50%, #061220 100%);
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
          box-shadow: 0 0 8px #fff, 0 0 15px #7dd3fc, 0 0 25px #38bdf8;
          animation: spark-flash 0.6s ease-in-out infinite;
        }
      `}</style>

      {/* ⭐ LAYOUT: Mobile stack, Desktop full width when ARMIES hidden */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2">

        {/* ===== LEFT SIDE - COLOSSEUM (visible on all screens) ===== */}
        <div className="order-1 lg:order-1">
          {/* THE COLOSSEUM heading */}
          <h2
            className="text-2xl lg:text-3xl font-extrabold text-center mb-4"
            style={{
              color: '#38bdf8',
              textShadow: '0 0 15px rgba(56, 189, 248, 0.5)',
              letterSpacing: '0.15em',
            }}
          >
            THE COLOSSEUM
          </h2>

          {/* ⭐ Battle Section */}
          <div>
            {/* ⭐ NEW: Kalshi-style Battle Card */}
            {latestBattle ? (
              <>
                {/* Standard BattleCard */}
                <div className="flex justify-center">
                  <div className="w-full max-w-[480px]">
                    <BattleCard
                      tokenA={{
                        mint: latestBattle.tokenA.mint.toString(),
                        name: latestBattle.tokenA.name || 'Unknown',
                        symbol: latestBattle.tokenA.symbol || '???',
                        image: latestBattle.tokenA.image || null,
                        marketCapUsd: calculateMarketCapUsd(latestBattle.tokenA),
                        solCollected: lamportsToSol(latestBattle.tokenA.realSolReserves ?? 0),
                        totalVolumeSol: latestBattle.tokenA.totalVolumeSol ?? lamportsToSol(latestBattle.tokenA.totalTradeVolume ?? 0),
                        tokensSold: latestBattle.tokenA.tokensSold,
                      }}
                      tokenB={{
                        mint: latestBattle.tokenB.mint.toString(),
                        name: latestBattle.tokenB.name || 'Unknown',
                        symbol: latestBattle.tokenB.symbol || '???',
                        image: latestBattle.tokenB.image || null,
                        marketCapUsd: calculateMarketCapUsd(latestBattle.tokenB),
                        solCollected: lamportsToSol(latestBattle.tokenB.realSolReserves ?? 0),
                        totalVolumeSol: latestBattle.tokenB.totalVolumeSol ?? lamportsToSol(latestBattle.tokenB.totalTradeVolume ?? 0),
                        tokensSold: latestBattle.tokenB.tokensSold,
                      }}
                      targetSol={battleTargets.targetSol}
                      targetVolumeSol={battleTargets.victoryVolumeSol}
                      showBuyButtons={true}
                    />
                  </div>
                </div>

                {/* Prize description */}
                <p className="text-center mt-4 text-lg lg:text-xl font-bold" style={{ color: '#38bdf8', textShadow: '0 0 15px rgba(56, 189, 248, 0.6)' }}>
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
                <p className="text-center mt-4 text-lg lg:text-xl font-bold" style={{ color: '#38bdf8', textShadow: '0 0 15px rgba(56, 189, 248, 0.6)' }}>
                  Winner gets listed on DEX + 50% liquidity of loser
                </p>
              </>
            )}
          </div>
        </div>

        {/* ===== RIGHT SIDE - JOIN ARMY + LEGENDARY CREATORS (DESKTOP ONLY) ===== */}
        <div className="hidden lg:flex flex-col items-center justify-center order-2 gap-6">

          {/* --- DON'T TRADE ALONE JOIN AN ARMY --- */}
          <h2
            className="text-2xl lg:text-3xl font-extrabold text-center"
            style={{
              color: '#FACC15',
              textShadow: '0 0 15px rgba(250, 204, 21, 0.4)'
            }}
          >
            DON&apos;T TRADE ALONE JOIN AN ARMY
          </h2>

          <Link
            href="/armies"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-colors"
          >
            <svg viewBox="0 0 640 640" fill="currentColor" className="w-5 h-5">
              <path d="M320 80C377.4 80 424 126.6 424 184C424 241.4 377.4 288 320 288C262.6 288 216 241.4 216 184C216 126.6 262.6 80 320 80zM96 152C135.8 152 168 184.2 168 224C168 263.8 135.8 296 96 296C56.2 296 24 263.8 24 224C24 184.2 56.2 152 96 152zM0 480C0 409.3 57.3 352 128 352C140.8 352 153.2 353.9 164.9 357.4C132 394.2 112 442.8 112 496L112 512C112 523.4 114.4 534.2 118.7 544L32 544C14.3 544 0 529.7 0 512L0 480zM521.3 544C525.6 534.2 528 523.4 528 512L528 496C528 442.8 508 394.2 475.1 357.4C486.8 353.9 499.2 352 512 352C582.7 352 640 409.3 640 480L640 512C640 529.7 625.7 544 608 544L521.3 544zM472 224C472 184.2 504.2 152 544 152C583.8 152 616 184.2 616 224C616 263.8 583.8 296 544 296C504.2 296 472 263.8 472 224zM160 496C160 407.6 231.6 336 320 336C408.4 336 480 407.6 480 496L480 512C480 529.7 465.7 544 448 544L192 544C174.3 544 160 529.7 160 512L160 496z"/>
            </svg>
            JOIN ARMY TO BATTLE
          </Link>

          {/* --- TOP ARMIES --- */}
          <div>
            <h4 className="text-[#bbb89b] text-[10px] font-bold tracking-widest uppercase mb-4 text-center">
              LEGENDARY ARMIES
            </h4>
            <div className="flex items-start gap-6">
              {topArmies.length > 0 ? topArmies.map((army, index) => (
                <Link
                  key={army.id}
                  href="/armies"
                  className={`flex flex-col items-center gap-2 text-center group ${index > 0 ? 'grayscale opacity-70 hover:grayscale-0 hover:opacity-100' : ''} transition-all`}
                  style={{ width: 100 }}
                >
                  <div className={`rounded-full overflow-hidden ${index === 0
                    ? 'border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] p-[3px]'
                    : 'border border-white/20 p-[2px]'
                  }`}>
                    {army.image_url ? (
                      <Image
                        src={army.image_url}
                        alt={army.name}
                        width={90}
                        height={90}
                        className="rounded-full object-cover w-[90px] h-[90px]"
                      />
                    ) : (
                      <div className="w-[90px] h-[90px] rounded-full bg-white/10 flex items-center justify-center text-3xl">
                        {army.icon}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase leading-tight ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                    {army.name}
                  </span>
                </Link>
              )) : (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2" style={{ width: 100 }}>
                    <div className="w-[90px] h-[90px] rounded-full bg-white/5 animate-pulse" />
                    <div className="w-14 h-2 rounded bg-white/5 animate-pulse" />
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}