// app/src/components/shared/BattleCard.tsx
// ⭐ FIXED: No nested <a> tags - uses div with onClick for navigation
// Uses centralized tier config from @/config/tier-config
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
} from '@/config/tier-config';

// Helper function to format SOL values
function formatSol(value: number, decimals: number = 2): string {
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(decimals);
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

  /* Glowing border animation for epic battle images */
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

  /* Use transition instead of animation so movement animation can work */
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
  marketCapUsd: number;       // For display only (USD)
  solCollected: number;       // SOL collected (in SOL, not lamports)
  totalVolumeSol: number;     // Total volume in SOL
  holders?: number;           // ⭐ NEW: Number of holders
}

interface BattleCardProps {
  tokenA: BattleToken;
  tokenB: BattleToken;
  targetSol?: number;        // SOL target for graduation (defaults to tier config)
  targetVolumeSol?: number;  // Volume target in SOL (defaults to tier config)
  winner?: 'A' | 'B' | null; // Se impostato, mostra la card in versione "winner"
  isEpicBattle?: boolean;    // Se true, usa colori viola elettrici
  showShareButton?: boolean; // ⭐ NEW: Show share button (default: true)
}

export function BattleCard({
  tokenA,
  tokenB,
  targetSol = TARGET_SOL,           // ⭐ Now defaults to tier config
  targetVolumeSol = VICTORY_VOLUME_SOL, // ⭐ Now defaults to tier config
  winner = null,
  isEpicBattle = false,
  showShareButton = true,  // ⭐ NEW: Default to true
}: BattleCardProps) {
  const router = useRouter();

  // ⚔️ Stati per le animazioni di battaglia
  const [attackA, setAttackA] = useState(false);
  const [attackB, setAttackB] = useState(false);
  const [clash, setClash] = useState(false);

  // ⚔️ Animazioni casuali di battaglia
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
    const scoreText = `📊 Score: ${tokenA.solCollected.toFixed(2)} vs ${tokenB.solCollected.toFixed(2)} SOL`;
    const tweetText = `⚔️ $${tokenA.symbol} vs $${tokenB.symbol} - EPIC BATTLE!
${scoreText}
🏆 Who will win? Vote now!
🔥 Winner gets listed on DEX + 50% of loser's liquidity!
#BonkBattle #Solana #Crypto`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(battleUrl)}`;
  };

  // ⭐ Handle card click - navigate to battle page (but not if clicking links)
  const handleCardClick = (e: React.MouseEvent) => {
    // Check if click originated from a link or share button
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('[data-share-button]')) {
      return; // Don't navigate if clicking a link
    }
    router.push(`/battle/${tokenA.mint}-${tokenB.mint}`);
  };

  // ⭐ SOL-BASED progress calculations using tier config values
  const solProgressA = Math.min((tokenA.solCollected / targetSol) * 100, 100);
  const solProgressB = Math.min((tokenB.solCollected / targetSol) * 100, 100);
  const volProgressA = Math.min((tokenA.totalVolumeSol / targetVolumeSol) * 100, 100);
  const volProgressB = Math.min((tokenB.totalVolumeSol / targetVolumeSol) * 100, 100);

  // Calcola score (based on SOL progress)
  const scoreA = (solProgressA >= 100 ? 1 : 0) + (volProgressA >= 100 ? 1 : 0);
  const scoreB = (solProgressB >= 100 ? 1 : 0) + (volProgressB >= 100 ? 1 : 0);

  // Default image
  const getTokenImage = (token: BattleToken) => {
    return token.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${token.symbol}`;
  };

  // URL della pagina battle
  const battleUrl = `/battle/${tokenA.mint}-${tokenB.mint}`;

  // Winner variant
  const winnerToken = winner === 'A' ? tokenA : winner === 'B' ? tokenB : null;
  const loserToken = winner === 'A' ? tokenB : winner === 'B' ? tokenA : null;

  // Se c'è un winner, mostra la card dorata
  if (winner && winnerToken && loserToken) {
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
              {/* Winner Image - Grande con corona */}
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
                {/* Crown overlay */}
                <div className="absolute -top-3 -right-3 text-3xl">👑</div>
              </div>

              {/* Winner Info */}
              <div className="flex-1">
                <h3 className="text-2xl font-black text-yellow-400 uppercase mb-1">
                  ${winnerToken.symbol}
                </h3>
                <p className="text-gray-300 text-sm mb-2">{winnerToken.name}</p>

                {/* Final Stats (SOL-based) */}
                <div className="flex gap-3">
                  <div className="bg-black/30 rounded px-2 py-1">
                    <span className="text-gray-500 text-xs">SOL </span>
                    <span className="text-yellow-400 font-bold text-sm">{formatSol(winnerToken.solCollected, 2)} SOL</span>
                  </div>
                  <div className="bg-black/30 rounded px-2 py-1">
                    <span className="text-gray-500 text-xs">VOL </span>
                    <span className="text-green-400 font-bold text-sm">{formatSol(winnerToken.totalVolumeSol, 2)} SOL</span>
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

  // ⭐ FIXED: Use div with onClick instead of Link to avoid nested <a> issues
  return (
    <>
      {/* Inject radiate styles */}
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
            className={`absolute left-0 top-0 bottom-0 w-[60%] transition-all duration-500 ${attackA || clash ? 'opacity-100' : 'opacity-0'
              }`}
            style={{
              zIndex: 0,
              backgroundColor: clash ? '#EFFE16' : isEpicBattle ? '#9333ea' : '#4DB5FF',
              boxShadow: attackA ? (isEpicBattle ? '0 0 30px rgba(147, 51, 234, 0.6)' : '0 0 30px rgba(38, 157, 255, 0.6)') : 'none'
            }}
          />
          {/* Background Attack Strip - Token B */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-[60%] transition-all duration-500 ${attackB || clash ? 'opacity-100' : 'opacity-0'
              }`}
            style={{
              zIndex: 0,
              backgroundColor: clash ? '#EFFE16' : isEpicBattle ? '#a855f7' : '#FF5A8E',
              boxShadow: attackB ? (isEpicBattle ? '0 0 30px rgba(168, 85, 247, 0.6)' : '0 0 30px rgba(254, 42, 98, 0.6)') : 'none'
            }}
          />

          <div className="flex items-center justify-between relative" style={{ zIndex: 1 }}>
            {/* Token A Image */}
            <div
              className={`w-24 h-24 lg:w-32 lg:h-32 rounded-xl overflow-visible flex-shrink-0 relative ${attackA ? 'battle-attack-bounce-right' : clash ? 'battle-clash-bounce-right' : ''
                } ${isEpicBattle && attackA ? 'epic-radiate' : ''} ${isEpicBattle ? (attackA || clash ? 'epic-image-attacking' : 'epic-image-container') : ''}`}
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

            {/* Score Center (SOL-based) */}
            <div className="flex flex-col items-center">
              <span className="text-sm lg:text-base text-gray-400 font-semibold mb-1">SOL</span>
              <span className="text-xl lg:text-2xl font-black text-yellow-400">
                {formatSol(tokenA.solCollected, 2)} - {formatSol(tokenB.solCollected, 2)}
              </span>
            </div>

            {/* Token B Image */}
            <div
              className={`w-24 h-24 lg:w-32 lg:h-32 rounded-xl overflow-visible flex-shrink-0 relative ${attackB ? 'battle-attack-bounce-left' : clash ? 'battle-clash-bounce-left' : ''
                } ${isEpicBattle && attackB ? 'epic-radiate' : ''} ${isEpicBattle ? (attackB || clash ? 'epic-image-attacking' : 'epic-image-container') : ''}`}
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
              {/* ⭐ Token Symbol + Holders */}
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

              {/* SOL Row */}
              <div className="flex items-center gap-1 lg:gap-2 mb-1.5 lg:mb-2">
                <span className="text-xs lg:text-sm font-bold text-gray-400 w-7 lg:w-8">SOL</span>
                <div className="flex-1 h-2 lg:h-2.5 bg-[#3b415a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${solProgressA >= 100
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                      : 'bg-gradient-to-r from-green-400 to-green-600'
                      }`}
                    style={{ width: `${solProgressA}%` }}
                  />
                </div>
                <span className="text-xs lg:text-sm font-semibold text-white min-w-[45px] lg:min-w-[55px] text-right">
                  {formatSol(tokenA.solCollected, 2)}
                </span>
              </div>

              {/* VOL Row */}
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
                <span className="text-xs lg:text-sm font-semibold text-white min-w-[45px] lg:min-w-[55px] text-right">
                  {formatSol(tokenA.totalVolumeSol, 2)}
                </span>
              </div>
            </div>

            {/* Center Target (SOL-based) - ⭐ SHARE BUTTON HERE */}
            <div className="flex flex-col items-center justify-center px-3 lg:px-4 border-x border-[#3b415a]">
              <span className="text-xs lg:text-sm text-gray-500 font-medium mb-2">TARGET TO WIN</span>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs lg:text-sm text-gray-400">SOL</span>
                <span className="text-xs lg:text-sm text-yellow-400 font-semibold">{formatSol(targetSol)} SOL</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs lg:text-sm text-gray-400">VOL</span>
                <span className="text-xs lg:text-sm text-yellow-400 font-semibold">{formatSol(targetVolumeSol)} SOL</span>
              </div>
            </div>

            {/* Right Token Stats */}
            <div className="flex-1 pl-2 lg:pl-4">
              {/* ⭐ Token Symbol + Holders */}
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

              {/* SOL Row */}
              <div className="flex items-center gap-1 lg:gap-2 mb-1.5 lg:mb-2">
                <span className="text-xs lg:text-sm font-semibold text-white min-w-[45px] lg:min-w-[55px]">
                  {formatSol(tokenB.solCollected, 2)}
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
                <span className="text-xs lg:text-sm font-bold text-gray-400 w-7 lg:w-8 text-right">SOL</span>
              </div>

              {/* VOL Row */}
              <div className="flex items-center gap-1 lg:gap-2">
                <span className="text-xs lg:text-sm font-semibold text-white min-w-[45px] lg:min-w-[55px]">
                  {formatSol(tokenB.totalVolumeSol, 2)}
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

        {/* ⭐ Share Footer - Black stripe at bottom (entire stripe is clickable) */}
        {showShareButton && (
          <a
            href={getShareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            data-share-button
            onClick={(e) => e.stopPropagation()}
            className="bg-black/80 py-2 px-4 flex items-center justify-center gap-3 hover:bg-black/90 transition-colors cursor-pointer"
          >
            {/* X (Twitter) Icon */}
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="font-semibold text-sm text-white">Share</span>
            <span className="text-orange-400 font-bold text-sm">+250 Points</span>
          </a>
        )}
      </div>
    </>
  );
}