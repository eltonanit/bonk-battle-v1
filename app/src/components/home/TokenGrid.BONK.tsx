// app/src/components/home/TokenGrid.BONK.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import type { ParsedTokenBattleState } from '@/types/bonk';
import { BattleStatus } from '@/types/bonk';
import { TokenCardBonk } from '@/components/shared/TokenCard.BONK';
import { BattleCard } from '@/components/shared/BattleCard';
import { usePriceOracle } from '@/hooks/usePriceOracle';

type FilterTab = 'battle' | 'new' | 'aboutToWin';

// Victory targets (devnet) - from smart contract
const VICTORY_MC_USD = 5500;    // $5,500 market cap
const VICTORY_VOLUME_USD = 100; // $100 volume

interface BattlePair {
  tokenA: ParsedTokenBattleState;
  tokenB: ParsedTokenBattleState;
}

export function TokenGridBonk() {
  const [allTokens, setAllTokens] = useState<ParsedTokenBattleState[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('battle');
  const [loading, setLoading] = useState(true);

  // ⭐ REAL SOL PRICE from on-chain oracle
  const { solPriceUsd, loading: priceLoading } = usePriceOracle();

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
    // Rimosso auto-refresh per evitare che le BattleCard spariscano
  }, []);

  // ⭐ Convert lamports to USD using real oracle price
  const lamportsToUsd = (lamports: number): number => {
    if (!solPriceUsd) return 0;
    const sol = lamports / 1e9; // lamports → SOL
    return sol * solPriceUsd;   // SOL → USD
  };

  // Group tokens into battle pairs
  const battlePairs = useMemo((): BattlePair[] => {
    const pairs: BattlePair[] = [];
    const processed = new Set<string>();

    // Find tokens that are InBattle
    const battlingTokens = allTokens.filter(t =>
      t.battleStatus === BattleStatus.InBattle
    );

    for (const token of battlingTokens) {
      const mintStr = token.mint.toString();
      if (processed.has(mintStr)) continue;

      // Find opponent
      const opponentMint = token.opponentMint?.toString();
      if (!opponentMint || opponentMint === '11111111111111111111111111111111') continue;

      const opponent = battlingTokens.find(t =>
        t.mint.toString() === opponentMint
      );

      if (opponent) {
        pairs.push({ tokenA: token, tokenB: opponent });
        processed.add(mintStr);
        processed.add(opponentMint);
      }
    }

    return pairs;
  }, [allTokens]);

  // Get tokens "About to Win" - InBattle with high progress
  const aboutToWinTokens = useMemo((): ParsedTokenBattleState[] => {
    if (!solPriceUsd) return [];

    return allTokens
      .filter(t => t.battleStatus === BattleStatus.InBattle)
      .map(token => {
        // ⭐ REAL conversion using oracle price
        const mcUsd = lamportsToUsd(token.solCollected);
        const volumeUsd = lamportsToUsd(token.totalTradeVolume);

        // Calculate progress toward victory
        const mcProgress = Math.min((mcUsd / VICTORY_MC_USD) * 100, 100);
        const volProgress = Math.min((volumeUsd / VICTORY_VOLUME_USD) * 100, 100);
        const avgProgress = (mcProgress + volProgress) / 2;

        return { token, avgProgress, mcProgress, volProgress };
      })
      .filter(({ avgProgress }) => avgProgress >= 50) // At least 50% progress
      .sort((a, b) => b.avgProgress - a.avgProgress)
      .map(({ token }) => token);
  }, [allTokens, solPriceUsd]);

  const getFilteredTokens = (): ParsedTokenBattleState[] => {
    if (activeFilter === 'battle') return [];
    if (activeFilter === 'aboutToWin') return aboutToWinTokens;

    // 'new' tab - sort by creation timestamp (newest first)
    return [...allTokens].sort((a, b) => b.creationTimestamp - a.creationTimestamp);
  };

  const filteredTokens = getFilteredTokens();

  // ⭐ Convert token state to BattleCard format with REAL USD values
  const toBattleToken = (token: ParsedTokenBattleState) => ({
    mint: token.mint.toString(),
    name: token.name || 'Unknown',
    symbol: token.symbol || '???',
    image: token.image || null, // ⭐ Use 'image' field (not imageUri)
    marketCapUsd: lamportsToUsd(token.solCollected),
    volumeUsd: lamportsToUsd(token.totalTradeVolume),
    solCollected: token.solCollected / 1e9 // Convert to SOL for display
  });

  // Count for display
  const getCount = () => {
    if (activeFilter === 'battle') return battlePairs.length;
    if (activeFilter === 'aboutToWin') return aboutToWinTokens.length;
    return filteredTokens.length;
  };

  const isLoading = loading || priceLoading;

  return (
    <div className="px-5 lg:px-6 pb-32">
      {/* Filter Tabs - Order: Battle | New Coins | About to Win */}
      <div className="flex gap-3 mb-6 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveFilter('battle')}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap ${activeFilter === 'battle'
              ? 'bg-bonk-orange text-white'
              : 'bg-bonk-card text-bonk-text hover:bg-bonk-border'
            }`}
        >
          ⚔️ Battle
        </button>

        <button
          onClick={() => setActiveFilter('new')}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap ${activeFilter === 'new'
              ? 'bg-bonk-blue-dark text-white'
              : 'bg-bonk-card text-bonk-text hover:bg-bonk-border'
            }`}
        >
          🆕 New Coins
        </button>

        <button
          onClick={() => setActiveFilter('aboutToWin')}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap ${activeFilter === 'aboutToWin'
              ? 'bg-bonk-gold text-black'
              : 'bg-bonk-card text-bonk-text hover:bg-bonk-border'
            }`}
        >
          🏆 About to Win
        </button>
      </div>

      {/* Count Display */}
      <div className="mb-4 text-sm text-bonk-text">
        {isLoading ? (
          'Loading tokens...'
        ) : activeFilter === 'battle' ? (
          `${battlePairs.length} active battle${battlePairs.length !== 1 ? 's' : ''}`
        ) : (
          `${getCount()} token${getCount() !== 1 ? 's' : ''} found`
        )}
      </div>

      {/* Content Based on Active Tab */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-bonk-card border border-bonk-border rounded-xl p-5 animate-pulse"
            >
              <div className="h-32 bg-bonk-dark rounded-lg mb-3"></div>
              <div className="h-4 bg-bonk-dark rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-bonk-dark rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : activeFilter === 'battle' ? (
        // BATTLE TAB - Show BattleCards
        battlePairs.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚔️</div>
            <div className="text-xl font-bold text-white mb-2">No Active Battles</div>
            <div className="text-bonk-text mb-6">
              Battles start when two qualified tokens are matched.
              <br />
              Buy at least $10 of a token to qualify it for battle!
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {battlePairs.map((pair, idx) => (
              <BattleCard
                key={`${pair.tokenA.mint}-${pair.tokenB.mint}-${idx}`}
                tokenA={toBattleToken(pair.tokenA)}
                tokenB={toBattleToken(pair.tokenB)}
                targetMC={VICTORY_MC_USD}
                targetVol={VICTORY_VOLUME_USD}
              />
            ))}
          </div>
        )
      ) : activeFilter === 'aboutToWin' ? (
        // ABOUT TO WIN TAB
        aboutToWinTokens.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏆</div>
            <div className="text-xl font-bold text-white mb-2">No Tokens Close to Victory</div>
            <div className="text-bonk-text mb-6">
              Tokens appear here when they're at least 50% toward victory conditions.
              <br />
              Keep trading to help your favorite token win!
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aboutToWinTokens.map((token) => (
              <TokenCardBonk
                key={token.mint.toString()}
                tokenState={token}
              />
            ))}
          </div>
        )
      ) : (
        // NEW COINS TAB
        filteredTokens.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎮</div>
            <div className="text-xl font-bold text-white mb-2">No tokens found</div>
            <div className="text-bonk-text mb-6">
              Be the first to create a BONK Battle token!
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-bonk-orange text-black font-bold rounded-lg hover:bg-bonk-orange-dark transition-all"
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
        )
      )}
    </div>
  );
}