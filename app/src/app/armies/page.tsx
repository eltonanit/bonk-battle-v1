// app/src/app/armies/page.tsx
'use client';

import { useState } from 'react';
import { useArmies } from '@/hooks/useArmies';
import { CreateArmyModal } from '@/components/armies/CreateArmyModal';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import Image from 'next/image';
import Link from 'next/link';

type TabType = 'top' | 'onfire' | 'leaderboard';

export default function ArmiesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('onfire');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: armies, isLoading, error } = useArmies(activeTab);

  // Filter armies by search query
  const filteredArmies = armies?.filter(army =>
    army.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMemberCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(2)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(2)}K`;
    return count.toString();
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ backgroundColor: '#101011' }}>
      {/* Tickers */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2" style={{ backgroundColor: '#101011' }}>
        <div className="flex items-center gap-2 px-2 justify-center xs:justify-start">
          <FOMOTicker />
          <div className="hidden sm:block">
            <CreatedTicker />
          </div>
        </div>
      </div>

      <Sidebar />
      <DesktopHeader />
      <Header />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16 max-w-full">
        <div className="max-w-3xl mx-auto px-4 py-8">

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search armies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors"
                style={{ backgroundColor: '#151516' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ⚔️ HERO SECTION */}
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-orange-500/30" style={{ backgroundColor: '#151516' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 via-red-600/5 to-orange-600/10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/20 via-transparent to-transparent" />

            <div className="relative px-6 py-10 text-center">
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-2" style={{
                background: 'linear-gradient(135deg, #FF6B35 0%, #F7C02B 50%, #FF6B35 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                ⚔️ JOIN THE WAR
              </h1>
              <p className="text-gray-400 text-sm mb-5">
                Choose your side. Build your army. <span className="text-orange-400 font-bold">Crush your enemies.</span>
              </p>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold uppercase tracking-wide rounded-xl transition-all hover:scale-105 shadow-lg shadow-orange-500/30"
              >
                🏴 Create Your Army
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('onfire')}
              className={`flex-1 py-3 px-4 font-bold uppercase text-sm tracking-wide rounded-xl transition-all ${
                activeTab === 'onfire'
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black'
                  : 'text-gray-400 hover:text-white border border-white/10'
              }`}
              style={{ backgroundColor: activeTab !== 'onfire' ? '#151516' : undefined }}
            >
              🔥 On Fire
            </button>
            <button
              onClick={() => setActiveTab('top')}
              className={`flex-1 py-3 px-4 font-bold uppercase text-sm tracking-wide rounded-xl transition-all ${
                activeTab === 'top'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'text-gray-400 hover:text-white border border-white/10'
              }`}
              style={{ backgroundColor: activeTab !== 'top' ? '#151516' : undefined }}
            >
              👑 Top
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 py-3 px-4 font-bold uppercase text-sm tracking-wide rounded-xl transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                  : 'text-gray-400 hover:text-white border border-white/10'
              }`}
              style={{ backgroundColor: activeTab !== 'leaderboard' ? '#151516' : undefined }}
            >
              🏆 Leaderboard
            </button>
          </div>

          {/* Tab Description */}
          <div className="mb-4 text-gray-500 text-sm">
            {activeTab === 'onfire' && '🔥 Fastest growing armies (most new recruits)'}
            {activeTab === 'top' && '👑 Largest armies by total members'}
            {activeTab === 'leaderboard' && '🏆 Best win/loss record in battles'}
          </div>

          {/* LIST CONTAINER */}
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ backgroundColor: '#151516' }}>

            {/* Loading State */}
            {isLoading && (
              <div className="divide-y divide-white/5">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                    <div className="w-12 h-12 rounded-xl bg-white/10" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                      <div className="h-3 w-20 bg-white/5 rounded" />
                    </div>
                    <div className="h-4 w-16 bg-white/10 rounded" />
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-8 text-center">
                <span className="text-3xl mb-3 block">💀</span>
                <p className="text-red-400 font-bold">Error loading armies</p>
                <p className="text-gray-500 text-sm">{error.message}</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredArmies && filteredArmies.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">{searchQuery ? '🔍' : '⚔️'}</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {searchQuery ? 'No armies found' : 'No Armies Yet'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery ? `No armies matching "${searchQuery}"` : 'Be the first commander to create an army!'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl"
                  >
                    🏴 Create First Army
                  </button>
                )}
              </div>
            )}

            {/* ⚔️ ARMY LIST */}
            {!isLoading && !error && filteredArmies && filteredArmies.length > 0 && (
              <div className="divide-y divide-white/5">
                {filteredArmies.map((army, index) => {
                  const isOnFire = activeTab === 'onfire';
                  const isLeaderboard = activeTab === 'leaderboard';
                  const isTop = activeTab === 'top';
                  const newMembers = army.member_count - army.member_count_checkpoint;
                  const wins = army.battles_won ?? 0;
                  const losses = army.battles_lost ?? 0;
                  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

                  return (
                    <Link key={army.id} href={`/armies/${army.id}`}>
                      <div className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer">
                        {/* Army Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-2xl">
                            {army.image_url ? (
                              <Image
                                src={army.image_url}
                                alt={army.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{army.icon || '⚔️'}</span>
                            )}
                          </div>
                          {/* Rank badge for top 3 */}
                          {(isLeaderboard || isTop) && index < 3 && (
                            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                              index === 0 ? 'bg-yellow-500 text-black' :
                              index === 1 ? 'bg-gray-300 text-black' :
                              'bg-orange-600 text-white'
                            }`}>
                              {index + 1}
                            </div>
                          )}
                        </div>

                        {/* Army Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white truncate">{army.name}</h3>
                            {isOnFire && <span className="text-orange-400 text-xs">🔥</span>}
                          </div>
                          <p className="text-gray-500 text-sm">
                            👥 {formatMemberCount(army.member_count)} soldiers
                          </p>
                        </div>

                        {/* Stats Column */}
                        <div className="text-right flex-shrink-0">
                          {isOnFire && (
                            <>
                              <div className={`font-bold text-sm ${newMembers > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                {newMembers > 0 ? `+${newMembers}` : '0'}
                              </div>
                              <div className="text-gray-500 text-xs">new today</div>
                            </>
                          )}
                          {isTop && (
                            <>
                              <div className="font-bold text-white text-sm">
                                {formatMemberCount(army.member_count)}
                              </div>
                              <div className="text-gray-500 text-xs">members</div>
                            </>
                          )}
                          {isLeaderboard && (
                            <>
                              <div className="flex items-center gap-2 justify-end">
                                <span className="text-green-400 font-bold text-sm">{wins}W</span>
                                <span className="text-gray-600">-</span>
                                <span className="text-red-400 font-bold text-sm">{losses}L</span>
                              </div>
                              <div className={`text-xs font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                {winRate}% win
                              </div>
                            </>
                          )}
                        </div>

                        {/* Arrow */}
                        <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm mb-3">Don't see an army you like?</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-orange-400 hover:text-orange-300 font-bold transition-colors"
            >
              Create Your Own →
            </button>
          </div>

        </div>
      </div>

      <MobileBottomNav />

      <CreateArmyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
