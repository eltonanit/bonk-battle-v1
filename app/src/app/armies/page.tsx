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
  // Default tab è 'onfire' (pagina principale dinamica)
  const [activeTab, setActiveTab] = useState<TabType>('onfire');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: armies, isLoading, error } = useArmies(activeTab);

  // Formatta il conteggio membri (es: 16.29K)
  const formatMemberCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(2)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(2)}K`;
    return count.toString();
  };

  return (
    <div className="min-h-screen bg-bonk-dark text-white overflow-x-hidden">
      {/* Tickers SOPRA Header - SOLO mobile/tablet (< lg) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
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
        {/* Container - più stretto per lista */}
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-white">🏛️ Armies</h1>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-all text-sm"
              >
                + Create
              </button>
            </div>
            <p className="text-gray-400 text-sm">
              Create your community. Build your army. Join the battle.
            </p>
          </div>

          {/* Tabs - ON FIRE | TOP | LEADERBOARD */}
          <div className="flex gap-0 mb-6 border-b border-white/10">
            <button
              onClick={() => setActiveTab('onfire')}
              className={`flex-1 py-3 px-2 font-semibold text-center transition-colors border-b-2 text-sm ${activeTab === 'onfire'
                  ? 'text-orange-500 border-orange-500'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
            >
              🔥 On Fire
            </button>
            <button
              onClick={() => setActiveTab('top')}
              className={`flex-1 py-3 px-2 font-semibold text-center transition-colors border-b-2 text-sm ${activeTab === 'top'
                  ? 'text-orange-500 border-orange-500'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
            >
              👑 Top
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 py-3 px-2 font-semibold text-center transition-colors border-b-2 text-sm ${activeTab === 'leaderboard'
                  ? 'text-orange-500 border-orange-500'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
            >
              🏆 Leaderboard
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-white/10" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                    <div className="h-3 w-24 bg-white/5 rounded" />
                  </div>
                  <div className="h-9 w-20 bg-white/10 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
              <span className="text-2xl mb-2 block">⚠️</span>
              <p className="text-red-400">{error.message}</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && armies && armies.length === 0 && (
            <div className="text-center py-16">
              <span className="text-5xl mb-4 block">
                {activeTab === 'onfire' ? '🔥' : activeTab === 'leaderboard' ? '🏆' : '🏛️'}
              </span>
              <h3 className="text-xl font-bold text-gray-400 mb-2">
                {activeTab === 'onfire'
                  ? 'No Armies On Fire'
                  : activeTab === 'leaderboard'
                  ? 'No Battle Records Yet'
                  : 'No Armies Yet'}
              </h3>
              <p className="text-gray-500 mb-6 text-sm">
                {activeTab === 'onfire'
                  ? 'No armies have gained 10+ members recently'
                  : activeTab === 'leaderboard'
                  ? 'Win battles to climb the leaderboard!'
                  : 'Be the first to create an army!'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
              >
                Create First Army
              </button>
            </div>
          )}

          {/* ⭐ LISTA ARMIES (stile BAGS) */}
          {!isLoading && !error && armies && armies.length > 0 && (
            <div className="space-y-2">
              {armies.map((army, index) => {
                const isOnFire = activeTab === 'onfire';
                const isLeaderboard = activeTab === 'leaderboard';
                const newMembers = army.member_count - army.member_count_checkpoint;
                const wins = army.battles_won ?? 0;
                const losses = army.battles_lost ?? 0;

                return (
                  <div
                    key={army.id}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-colors border ${
                      isOnFire
                        ? 'bg-yellow-500/5 border-yellow-500/30 hover:bg-yellow-500/10'
                        : isLeaderboard && index < 3
                        ? 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                  >
                    {/* Rank Badge for Leaderboard */}
                    {isLeaderboard && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-300 text-black' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-white/10 text-gray-400'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </div>
                    )}

                    {/* Avatar */}
                    <Link href={`/armies/${army.id}`} className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-2xl">
                        {army.image_url ? (
                          <Image
                            src={army.image_url}
                            alt={army.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{army.icon}</span>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <Link href={`/armies/${army.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white truncate">{army.name}</h3>
                        {isOnFire && (
                          <span className="text-yellow-400 text-xs">🔥</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        {isLeaderboard ? (
                          <>
                            <span className="text-green-400 font-bold">{wins}W</span>
                            <span className="text-gray-500">-</span>
                            <span className="text-red-400 font-bold">{losses}L</span>
                            <span className="text-gray-500 text-xs">• {formatMemberCount(army.member_count)} members</span>
                          </>
                        ) : (
                          <>
                            <span>👥 {formatMemberCount(army.member_count)} members</span>
                            {isOnFire && newMembers > 0 && (
                              <span className="text-yellow-400 text-xs font-bold">
                                +{newMembers} new
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </Link>

                    {/* Join Button */}
                    <Link href={`/armies/${army.id}`}>
                      <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition-all whitespace-nowrap">
                        {isLeaderboard ? 'VIEW' : 'JOIN'}
                      </button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      <MobileBottomNav />

      {/* Create Army Modal */}
      <CreateArmyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}