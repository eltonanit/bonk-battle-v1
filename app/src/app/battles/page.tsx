'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { NowMomentTicker } from '@/components/global/NowMomentTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { supabase } from '@/lib/supabase';
import { useNetwork } from '@/providers/NetworkProvider';
import Image from 'next/image';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

interface BattleData {
  id: string;
  tokenA: {
    mint: string;
    symbol: string;
    image: string | null;
  };
  tokenB: {
    mint: string;
    symbol: string;
    image: string | null;
  };
  status: 'active' | 'ended';
  startedAt: string;
}

// ============================================================================
// BATTLE LIST PAGE
// ============================================================================

export default function BattleListPage() {
  const [battles, setBattles] = useState<BattleData[]>([]);
  const [loading, setLoading] = useState(true);
  const { network } = useNetwork();

  useEffect(() => {
    async function fetchBattles() {
      try {
        setLoading(true);

        // Fetch tokens in battle (battle_status = 2)
        const { data: tokens, error } = await supabase
          .from('tokens')
          .select('mint, symbol, image, opponent_mint, battle_status, battle_start_timestamp, network')
          .eq('battle_status', 2)
          .eq('network', network)
          .not('opponent_mint', 'is', null);

        if (error) {
          console.error('Error fetching battles:', error);
          setBattles([]);
          return;
        }

        if (!tokens || tokens.length === 0) {
          setBattles([]);
          return;
        }

        // Group tokens into battles (each battle has 2 tokens)
        const processedPairs = new Set<string>();
        const battlesList: BattleData[] = [];

        for (const token of tokens) {
          // Create a unique key for this pair
          const pairKey = [token.mint, token.opponent_mint].sort().join('-');

          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          // Find opponent
          const opponent = tokens.find(t => t.mint === token.opponent_mint);

          if (!opponent) continue;

          // Format start date
          let startedAt = 'Unknown';
          if (token.battle_start_timestamp) {
            const date = new Date(token.battle_start_timestamp);
            startedAt = date.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
          }

          battlesList.push({
            id: pairKey,
            tokenA: {
              mint: token.mint,
              symbol: token.symbol || 'TOKEN',
              image: token.image,
            },
            tokenB: {
              mint: opponent.mint,
              symbol: opponent.symbol || 'TOKEN',
              image: opponent.image,
            },
            status: 'active',
            startedAt,
          });
        }

        setBattles(battlesList);
      } catch (error) {
        console.error('Error fetching battles:', error);
        setBattles([]);
      } finally {
        setLoading(false);
      }
    }

    fetchBattles();
  }, [network]);

  const handleRefresh = () => {
    setLoading(true);
    // Re-trigger useEffect
    setBattles([]);
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      {/* Mobile Tickers */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
        <div className="flex flex-col gap-1 px-2">
          <div className="flex items-center gap-2 justify-center xs:justify-start">
            <FOMOTicker />
            <NowMomentTicker />
          </div>
          <div className="hidden sm:flex justify-center xs:justify-start">
            <CreatedTicker />
          </div>
        </div>
      </div>

      <DesktopHeader />
      <Header />
      <Sidebar />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16">
        <div className="max-w-[1000px] mx-auto px-5 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">&#9876;</span>
              <h1 className="text-2xl font-bold text-white">Battle Links</h1>
              <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {battles.length}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1f2e] hover:bg-[#252a3a] border border-[#2a3544] rounded-lg text-white text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Description */}
          <p className="text-gray-400 text-sm mb-6">
            All active battles. Click &quot;Go to Battle Card&quot; to view the battle details.
          </p>

          {/* Battle List */}
          <div className="space-y-4">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700" />
                      <div className="w-16 h-6 bg-gray-700 rounded" />
                    </div>
                    <div className="w-8 h-6 bg-gray-700 rounded" />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700" />
                      <div className="w-16 h-6 bg-gray-700 rounded" />
                    </div>
                  </div>
                </div>
              ))
            ) : battles.length === 0 ? (
              // Empty state
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-12 text-center">
                <span className="text-5xl mb-4 block">&#9876;</span>
                <h3 className="text-xl font-bold text-white mb-2">No Active Battles</h3>
                <p className="text-gray-400 mb-4">There are no battles happening right now.</p>
                <Link
                  href="/"
                  className="inline-block px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors"
                >
                  Go Home
                </Link>
              </div>
            ) : (
              // Battle rows
              battles.map((battle) => (
                <div
                  key={battle.id}
                  className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-5 hover:border-green-500/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Token A vs Token B */}
                    <div className="flex items-center gap-3 flex-1">
                      {/* Token A */}
                      <div className="flex items-center gap-2 bg-[#252a3a] px-3 py-2 rounded-lg">
                        {battle.tokenA.image ? (
                          <Image
                            src={battle.tokenA.image}
                            alt={battle.tokenA.symbol}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full"
                            unoptimized
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold">
                            {battle.tokenA.symbol.charAt(0)}
                          </div>
                        )}
                        <span className="text-green-400 font-bold">${battle.tokenA.symbol}</span>
                      </div>

                      {/* VS */}
                      <span className="text-gray-500 font-bold text-sm px-2">vs</span>

                      {/* Token B */}
                      <div className="flex items-center gap-2 bg-[#252a3a] px-3 py-2 rounded-lg">
                        {battle.tokenB.image ? (
                          <Image
                            src={battle.tokenB.image}
                            alt={battle.tokenB.symbol}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full"
                            unoptimized
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold">
                            {battle.tokenB.symbol.charAt(0)}
                          </div>
                        )}
                        <span className="text-blue-400 font-bold">${battle.tokenB.symbol}</span>
                      </div>
                    </div>

                    {/* Status & Date */}
                    <div className="flex items-center gap-4">
                      {/* Active Badge */}
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
                        Active
                      </span>

                      {/* Started Date */}
                      <span className="text-gray-400 text-sm whitespace-nowrap">
                        Started: {battle.startedAt}
                      </span>
                    </div>

                    {/* Go to Battle Card Button */}
                    <Link
                      href={`/token/${battle.tokenA.mint}`}
                      className="bg-bonk-gold hover:bg-bonk-gold/90 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex items-center gap-2"
                    >
                      Go to Battle Card
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Stats */}
          {battles.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 text-center">
                <span className="text-gray-400 text-sm block mb-1">Active Battles</span>
                <span className="text-2xl font-bold text-green-400">{battles.length}</span>
              </div>
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 text-center">
                <span className="text-gray-400 text-sm block mb-1">Total Tokens Fighting</span>
                <span className="text-2xl font-bold text-white">{battles.length * 2}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
