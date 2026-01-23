'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

interface QualifiedToken {
  mint: string;
  symbol: string;
  name: string;
  image: string | null;
  sol_collected: number;
  created_at: string;
}

type TabType = 'battles' | 'qualified' | 'new';

// ============================================================================
// BATTLE LIST PAGE
// ============================================================================

function BattleListContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (tabParam === 'qualified') return 'qualified';
    if (tabParam === 'new') return 'new';
    return 'battles';
  });

  const [battles, setBattles] = useState<BattleData[]>([]);
  const [qualifiedTokens, setQualifiedTokens] = useState<QualifiedToken[]>([]);
  const [newTokens, setNewTokens] = useState<QualifiedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const { network } = useNetwork();

  // Update tab when URL changes
  useEffect(() => {
    if (tabParam === 'qualified') setActiveTab('qualified');
    else if (tabParam === 'new') setActiveTab('new');
    else setActiveTab('battles');
  }, [tabParam]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        if (activeTab === 'battles') {
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

          // Group tokens into battles
          const processedPairs = new Set<string>();
          const battlesList: BattleData[] = [];

          for (const token of tokens) {
            const pairKey = [token.mint, token.opponent_mint].sort().join('-');
            if (processedPairs.has(pairKey)) continue;
            processedPairs.add(pairKey);

            const opponent = tokens.find(t => t.mint === token.opponent_mint);
            if (!opponent) continue;

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
              tokenA: { mint: token.mint, symbol: token.symbol || 'TOKEN', image: token.image },
              tokenB: { mint: opponent.mint, symbol: opponent.symbol || 'TOKEN', image: opponent.image },
              status: 'active',
              startedAt,
            });
          }

          setBattles(battlesList);
        } else if (activeTab === 'qualified') {
          // Fetch qualified tokens (battle_status = 1)
          const { data: tokens, error } = await supabase
            .from('tokens')
            .select('mint, symbol, name, image, sol_collected, created_at')
            .eq('battle_status', 1)
            .eq('network', network)
            .order('sol_collected', { ascending: false });

          if (error) {
            console.error('Error fetching qualified tokens:', error);
            setQualifiedTokens([]);
            return;
          }

          setQualifiedTokens(tokens || []);
        } else if (activeTab === 'new') {
          // Fetch new tokens (battle_status = 0)
          const { data: tokens, error } = await supabase
            .from('tokens')
            .select('mint, symbol, name, image, sol_collected, created_at')
            .eq('battle_status', 0)
            .eq('network', network)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching new tokens:', error);
            setNewTokens([]);
            return;
          }

          setNewTokens(tokens || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [network, activeTab]);

  const handleRefresh = () => {
    setLoading(true);
    setBattles([]);
    setQualifiedTokens([]);
    setNewTokens([]);
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Update URL without reload
    const url = new URL(window.location.href);
    if (tab === 'battles') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.pushState({}, '', url.toString());
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
              <h1 className="text-2xl font-bold text-white">Battles</h1>
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

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-[#2a3544] pb-4">
            <button
              onClick={() => handleTabChange('battles')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'battles'
                  ? 'bg-red-500 text-white'
                  : 'bg-[#1a1f2e] text-gray-400 hover:text-white hover:bg-[#252a3a]'
              }`}
            >
              ⚔️ In Battle
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'battles' ? 'bg-red-600' : 'bg-[#2a3544]'
              }`}>
                {battles.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('qualified')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'qualified'
                  ? 'bg-purple-500 text-white'
                  : 'bg-[#1a1f2e] text-gray-400 hover:text-white hover:bg-[#252a3a]'
              }`}
            >
              ⭐ Qualified
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'qualified' ? 'bg-purple-600' : 'bg-[#2a3544]'
              }`}>
                {qualifiedTokens.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange('new')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                activeTab === 'new'
                  ? 'bg-green-500 text-white'
                  : 'bg-[#1a1f2e] text-gray-400 hover:text-white hover:bg-[#252a3a]'
              }`}
            >
              🆕 New
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'new' ? 'bg-green-600' : 'bg-[#2a3544]'
              }`}>
                {newTokens.length}
              </span>
            </button>
          </div>

          {/* Description */}
          <p className="text-gray-400 text-sm mb-6">
            {activeTab === 'battles' && 'Active battles. Click "Go to Battle Card" to view details.'}
            {activeTab === 'qualified' && 'Qualified tokens ready to enter a battle.'}
            {activeTab === 'new' && 'Newly created tokens not yet qualified.'}
          </p>

          {/* Content based on active tab */}
          <div className="space-y-4">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-700" />
                    <div className="w-24 h-6 bg-gray-700 rounded" />
                    <div className="flex-1" />
                    <div className="w-20 h-8 bg-gray-700 rounded" />
                  </div>
                </div>
              ))
            ) : activeTab === 'battles' ? (
              // BATTLES TAB
              battles.length === 0 ? (
                <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-12 text-center">
                  <span className="text-5xl mb-4 block">⚔️</span>
                  <h3 className="text-xl font-bold text-white mb-2">No Active Battles</h3>
                  <p className="text-gray-400 mb-4">There are no battles happening right now.</p>
                  <Link href="/" className="inline-block px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors">
                    Go Home
                  </Link>
                </div>
              ) : (
                battles.map((battle) => (
                  <div key={battle.id} className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-5 hover:border-red-500/30 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2 bg-[#252a3a] px-3 py-2 rounded-lg">
                          {battle.tokenA.image ? (
                            <Image src={battle.tokenA.image} alt={battle.tokenA.symbol} width={32} height={32} className="w-8 h-8 rounded-full" unoptimized />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold">{battle.tokenA.symbol.charAt(0)}</div>
                          )}
                          <span className="text-green-400 font-bold">${battle.tokenA.symbol}</span>
                        </div>
                        <span className="text-gray-500 font-bold text-sm px-2">vs</span>
                        <div className="flex items-center gap-2 bg-[#252a3a] px-3 py-2 rounded-lg">
                          {battle.tokenB.image ? (
                            <Image src={battle.tokenB.image} alt={battle.tokenB.symbol} width={32} height={32} className="w-8 h-8 rounded-full" unoptimized />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold">{battle.tokenB.symbol.charAt(0)}</div>
                          )}
                          <span className="text-blue-400 font-bold">${battle.tokenB.symbol}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">In Battle</span>
                        <span className="text-gray-400 text-sm whitespace-nowrap">Started: {battle.startedAt}</span>
                      </div>
                      <Link href={`/token/${battle.tokenA.mint}`} className="bg-bonk-gold hover:bg-bonk-gold/90 text-black font-bold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex items-center gap-2">
                        Go to Battle
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))
              )
            ) : activeTab === 'qualified' ? (
              // QUALIFIED TAB
              qualifiedTokens.length === 0 ? (
                <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-12 text-center">
                  <span className="text-5xl mb-4 block">⭐</span>
                  <h3 className="text-xl font-bold text-white mb-2">No Qualified Tokens</h3>
                  <p className="text-gray-400 mb-4">No tokens are currently qualified for battle.</p>
                </div>
              ) : (
                qualifiedTokens.map((token) => (
                  <div key={token.mint} className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-5 hover:border-purple-500/30 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        {token.image ? (
                          <Image src={token.image} alt={token.symbol} width={40} height={40} className="w-10 h-10 rounded-full" unoptimized />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">{token.symbol.charAt(0)}</div>
                        )}
                        <div>
                          <span className="text-white font-bold">${token.symbol}</span>
                          <p className="text-gray-500 text-sm">{token.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Qualified</span>
                        <span className="text-green-400 font-bold text-sm">{(token.sol_collected / 1e9).toFixed(4)} SOL</span>
                      </div>
                      <Link href={`/token/${token.mint}`} className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex items-center gap-2">
                        View Token
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))
              )
            ) : (
              // NEW TAB
              newTokens.length === 0 ? (
                <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-12 text-center">
                  <span className="text-5xl mb-4 block">🆕</span>
                  <h3 className="text-xl font-bold text-white mb-2">No New Tokens</h3>
                  <p className="text-gray-400 mb-4">All tokens have been qualified or are in battle.</p>
                </div>
              ) : (
                newTokens.map((token) => (
                  <div key={token.mint} className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-5 hover:border-green-500/30 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        {token.image ? (
                          <Image src={token.image} alt={token.symbol} width={40} height={40} className="w-10 h-10 rounded-full" unoptimized />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">{token.symbol.charAt(0)}</div>
                        )}
                        <div>
                          <span className="text-white font-bold">${token.symbol}</span>
                          <p className="text-gray-500 text-sm">{token.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">New</span>
                        <span className="text-gray-400 text-sm">{(token.sol_collected / 1e9).toFixed(4)} SOL</span>
                      </div>
                      <Link href={`/token/${token.mint}`} className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex items-center gap-2">
                        View Token
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          {/* Stats */}
          {activeTab === 'battles' && battles.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 text-center">
                <span className="text-gray-400 text-sm block mb-1">Active Battles</span>
                <span className="text-2xl font-bold text-red-400">{battles.length}</span>
              </div>
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 text-center">
                <span className="text-gray-400 text-sm block mb-1">Tokens Fighting</span>
                <span className="text-2xl font-bold text-white">{battles.length * 2}</span>
              </div>
            </div>
          )}
          {activeTab === 'qualified' && qualifiedTokens.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 text-center">
                <span className="text-gray-400 text-sm block mb-1">Qualified Tokens</span>
                <span className="text-2xl font-bold text-purple-400">{qualifiedTokens.length}</span>
              </div>
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 text-center">
                <span className="text-gray-400 text-sm block mb-1">Total SOL Collected</span>
                <span className="text-2xl font-bold text-green-400">
                  {(qualifiedTokens.reduce((sum, t) => sum + t.sol_collected, 0) / 1e9).toFixed(2)}
                </span>
              </div>
            </div>
          )}
          {activeTab === 'new' && newTokens.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 text-center">
                <span className="text-gray-400 text-sm block mb-1">New Tokens</span>
                <span className="text-2xl font-bold text-green-400">{newTokens.length}</span>
              </div>
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 text-center">
                <span className="text-gray-400 text-sm block mb-1">Total SOL Collected</span>
                <span className="text-2xl font-bold text-gray-400">
                  {(newTokens.reduce((sum, t) => sum + t.sol_collected, 0) / 1e9).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}

// Wrapper with Suspense for useSearchParams
export default function BattleListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bonk-dark flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    }>
      <BattleListContent />
    </Suspense>
  );
}
