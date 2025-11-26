// app/src/app/points/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useUserPoints } from '@/hooks/useUserPoints';

export default function PointsPage() {
  const { points, loading } = useUserPoints();

  return (
    <div className="min-h-screen bg-[#0a1a1a] text-white">
      <DesktopHeader />
      <Header />
      <Sidebar />

      <div className="pt-32 lg:pt-0 lg:ml-56 lg:mt-16">
        <div className="lg:hidden">
          <FOMOTicker />
        </div>

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

          {/* Get More Points Section */}
          <div className="mb-8">
            <div className="text-gray-400 text-sm mb-3">Get more points</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/create" className="bg-[#0d2626] border border-[#1a3a3a] hover:border-emerald-500/50 rounded-xl p-4 transition-all group">
                <div className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">Create a Token</div>
                <div className="text-sm text-gray-400">Launch your meme and earn points</div>
              </Link>
              <Link href="/battle" className="bg-[#0d2626] border border-[#1a3a3a] hover:border-orange-500/50 rounded-xl p-4 transition-all group">
                <div className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">Win Battles</div>
                <div className="text-sm text-gray-400">Fight and dominate the arena</div>
              </Link>
              <Link href="/" className="bg-[#0d2626] border border-[#1a3a3a] hover:border-yellow-500/50 rounded-xl p-4 transition-all group">
                <div className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">Trade Tokens</div>
                <div className="text-sm text-gray-400">Buy and sell to rack up points</div>
              </Link>
              <Link href="/armies" className="bg-[#0d2626] border border-[#1a3a3a] hover:border-cyan-500/50 rounded-xl p-4 transition-all group">
                <div className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">Join an Army</div>
                <div className="text-sm text-gray-400">Team up and earn together</div>
              </Link>
            </div>
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