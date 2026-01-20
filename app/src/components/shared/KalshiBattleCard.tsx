// =================================================================
// FILE: app/src/components/shared/KalshiBattleCard.tsx
// KALSHI-STYLE BATTLE CARD - Viral design with share + social links
// =================================================================

'use client';

import Image from 'next/image';
import Link from 'next/link';

interface BattleToken {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  marketCapUsd: number;
  solCollected: number;
  socialLink?: string; // Instagram, TikTok, Twitter, etc.
}

interface BattleCardConfig {
  question: string;
  target_text: string;
  context_text: string;
  token_a_link: string | null;
  token_b_link: string | null;
}

interface KalshiBattleCardProps {
  tokenA: BattleToken;
  tokenB: BattleToken;
  config?: BattleCardConfig;
}

export function KalshiBattleCard({ tokenA, tokenB, config }: KalshiBattleCardProps) {
  // Calculate percentages based on sol collected
  const totalSol = tokenA.solCollected + tokenB.solCollected;
  let percentA = totalSol > 0 ? (tokenA.solCollected / totalSol) * 100 : 50;
  let percentB = totalSol > 0 ? (tokenB.solCollected / totalSol) * 100 : 50;

  // Never show 50/50 - always show 51/49
  if (Math.round(percentA) === Math.round(percentB)) {
    percentA = 51;
    percentB = 49;
  }

  // Default config values
  const question = config?.question || 'Which satisfies you most?';
  const targetText = config?.target_text || 'First to $10B wins';

  // Links
  const linkA = config?.token_a_link || `/token/${tokenA.mint}`;
  const linkB = config?.token_b_link || `/token/${tokenB.mint}`;

  // Potential multiplier (14.68x from bonding curve)
  const potentialMin = 100;
  const potentialMax = 50000; // $100 → $50,000 (500x realistic display)

  // Share function
  const handleShare = async () => {
    const shareText = `🔥 ${tokenA.name} vs ${tokenB.name}\n\n${question}\n\n${tokenA.symbol}: ${percentA.toFixed(0)}% | ${tokenB.symbol}: ${percentB.toFixed(0)}%\n\nPick your side 👇`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${tokenA.name} vs ${tokenB.name}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Link copied!');
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg max-w-[820px] w-full">

      {/* ============ ROW 1: HERO IMAGES + QUESTION ============ */}
      <div className="relative">
        {/* Hero images side by side */}
        <div className="flex">
          {/* Token A Hero */}
          <div className="flex-1 h-32 md:h-40 bg-gradient-to-br from-blue-500 to-blue-600 relative overflow-hidden">
            {tokenA.image && (
              <Image
                src={tokenA.image}
                alt={tokenA.name}
                fill
                className="object-cover opacity-80"
                unoptimized
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/60 to-transparent" />
          </div>

          {/* Token B Hero */}
          <div className="flex-1 h-32 md:h-40 bg-gradient-to-bl from-orange-500 to-orange-600 relative overflow-hidden">
            {tokenB.image && (
              <Image
                src={tokenB.image}
                alt={tokenB.name}
                fill
                className="object-cover opacity-80"
                unoptimized
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-l from-orange-600/60 to-transparent" />
          </div>

          {/* VS Badge in center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center shadow-xl border-2 border-gray-200">
              <span className="text-lg md:text-xl font-black text-gray-800">VS</span>
            </div>
          </div>
        </div>

        {/* Question overlay */}
        <div className="px-4 py-4 bg-white">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center leading-tight">
            {question}
          </h2>
        </div>
      </div>

      {/* ============ ROW 2: TOKEN IMAGES CLASH ============ */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-center gap-6 md:gap-10">
          {/* Token A Image */}
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-gray-100 border-4 border-blue-500 shadow-lg transform -rotate-6 hover:rotate-0 transition-transform">
              {tokenA.image ? (
                <Image
                  src={tokenA.image}
                  alt={tokenA.symbol}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 text-2xl font-bold">
                  {tokenA.symbol.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Lightning/Clash Icon */}
          <div className="text-4xl md:text-5xl">⚡</div>

          {/* Token B Image */}
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-gray-100 border-4 border-orange-500 shadow-lg transform rotate-6 hover:rotate-0 transition-transform">
              {tokenB.image ? (
                <Image
                  src={tokenB.image}
                  alt={tokenB.symbol}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-600 text-2xl font-bold">
                  {tokenB.symbol.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ ROW 3: NAME + BUY WINNER + POTENTIAL ============ */}
      <div className="px-4 md:px-6 pb-4">
        <div className="flex gap-3 md:gap-4">
          {/* Token A Side */}
          <div className="flex-1 text-center">
            <div className="font-bold text-base md:text-lg text-gray-900 mb-2">
              {tokenA.name}
            </div>
            <Link href={linkA}>
              <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-3 rounded-xl transition-colors text-sm md:text-base shadow-md">
                Buy winner {percentA.toFixed(0)}%
              </button>
            </Link>
            <div className="mt-2 text-xs md:text-sm text-gray-500 font-medium">
              ${potentialMin} → <span className="text-green-600 font-bold">${potentialMax.toLocaleString()}</span>
            </div>
          </div>

          {/* Token B Side */}
          <div className="flex-1 text-center">
            <div className="font-bold text-base md:text-lg text-gray-900 mb-2">
              {tokenB.name}
            </div>
            <Link href={linkB}>
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-3 rounded-xl transition-colors text-sm md:text-base shadow-md">
                Buy winner {percentB.toFixed(0)}%
              </button>
            </Link>
            <div className="mt-2 text-xs md:text-sm text-gray-500 font-medium">
              ${potentialMin} → <span className="text-orange-600 font-bold">${potentialMax.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ PROGRESS BAR ============ */}
      <div className="px-6 pb-3">
        <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
          <div
            className="bg-blue-600 transition-all duration-500"
            style={{ width: `${percentA}%` }}
          />
          <div
            className="bg-orange-500 transition-all duration-500"
            style={{ width: `${percentB}%` }}
          />
        </div>
        <p className="text-center text-xs text-gray-500 mt-2 font-medium">
          {targetText}
        </p>
      </div>

      {/* ============ ROW 4: SHARE + SOCIAL LINKS ============ */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          {/* Token A Social Link (Instagram) */}
          <div className="flex-1">
            {tokenA.socialLink && (
              <a
                href={tokenA.socialLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-pink-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span className="hidden md:inline">{tokenA.symbol}</span>
              </a>
            )}
          </div>

          {/* Share Button - Center */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-full transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>

          {/* Token B Social Link (TikTok) */}
          <div className="flex-1 text-right">
            {tokenB.socialLink && (
              <a
                href={tokenB.socialLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors"
              >
                <span className="hidden md:inline">{tokenB.symbol}</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default KalshiBattleCard;