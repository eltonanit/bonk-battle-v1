// app/src/components/shared/BattleCard.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface BattleToken {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  marketCapUsd: number;
  volumeUsd: number;
  solCollected: number;
}

interface BattleCardProps {
  tokenA: BattleToken;
  tokenB: BattleToken;
  targetMC?: number;
  targetVol?: number;
  winner?: 'A' | 'B' | null; // Se impostato, mostra la card in versione "winner"
  isEpicBattle?: boolean; // Se true, usa colori viola elettrici
}

export function BattleCard({
  tokenA,
  tokenB,
  targetMC = 5500,
  targetVol = 100,
  winner = null,
  isEpicBattle = false
}: BattleCardProps) {

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

  // Calcola progress percentuali
  const mcProgressA = Math.min((tokenA.marketCapUsd / targetMC) * 100, 100);
  const mcProgressB = Math.min((tokenB.marketCapUsd / targetMC) * 100, 100);
  const volProgressA = Math.min((tokenA.volumeUsd / targetVol) * 100, 100);
  const volProgressB = Math.min((tokenB.volumeUsd / targetVol) * 100, 100);

  // Calcola score
  const scoreA = (mcProgressA >= 100 ? 1 : 0) + (volProgressA >= 100 ? 1 : 0);
  const scoreB = (mcProgressB >= 100 ? 1 : 0) + (volProgressB >= 100 ? 1 : 0);

  // Format currency
  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

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

                {/* Final Stats */}
                <div className="flex gap-3">
                  <div className="bg-black/30 rounded px-2 py-1">
                    <span className="text-gray-500 text-xs">MC </span>
                    <span className="text-yellow-400 font-bold text-sm">{formatUsd(winnerToken.marketCapUsd)}</span>
                  </div>
                  <div className="bg-black/30 rounded px-2 py-1">
                    <span className="text-gray-500 text-xs">VOL </span>
                    <span className="text-green-400 font-bold text-sm">{formatUsd(winnerToken.volumeUsd)}</span>
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
    <Link href={battleUrl} className="block">
      <div className="bg-[#1d2531] rounded-xl overflow-hidden border border-[#2a3544] hover:border-orange-500 transition-all cursor-pointer">
        {/* Battle Header */}
        <div className="battle-grid-bg px-2 py-2 lg:px-4 lg:py-3 border-b border-[#2a3544] relative overflow-hidden">
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
              className={`w-24 h-24 lg:w-32 lg:h-32 rounded-lg overflow-hidden bg-[#2a3544] flex-shrink-0 ${attackA ? 'battle-attack-bounce-right' : clash ? 'battle-clash-bounce-right' : ''
                }`}
            >
              <Image
                src={getTokenImage(tokenA)}
                alt={tokenA.symbol}
                width={128}
                height={128}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>

            {/* Score Center */}
            <div className="flex flex-col items-center">
              <span className="text-xs lg:text-sm text-gray-400 font-semibold mb-1">SCORE</span>
              <span className="text-lg lg:text-xl font-black text-yellow-400">
                {formatUsd(tokenA.marketCapUsd)} - {formatUsd(tokenB.marketCapUsd)}
              </span>
            </div>

            {/* Token B Image */}
            <div
              className={`w-24 h-24 lg:w-32 lg:h-32 rounded-lg overflow-hidden bg-[#2a3544] flex-shrink-0 ${attackB ? 'battle-attack-bounce-left' : clash ? 'battle-clash-bounce-left' : ''
                }`}
            >
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

        {/* Battle Content */}
        <div className="bg-[#232a36] p-2 lg:p-4">
          <div className="flex items-start justify-between">
            {/* Left Token Stats */}
            <div className="flex-1 pr-2 lg:pr-4">
              {/* ⭐ FIX: Solo testo, niente Link annidato */}
              <p className="text-xs lg:text-sm text-orange-400 font-bold mb-2 lg:mb-3 truncate uppercase">
                ${tokenA.symbol}
              </p>

              {/* MC Row */}
              <div className="flex items-center gap-1 lg:gap-2 mb-1.5 lg:mb-2">
                <span className="text-[9px] lg:text-[11px] font-bold w-3 lg:w-4 text-yellow-400">
                  {mcProgressA >= 100 ? '1' : '0'}
                </span>
                <span className="text-[11px] lg:text-[11px] font-bold text-gray-400 w-6 lg:w-6">MC</span>
                <div className="flex-1 h-1.5 lg:h-2 bg-[#3b415a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${mcProgressA >= 100
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                        : 'bg-gradient-to-r from-green-400 to-green-600'
                      }`}
                    style={{ width: `${mcProgressA}%` }}
                  />
                </div>
                <span className="text-[10px] lg:text-xs font-semibold text-white min-w-[40px] lg:min-w-[50px] text-right">
                  {formatUsd(tokenA.marketCapUsd)}
                </span>
              </div>

              {/* VOL Row */}
              <div className="flex items-center gap-1 lg:gap-2">
                <span className="text-[9px] lg:text-[11px] font-bold w-3 lg:w-4 text-yellow-400">
                  {volProgressA >= 100 ? '1' : '0'}
                </span>
                <span className="text-[11px] lg:text-[11px] font-bold text-gray-400 w-6 lg:w-6">VOL</span>
                <div className="flex-1 h-1.5 lg:h-2 bg-[#3b415a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${volProgressA >= 100
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                        : 'bg-gradient-to-r from-green-400 to-green-600'
                      }`}
                    style={{ width: `${volProgressA}%` }}
                  />
                </div>
                <span className="text-[10px] lg:text-xs font-semibold text-white min-w-[40px] lg:min-w-[50px] text-right">
                  {formatUsd(tokenA.volumeUsd)}
                </span>
              </div>
            </div>

            {/* Center Target */}
            <div className="flex flex-col items-center justify-center px-3 lg:px-4 border-x border-[#3b415a]">
              <span className="text-[10px] lg:text-xs text-gray-500 font-medium mb-2">TARGET</span>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] lg:text-[11px] text-gray-400">MC</span>
                <span className="text-[10px] lg:text-[11px] text-yellow-400 font-semibold">{formatUsd(targetMC)}</span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[10px] lg:text-[11px] text-gray-400">VOL</span>
                <span className="text-[10px] lg:text-[11px] text-yellow-400 font-semibold">{formatUsd(targetVol)}</span>
              </div>
              {/* Initial MC Reference */}
              <div className="border-t border-[#3b415a] pt-2 mt-1">
                <span className="text-[9px] text-gray-500">Start: ~$375</span>
              </div>
            </div>

            {/* Right Token Stats */}
            <div className="flex-1 pl-2 lg:pl-4">
              {/* ⭐ FIX: Solo testo, niente Link annidato */}
              <p className="text-xs lg:text-sm text-orange-400 font-bold mb-2 lg:mb-3 truncate text-right uppercase">
                ${tokenB.symbol}
              </p>

              {/* MC Row */}
              <div className="flex items-center gap-1 lg:gap-2 mb-1.5 lg:mb-2">
                <span className="text-[10px] lg:text-xs font-semibold text-white min-w-[40px] lg:min-w-[50px]">
                  {formatUsd(tokenB.marketCapUsd)}
                </span>
                <div className="flex-1 h-1.5 lg:h-2 bg-[#3b415a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${mcProgressB >= 100
                        ? 'bg-gradient-to-r from-orange-500 to-yellow-400'
                        : 'bg-gradient-to-r from-green-600 to-green-400'
                      }`}
                    style={{ width: `${mcProgressB}%` }}
                  />
                </div>
                <span className="text-[11px] lg:text-[11px] font-bold text-gray-400 w-6 lg:w-6 text-right">MC</span>
                <span className="text-[9px] lg:text-[11px] font-bold w-3 lg:w-4 text-right text-yellow-400">
                  {mcProgressB >= 100 ? '1' : '0'}
                </span>
              </div>

              {/* VOL Row */}
              <div className="flex items-center gap-1 lg:gap-2">
                <span className="text-[10px] lg:text-xs font-semibold text-white min-w-[40px] lg:min-w-[50px]">
                  {formatUsd(tokenB.volumeUsd)}
                </span>
                <div className="flex-1 h-1.5 lg:h-2 bg-[#3b415a] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${volProgressB >= 100
                        ? 'bg-gradient-to-r from-orange-500 to-yellow-400'
                        : 'bg-gradient-to-r from-green-600 to-green-400'
                      }`}
                    style={{ width: `${volProgressB}%` }}
                  />
                </div>
                <span className="text-[11px] lg:text-[11px] font-bold text-gray-400 w-6 lg:w-6 text-right">VOL</span>
                <span className="text-[9px] lg:text-[11px] font-bold w-3 lg:w-4 text-right text-yellow-400">
                  {volProgressB >= 100 ? '1' : '0'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}