// app/src/app/armies/page.tsx
'use client';

import { useState } from 'react';
import { useArmies } from '@/hooks/useArmies';
import { ArmyCard } from '@/components/armies/ArmyCard';
import { CreateArmyModal } from '@/components/armies/CreateArmyModal';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';

type TabType = 'top' | 'onfire';

export default function ArmiesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('top');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: armies, isLoading, error } = useArmies(activeTab);

  return (
    <div className="min-h-screen bg-bonk-dark text-white overflow-x-hidden">
      {/* ⭐ Tickers SOPRA Header - SOLO mobile/tablet (< lg) */}
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
        {/* Container */}
        <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <span>🏛️</span>
              <span>Join Army</span>
            </h1>

            {/* Create Army Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
            >
              + Create Army
            </button>
          </div>

          <p className="text-gray-400 text-lg">
            Unite con altre leggende e dominate l'arena insieme!
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="inline-flex rounded-lg bg-gray-800 p-1">
            {/* Tab TOP */}
            <button
              onClick={() => setActiveTab('top')}
              className={`
                px-6 py-3 rounded-md font-bold transition-all duration-200
                ${activeTab === 'top'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span>👑</span>
                <span>TOP</span>
              </div>
            </button>

            {/* Tab ON FIRE */}
            <button
              onClick={() => setActiveTab('onfire')}
              className={`
                px-6 py-3 rounded-md font-bold transition-all duration-200
                ${activeTab === 'onfire'
                  ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50'
                  : 'text-gray-400 hover:text-white'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span>🔥</span>
                <span>ON FIRE</span>
              </div>
            </button>
          </div>

          {/* Tab Description */}
          <div className="mt-4 text-sm text-gray-400">
            {activeTab === 'top' && (
              <p>📊 Le army più grandi e potenti, ordinate per numero di membri</p>
            )}
            {activeTab === 'onfire' && (
              <p>🔥 Le army in forte crescita con almeno 10 nuovi membri!</p>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
              <p className="text-gray-400">Loading armies...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
            <span className="text-4xl mb-2 block">⚠️</span>
            <h3 className="text-red-400 font-bold text-lg mb-2">Error Loading Armies</h3>
            <p className="text-gray-400">{error.message}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && armies && armies.length === 0 && (
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">
              {activeTab === 'top' ? '🏛️' : '🔥'}
            </span>
            <h3 className="text-2xl font-bold text-gray-400 mb-2">
              {activeTab === 'top' ? 'No Armies Yet' : 'No Armies ON FIRE'}
            </h3>
            <p className="text-gray-500 mb-6">
              {activeTab === 'top'
                ? 'Be the first to create an army!'
                : 'No armies have gained 10+ members recently'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
            >
              Create First Army
            </button>
          </div>
        )}

        {/* Armies Grid */}
        {!isLoading && !error && armies && armies.length > 0 && (
          <>
            {/* Stats */}
            <div className="mb-6 flex items-center gap-4 text-sm">
              <div className="text-gray-400">
                Found <span className="text-white font-bold">{armies.length}</span> {armies.length === 1 ? 'army' : 'armies'}
              </div>

              {activeTab === 'onfire' && (
                <div className="flex items-center gap-2 text-yellow-400">
                  <span>⚡</span>
                  <span className="font-bold">
                    {armies.reduce((sum, army) => sum + (army.member_count - army.member_count_checkpoint), 0)} new members total!
                  </span>
                </div>
              )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {armies.map((army) => {
                const isOnFire = activeTab === 'onfire';
                return (
                  <ArmyCard
                    key={army.id}
                    army={army}
                    isOnFire={isOnFire}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Info Box (sotto la grid) */}
        {!isLoading && armies && armies.length > 0 && (
          <div className="mt-12 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span>💡</span>
              <span>Come funziona?</span>
            </h3>
            <div className="text-gray-400 text-sm space-y-2">
              <p>
                <strong className="text-white">1. Join Army:</strong> Entra in un'army per ricevere ordini dal Re-Capitano
              </p>
              <p>
                <strong className="text-white">2. Follow Orders:</strong> Il capitano ti dice su quale token investire
              </p>
              <p>
                <strong className="text-white">3. Attack Together:</strong> Coordinate con l'army per dominare le battaglie
              </p>
              <p>
                <strong className="text-orange-500">🔥 ON FIRE:</strong> Le army che crescono velocemente (+10 membri) ottengono il badge ON FIRE!
              </p>
            </div>
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
