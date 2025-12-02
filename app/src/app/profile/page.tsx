'use client';

import { useState, useEffect, Suspense } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { BalancesTab } from '@/components/profile/BalancesTab';
import { CoinsTab } from '@/components/profile/CoinsTab';
import { YourArmyTab } from '@/components/profile/YourArmyTab';
import { useUserPoints } from '@/hooks/useUserPoints';

function ProfileContent() {
  const { publicKey } = useWallet();
  const searchParams = useSearchParams();
  const { points, loading: pointsLoading } = useUserPoints();

  // Tab: balances, coins, army, points
  const initialTab = (searchParams.get('tab') as 'balances' | 'coins' | 'army' | 'points') || 'balances';

  const [activeTab, setActiveTab] = useState<'balances' | 'coins' | 'army' | 'points'>(initialTab);
  const [createdCoinsCount, setCreatedCoinsCount] = useState(0);

  // Update tab quando cambia URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'balances' || tab === 'coins' || tab === 'army' || tab === 'points') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!publicKey) return;

    async function fetchCreatedCount() {
      if (!publicKey) return;

      try {
        const { fetchAllBonkTokens } = await import('@/lib/solana/fetch-all-bonk-tokens');
        const allTokens = await fetchAllBonkTokens();

        // Filter only tokens created by this user
        const userCreatedTokens = allTokens.filter(
          token => token.creator?.toString() === publicKey.toBase58()
        );

        setCreatedCoinsCount(userCreatedTokens.length);
        console.log(`User created tokens: ${userCreatedTokens.length} (total: ${allTokens.length})`);
      } catch (error) {
        console.error('Error fetching created count:', error);
      }
    }

    fetchCreatedCount();
  }, [publicKey]);

  return (
    <>
      <div className="max-w-[800px] mx-auto px-5 py-8">
        <ProfileHeader createdCoinsCount={createdCoinsCount} />

        {/* Tabs: Balance - Coins - Army - Points */}
        <div className="border-b border-white/10 mb-8">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('balances')}
              className={`pb-4 px-2 font-semibold transition-colors border-b-2 ${activeTab === 'balances'
                ? 'text-white border-cyan-500'
                : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
            >
              Balance
            </button>
            <button
              onClick={() => setActiveTab('coins')}
              className={`pb-4 px-2 font-semibold transition-colors border-b-2 ${activeTab === 'coins'
                ? 'text-white border-cyan-500'
                : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
            >
              Coins
            </button>
            <button
              onClick={() => setActiveTab('army')}
              className={`pb-4 px-2 font-semibold transition-colors border-b-2 ${activeTab === 'army'
                ? 'text-white border-orange-500'
                : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
            >
              Army
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`pb-4 px-2 font-semibold transition-colors border-b-2 ${activeTab === 'points'
                ? 'text-white border-emerald-500'
                : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
            >
              Points
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'balances' && <BalancesTab />}
          {activeTab === 'coins' && <CoinsTab />}
          {activeTab === 'army' && <YourArmyTab />}
          {activeTab === 'points' && (
            <div className="space-y-6">
              {/* Points Summary */}
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-6">
                <div className="text-center mb-6">
                  <div className="text-gray-400 text-sm mb-1">Total Points</div>
                  <div className="text-4xl font-bold text-emerald-400">
                    {pointsLoading ? '...' : (points?.totalPoints?.toLocaleString() || 0)}
                  </div>
                  {points?.rank && (
                    <div className="text-gray-400 text-sm mt-2">
                      Rank #{points.rank.toLocaleString()}
                    </div>
                  )}
                </div>

                <Link
                  href="/points"
                  className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg text-center transition-colors"
                >
                  View All Points & Earn More
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-bonk-dark text-white">
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

        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-gray-400">Loading profile...</div>
          </div>
        }>
          <ProfileContent />
        </Suspense>
      </div>
      <MobileBottomNav />
    </div>
  );
}
