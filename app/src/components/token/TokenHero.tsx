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
            onClick={shareOnX}
            className="w-full flex flex-col items-center justify-center py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Share on X</span>
            </div>
            <span className="text-black text-xs font-bold mt-1 animate-zoom-subtle">GET +500 POINTS</span>
          </button>

          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? 'Copied!' : 'Copy link'}
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

// Battle Status enum values
enum BattleStatus {
  Created = 0,
  Qualified = 1,
  InBattle = 2,
  VictoryPending = 3,
  Listed = 4,
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
  battleStatus?: number; // ⭐ NEW: Battle status for status button
}

const EMOJI_FALLBACKS = ['🚀', '💎', '🐸', '🐕', '🦊', '😎', '🌙', '🎯', '🦍', '🐂'];

export function TokenHero({ token, preloadedMetadata, battleId, battleStatus }: TokenHeroProps) {
  const { metadata: fetchedMetadata } = useTokenMetadata(token.mint);
  const [imageError, setImageError] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [ctCopied, setCtCopied] = useState(false);

  // Use preloaded metadata if available, otherwise use fetched metadata
  const metadata = preloadedMetadata || fetchedMetadata;

  const displayName = metadata?.name || token.name || 'Unknown';
  const rawSymbol = metadata?.symbol || token.symbol || 'UNK';
  const displaySymbol = rawSymbol.slice(0, 5); // Max 5 characters
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

  // ⭐ NEW: Short address for creator (only first 4 chars)
  const creatorShort = creatorWallet ? creatorWallet.slice(0, 4) : null;

  // ⭐ NEW: Contract address shortened
  const ctShort = `${token.mint.slice(0, 4)}...${token.mint.slice(-4)}`;

  // ⭐ NEW: Copy CT address
  const copyCtAddress = async () => {
    await navigator.clipboard.writeText(token.mint);
    setCtCopied(true);
    setTimeout(() => setCtCopied(false), 2000);
  };

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

      {/* Animation styles */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-ping-slow {
          animation: ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.2); }
          50% { opacity: 0.95; box-shadow: 0 0 12px 2px rgba(16, 185, 129, 0.3); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2.5s ease-in-out infinite;
        }
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 4px rgba(250, 204, 21, 0.4); }
          50% { text-shadow: 0 0 12px rgba(250, 204, 21, 0.8), 0 0 20px rgba(250, 204, 21, 0.4); }
        }
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        @keyframes zoom-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .animate-zoom-pulse {
          animation: zoom-pulse 2s ease-in-out infinite;
        }
        @keyframes zoom-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-zoom-subtle {
          animation: zoom-subtle 2.5s ease-in-out infinite;
        }
      `}</style>

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

            {/* ⭐ CT Address under photo (clickable to copy) */}
            <button
              onClick={copyCtAddress}
              className="mt-2 flex items-center gap-1.5 group cursor-pointer hover:opacity-80 transition-opacity"
              title="Click to copy contract address"
            >
              <span className="text-[10px] text-gray-500 uppercase">CT:</span>
              {ctCopied ? (
                <span className="text-xs text-green-400 font-mono">Copied!</span>
              ) : (
                <>
                  <span className="text-xs font-mono text-gray-400 group-hover:text-white transition-colors">{ctShort}</span>
                  <svg className="w-3 h-3 text-gray-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </>
              )}
            </button>

            {/* ⭐ Time under CT */}
            <span className="mt-1 text-[10px] text-gray-500">{createdDisplay}</span>
          </div>

          {/* Token Info */}
          <div className="flex-1 min-w-0">
            {/* Top row: Symbol + Share button */}
            <div className="flex items-start justify-between mb-1">
              <div className="flex flex-col">
                {/* ⭐ Token Symbol (max 5 chars) - smaller on mobile */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-white">${displaySymbol}</h1>
                </div>
                {/* ⭐ "by" section under symbol */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-gray-500">by</span>
                  {creatorWallet ? (
                    <Link
                      href={`/profile/${creatorWallet}`}
                      className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0 border border-orange-400/50">
                        <Image
                          src={
                            creatorProfile?.avatar_url && !avatarError
                              ? creatorProfile.avatar_url
                              : '/profilo.png'
                          }
                          alt="creator"
                          width={14}
                          height={14}
                          className="w-full h-full object-cover"
                          onError={() => setAvatarError(true)}
                          unoptimized
                        />
                      </div>
                      <span className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium">
                        {creatorShort}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-[10px] text-gray-500">Unknown</span>
                  )}
                </div>
              </div>

              {/* Share button - top right, responsive */}
              <div className="flex flex-col gap-2 flex-shrink-0 ml-2">
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all"
                  title="Share to earn +500 points"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-bold text-emerald-400 animate-zoom-pulse">+500 pts</span>
                </button>

                {/* ⭐ Status Buttons - responsive */}
                {battleStatus === BattleStatus.Created && (
                  <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs sm:text-sm font-medium">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400"></span>
                    <span>New</span>
                  </div>
                )}

                {battleStatus === BattleStatus.Qualified && (
                  <Link
                    href="/battlestart?tab=qualify"
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs sm:text-sm font-medium transition-colors"
                  >
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-400"></span>
                    <span>Qualified</span>
                  </Link>
                )}

                {(battleStatus === BattleStatus.InBattle || battleStatus === BattleStatus.VictoryPending) && battleId && (
                  <Link
                    href={`/battle/${battleId}`}
                    className="flex flex-col items-center px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-xs sm:text-sm font-medium transition-colors animate-pulse-slow"
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5 text-orange-400">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-400 animate-ping-slow"></span>
                      <span>In Battle</span>
                    </div>
                    <span className="text-white text-xs">VIEW</span>
                  </Link>
                )}

                {battleStatus === BattleStatus.Listed && (
                  <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs sm:text-sm font-medium">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-400"></span>
                    <span>Champion</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}