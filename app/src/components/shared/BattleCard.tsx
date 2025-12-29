// =================================================================
// FILE: app/src/components/shared/BattleCard.tsx
// ⭐ UPDATED: Added "Buy Winner" buttons with chances + BuyToWin modal
// =================================================================
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ⭐ IMPORT FROM CENTRALIZED TIER CONFIG
import {
  TARGET_SOL,
  VICTORY_VOLUME_SOL,
  ACTIVE_TIER,
  calculateMarketCapUsd,
  getFinalMarketCapUsd,
} from '@/config/tier-config';

// ⭐ IMPORT CHANCE CALCULATION
import { calculateChances } from '@/utils/calculateBestToWin';

// ⭐ IMPORT MODAL
import { BuyToWinModal } from '@/components/BuyToWinModal';

// ⭐ USE ON-CHAIN PRICE ORACLE
import { usePriceOracle } from '@/hooks/usePriceOracle';

/**
 * Convert SOL to USD using oracle price
 */
function solToUsd(solAmount: number, solPriceUsd: number): number {
  if (!solPriceUsd || solPriceUsd <= 0) return 0;
  return solAmount * solPriceUsd;
}

/**
 * Format USD value for display
 */
function formatUsd(usd: number): string {
  if (!usd || usd <= 0) return '$0';

  if (usd >= 1_000_000) {
    return `$${(usd / 1_000_000).toFixed(2)}M`;
  }
  if (usd >= 1_000) {
    return `$${(usd / 1_000).toFixed(1)}K`;
  }
  return `$${Math.round(usd).toLocaleString()}`;
}

// CSS for radiating glow effect and diamond pattern
const radiateStyles = `
  .epic-diamond-bg {
    background:
      linear-gradient(45deg, #581c87 25%, transparent 25%, transparent 75%, #581c87 75%),
      linear-gradient(45deg, #581c87 25%, transparent 25%, transparent 75%, #581c87 75%),
      linear-gradient(-45deg, #6d28d9 25%, transparent 25%, transparent 75%, #6d28d9 75%),
      linear-gradient(-45deg, #6d28d9 25%, transparent 25%, transparent 75%, #6d28d9 75%);
    background-color: #4c1d95;
    background-size: 30px 30px;
    background-position: 0 0, 15px 15px, 0 0, 15px 15px;
    position: relative;
  }

  .epic-diamond-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 10px,
        rgba(139, 92, 246, 0.15) 10px,
        rgba(139, 92, 246, 0.15) 20px
      ),
      repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 10px,
        rgba(139, 92, 246, 0.15) 10px,
        rgba(139, 92, 246, 0.15) 20px
      );
    pointer-events: none;
  }

  @keyframes radiate-glow {
    0% {
      box-shadow:
        0 0 40px rgba(192, 132, 252, 1),
        0 0 80px rgba(168, 85, 247, 0.8),
        0 0 120px rgba(147, 51, 234, 0.6),
        0 0 160px rgba(126, 34, 206, 0.4);
    }
    50% {
      box-shadow:
        0 0 60px rgba(216, 180, 254, 1),
        0 0 120px rgba(192, 132, 252, 0.9),
        0 0 180px rgba(168, 85, 247, 0.7),
        0 0 240px rgba(147, 51, 234, 0.5);
    }
    100% {
      box-shadow:
        0 0 40px rgba(192, 132, 252, 1),
        0 0 80px rgba(168, 85, 247, 0.8),
        0 0 120px rgba(147, 51, 234, 0.6),
        0 0 160px rgba(126, 34, 206, 0.4);
    }
  }

  @keyframes radiate-rays {
    0% {
      opacity: 0.7;
      transform: scale(1) rotate(0deg);
    }
    50% {
      opacity: 1;
      transform: scale(1.3) rotate(8deg);
    }
    100% {
      opacity: 0.7;
      transform: scale(1) rotate(0deg);
    }
  }

  .epic-radiate {
    animation: radiate-glow 0.5s ease-in-out;
  }

  .epic-radiate::before {
    content: '';
    position: absolute;
    inset: -25px;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      rgba(216, 180, 254, 0.7) 20deg,
      rgba(192, 132, 252, 0.5) 40deg,
      transparent 60deg,
      transparent 100deg,
      rgba(192, 132, 252, 0.7) 120deg,
      rgba(168, 85, 247, 0.5) 140deg,
      transparent 160deg,
      transparent 200deg,
      rgba(168, 85, 247, 0.7) 220deg,
      rgba(147, 51, 234, 0.5) 240deg,
      transparent 260deg,
      transparent 300deg,
      rgba(147, 51, 234, 0.7) 320deg,
      rgba(126, 34, 206, 0.5) 340deg,
      transparent 360deg
    );
    border-radius: 24px;
    animation: radiate-rays 0.5s ease-in-out;
    z-index: -1;
    filter: blur(12px);
  }

  @keyframes epic-glow-pulse {
    0%, 100% {
      box-shadow:
        0 0 10px rgba(192, 132, 252, 0.6),
        0 0 20px rgba(168, 85, 247, 0.4),
        0 0 30px rgba(147, 51, 234, 0.3),
        inset 0 0 10px rgba(216, 180, 254, 0.2);
    }
    50% {
      box-shadow:
        0 0 20px rgba(216, 180, 254, 0.8),
        0 0 40px rgba(192, 132, 252, 0.6),
        0 0 60px rgba(168, 85, 247, 0.4),
        inset 0 0 15px rgba(216, 180, 254, 0.3);
    }
  }

  .epic-image-container {
    animation: epic-glow-pulse 2s ease-in-out infinite;
    border: 2px solid rgba(192, 132, 252, 0.6);
    transition: box-shadow 0.15s ease-out, border-color 0.15s ease-out;
  }

  .epic-image-attacking {
    box-shadow:
      0 0 30px rgba(255, 255, 255, 1),
      0 0 60px rgba(216, 180, 254, 1),
      0 0 90px rgba(192, 132, 252, 0.9),
      0 0 120px rgba(168, 85, 247, 0.7),
      0 0 150px rgba(147, 51, 234, 0.5) !important;
    border: 3px solid rgba(255, 255, 255, 1) !important;
  }
`;

interface BattleToken {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  marketCapUsd: number;
  solCollected: number;
  totalVolumeSol: number;
  holders?: number;
  tokensSold?: number;
}

interface BattleCardProps {
  tokenA: BattleToken;
  tokenB: BattleToken;
  targetSol?: number;
  targetVolumeSol?: number;
  winner?: 'A' | 'B' | null;
  isEpicBattle?: boolean;
  showShareButton?: boolean;
  showBuyButtons?: boolean; // ⭐ NEW: Show buy buttons
}

export function BattleCard({
  tokenA,
  tokenB,
  targetSol = TARGET_SOL,
  targetVolumeSol = VICTORY_VOLUME_SOL,
  winner = null,
  isEpicBattle = false,
  showShareButton = true,
  showBuyButtons = true, // ⭐ Default true
}: BattleCardProps) {
  const router = useRouter();

  // ⭐ GET SOL PRICE FROM ON-CHAIN ORACLE
  const { solPriceUsd, loading: priceLoading } = usePriceOracle();
  const solPrice = solPriceUsd || 0;

  // ⚔️ Battle animation states
  const [attackA, setAttackA] = useState(false);
  const [attackB, setAttackB] = useState(false);
  const [clash, setClash] = useState(false);

  // ⭐ Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState<'A' | 'B'>('A');

  // ⭐ Calculate Market Caps using CORRECT bonding curve formula
  const mcUsdA = calculateMarketCapUsd(tokenA.solCollected, solPrice);
  const mcUsdB = calculateMarketCapUsd(tokenB.solCollected, solPrice);

  // ⭐ Target MC = Final MC when bonding curve is full
  const targetMcUsd = getFinalMarketCapUsd(solPrice);

  // ⭐ Calculate volumes in USD
  const volUsdA = solToUsd(tokenA.totalVolumeSol, solPrice);
  const volUsdB = solToUsd(tokenB.totalVolumeSol, solPrice);
  const targetVolUsd = solToUsd(targetVolumeSol, solPrice);

  // ⭐ Calculate chances
  const { chanceA, chanceB } = calculateChances(tokenA.solCollected, tokenB.solCollected);

  // ⚔️ Random battle animations
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let animationTimeoutId: NodeJS.Timeout;
    let isMounted = true;

    const startBattleAnimations = () => {
      if (!isMounted) return;

      const randomInterval = Math.random() * 600 + 1000;

      timeoutId = setTimeout(() => {
        if (!isMounted) return;

        const action = Math.random();

        if (action < 0.45) {
          setAttackA(true);
          animationTimeoutId = setTimeout(() => {
            if (isMounted) setAttackA(false);
          }, 500);
        } else if (action < 0.9) {
          setAttackB(true);
          animationTimeoutId = setTimeout(() => {
            if (isMounted) setAttackB(false);
          }, 500);
        } else {
          setClash(true);
          animationTimeoutId = setTimeout(() => {
            if (isMounted) setClash(false);
          }, 500);
        }

        startBattleAnimations();
      }, randomInterval);
    };

    startBattleAnimations();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (animationTimeoutId) clearTimeout(animationTimeoutId);
    };
  }, []);

  // ⭐ Generate Twitter share URL
  const getShareUrl = () => {
    const battleUrl = `${window.location.origin}/battle/${tokenA.mint}-${tokenB.mint}`;
    const tweetText = `🚨 NEW BONKBATTLE: Will $${tokenA.symbol} defeat $${tokenB.symbol}? | Winner gets Listed on DEX! |

#BonkBattle #Solana #Crypto #Memecoin`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(battleUrl)}`;
  };

  // Handle card click
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('[data-share-button]') || target.closest('[data-buy-button]')) {
      return;
    }
    router.push(`/battle/${tokenA.mint}-${tokenB.mint}`);
  };

  // ⭐ Handle buy button click
  const handleBuyClick = (side: 'A' | 'B', e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSide(side);
    setModalOpen(true);
  };

  // ⭐ Handle actual buy
  const handleBuy = (amountSOL: number) => {
    // TODO: Integrate with actual buy transaction
    console.log(`Buying ${amountSOL} SOL of token ${selectedSide === 'A' ? tokenA.symbol : tokenB.symbol}`);
    setModalOpen(false);
    // Navigate to battle page for now
    router.push(`/battle/${tokenA.mint}-${tokenB.mint}`);
  };

  // ⭐ Progress calculations (based on SOL for accuracy)
  const solProgressA = Math.min((tokenA.solCollected / targetSol) * 100, 100);
  const solProgressB = Math.min((tokenB.solCollected / targetSol) * 100, 100);
  const volProgressA = Math.min((tokenA.totalVolumeSol / targetVolumeSol) * 100, 100);
  const volProgressB = Math.min((tokenB.totalVolumeSol / targetVolumeSol) * 100, 100);

  // Default image
  const getTokenImage = (token: BattleToken) => {
    return token.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${token.symbol}`;
  };

  // Winner variant
  const winnerToken = winner === 'A' ? tokenA : winner === 'B' ? tokenB : null;
  const loserToken = winner === 'A' ? tokenB : winner === 'B' ? tokenA : null;

  // Winner card (golden)
  if (winner && winnerToken && loserToken) {
    const winnerMcUsd = calculateMarketCapUsd(winnerToken.solCollected, solPrice);
    const winnerVolUsd = solToUsd(winnerToken.totalVolumeSol, solPrice);

    return (
      <Link href={`/token/${winnerToken.mint}`} className="block">
        <div className="bg-gradient-to-br from-yellow-900/40 via-orange-900/30 to-yellow-900/40 rounded-xl overflow-hidden border-2 border-yellow-500 hover:border-yellow-400 transition-all cursor-pointer shadow-lg shadow-yellow-500/20">
          {/* Winner Header */}
          <div className="bg-gradient-to-r from-yellow-600 via-orange-500 to-yellow-600 px-4 py-2 flex items-center justify-center gap-2">
            <span className="text-2xl">👑</span>
            <span className="text-black font-black text-lg uppercase tracking-wide">WINNER</span>
            <span className="text-2xl">👑</span>
          </div>

          {/* Winner Content */}
          <div className="p-4">
            <div className="flex items-center gap-4">
              {/* Winner Image */}
              <div className="relative">
                <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-xl overflow-hidden border-4 border-yellow-500 shadow-lg">
                  <Image
                    src={getTokenImage(winnerToken)}
                    alt={winnerToken.symbol}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="absolute -top-3 -right-3 text-3xl">👑</div>
              </div>

              {/* Winner Info */}
              <div className="flex-1">
                <h3 className="text-2xl font-black text-yellow-400 uppercase mb-1">
                  ${winnerToken.symbol}
                </h3>
                <p className="text-gray-300 text-sm mb-2">{winnerToken.name}</p>

                {/* Final Stats in USD */}
                <div className="flex gap-3">
                  <div className="bg-black/30 rounded px-2 py-1">
                    <span className="text-gray-500 text-xs">MC </span>
                    <span className="text-yellow-400 font-bold text-sm">{formatUsd(winnerMcUsd)}</span>
                  </div>
                  <div className="bg-black/30 rounded px-2 py-1">
                    <span className="text-gray-500 text-xs">VOL </span>
                    <span className="text-green-400 font-bold text-sm">{formatUsd(winnerVolUsd)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Defeated Section */}
            <div className="mt-4 pt-3 border-t border-yellow-500/30">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-sm">Defeated:</span>
                <div className="flex items-center gap-2 opacity-60">
                  <div className="w-8 h-8 rounded-lg overflow-hidden grayscale">
                    <Image
                      src={getTokenImage(loserToken)}
                      alt={loserToken.symbol}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="text-red-400 line-through font-semibold">${loserToken.symbol}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <>
      {isEpicBattle && <style jsx global>{radiateStyles}</style>}

      <div
        onClick={handleCardClick}
        className="bg-[#1d2531] rounded-xl overflow-hidden border border-[#2a3544] hover:border-orange-500 transition-all cursor-pointer"
      >
        {/* Battle Header */}
        <div
          className={`${!isEpicBattle ? 'battle-grid-bg' : ''} px-2 py-2 lg:px-4 lg:py-3 border-b border-[#2a3544] relative overflow-hidden`}
          style={isEpicBattle ? {
            backgroundColor: '#2D1065',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20 Z' fill='%23391A76' stroke='%23230460' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          } : {}}
        >
          {/* Background Attack Strip - Token A */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-[60%] transition-all duration-500 ${attackA || clash ? 'opacity-100' : 'opacity-0'}`}
            style={{
              zIndex: 0,
              backgroundColor: clash ? '#EFFE16' : isEpicBattle ? '#9333ea' : '#386BFD',
              boxShadow: attackA ? (isEpicBattle ? '0 0 30px rgba(147, 51, 234, 0.6)' : '0 0 30px rgba(56, 107, 253, 0.6)') : 'none'
            }}
          />
          {/* Background Attack Strip - Token B */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-[60%] transition-all duration-500 ${attackB || clash ? 'opacity-100' : 'opacity-0'}`}
            style={{
              zIndex: 0,
              backgroundColor: clash ? '#EFFE16' : isEpicBattle ? '#a855f7' : '#FD1F6F',
              boxShadow: attackB ? (isEpicBattle ? '0 0 30px rgba(168, 85, 247, 0.6)' : '0 0 30px rgba(253, 31, 111, 0.6)') : 'none'
            }}
          />

          <div className="flex items-center justify-between relative" style={{ zIndex: 1 }}>
            {/* Token A Image */}
            <div
              className={`w-[88px] h-[88px] lg:w-32 lg:h-32 rounded-xl overflow-visible flex-shrink-0 relative ${attackA ? 'battle-attack-bounce-right' : clash ? 'battle-clash-bounce-right' : ''} ${isEpicBattle && attackA ? 'epic-radiate' : ''} ${isEpicBattle ? (attackA || clash ? 'epic-image-attacking' : 'epic-image-container') : ''}`}
              style={isEpicBattle ? {
                padding: '3px',
                background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #7c3aed 100%)'
              } : { backgroundColor: '#2a3544' }}
            >
              <div className={`w-full h-full rounded-lg overflow-hidden ${isEpicBattle ? 'bg-[#1a1035]' : ''}`}>
                <Image
                  src={getTokenImage(tokenA)}
                  alt={tokenA.symbol}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            </div>

            {/* ⭐ Score Center - SHOWS USD from Oracle */}
            <div className="flex flex-col items-center flex-1 px-2">
              <span className="text-xs lg:text-base text-gray-400 font-semibold mb-1">MC</span>
              {priceLoading ? (
                <span className="text-lg lg:text-2xl font-black text-gray-500">Loading...</span>
              ) : (
                <span className="text-lg lg:text-2xl font-black text-yellow-400 whitespace-nowrap">
                  {formatUsd(mcUsdA)} - {formatUsd(mcUsdB)}
                </span>
              )}
              {/* Show oracle SOL price */}
              {solPrice > 0 && (
                <span className="text-[10px] text-gray-500 mt-1">
                  SOL ${solPrice.toFixed(0)}
                </span>
              )}
            </div>

            {/* Token B Image */}
            <div
              className={`w-[88px] h-[88px] lg:w-32 lg:h-32 rounded-xl overflow-visible flex-shrink-0 relative ${attackB ? 'battle-attack-bounce-left' : clash ? 'battle-clash-bounce-left' : ''} ${isEpicBattle && attackB ? 'epic-radiate' : ''} ${isEpicBattle ? (attackB || clash ? 'epic-image-attacking' : 'epic-image-container') : ''}`}
              style={isEpicBattle ? {
                padding: '3px',
                background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 50%, #7c3aed 100%)'
              } : { backgroundColor: '#2a3544' }}
            >
              <div className={`w-full h-full rounded-lg overflow-hidden ${isEpicBattle ? 'bg-[#1a1035]' : ''}`}>
                <Image
                  src={getTokenImage(tokenB)}
                  alt={tokenB.symbol}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>

        {/* Battle Content */}
        <div className="bg-[#232a36] p-2 lg:p-4">
          <div className="flex items-start justify-between">
            {/* Left Token Stats */}
            <div className="flex-1 pr-2 lg:pr-4">
              <div className="flex items-center gap-2 mb-2 lg:mb-3">
                <p className="text-sm lg:text-base text-orange-400 font-bold truncate uppercase">
                  ${tokenA.symbol}
                </p>
                {tokenA.holders !== undefined && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <span>👥</span>
                    <span>{tokenA.holders}</span>
                  </span>
                )}
              </div>

              {/* MC Row in USD */}
              <div className="flex items-center gap-1 lg:gap-2 mb-1.5 lg:mb-2">
                <span className="text-xs lg:text-sm font-bold text-gray-400 w-7 lg:w-8">MC</span>
                <div className="flex-1 h-2 lg:h-2.5 bg-[#3b415a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${solProgressA >= 100
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                      : 'bg-gradient-to-r from-green-400 to-green-600'
                      }`}
                    style={{ width: `${solProgressA}%` }}
                  />
                </div>
                <span className="text-xs lg:text-sm font-semibold text-white min-w-[50px] lg:min-w-[60px] text-right">
                  {formatUsd(mcUsdA)}
                </span>
              </div>

              {/* VOL Row in USD */}
              <div className="flex items-center gap-1 lg:gap-2">
                <span className="text-xs lg:text-sm font-bold text-gray-400 w-7 lg:w-8">VOL</span>
                <div className="flex-1 h-2 lg:h-2.5 bg-[#3b415a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${volProgressA >= 100
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                      : 'bg-gradient-to-r from-green-400 to-green-600'
                      }`}
                    style={{ width: `${volProgressA}%` }}
                  />
                </div>
                <span className="text-xs lg:text-sm font-semibold text-white min-w-[50px] lg:min-w-[60px] text-right">
                  {formatUsd(volUsdA)}
                </span>
              </div>
            </div>

            {/* Center Target - USD from Oracle */}
            <div className="flex flex-col items-center justify-center px-2 lg:px-4 border-x border-[#3b415a] min-w-[100px] lg:min-w-[130px]">
              <span className="text-xs lg:text-sm text-gray-500 font-medium mb-1 lg:mb-2 whitespace-nowrap">TARGET TO WIN</span>
              <div className="flex items-center gap-1 mb-0.5 lg:mb-1">
                <span className="text-xs lg:text-sm text-gray-400">MC</span>
                <span className="text-sm lg:text-base text-yellow-400">{formatUsd(targetMcUsd)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs lg:text-sm text-gray-400">VOL</span>
                <span className="text-sm lg:text-base text-yellow-400">{formatUsd(targetVolUsd)}</span>
              </div>
            </div>

            {/* Right Token Stats */}
            <div className="flex-1 pl-2 lg:pl-4">
              <div className="flex items-center justify-end gap-2 mb-2 lg:mb-3">
                {tokenB.holders !== undefined && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <span>{tokenB.holders}</span>
                    <span>👥</span>
                  </span>
                )}
                <p className="text-sm lg:text-base text-orange-400 font-bold truncate text-right uppercase">
                  ${tokenB.symbol}
                </p>
              </div>

              {/* MC Row in USD */}
              <div className="flex items-center gap-1 lg:gap-2 mb-1.5 lg:mb-2">
                <span className="text-xs lg:text-sm font-semibold text-white min-w-[50px] lg:min-w-[60px]">
                  {formatUsd(mcUsdB)}
                </span>
                <div className="flex-1 h-2 lg:h-2.5 bg-[#3b415a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${solProgressB >= 100
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-400'
                      : 'bg-gradient-to-r from-green-600 to-green-400'
                      }`}
                    style={{ width: `${solProgressB}%` }}
                  />
                </div>
                <span className="text-xs lg:text-sm font-bold text-gray-400 w-7 lg:w-8 text-right">MC</span>
              </div>

              {/* VOL Row in USD */}
              <div className="flex items-center gap-1 lg:gap-2">
                <span className="text-xs lg:text-sm font-semibold text-white min-w-[50px] lg:min-w-[60px]">
                  {formatUsd(volUsdB)}
                </span>
                <div className="flex-1 h-2 lg:h-2.5 bg-[#3b415a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${volProgressB >= 100
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-400'
                      : 'bg-gradient-to-r from-green-600 to-green-400'
                      }`}
                    style={{ width: `${volProgressB}%` }}
                  />
                </div>
                <span className="text-xs lg:text-sm font-bold text-gray-400 w-7 lg:w-8 text-right">VOL</span>
              </div>
            </div>
          </div>
        </div>

        {/* ⭐ NEW: Buy Winner Buttons Row */}
        {showBuyButtons && (
          <div className="bg-[#1d2531] px-3 py-2 my-3 flex items-center justify-between">
            {/* Token A - Blue Button */}
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-base">{Math.round(chanceA)}%</span>
              <button
                data-buy-button
                onClick={(e) => handleBuyClick('A', e)}
                className="py-1.5 px-3 rounded-md font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: '#386BFD' }}
              >
                Buy winner
              </button>
            </div>

            {/* Token B - Pink Button */}
            <div className="flex items-center gap-1.5">
              <button
                data-buy-button
                onClick={(e) => handleBuyClick('B', e)}
                className="py-1.5 px-3 rounded-md font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: '#FD1F6F' }}
              >
                Buy winner
              </button>
              <span className="text-white font-bold text-base">{Math.round(chanceB)}%</span>
            </div>
          </div>
        )}

        {/* Share Footer */}
        {showShareButton && (
          <a
            href={getShareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            data-share-button
            onClick={(e) => e.stopPropagation()}
            className="bg-black/80 py-2 px-4 flex items-center justify-center gap-3 hover:bg-black/90 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="font-semibold text-sm text-white">Share</span>
            <span className="text-orange-400 font-bold text-sm">+250 Points</span>
          </a>
        )}
      </div>

      {/* ⭐ Buy To Win Modal */}
      <BuyToWinModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        token={selectedSide === 'A' ? tokenA : tokenB}
        opponent={selectedSide === 'A'
          ? { solCollected: tokenB.solCollected, tokensSold: tokenB.tokensSold }
          : { solCollected: tokenA.solCollected, tokensSold: tokenA.tokensSold }
        }
        solPriceUSD={solPrice}
        side={selectedSide}
        onBuy={handleBuy}
      />
    </>
  );
}