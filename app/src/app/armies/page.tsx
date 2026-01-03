// app/src/app/armies/page.tsx
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useArmies, useMyArmies, Army } from '@/hooks/useArmies';
import { CreateArmyModal } from '@/components/armies/CreateArmyModal';
import { ArmyPreviewModal } from '@/components/armies/ArmyPreviewModal';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type TabType = 'top' | 'onfire' | 'leaderboard' | 'ultra';

// Genera ticker automatico (prime 5 lettere, no spazi, uppercase)
const getTicker = (name: string) => {
  return name.replace(/\s/g, '').substring(0, 5).toUpperCase();
};

export default function ArmiesPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('onfire');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewArmy, setPreviewArmy] = useState<Army | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: armies, isLoading, error, refetch } = useArmies(activeTab);
  const { data: myArmies, refetch: refetchMyArmies } = useMyArmies(publicKey?.toString() || null);

  // Set di army IDs dove sono membro (per lookup veloce)
  const myArmyIds = new Set(myArmies?.map(a => a.id) || []);

  // Filter armies by search query
  const filteredArmies = armies?.filter(army =>
    army.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getTicker(army.name).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMemberCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(2)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(2)}K`;
    return count.toString();
  };

  // Controlla se l'utente è membro o commander dell'armata
  const handleArmyClick = (army: Army, isMember: boolean) => {
    // Se è membro o commander, vai direttamente alla pagina
    if (isMember) {
      router.push(`/armies/${army.id}`);
      return;
    }

    // Altrimenti mostra preview modal per JOIN
    setPreviewArmy(army);
  };

  const handleJoinSuccess = () => {
    refetch();
    refetchMyArmies();
    // Chiudi modal e vai alla pagina dell'armata
    if (previewArmy) {
      router.push(`/armies/${previewArmy.id}`);
    }
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
                placeholder="Search armies by name or ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors"
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
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-green-500/30" style={{ backgroundColor: '#151516' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 via-emerald-600/5 to-green-600/10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-500/20 via-transparent to-transparent" />

            <div className="relative px-6 py-10 text-center">
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-2" style={{
                background: 'linear-gradient(135deg, #22C55E 0%, #4ADE80 50%, #22C55E 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                ⚔️ JOIN AN ARMY
              </h1>
              <p className="text-gray-400 text-sm mb-5">
                Follow the winners. <span className="text-green-400 font-bold">Take the profits.</span>
              </p>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold uppercase tracking-wide rounded-xl transition-all hover:scale-105 shadow-lg shadow-green-500/30"
              >
                🏴 Create Your Army
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('ultra')}
              className={`flex-1 py-3 px-4 font-bold uppercase text-sm tracking-wide rounded-xl transition-all whitespace-nowrap ${activeTab === 'ultra'
                ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-black'
                : 'border border-white/10'
                }`}
              style={{
                backgroundColor: activeTab !== 'ultra' ? '#151516' : undefined,
                color: activeTab !== 'ultra' ? '#FFD700' : undefined,
              }}
            >
              ⭐ Ultra
            </button>
            <button
              onClick={() => setActiveTab('onfire')}
              className={`flex-1 py-3 px-4 font-bold uppercase text-sm tracking-wide rounded-xl transition-all whitespace-nowrap ${activeTab === 'onfire'
                ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black'
                : 'text-gray-400 hover:text-white border border-white/10'
                }`}
              style={{ backgroundColor: activeTab !== 'onfire' ? '#151516' : undefined }}
            >
              🔥 On Fire
            </button>
            <button
              onClick={() => setActiveTab('top')}
              className={`flex-1 py-3 px-4 font-bold uppercase text-sm tracking-wide rounded-xl transition-all whitespace-nowrap ${activeTab === 'top'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'text-gray-400 hover:text-white border border-white/10'
                }`}
              style={{ backgroundColor: activeTab !== 'top' ? '#151516' : undefined }}
            >
              👑 Top
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 py-3 px-4 font-bold uppercase text-sm tracking-wide rounded-xl transition-all whitespace-nowrap ${activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black'
                : 'text-gray-400 hover:text-white border border-white/10'
                }`}
              style={{ backgroundColor: activeTab !== 'leaderboard' ? '#151516' : undefined }}
            >
              🏆 Winners
            </button>
          </div>

          {/* Tab Description */}
          <div className="mb-4 text-gray-500 text-sm">
            {activeTab === 'onfire' && '🔥 Fastest growing armies (most new recruits)'}
            {activeTab === 'top' && '👑 Largest armies by total members'}
            {activeTab === 'leaderboard' && '🏆 Armies with most battle wins'}
            {activeTab === 'ultra' && <span style={{ color: '#FFD700' }}>⭐ Highest level elite armies</span>}
          </div>

          {/* LIST CONTAINER */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#0a0a0b' }}>

            {/* Loading State */}
            {isLoading && (
              <div className="divide-y divide-white/5">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-white/10" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                      <div className="h-3 w-20 bg-white/5 rounded" />
                    </div>
                    <div className="h-8 w-16 bg-white/10 rounded-full" />
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
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl"
                  >
                    🏴 Create First Army
                  </button>
                )}
              </div>
            )}

            {/* ⚔️ ARMY LIST */}
            {!isLoading && !error && filteredArmies && filteredArmies.length > 0 && (
              <div className="divide-y divide-white/5">
                {filteredArmies.map((army) => {
                  const ticker = army.ticker || getTicker(army.name);
                  const isCommander = publicKey?.toString() === army.capitano_wallet;
                  const isMember = myArmyIds.has(army.id);

                  return (
                    <div
                      key={army.id}
                      onClick={() => handleArmyClick(army, isMember)}
                      className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors cursor-pointer"
                    >

                      {/* Army Avatar - Rotondo */}
                      <div className="relative flex-shrink-0">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xl">
                          {army.image_url ? (
                            <Image
                              src={army.image_url}
                              alt={army.name}
                              width={44}
                              height={44}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{army.icon || '⚔️'}</span>
                          )}
                        </div>
                        {/* Commander badge */}
                        {isCommander && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px]">
                            👑
                          </div>
                        )}
                      </div>

                      {/* Army Info - Nome + Ticker + Members */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white truncate">{army.name}</h3>
                          <span className="text-gray-500 text-sm">{ticker}</span>
                        </div>
                        <p className="text-gray-500 text-sm flex items-center gap-1">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          {formatMemberCount(army.member_count)} members
                        </p>
                      </div>

                      {/* BUTTON: ENTER se membro, JOIN se no */}
                      {isMember ? (
                        <div className="flex-shrink-0 px-4 py-2 bg-green-500/20 text-green-400 font-bold text-sm rounded-full border border-green-500/30">
                          ENTER
                        </div>
                      ) : (
                        <div className="flex-shrink-0 px-5 py-2 bg-green-500 text-black font-bold text-sm rounded-full">
                          JOIN
                        </div>
                      )}
                    </div>
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
              className="text-green-400 hover:text-green-300 font-bold transition-colors"
            >
              Create Your Own →
            </button>
          </div>

        </div>
      </div>

      <MobileBottomNav />

      {/* Modals */}
      <CreateArmyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <ArmyPreviewModal
        army={previewArmy}
        isOpen={!!previewArmy}
        onClose={() => setPreviewArmy(null)}
        onJoinSuccess={handleJoinSuccess}
      />
    </div>
  );
}