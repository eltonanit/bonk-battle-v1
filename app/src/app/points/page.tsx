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
  x: 'https://x.com/bonk_battle?s=20',
  instagram: 'https://www.instagram.com/bonk_battle',
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
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
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
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
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
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${claimed
              ? 'bg-green-600 text-white hover:bg-green-500'
              : 'bg-white text-black hover:bg-gray-200 hover:scale-105 active:scale-95'
            }`}
        >
          {claimed ? '✓ Claimed' : loading ? '...' : 'Claim'}
        </button>
      </div>
    </div>
  );
}

// Leaderboard entry interface
interface LeaderboardEntry {
  wallet_address: string;
  total_points: number;
  tier: string;
  rank?: number;
}

// Points history entry interface
interface PointsHistoryEntry {
  id: string;
  action: string;
  points: number;
  token_symbol?: string;
  token_image?: string;
  created_at: string;
}

// Tab type
type TabType = 'balance' | 'leaderboard' | 'history';

export default function PointsPage() {
  const { points, loading, refetch } = useUserPoints();
  const { publicKey } = useWallet();
  const [claimedSocials, setClaimedSocials] = useState<Set<string>>(new Set());
  const [claimLoading, setClaimLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('balance');

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // History state
  const [history, setHistory] = useState<PointsHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  // Fetch leaderboard when tab changes
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  // Fetch history when tab changes
  useEffect(() => {
    if (activeTab === 'history' && publicKey) {
      fetchHistory();
    }
  }, [activeTab, publicKey]);

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const { data } = await supabase
        .from('user_points')
        .select('wallet_address, total_points, tier')
        .order('total_points', { ascending: false })
        .limit(50);

      if (data) {
        setLeaderboard(data.map((entry, index) => ({ ...entry, rank: index + 1 })));
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!publicKey) return;

    setHistoryLoading(true);
    try {
      // First try points_history table
      const { data: historyData } = await supabase
        .from('points_history')
        .select('*')
        .eq('wallet_address', publicKey.toString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (historyData && historyData.length > 0) {
        setHistory(historyData);
      } else {
        // Fallback: get from notifications
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_wallet', publicKey.toString())
          .eq('type', 'points')
          .order('created_at', { ascending: false })
          .limit(50);

        if (notifData) {
          setHistory(notifData.map(n => ({
            id: n.id,
            action: n.data?.action || 'unknown',
            points: n.data?.points || 0,
            token_symbol: n.data?.token_symbol,
            token_image: n.data?.token_image,
            created_at: n.created_at
          })));
        }
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleClaim = async (type: 'x' | 'instagram' | 'telegram') => {
    // Always open social link
    window.open(SOCIAL_LINKS[type], '_blank');

    // If already claimed or wallet not connected, don't track
    if (claimedSocials.has(type) || !publicKey) return;

    setClaimLoading(true);

    // Wait a bit then process claim
    setTimeout(async () => {
      try {
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
          refetch?.();
        }
      } catch (err) {
        console.error('Claim error:', err);
      } finally {
        setClaimLoading(false);
      }
    }, 1000);
  };

  // Format wallet address
  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  // Format action name
  const formatAction = (action: string) => {
    const actionNames: Record<string, string> = {
      create_token: 'Created token',
      buy_token: 'Bought token',
      sell_token: 'Sold token',
      qualify_token: 'Token qualified',
      win_battle: 'Won battle',
      share_battle: 'Shared battle',
      share_win: 'Shared win',
      referral_joins: 'Referral joined',
      new_follower: 'New follower',
      daily_login: 'Daily login',
      follow_user: 'Followed user',
      first_buy: 'First buy bonus',
    };
    return actionNames[action] || action;
  };

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return then.toLocaleDateString();
  };

  // Get tier color
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'legend': return 'text-purple-400';
      case 'diamond': return 'text-cyan-400';
      case 'gold': return 'text-yellow-400';
      case 'silver': return 'text-gray-300';
      default: return 'text-amber-600';
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
          {/* ⭐ Header Section */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">Points</h1>
            <Link href="#learn" className="text-emerald-400 hover:text-emerald-300 text-sm">
              Learn more
            </Link>

            {/* 🌍 Position worldwide: con rank e allori */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-gray-400 text-sm">Position worldwide:</span>
              <div className="inline-flex items-center gap-0">
                <Image src="/left.png" alt="laurel" width={40} height={40} className="brightness-150 hue-rotate-[80deg] saturate-150 drop-shadow-[0_0_10px_rgba(34,197,94,0.9)]" />
                <span className="text-xl font-black text-white -mx-1">
                  {points?.rank ? `${points.rank.toLocaleString()}th` : '—'}
                </span>
                <Image src="/right.png" alt="laurel" width={40} height={40} className="brightness-150 hue-rotate-[80deg] saturate-150 drop-shadow-[0_0_10px_rgba(34,197,94,0.9)]" />
              </div>
            </div>
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

          {/* ⭐ 3 Tabs */}
          <div className="flex border-b border-gray-700 mb-6">
            <button
              onClick={() => setActiveTab('balance')}
              className={`px-6 py-3 font-semibold text-sm transition-colors relative ${activeTab === 'balance'
                  ? 'text-emerald-400'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              Balance Points
              {activeTab === 'balance' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-6 py-3 font-semibold text-sm transition-colors relative ${activeTab === 'leaderboard'
                  ? 'text-emerald-400'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              Leaderboard
              {activeTab === 'leaderboard' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-semibold text-sm transition-colors relative ${activeTab === 'history'
                  ? 'text-emerald-400'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              History
              {activeTab === 'history' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </button>
          </div>

          {/* ⭐ Tab Content */}

          {/* BALANCE TAB */}
          {activeTab === 'balance' && (
            <>
              {/* Total Points Box */}
              <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl p-6 mb-6">
                <div className="text-gray-400 text-sm mb-2">Total Points</div>
                {loading ? (
                  <div className="text-4xl font-bold text-white">...</div>
                ) : (
                  <div className="text-4xl font-bold text-emerald-400">
                    {points?.totalPoints?.toLocaleString() || 0}
                  </div>
                )}
              </div>

              {/* Earn Points Table */}
              <div className="mb-8">
                <div className="text-gray-400 text-sm mb-3">Earn Points</div>
                <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl overflow-hidden">
                  {/* Create token */}
                  <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                    <span className="text-white font-medium">Create token</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">+500 pts</span>
                      <Link href="/create" className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-sm rounded-lg transition-colors">
                        Create
                      </Link>
                    </div>
                  </div>

                  {/* Buy token */}
                  <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                    <span className="text-white font-medium">Buy token</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">+700 pts</span>
                      <Link href="/" className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-sm rounded-lg transition-colors">
                        Trade
                      </Link>
                    </div>
                  </div>

                  {/* Qualify token */}
                  <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                    <span className="text-white font-medium">Qualify token</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">+1,000 pts</span>
                      <Link href="/" className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-black font-semibold text-sm rounded-lg transition-colors">
                        Explore
                      </Link>
                    </div>
                  </div>

                  {/* Win battle */}
                  <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                    <span className="text-white font-medium">Win battle</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">+10,000 pts</span>
                      <Link href="/battlestart" className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm rounded-lg transition-colors">
                        Battle
                      </Link>
                    </div>
                  </div>

                  {/* Share battle */}
                  <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                    <span className="text-white font-medium">Share battle</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">+500 pts</span>
                      <Link href="/battlestart" className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm rounded-lg transition-colors">
                        Share
                      </Link>
                    </div>
                  </div>

                  {/* Share win */}
                  <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                    <span className="text-white font-medium">Share win</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">+2,000 pts</span>
                      <Link href="/battlestart" className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm rounded-lg transition-colors">
                        Share
                      </Link>
                    </div>
                  </div>

                  {/* Referral joins */}
                  <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                    <span className="text-white font-medium">Referral joins</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">+5,000 pts</span>
                      <button className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-sm rounded-lg transition-colors">
                        Invite
                      </button>
                    </div>
                  </div>

                  {/* New follower */}
                  <div className="flex items-center justify-between p-4 border-b border-[#1a3a3a]">
                    <span className="text-white font-medium">New follower</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">+25 pts</span>
                      <Link href="/profile" className="px-4 py-1.5 bg-pink-500 hover:bg-pink-600 text-white font-semibold text-sm rounded-lg transition-colors">
                        Profile
                      </Link>
                    </div>
                  </div>

                  {/* Daily login */}
                  <div className="flex items-center justify-between p-4">
                    <span className="text-white font-medium">Daily login</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold">+100 pts</span>
                      <button className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-semibold text-sm rounded-lg transition-colors">
                        Claim
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ⭐ BECOME AN EMPEROR - Special Golden Box */}
              <Link href="/emperor" className="block mb-8">
                <div className="relative overflow-hidden rounded-xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-900/40 via-amber-900/30 to-orange-900/40 p-6 cursor-pointer hover:border-yellow-400 hover:scale-[1.02] transition-all duration-300 shadow-[0_0_40px_rgba(234,179,8,0.3)] hover:shadow-[0_0_60px_rgba(234,179,8,0.5)]">
                  {/* Animated shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent animate-shimmer" />

                  {/* Logo particles animation */}
                  <div className="absolute top-2 right-4 w-8 h-8 animate-bounce">
                    <Image src="/BONK-LOGO.svg" alt="BONK" width={32} height={32} />
                  </div>
                  <div className="absolute top-4 right-16 text-lg animate-pulse delay-100">✨</div>
                  <div className="absolute bottom-4 left-4 text-lg animate-pulse delay-200">⭐</div>

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30 animate-pulse p-3">
                        <Image src="/BONK-LOGO.svg" alt="BONK" width={40} height={40} />
                      </div>
                      <div>
                        <div className="text-yellow-400 font-extrabold text-xl uppercase tracking-wide">
                          Become an Emperor
                        </div>
                        <div className="text-yellow-300/80 text-sm">
                          Join our affiliate program & earn real $$$
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-yellow-400 font-black text-3xl animate-pulse" style={{ textShadow: '0 0 20px rgba(234,179,8,0.5)' }}>
                        1,000,000 pts
                      </div>
                      <div className="text-yellow-500/70 text-xs uppercase tracking-wider">
                        for creators
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

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
                    alt="BATTLECOIN MARKET"
                    width={48}
                    height={48}
                    className="opacity-80"
                  />
                  <div className="text-xs text-gray-500">Team BATTLECOIN MARKET</div>
                </div>
              </div>
            </>
          )}

          {/* LEADERBOARD TAB */}
          {activeTab === 'leaderboard' && (
            <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl overflow-hidden">
              {leaderboardLoading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading leaderboard...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🏆</div>
                  <h2 className="text-xl font-semibold mb-2">No rankings yet</h2>
                  <p className="text-gray-400">Be the first to earn points!</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1a3a3a] text-gray-400 text-sm">
                      <th className="text-left p-4">#</th>
                      <th className="text-left p-4">Wallet</th>
                      <th className="text-left p-4">Tier</th>
                      <th className="text-right p-4">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => (
                      <tr
                        key={entry.wallet_address}
                        className={`border-b border-[#1a3a3a] ${publicKey?.toString() === entry.wallet_address ? 'bg-emerald-500/10' : ''
                          }`}
                      >
                        <td className="p-4">
                          {index < 3 ? (
                            <span className="text-xl">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </span>
                          ) : (
                            <span className="text-gray-400">{entry.rank}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-white font-mono">
                            {formatWallet(entry.wallet_address)}
                          </span>
                          {publicKey?.toString() === entry.wallet_address && (
                            <span className="ml-2 text-xs text-emerald-400">(you)</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`capitalize font-semibold ${getTierColor(entry.tier)}`}>
                            {entry.tier}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-emerald-400 font-bold">
                            {entry.total_points.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl overflow-hidden">
              {!publicKey ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🔐</div>
                  <h2 className="text-xl font-semibold mb-2">Connect wallet</h2>
                  <p className="text-gray-400">Connect your wallet to see your points history</p>
                </div>
              ) : historyLoading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">📜</div>
                  <h2 className="text-xl font-semibold mb-2">No history yet</h2>
                  <p className="text-gray-400">Start earning points to see your history!</p>
                </div>
              ) : (
                <div className="divide-y divide-[#1a3a3a]">
                  {history.map((entry) => (
                    <div key={entry.id} className="p-4 flex items-center gap-4">
                      {/* Token image or default icon */}
                      {entry.token_image ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={entry.token_image}
                            alt={entry.token_symbol || 'Token'}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 640 640" fill="currentColor">
                            <path d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z" />
                          </svg>
                        </div>
                      )}

                      {/* Action info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium">
                          {formatAction(entry.action)}
                          {entry.token_symbol && (
                            <span className="text-gray-400 ml-2">${entry.token_symbol}</span>
                          )}
                        </div>
                        <div className="text-gray-500 text-sm">
                          {formatTimeAgo(entry.created_at)}
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-emerald-400 font-bold text-lg">
                        +{entry.points.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}