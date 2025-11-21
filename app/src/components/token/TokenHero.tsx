'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PublicKey } from '@solana/web3.js';
import { Share2, Star } from 'lucide-react';
import { useTokenMetadata } from '@/hooks/useTokenMetadata';

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
    creator: PublicKey | string | null;
    createdAt: number;
    tier: number;
    mint: string;
  };
  preloadedMetadata?: Metadata;
}

const EMOJI_FALLBACKS = ['🚀', '💎', '🐸', '🐕', '🦊', '😎', '🌙', '🎯', '🦍', '🐂'];

// ...

export function TokenHero({ token, preloadedMetadata }: TokenHeroProps) {
  const { metadata: fetchedMetadata, loading } = useTokenMetadata(token.mint);
  const [imageError, setImageError] = useState(false);

  // Use preloaded metadata if available, otherwise use fetched metadata
  const metadata = preloadedMetadata || fetchedMetadata;

  const displayName = metadata?.name || token.name || 'Unknown';
  const displaySymbol = metadata?.symbol || token.symbol || 'UNK';
  const imageUrl = metadata?.image || '';
  const randomEmoji = EMOJI_FALLBACKS[Math.floor(Math.random() * EMOJI_FALLBACKS.length)];

  const creatorDisplay = token.creator
    ? (typeof token.creator === 'string'
      ? `${token.creator.slice(0, 4)}...${token.creator.slice(-4)}`
      : `${token.creator.toString().slice(0, 4)}...${token.creator.toString().slice(-4)}`)
    : 'Unknown';

  let createdDisplay = 'Just now';
  if (token.createdAt && token.createdAt < Date.now() / 1000 && token.createdAt > 1600000000) {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - token.createdAt;
    if (diff < 60) createdDisplay = 'Just now';
    else if (diff < 3600) createdDisplay = `${Math.floor(diff / 60)}m ago`;
    else if (diff < 86400) createdDisplay = `${Math.floor(diff / 3600)}h ago`;
    else createdDisplay = `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="bg-bonk-card border border-bonk-border rounded-xl p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Token Image */}
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
            <span>{randomEmoji}</span>
          )}
        </div>

        {/* Token Info */}
        <div>
          <h1 className="text-xl font-bold text-white">{displayName}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="font-bold text-gray-300">{displaySymbol}</span>
            <span>•</span>
            <span>{creatorDisplay}</span>
            <span>•</span>
            <span>{createdDisplay}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className="p-2 bg-bonk-green rounded-lg text-black hover:bg-bonk-green/90 transition-colors flex items-center gap-2 font-bold">
          Share
        </button>
        <button className="p-2 bg-bonk-dark border border-bonk-border rounded-lg text-gray-400 hover:text-white transition-colors">
          <Star size={20} />
        </button>
      </div>
    </div>
  );
} 