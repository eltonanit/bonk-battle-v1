'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

interface LeaderboardUser {
  wallet: string;
  totalPoints: number;
  rank: number;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const response = await fetch('/api/leaderboard');
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      {/* Mobile Tickers */}
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-4xl">🏆</span>
              Leaderboard
            </h1>
            <p className="text-gray-400 mt-2">
              This page shows accounts with the most points
            </p>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-3 gap-4 p-4 border-b border-[#1a3a3a] bg-[#0a1f1f]">
              <div className="text-gray-400 font-semibold text-sm">Rank</div>
              <div className="text-gray-400 font-semibold text-sm">Wallet</div>
              <div className="text-gray-400 font-semibold text-sm text-right">Points</div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="p-8 text-center">
                <div className="animate-spin text-4xl mb-4">🔄</div>
                <p className="text-gray-400">Loading leaderboard...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && users.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-400 mb-2">No data yet</p>
                <p className="text-gray-500 text-sm">
                  Start earning points to appear on the leaderboard!
                </p>
              </div>
            )}

            {/* Leaderboard Rows */}
            {!loading && users.map((user, index) => (
              <div
                key={user.wallet}
                className={`grid grid-cols-3 gap-4 p-4 items-center border-b border-[#1a3a3a] last:border-b-0 ${
                  index === 0 ? 'bg-yellow-500/10' :
                  index === 1 ? 'bg-gray-400/10' :
                  index === 2 ? 'bg-orange-600/10' : ''
                }`}
              >
                {/* Rank */}
                <div className="flex items-center gap-2">
                  {index === 0 && <span className="text-2xl">🥇</span>}
                  {index === 1 && <span className="text-2xl">🥈</span>}
                  {index === 2 && <span className="text-2xl">🥉</span>}
                  {index > 2 && (
                    <span className="text-white font-bold text-lg w-8 text-center">
                      #{user.rank}
                    </span>
                  )}
                </div>

                {/* Wallet */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-xs">
                    {user.wallet.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-white font-medium">
                    {formatWallet(user.wallet)}
                  </span>
                </div>

                {/* Points */}
                <div className="text-right">
                  <span className={`font-bold ${
                    index === 0 ? 'text-yellow-400 text-xl' :
                    index === 1 ? 'text-gray-300 text-lg' :
                    index === 2 ? 'text-orange-400 text-lg' :
                    'text-emerald-400'
                  }`}>
                    {user.totalPoints.toLocaleString()}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">pts</span>
                </div>
              </div>
            ))}
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-[#0d2626] border border-[#1a3a3a] rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>💡</span> How to earn points
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="text-gray-400">
                <span className="text-emerald-400 font-bold">+500</span> Create token
              </div>
              <div className="text-gray-400">
                <span className="text-emerald-400 font-bold">+700</span> Buy token
              </div>
              <div className="text-gray-400">
                <span className="text-emerald-400 font-bold">+1,000</span> Qualify token
              </div>
              <div className="text-gray-400">
                <span className="text-emerald-400 font-bold">+10,000</span> Win battle
              </div>
              <div className="text-gray-400">
                <span className="text-emerald-400 font-bold">+5,000</span> Referral joins
              </div>
              <div className="text-gray-400">
                <span className="text-emerald-400 font-bold">+100</span> Daily login
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
