// app/src/app/points/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useUserPoints } from '@/hooks/useUserPoints';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';

// Social links
const SOCIAL_LINKS = {
  x: 'https://x.com/bonk_battle',
  instagram: 'https://instagram.com/bonkbattle',
  telegram: 'https://t.me/bonkbattle',
};

interface SocialClaimBoxProps {
  type: 'x' | 'instagram' | 'telegram';
  claimed: boolean;
  onClaim: (type: 'x' | 'instagram' | 'telegram') => void;
  loading: boolean;
}

function SocialClaimBox({ type, claimed, onClaim, loading }: SocialClaimBoxProps) {
  const config = {
    x: {
      name: 'X (Twitter)',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      gradient: 'from-gray-800 to-gray-900',
      glow: 'shadow-[0_0_30px_rgba(255,255,255,0.3)]',
      hoverGlow: 'hover:shadow-[0_0_40px_rgba(255,255,255,0.5)]',
    },
    instagram: {
      name: 'Instagram',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      gradient: 'from-pink-500 via-purple-500 to-orange-500',
      glow: 'shadow-[0_0_30px_rgba(236,72,153,0.5)]',
      hoverGlow: 'hover:shadow-[0_0_40px_rgba(236,72,153,0.7)]',
    },
    telegram: {
      name: 'Telegram',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      gradient: 'from-blue-400 to-blue-600',
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.5)]',
      hoverGlow: 'hover:shadow-[0_0_40px_rgba(59,130,246,0.7)]',
    },
  };

  const c = config[type];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br ${c.gradient} ${c.glow} ${!claimed ? c.hoverGlow : ''} transition-all duration-300 ${claimed ? 'opacity-60' : ''}`}
    >
      {/* Animated glow effect */}
      {!claimed && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      )}

      <div className="relative p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
            {c.icon}
          </div>
          <div>
            <div className="text-white font-semibold text-sm">Follow {c.name}</div>
            <div className="text-emerald-400 font-bold text-lg">+1,000 pts</div>
          </div>
        </div>

        <button
          onClick={() => onClaim(type)}
          disabled={claimed || loading}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            claimed
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-white text-black hover:bg-gray-200 hover:scale-105 active:scale-95'
          }`}
        >
          {claimed ? '✓ Claimed' : loading ? '...' : 'Claim'}
        </button>
      </div>
    </div>
  );
}

export default function PointsPage() {
  const { points, loading } = useUserPoints();
  const { publicKey } = useWallet();
  const [claimedSocials, setClaimedSocials] = useState<Set<string>>(new Set());
  const [claimLoading, setClaimLoading] = useState(false);

  // Fetch claimed socials on mount
  useEffect(() => {
    if (!publicKey) return;

    const fetchClaims = async () => {
      const { data } = await supabase
        .from('social_claims')
        .select('social_type')
        .eq('wallet_address', publicKey.toString());

      if (data) {
        setClaimedSocials(new Set(data.map(d => d.social_type)));
      }
    };

    fetchClaims();
  }, [publicKey]);

  const handleClaim = async (type: 'x' | 'instagram' | 'telegram') => {
    if (!publicKey || claimedSocials.has(type)) return;

    // Open social link in new tab
    window.open(SOCIAL_LINKS[type], '_blank');

    setClaimLoading(true);
    try {
      // Save claim to database
      const { error } = await supabase
        .from('social_claims')
        .insert({
          wallet_address: publicKey.toString(),
          social_type: type,
        });

      if (!error) {
        // Add 1000 points
        await supabase
          .from('user_points')
          .upsert({
            wallet_address: publicKey.toString(),
            total_points: (points?.totalPoints || 0) + 1000,
          }, { onConflict: 'wallet_address' });

        setClaimedSocials(prev => new Set([...prev, type]));
      }
    } catch (err) {
      console.error('Claim error:', err);
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1a1a] text-white">
      {/* ⭐ Tickers SOPRA Header - SOLO mobile/tablet (< lg) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
        <div className="flex items-center gap-2 px-2 justify-center xs:justify-start">
          <FOMOTicker />
          <div className="hidden sm:block">
            <CreatedTicker />
          </div>
        </div>
      </div>

      <DesktopHeader />
      <Header />
      <Sidebar />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16">

        <div className="max-w-[900px] mx-auto px-5 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">Points</h1>
            <Link href="#learn" className="text-emerald-400 hover:text-emerald-300 text-sm">
              Learn more
            </Link>
          </div>

          {/* Social Follow Claim Boxes */}
          {publicKey && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <SocialClaimBox
                type="x"
                claimed={claimedSocials.has('x')}
                onClaim={handleClaim}
                loading={claimLoading}
              />
              <SocialClaimBox
                type="instagram"
                claimed={claimedSocials.has('instagram')}
                onClaim={handleClaim}
                loading={claimLoading}
              />
              <SocialClaimBox
                type="telegram"
                claimed={claimedSocials.has('telegram')}
                onClaim={handleClaim}
                loading={claimLoading}
              />
            </div>
          )}

          {/* 2 Stats Boxes */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Total Points */}
            <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">Total Points</div>
              {loading ? (
                <div className="text-2xl font-bold text-white">...</div>
              ) : (
                <div className="text-2xl font-bold text-white">
                  {points?.totalPoints?.toLocaleString() || 0}
                </div>
              )}
            </div>

            {/* Rank */}
            <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">Rank</div>
              <div className="text-2xl font-bold text-white">
                {points?.rank ? `#${points.rank.toLocaleString()}` : '#1'}
              </div>
            </div>
          </div>

          {/* Points Table */}
          <div className="mb-8">
            <div className="text-gray-400 text-sm mb-3">Earn Points</div>
            <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl overflow-hidden">
              {/* Create token */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">Create token</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">+500 pts</span>
                  <Link href="/create" className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-sm rounded-lg transition-colors">
                    Create
                  </Link>
                </div>
              </div>

              {/* Buy token */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">Buy token</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">+700 pts</span>
                  <Link href="/" className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-sm rounded-lg transition-colors">
                    Trade
                  </Link>
                </div>
              </div>

              {/* Qualify token */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">Qualify token</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">+1,000 pts</span>
                  <Link href="/" className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-black font-semibold text-sm rounded-lg transition-colors">
                    Explore
                  </Link>
                </div>
              </div>

              {/* Win battle */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">Win battle</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">+10,000 pts</span>
                  <Link href="/battlestart" className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm rounded-lg transition-colors">
                    Battle
                  </Link>
                </div>
              </div>

              {/* Share battle */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">Share battle</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">+500 pts</span>
                  <Link href="/battlestart" className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm rounded-lg transition-colors">
                    Share
                  </Link>
                </div>
              </div>

              {/* Share win */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">Share win</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">+2,000 pts</span>
                  <Link href="/battlestart" className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm rounded-lg transition-colors">
                    Share
                  </Link>
                </div>
              </div>

              {/* Referral joins */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">Referral joins</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">+5,000 pts</span>
                  <button className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-sm rounded-lg transition-colors">
                    Invite
                  </button>
                </div>
              </div>

              {/* New follower */}
              <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">New follower</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">+25 pts</span>
                  <Link href="/profile" className="px-4 py-1.5 bg-pink-500 hover:bg-pink-600 text-white font-semibold text-sm rounded-lg transition-colors">
                    Profile
                  </Link>
                </div>
              </div>

              {/* Daily login */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">Daily login</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">+100 pts</span>
                  <button className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-semibold text-sm rounded-lg transition-colors">
                    Claim
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* What are points for */}
          <div className="mb-8">
            <div className="text-gray-400 text-sm mb-3">What are points for?</div>
          </div>

          {/* Mystery Section */}
          <div id="learn" className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl p-6 text-center">
            <div className="text-xl font-bold text-white mb-2">
              Something massive is cooking...
            </div>
            <div className="text-gray-400 mb-6">
              Stack those points anon. When the time comes, early believers get rewarded. NFA, but wagmi.
            </div>
            <div className="flex flex-col items-center gap-2">
              <Image
                src="/BONK-LOGO.svg"
                alt="BONK BATTLE"
                width={48}
                height={48}
                className="opacity-80"
              />
              <div className="text-xs text-gray-500">Team BONK BATTLE</div>
            </div>
          </div>

          {/* 2 Ways to Use Points */}
          <div className="mt-8 bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 border border-emerald-500/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-emerald-400 mb-4">
              2 Ways Points Reward You
            </h3>
            <div className="space-y-4">
              {/* Future Airdrop */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🎁</span>
                </div>
                <div>
                  <div className="text-white font-semibold">Future Airdrop</div>
                  <div className="text-gray-400 text-sm">Points will convert to tokens in our upcoming airdrop. More points = bigger share.</div>
                </div>
              </div>

              {/* 24h Cash */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">💰</span>
                </div>
                <div>
                  <div className="text-white font-semibold">24h Cash Prize</div>
                  <div className="text-gray-400 text-sm">Top of the 24h leaderboard wins <span className="text-yellow-400 font-bold">10 SOL</span> every day!</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}