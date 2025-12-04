'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import { useTokenMetadata } from '@/hooks/useTokenMetadata';

// Share Modal Component
function ShareModal({ isOpen, onClose, tokenMint, tokenSymbol }: { isOpen: boolean; onClose: () => void; tokenMint: string; tokenSymbol: string }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `https://bonk-battle.vercel.app/token/${tokenMint}`;
  const tweetText = `Check out $${tokenSymbol} on BONK BATTLE! `;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#1a1f2e] rounded-xl p-6 w-[90%] max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Share coin</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-6">Copy link or share directly to X</p>

        <div className="space-y-3">
          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? 'Copied!' : 'Copy link'}
          </button>

          <button
            onClick={shareOnX}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors border border-white/20"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share on X
          </button>
        </div>
      </div>
    </div>
  );
}

interface Metadata {
  name: string;
  symbol: string;
  uri?: string;
  image?: string;
  description?: string;
}

interface CreatorProfile {
  wallet: string;
  username: string | null;
  avatar_url: string | null;
}

interface TokenHeroProps {
  token: {
    name: string;
    symbol: string;
    metadataUri: string;
    creator?: PublicKey | string | null;
    createdAt: number;
    mint: string;
    marketCapUsd?: number;
  };
  preloadedMetadata?: Metadata;
  battleId?: string;
}

const EMOJI_FALLBACKS = ['🚀', '💎', '🐸', '🐕', '🦊', '😎', '🌙', '🎯', '🦍', '🐂'];

export function TokenHero({ token, preloadedMetadata, battleId }: TokenHeroProps) {
  const { metadata: fetchedMetadata } = useTokenMetadata(token.mint);
  const [imageError, setImageError] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  // Use preloaded metadata if available, otherwise use fetched metadata
  const metadata = preloadedMetadata || fetchedMetadata;

  const displayName = metadata?.name || token.name || 'Unknown';
  const displaySymbol = metadata?.symbol || token.symbol || 'UNK';
  const imageUrl = metadata?.image || '';

  // Get creator wallet address
  const creatorWallet = token.creator
    ? (typeof token.creator === 'string' ? token.creator : token.creator.toString())
    : null;

  // Fetch creator profile
  useEffect(() => {
    if (!creatorWallet) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/user/profile?wallet=${creatorWallet}`);
        const data = await res.json();
        if (data.success && data.profile) {
          setCreatorProfile(data.profile);
        }
      } catch (err) {
        console.warn('Failed to fetch creator profile:', err);
      }
    };

    fetchProfile();
  }, [creatorWallet]);

  // Use consistent emoji based on mint address (not random)
  const emojiIndex = token.mint ?
    token.mint.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % EMOJI_FALLBACKS.length :
    0;
  const fallbackEmoji = EMOJI_FALLBACKS[emojiIndex];

  // Display name: username if available, otherwise shortened address
  const creatorDisplayName = creatorProfile?.username
    || (creatorWallet ? `${creatorWallet.slice(0, 4)}...${creatorWallet.slice(-4)}` : 'Unknown');

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


  return (
    <>
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        tokenMint={token.mint}
        tokenSymbol={displaySymbol}
      />

      <div className="bg-bonk-card border border-bonk-border rounded-xl p-4 mb-4">
        <div className="flex items-start gap-4">
          {/* Token Image with border */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl overflow-hidden border-2 border-bonk-border"
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
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                  priority
                />
              ) : (
                <span>{fallbackEmoji}</span>
              )}
            </div>
            {/* MC under photo - DYNAMIC */}
            <div className="mt-2 text-center">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Market Cap</div>
              <div className="text-lg font-bold text-white">
                {token.marketCapUsd !== undefined && token.marketCapUsd !== null
                  ? `$${token.marketCapUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : '...'
                }
              </div>
            </div>
          </div>

          {/* Token Info */}
          <div className="flex-1 min-w-0">
            {/* Top row: Name + Ticker + Share button */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Token Name */}
                <h1 className="text-xl font-bold text-white">{displayName}</h1>
                {/* Ticker badge */}
                <span className="px-2 py-0.5 bg-bonk-border rounded text-sm text-gray-300 font-medium">
                  ${displaySymbol}
                </span>
                {/* In Battle button */}
                {battleId && (
                  <Link
                    href={`/battle/${battleId}`}
                    className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    ⚔️ In battle
                  </Link>
                )}
              </div>

              {/* Share button - top right, responsive */}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors flex-shrink-0 ml-2"
                title="Share"
              >
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {/* Text visible only on desktop (>600px) */}
                <span className="hidden sm:inline text-sm font-medium text-emerald-400">Share</span>
              </button>
            </div>

            {/* Created by row: avatar + username/address + time ago */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-gray-500">Created by</span>

              {/* Creator avatar + name (clickable) */}
              {creatorWallet ? (
                <Link
                  href={`/profile/${creatorWallet}`}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                >
                  {/* Avatar */}
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-bonk-border flex items-center justify-center">
                    {creatorProfile?.avatar_url && !avatarError ? (
                      <Image
                        src={creatorProfile.avatar_url}
                        alt={creatorDisplayName}
                        width={20}
                        height={20}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400">
                        {creatorDisplayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Username or address */}
                  <span className="text-emerald-400 hover:text-emerald-300 font-medium">
                    {creatorDisplayName}
                  </span>
                </Link>
              ) : (
                <span className="text-gray-500">Unknown</span>
              )}

              {/* Time ago */}
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">{createdDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}