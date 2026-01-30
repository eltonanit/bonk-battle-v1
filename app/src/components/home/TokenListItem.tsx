// =================================================================
// FILE: app/src/components/home/TokenListItem.tsx
// POTENTIALS.FUN - Token List Item Component
// =================================================================

'use client';

import Image from 'next/image';
import Link from 'next/link';

interface TokenListItemProps {
  mint: string;
  symbol: string;
  name: string;
  image?: string;
  potential: number;
  multiplier: number;
  marketCap: number;      // in USD
  volume: number;         // in USD
  progress: number;       // 0-100%
  solPriceUsd?: number;
}

// Format number to short form (1.2M, 450k, etc)
function formatShortNumber(num: number): string {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}k`;
  }
  return `$${num.toFixed(0)}`;
}

// Format potential (45,000x or 4.5k x)
function formatPotential(potential: number): string {
  if (potential >= 1000) {
    return `${(potential / 1000).toFixed(1)}k`;
  }
  return potential.toFixed(0);
}

// Get multiplier badge color
function getMultiplierColor(multiplier: number): string {
  switch (multiplier) {
    case 50: return 'bg-gradient-to-r from-red-500 to-pink-500';
    case 30: return 'bg-gradient-to-r from-orange-500 to-yellow-500';
    case 20: return 'bg-solana-green';
    case 10: return 'bg-solana-purple';
    default: return 'bg-white';
  }
}

// Get multiplier text color
function getMultiplierTextColor(multiplier: number): string {
  return multiplier >= 20 ? 'text-black' : (multiplier === 10 ? 'text-white' : 'text-black');
}

export function TokenListItem({
  mint,
  symbol,
  name,
  image,
  potential,
  multiplier,
  marketCap,
  volume,
  progress,
}: TokenListItemProps) {
  const isHot = progress >= 90;

  return (
    <Link
      href={`/token/${mint}`}
      className="flex gap-4 p-4 border-b border-white/5 bg-card-dark/20 hover:bg-white/[0.02] transition-colors"
    >
      {/* Token Image with Multiplier Badge */}
      <div className="relative shrink-0">
        {image ? (
          <Image
            src={image}
            alt={symbol}
            width={80}
            height={80}
            className="size-20 rounded-xl object-cover border border-white/10 shadow-lg"
            unoptimized
          />
        ) : (
          <div className="size-20 bg-gray-800 rounded-xl border border-white/10 flex items-center justify-center">
            <span className="text-2xl">🪙</span>
          </div>
        )}

        {/* Multiplier or HOT Badge */}
        {isHot ? (
          <div className="absolute -bottom-1 -right-1 bg-white text-black text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm italic">
            HOT
          </div>
        ) : multiplier > 1 ? (
          <div className={`absolute -bottom-1 -right-1 ${getMultiplierColor(multiplier)} ${getMultiplierTextColor(multiplier)} text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm`}>
            {multiplier}x
          </div>
        ) : null}
      </div>

      {/* Token Info */}
      <div className="flex flex-col flex-1 min-w-0 justify-between">
        {/* Row 1: Name & Potential */}
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">${symbol}</h3>
            <p className="text-[10px] text-gray-400 truncate">{name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-primary text-sm font-black">{formatPotential(potential)}x</p>
            <p className="text-[10px] text-gray-500">Potential</p>
          </div>
        </div>

        {/* Row 2: MCap & Volume */}
        <div className="flex items-center gap-4 mt-1">
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 uppercase font-bold">MCap</span>
            <span className="text-[10px] text-solana-green font-bold">{formatShortNumber(marketCap)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-500 uppercase font-bold">Volume</span>
            <span className="text-[10px] text-white font-bold">{formatShortNumber(volume)}</span>
          </div>
        </div>

        {/* Row 3: Progress Bar */}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-solana-green"
              style={{
                width: `${Math.min(progress, 100)}%`,
                boxShadow: '0 0 8px rgba(20, 241, 149, 0.5)',
              }}
            />
          </div>
          <span className="text-[9px] font-bold text-solana-green">{progress.toFixed(0)}%</span>
        </div>
      </div>
    </Link>
  );
}

export default TokenListItem;
