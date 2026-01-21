'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ActivityEvent } from '@/hooks/useActivityFeed';
import { SmallGradientAvatar, GradientAvatar } from '@/components/ui/GradientAvatar';

interface ActivityItemProps {
  event: ActivityEvent;
  showToken?: boolean; // Hide token info when on token-specific page
  compact?: boolean; // Smaller version for embedded use
}

export function ActivityItem({ event, showToken = true, compact = false }: ActivityItemProps) {
  const isBuy = event.tradeType === 'buy';

  // Format SOL amount
  const formatSol = (amount: number) => {
    if (amount < 0.001) return amount.toFixed(6);
    if (amount < 0.01) return amount.toFixed(4);
    if (amount < 1) return amount.toFixed(3);
    return amount.toFixed(2);
  };

  // Format USD amount
  const formatUsd = (amount: number) => {
    if (amount < 1) return `$${amount.toFixed(2)}`;
    if (amount < 1000) return `$${amount.toFixed(0)}`;
    if (amount < 10000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  // Content component (shared between Link and div versions)
  const content = (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
      {/* User Avatar - Gradient fallback */}
      <div className="relative flex-shrink-0">
        <GradientAvatar
          walletAddress={event.walletAddress}
          avatarUrl={event.avatarUrl}
          size={compact ? 32 : 40}
          showBorder={true}
          borderColor="border-[#2a3544] group-hover:border-[#3a4554]"
          className="transition-colors"
        />
        {/* Whale indicator */}
        {event.isWhale && (
          <div className={`absolute -top-1 -right-1 ${compact ? 'text-xs' : 'text-sm'}`} title="Whale (>$500)">
            🐋
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Top Row: User + Action + Amount */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Username/Wallet */}
          <span className={`font-bold text-white ${compact ? 'text-xs' : 'text-sm'}`}>
            {event.username || event.walletShort}
          </span>

          {/* Action */}
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
            {isBuy ? 'bought' : 'sold'}
          </span>

          {/* Amount */}
          <span className={`text-white ${compact ? 'text-xs' : 'text-sm'} font-semibold`}>
            {formatSol(event.solAmount)} SOL
          </span>

          {/* USD Value */}
          <span className={`text-gray-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            ({formatUsd(event.usdValue)})
          </span>

          {/* Token (if showing) */}
          {showToken && (
            <>
              <span className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>of</span>
              <span className={`text-white font-bold ${compact ? 'text-xs' : 'text-sm'} uppercase`}>
                ${event.tokenSymbol}
              </span>
            </>
          )}
        </div>

        {/* Bottom Row: Badges */}
        <div className="flex items-center gap-2 mt-1">
          {/* Trade Type Badge */}
          <span
            className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${
              isBuy
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isBuy ? 'BUY' : 'SELL'}
          </span>

          {/* Whale Badge */}
          {event.isWhale && (
            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase rounded">
              WHALE
            </span>
          )}

          {/* Time */}
          <span className="text-gray-500 text-xs ml-auto">
            {event.timeAgo}
          </span>
        </div>
      </div>

      {/* Token Image (if showing) */}
      {showToken && (
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-full overflow-hidden bg-gray-700 flex-shrink-0 border border-[#2a3544]`}>
          {event.tokenImage ? (
            <Image
              src={event.tokenImage}
              alt={event.tokenSymbol}
              width={compact ? 32 : 40}
              height={compact ? 32 : 40}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg bg-gradient-to-br from-orange-500 to-yellow-500">
              🪙
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Compact mode: no link, smaller padding
  if (compact) {
    return (
      <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-lg p-3 hover:bg-[#1e2538] transition-all group">
        {content}
      </div>
    );
  }

  // Full mode: with link
  return (
    <Link
      href={`/token/${event.tokenMint}`}
      className="block bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 hover:border-[#3a4554] hover:bg-[#1e2538] transition-all group"
    >
      {content}
    </Link>
  );
}

// ============================================================================
// SKELETON LOADER
// ============================================================================

export function ActivityItemSkeleton() {
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-3">
        {/* Avatar skeleton */}
        <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />

        {/* Content skeleton */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 bg-gray-700 rounded w-20" />
            <div className="h-4 bg-gray-700 rounded w-16" />
            <div className="h-4 bg-gray-700 rounded w-24" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 bg-gray-700 rounded w-10" />
            <div className="h-4 bg-gray-700 rounded w-16 ml-auto" />
          </div>
        </div>

        {/* Token image skeleton */}
        <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />
      </div>
    </div>
  );
}
