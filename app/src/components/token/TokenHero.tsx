'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PublicKey } from '@solana/web3.js';
import { useTokenMetadata } from '@/hooks/useTokenMetadata';
import { BattleStatus, BattleTier, BATTLE_STATUS_LABELS, BATTLE_STATUS_COLORS, BATTLE_STATUS_BG_COLORS } from '@/types/bonk';

interface Metadata {
  name: string;
  symbol: string;
  uri?: string;
  image?: string;
  description?: string;
}

interface TokenHeroProps {
  token: {
    name: string;
    symbol: string;
    metadataUri: string;
    creator?: PublicKey | string | null;
    createdAt: number;
    tier?: BattleTier;
    mint: string;
    battleStatus?: BattleStatus;
    marketCapUsd?: number;
  };
  preloadedMetadata?: Metadata;
}

const EMOJI_FALLBACKS = ['🚀', '💎', '🐸', '🐕', '🦊', '😎', '🌙', '🎯', '🦍', '🐂'];

export function TokenHero({ token, preloadedMetadata }: TokenHeroProps) {
  const { metadata: fetchedMetadata } = useTokenMetadata(token.mint);
  const [imageError, setImageError] = useState(false);

  // Use preloaded metadata if available, otherwise use fetched metadata
  const metadata = preloadedMetadata || fetchedMetadata;

  const displayName = metadata?.name || token.name || 'Unknown';
  const displaySymbol = metadata?.symbol || token.symbol || 'UNK';
  const imageUrl = metadata?.image || '';

  // Use consistent emoji based on mint address (not random)
  const emojiIndex = token.mint ?
    token.mint.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % EMOJI_FALLBACKS.length :
    0;
  const fallbackEmoji = EMOJI_FALLBACKS[emojiIndex];

  const creatorDisplay = token.creator
    ? (typeof token.creator === 'string'
      ? `${token.creator.slice(0, 4)}...${token.creator.slice(-4)}`
      : `${token.creator.toString().slice(0, 4)}...${token.creator.toString().slice(-4)}`)
    : 'Unknown';

  // Time since creation
  let createdDisplay = 'Just now';
  if (token.createdAt && token.createdAt < Date.now() / 1000 && token.createdAt > 1600000000) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - token.createdAt;
    if (diff < 60) createdDisplay = 'Just now';
    else if (diff < 3600) createdDisplay = `${Math.floor(diff / 60)}m ago`;
    else if (diff < 86400) createdDisplay = `${Math.floor(diff / 3600)}h ago`;
    else createdDisplay = `${Math.floor(diff / 86400)}d ago`;
  }

  // Battle status
  const battleStatus = token.battleStatus ?? BattleStatus.Created;
  const statusLabel = BATTLE_STATUS_LABELS[battleStatus];
  const statusColor = BATTLE_STATUS_COLORS[battleStatus];
  const statusBgColor = BATTLE_STATUS_BG_COLORS[battleStatus];

  // Tier
  const tier = token.tier ?? BattleTier.Test;

  return (
    <div className="bg-bonk-card border border-bonk-border rounded-xl p-4 mb-4">
      <div className="flex items-start gap-4">
        {/* Token Image + MC under it */}
        <div className="flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden"
            style={{
              background: imageUrl && !imageError
                ? 'transparent'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            {imageUrl && !imageError ? (
              <Image
                src={imageUrl}
                alt={displayName}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                priority
              />
            ) : (
              <span>{fallbackEmoji}</span>
            )}
          </div>
          {/* MC under photo */}
          {token.marketCapUsd !== undefined && (
            <div className="mt-2 text-center">
              <div className="text-xs text-gray-500">MC</div>
              <div className="text-sm font-bold text-green-400">
                ${token.marketCapUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          )}
        </div>

        {/* Token Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Symbol as main title */}
              <h1 className="text-xl font-bold text-white">${displaySymbol}</h1>
              {/* Status Badge */}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor} ${statusBgColor}`}>
                {statusLabel}
              </span>
            </div>
            {/* Time ago in top right */}
            <span className="text-sm text-gray-400 whitespace-nowrap ml-2">
              {createdDisplay}
            </span>
          </div>

          {/* Name and creator info */}
          <div className="text-sm text-gray-400 mb-2">
            <span className="text-gray-300">{displayName}</span>
            <span className="mx-2">•</span>
            <span>{creatorDisplay}</span>
          </div>

          {/* Status info row */}
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-500">Status: </span>
              <span className={`font-bold ${statusColor}`}>{statusLabel}</span>
            </div>
            <div>
              <span className="text-gray-500">Tier: </span>
              <span className={`font-bold ${tier === BattleTier.Test ? 'text-yellow-500' : 'text-green-500'}`}>
                {tier === BattleTier.Test ? 'Test' : 'Prod'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}