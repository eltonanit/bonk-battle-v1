// app/src/app/points/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useUserPoints } from '@/hooks/useUserPoints';

export default function PointsPage() {
  const { points, loading } = useUserPoints();

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
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}