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

type TabType = 'myarmies' | 'onfire' | 'top' | 'leaderboard';

// Genera ticker automatico (prime 5 lettere, no spazi, uppercase)
const getTicker = (name: string) => {
  return name.replace(/\s/g, '').substring(0, 5).toUpperCase();
};

export default function ArmiesPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('myarmies');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewArmy, setPreviewArmy] = useState<Army | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Map tabs to API params - 'myarmies' doesn't need API call
  const apiTab = activeTab === 'myarmies' ? 'onfire' : activeTab;
  const { data: armies, isLoading, error, refetch } = useArmies(apiTab);
  const { data: myArmies, refetch: refetchMyArmies } = useMyArmies(publicKey?.toString() || null);

  // Set di army IDs dove sono membro (per lookup veloce)
  const myArmyIds = new Set(myArmies?.map(a => a.id) || []);

  // Filter armies by search query and tab
  const armiesToShow = activeTab === 'myarmies' ? myArmies : armies;
  const filteredArmies = armiesToShow?.filter(army =>
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
      {/* Matrix Dollar Animation Styles */}
      <style jsx>{`
        @keyframes fallDown {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
        .dollar-fall-1 {
          animation: fallDown 8s linear infinite;
        }
        .dollar-fall-2 {
          animation: fallDown 10s linear infinite 2s;
        }
        .dollar-fall-3 {
          animation: fallDown 12s linear infinite 4s;
        }
        .dollar-fall-4 {
          animation: fallDown 9s linear infinite 1s;
        }
        .dollar-fall-5 {
          animation: fallDown 11s linear infinite 3s;
        }
        .dollar-fall-6 {
          animation: fallDown 13s linear infinite 5s;
        }
        .dollar-fall-7 {
          animation: fallDown 10s linear infinite 6s;
        }
        .dollar-fall-8 {
          animation: fallDown 14s linear infinite 7s;
        }
        .dollar-fall-9 {
          animation: fallDown 9s linear infinite 0.5s;
        }
        .dollar-fall-10 {
          animation: fallDown 11s linear infinite 2.5s;
        }
        .dollar-fall-11 {
          animation: fallDown 13s linear infinite 4.5s;
        }
        .dollar-fall-12 {
          animation: fallDown 10s linear infinite 1.5s;
        }
        .dollar-fall-13 {
          animation: fallDown 12s linear infinite 3.5s;
        }
        .dollar-fall-14 {
          animation: fallDown 14s linear infinite 5.5s;
        }
        .dollar-fall-15 {
          animation: fallDown 11s linear infinite 6.5s;
        }
        .dollar-fall-16 {
          animation: fallDown 15s linear infinite 8s;
        }
        .sword-fall-1 {
          animation: fallDown 10s linear infinite 0.8s;
        }
        .sword-fall-2 {
          animation: fallDown 12s linear infinite 2.8s;
        }
        .sword-fall-3 {
          animation: fallDown 14s linear infinite 4.8s;
        }
        .sword-fall-4 {
          animation: fallDown 11s linear infinite 1.8s;
        }
        .sword-fall-5 {
          animation: fallDown 13s linear infinite 3.8s;
        }
        .sword-fall-6 {
          animation: fallDown 15s linear infinite 5.8s;
        }
        .sword-fall-7 {
          animation: fallDown 12s linear infinite 6.8s;
        }
        .sword-fall-8 {
          animation: fallDown 16s linear infinite 8.5s;
        }
        .logo-fall-1 {
          animation: fallDown 13s linear infinite 1.2s;
        }
        .logo-fall-2 {
          animation: fallDown 15s linear infinite 3.5s;
        }
        .logo-fall-3 {
          animation: fallDown 14s linear infinite 6s;
        }
        .logo-fall-4 {
          animation: fallDown 16s linear infinite 8.2s;
        }
      `}</style>

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

          {/* ⚔️ HERO SECTION */}
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-green-500/30" style={{ backgroundColor: '#0a0f0a' }}>
            {/* Matrix Dollar Signs & Swords Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {/* Dollari */}
              <span className="absolute text-green-500/30 text-4xl font-bold dollar-fall-1" style={{ left: '5%' }}>$</span>
              <span className="absolute text-green-400/25 text-5xl font-bold dollar-fall-2" style={{ left: '15%' }}>$</span>
              <span className="absolute text-green-500/35 text-3xl font-bold dollar-fall-3" style={{ left: '25%' }}>$</span>
              <span className="absolute text-green-400/20 text-6xl font-bold dollar-fall-4" style={{ left: '40%' }}>$</span>
              <span className="absolute text-green-500/30 text-4xl font-bold dollar-fall-5" style={{ left: '55%' }}>$</span>
              <span className="absolute text-green-400/25 text-3xl font-bold dollar-fall-6" style={{ left: '70%' }}>$</span>
              <span className="absolute text-green-500/20 text-5xl font-bold dollar-fall-7" style={{ left: '80%' }}>$</span>
              <span className="absolute text-green-400/30 text-4xl font-bold dollar-fall-8" style={{ left: '90%' }}>$</span>
              <span className="absolute text-green-500/25 text-5xl font-bold dollar-fall-9" style={{ left: '10%' }}>$</span>
              <span className="absolute text-green-400/30 text-3xl font-bold dollar-fall-10" style={{ left: '20%' }}>$</span>
              <span className="absolute text-green-500/20 text-4xl font-bold dollar-fall-11" style={{ left: '35%' }}>$</span>
              <span className="absolute text-green-400/25 text-6xl font-bold dollar-fall-12" style={{ left: '45%' }}>$</span>
              <span className="absolute text-green-500/30 text-5xl font-bold dollar-fall-13" style={{ left: '60%' }}>$</span>
              <span className="absolute text-green-400/20 text-4xl font-bold dollar-fall-14" style={{ left: '75%' }}>$</span>
              <span className="absolute text-green-500/25 text-3xl font-bold dollar-fall-15" style={{ left: '85%' }}>$</span>
              <span className="absolute text-green-400/35 text-5xl font-bold dollar-fall-16" style={{ left: '95%' }}>$</span>

              {/* Spade Incrociate */}
              <span className="absolute text-yellow-500/25 text-3xl sword-fall-1" style={{ left: '8%' }}>⚔️</span>
              <span className="absolute text-yellow-400/30 text-4xl sword-fall-2" style={{ left: '18%' }}>⚔️</span>
              <span className="absolute text-yellow-500/20 text-3xl sword-fall-3" style={{ left: '32%' }}>⚔️</span>
              <span className="absolute text-yellow-400/25 text-5xl sword-fall-4" style={{ left: '48%' }}>⚔️</span>
              <span className="absolute text-yellow-500/30 text-4xl sword-fall-5" style={{ left: '62%' }}>⚔️</span>
              <span className="absolute text-yellow-400/20 text-3xl sword-fall-6" style={{ left: '78%' }}>⚔️</span>
              <span className="absolute text-yellow-500/25 text-4xl sword-fall-7" style={{ left: '88%' }}>⚔️</span>
              <span className="absolute text-yellow-400/35 text-3xl sword-fall-8" style={{ left: '92%' }}>⚔️</span>

              {/* BONK Logos */}
              <div className="absolute logo-fall-1 opacity-20" style={{ left: '12%', width: '40px', height: '40px' }}>
                <Image src="/BONK-LOGO.svg" alt="" width={40} height={40} className="w-full h-full" />
              </div>
              <div className="absolute logo-fall-2 opacity-25" style={{ left: '38%', width: '50px', height: '50px' }}>
                <Image src="/BONK-LOGO.svg" alt="" width={50} height={50} className="w-full h-full" />
              </div>
              <div className="absolute logo-fall-3 opacity-15" style={{ left: '65%', width: '45px', height: '45px' }}>
                <Image src="/BONK-LOGO.svg" alt="" width={45} height={45} className="w-full h-full" />
              </div>
              <div className="absolute logo-fall-4 opacity-30" style={{ left: '82%', width: '35px', height: '35px' }}>
                <Image src="/BONK-LOGO.svg" alt="" width={35} height={35} className="w-full h-full" />
              </div>
            </div>

            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 via-transparent to-green-900/20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent" />

            <div className="relative px-6 py-6 text-center z-10">
              <h1 className="text-lg md:text-xl font-bold text-gray-200">
                Join Army. Get notified. <span className="text-green-400 font-bold">Get paid.</span>
              </h1>
            </div>
          </div>

          {/* BUTTONS ROW: CREATE YOUR ARMY + ULTRA ARMIES */}
          <div className="flex gap-3 mb-6">
            {/* CREATE YOUR ARMY Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-wide rounded-xl transition-all hover:scale-105"
            >
              🏴 Create Your Army
            </button>

            {/* ULTRA ARMIES Button */}
            <button
              onClick={() => router.push('/armies/ultra')}
              className="flex-1 py-3 px-6 rounded-xl border border-yellow-500/30 hover:border-yellow-500/60 transition-all hover:scale-[1.02] active:scale-[0.98] group"
              style={{ backgroundColor: '#151516' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <div className="text-left">
                    <h2 className="text-sm font-black uppercase tracking-wider" style={{
                      background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      ULTRA ARMIES
                    </h2>
                    <p className="text-gray-500 text-xs">Highest level elite armies</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-yellow-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>

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

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('myarmies')}
              className={`flex-1 py-3 px-4 font-bold uppercase text-sm tracking-wide rounded-xl transition-all whitespace-nowrap ${activeTab === 'myarmies'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                : 'text-gray-400 hover:text-white border border-white/10'
                }`}
              style={{ backgroundColor: activeTab !== 'myarmies' ? '#151516' : undefined }}
            >
              🛡️ Your Armies
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
              🏆 Leaderboard
            </button>
          </div>

          {/* Tab Description */}
          <div className="mb-4 text-gray-500 text-sm">
            {activeTab === 'myarmies' && '🛡️ Armies you have joined'}
            {activeTab === 'onfire' && '🔥 Fastest growing armies (most new recruits)'}
            {activeTab === 'top' && '👑 Largest armies by total members'}
            {activeTab === 'leaderboard' && '🏆 Armies with most battle wins'}
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
                <div className="text-5xl mb-4">{searchQuery ? '🔍' : activeTab === 'myarmies' ? '🛡️' : '⚔️'}</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {searchQuery ? 'No armies found' : activeTab === 'myarmies' ? 'No Armies Joined' : 'No Armies Yet'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery
                    ? `No armies matching "${searchQuery}"`
                    : activeTab === 'myarmies'
                      ? 'Join an army to start trading together!'
                      : 'Be the first commander to create an army!'}
                </p>
                {!searchQuery && activeTab === 'myarmies' && (
                  <button
                    onClick={() => setActiveTab('onfire')}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl"
                  >
                    🔥 Find Army to Join
                  </button>
                )}
                {!searchQuery && activeTab !== 'myarmies' && (
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