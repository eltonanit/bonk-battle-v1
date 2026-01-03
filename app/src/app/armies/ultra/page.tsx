// app/src/app/armies/ultra/page.tsx
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useArmies, useMyArmies, Army } from '@/hooks/useArmies';
import { ArmyPreviewModal } from '@/components/armies/ArmyPreviewModal';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const formatMemberCount = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(2)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(2)}K`;
  return count.toString();
};

export default function UltraArmiesPage() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [previewArmy, setPreviewArmy] = useState<Army | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch ultra armies
  const { data: ultraArmies, isLoading, error, refetch } = useArmies('ultra');
  const { data: myArmies, refetch: refetchMyArmies } = useMyArmies(publicKey?.toString() || null);

  // Set di army IDs dove sono membro (per lookup veloce)
  const myArmyIds = new Set(myArmies?.map(a => a.id) || []);

  // Filter by search
  const filteredArmies = ultraArmies?.filter(army =>
    army.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Controlla se l'utente è membro o commander dell'armata
  const handleArmyClick = (army: Army, isMember: boolean) => {
    if (isMember) {
      router.push(`/armies/${army.id}`);
      return;
    }
    setPreviewArmy(army);
  };

  const handleJoinSuccess = () => {
    refetch();
    refetchMyArmies();
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

          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider" style={{
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                ⭐ ULTRA ARMIES
              </h1>
              <p className="text-gray-500 text-sm">Highest level elite armies</p>
            </div>
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
                placeholder="Search ultra armies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-yellow-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/60 transition-colors"
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

          {/* Count */}
          <div className="mb-4 text-sm" style={{ color: '#FFD700' }}>
            {filteredArmies?.length || 0} ultra armies
          </div>

          {/* GRID CONTAINER */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#0a0a0b' }}>

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                  <div key={i} className="aspect-square bg-yellow-500/10 animate-pulse" />
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
                <div className="text-5xl mb-4">⭐</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {searchQuery ? 'No armies found' : 'No Ultra Armies Yet'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery
                    ? `No ultra armies matching "${searchQuery}"`
                    : 'Level up your army to become ultra!'}
                </p>
              </div>
            )}

            {/* ⭐ ULTRA GRID - Instagram style */}
            {!isLoading && !error && filteredArmies && filteredArmies.length > 0 && (
              <div className="grid grid-cols-3 gap-1">
                {filteredArmies.map((army) => {
                  const isMember = myArmyIds.has(army.id);
                  return (
                    <div
                      key={army.id}
                      onClick={() => handleArmyClick(army, isMember)}
                      className="relative aspect-square cursor-pointer group"
                    >
                      {/* Image */}
                      {army.image_url ? (
                        <Image
                          src={army.image_url}
                          alt={army.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yellow-600/30 to-amber-600/30 flex items-center justify-center">
                          <span className="text-4xl">{army.icon || '⚔️'}</span>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                        <span className="text-white font-bold text-sm truncate px-2 text-center">{army.name}</span>
                        <span className="text-yellow-400 text-xs font-bold mt-1">Level {army.level || 1}</span>
                        <span className="text-gray-300 text-xs mt-0.5">{formatMemberCount(army.member_count)} members</span>
                      </div>

                      {/* Ultra Badge */}
                      <div className="absolute top-1 right-1 bg-yellow-500/90 rounded-full p-1">
                        <span className="text-xs">⭐</span>
                      </div>

                      {/* Member Badge */}
                      {isMember && (
                        <div className="absolute bottom-1 left-1 bg-green-500/90 rounded-full px-2 py-0.5">
                          <span className="text-[10px] text-white font-bold">JOINED</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Back to armies */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/armies')}
              className="text-yellow-400 hover:text-yellow-300 font-bold transition-colors"
            >
              ← Back to All Armies
            </button>
          </div>

        </div>
      </div>

      <MobileBottomNav />

      {/* Preview Modal */}
      <ArmyPreviewModal
        army={previewArmy}
        isOpen={!!previewArmy}
        onClose={() => setPreviewArmy(null)}
        onJoinSuccess={handleJoinSuccess}
      />
    </div>
  );
}
