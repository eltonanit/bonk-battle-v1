// app/src/components/home/TokenGrid.BONK.tsx
'use client';

import { useEffect, useState } from 'react';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import type { ParsedTokenBattleState } from '@/types/bonk';
import { BattleStatus } from '@/types/bonk';
import { TokenCardBonk } from '@/components/shared/TokenCard.BONK';

type FilterTab = 'new' | 'battle' | 'fire';

export function TokenGridBonk() {
  const [allTokens, setAllTokens] = useState<ParsedTokenBattleState[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('new');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTokens() {
      try {
        setLoading(true);
        console.log('📊 TokenGridBonk: Loading all BONK Battle tokens...');
        const tokens = await fetchAllBonkTokens();
        console.log(`✅ TokenGridBonk: Found ${tokens.length} BONK tokens`);
        setAllTokens(tokens);
      } catch (error) {
        console.error('❌ Error loading BONK tokens:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTokens();
    // ⚠️ DISABILITATO: Auto-refresh per evitare 429 rate limits
    // TODO: Riattivare quando si ha RPC dedicato
    // const interval = setInterval(loadTokens, 120000);
    // return () => clearInterval(interval);
  }, []);

  const getFilteredTokens = (): ParsedTokenBattleState[] => {
    let filtered = [...allTokens];

    switch (activeFilter) {
      case 'new':
        // Sort by creation timestamp (newest first)
        filtered.sort((a, b) => b.creationTimestamp - a.creationTimestamp);
        break;
      case 'battle':
        // Filter tokens in battle or qualified
        filtered = filtered.filter(t =>
          t.battleStatus === BattleStatus.Qualified ||
          t.battleStatus === BattleStatus.InBattle ||
          t.battleStatus === BattleStatus.VictoryPending
        );
        // Sort by SOL collected (more likely to win)
        filtered.sort((a, b) => b.solCollected - a.solCollected);
        break;
      case 'fire':
        // Filter tokens with trading activity
        filtered = filtered.filter(t => t.totalTradeVolume > 0);
        // Sort by trading volume
        filtered.sort((a, b) => b.totalTradeVolume - a.totalTradeVolume);
        break;
    }

    return filtered;
  };

  const filteredTokens = getFilteredTokens();

  return (
    <div className="px-5 lg:px-6 pb-32">
      {/* Filter Tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveFilter('new')}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${activeFilter === 'new'
            ? 'bg-blue-500 text-white'
            : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
        >
          📘 New
        </button>

        <button
          onClick={() => setActiveFilter('battle')}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${activeFilter === 'battle'
            ? 'bg-orange-500 text-white'
            : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
        >
          ⚔️ Battle
        </button>

        <button
          onClick={() => setActiveFilter('fire')}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${activeFilter === 'fire'
            ? 'bg-red-500 text-white'
            : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
        >
          🔥 Fire
        </button>
      </div>

      {/* Token Count */}
      <div className="mb-4 text-sm text-gray-400">
        {loading ? (
          'Loading tokens...'
        ) : (
          `${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''} found`
        )}
      </div>

      {/* Token Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse"
            >
              <div className="h-32 bg-white/5 rounded-lg mb-3"></div>
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-white/5 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredTokens.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎮</div>
          <div className="text-xl font-bold mb-2">No tokens found</div>
          <div className="text-gray-400 mb-6">
            {activeFilter === 'new' && 'Be the first to create a BONK Battle token!'}
            {activeFilter === 'battle' && 'No tokens in battle right now. Create one to start!'}
            {activeFilter === 'fire' && 'No trading activity yet. Be the first to trade!'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-bonk-orange text-black font-bold rounded-lg hover:bg-bonk-orange-light transition-all"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTokens.map((token) => (
            <TokenCardBonk
              key={token.mint.toString()}
              tokenState={token}
            />
          ))}
        </div>
      )}
    </div>
  );
}
