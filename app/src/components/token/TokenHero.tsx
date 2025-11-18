'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PublicKey } from '@solana/web3.js';
import { UpvoteButton } from '@/components/token/UpvoteButton';

interface TokenHeroProps {
  token: {
    name: string;
    symbol: string;
    metadataUri: string;
    creator: PublicKey | string | null;
    createdAt: number;
    tier: number;
    mint: string; // ⭐ AGGIUNTO
  };
}

interface Metadata {
  name: string;
  symbol: string;
  image?: string;
  description?: string;
}

const EMOJI_FALLBACKS = ['🚀', '💎', '🐸', '🐕', '🦊', '😎', '🌙', '🎯', '🦍', '🐂'];

export function TokenHero({ token }: TokenHeroProps) {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        // CRITICAL: metadataUri può essere JSON diretto o URL
        console.log('MetadataUri:', token.metadataUri);

        let parsedMetadata: Metadata;

        // Prova a parsare come JSON diretto
        if (token.metadataUri && token.metadataUri.startsWith('{')) {
          parsedMetadata = JSON.parse(token.metadataUri);
          console.log('Metadata parsed:', parsedMetadata);
        }
        // Altrimenti prova fetch se è URL
        else if (token.metadataUri && token.metadataUri.startsWith('http')) {
          const response = await fetch(token.metadataUri);
          parsedMetadata = await response.json();
        }
        // Fallback
        else {
          parsedMetadata = {
            name: token.name,
            symbol: token.symbol,
          };
        }

        setMetadata(parsedMetadata);
      } catch (error) {
        console.error('Error parsing metadata:', error);
        setMetadata({
          name: token.name,
          symbol: token.symbol,
        });
      }
    }

    fetchMetadata();
  }, [token.metadataUri, token.name, token.symbol]);

  const displayName = metadata?.name || token.name || 'Unknown';
  const displaySymbol = metadata?.symbol || token.symbol || 'UNK';
  const imageUrl = metadata?.image || '';

  const randomEmoji = EMOJI_FALLBACKS[Math.floor(Math.random() * EMOJI_FALLBACKS.length)];

  // Type-safe creator display
  const creatorDisplay = token.creator
    ? (typeof token.creator === 'string'
      ? `${token.creator.slice(0, 4)}...${token.creator.slice(-4)}`
      : `${token.creator.toString().slice(0, 4)}...${token.creator.toString().slice(-4)}`)
    : 'Unknown';

  // Type-safe creator string for UpvoteButton
  const creatorString = token.creator
    ? (typeof token.creator === 'string' ? token.creator : token.creator.toString())
    : '';

  const tierColors: Record<number, string> = {
    1: 'bg-blue-500',
    2: 'bg-orange-500',
    3: 'bg-green-500',
    4: 'bg-yellow-500'
  };
  const tierColor = tierColors[token.tier] || 'bg-gray-500';

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
    <div className="relative flex gap-5 mb-6">
      {/* ⭐ Upvote section - LEFT SIDE */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 z-10">
        <UpvoteButton
          tokenMint={token.mint}
          creatorAddress={creatorString}
        />
      </div>

      {/* Token Image */}
      <div
        className="w-40 h-40 rounded-2xl flex items-center justify-center text-7xl flex-shrink-0 overflow-hidden"
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
            width={160}
            height={160}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <span>{randomEmoji}</span>
        )}
      </div>

      {/* Token Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
          <div className="text-lg text-gray-400 mb-3">${displaySymbol}</div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>Created by {creatorDisplay}</span>
            <span>•</span>
            <span>{createdDisplay}</span>
          </div>
        </div>

        <div className={`inline-block px-4 py-2 rounded-lg text-sm font-bold ${tierColor} text-white w-fit`}>
          Tier {token.tier}
        </div>
      </div>
    </div>
  );
} 