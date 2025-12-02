// app/src/components/home/TokenGrid.BONK.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import type { ParsedTokenBattleState } from '@/types/bonk';
import { BattleStatus } from '@/types/bonk';
import { TokenCardBonk } from '@/components/shared/TokenCard.BONK';
import { BattleCard } from '@/components/shared/BattleCard';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { supabase } from '@/lib/supabase';

type FilterTab = 'battle' | 'new' | 'aboutToWin' | 'winners';

// Victory targets (devnet) - from smart contract
const VICTORY_MC_USD = 5500;    // $5,500 market cap
const VICTORY_VOLUME_USD = 100; // $100 volume

interface Winner {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  loser_mint: string | null;
  loser_name: string | null;
  loser_symbol: string | null;
  loser_image: string | null;
  final_mc_usd: number;
  final_volume_usd: number;
  spoils_sol: number;
  pool_id: string | null;
  raydium_url: string | null;
  victory_timestamp: string;
  status: string;
}

interface BattlePair {
  tokenA: ParsedTokenBattleState;
  tokenB: ParsedTokenBattleState;
}

export function TokenGridBonk() {
  const [allTokens, setAllTokens] = useState<ParsedTokenBattleState[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('battle');
  const [loading, setLoading] = useState(true);
  const [winners, setWinners] = useState<Winner[]>([]);

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

        // Fetch winners from Supabase
        const { data: winnersData, error: winnersError } = await supabase
          .from('winners')
          .select('*')
          .order('victory_timestamp', { ascending: false })
          .limit(50);

        if (winnersError) {
          console.error('❌ Error fetching winners:', winnersError);
        } else {
          console.log(`✅ Found ${winnersData?.length || 0} winners`);
          setWinners(winnersData || []);
        }
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

  // Group tokens into battle pairs (including completed battles)
  const battlePairs = useMemo((): (BattlePair & { winner?: 'A' | 'B' | null })[] => {
    const pairs: (BattlePair & { winner?: 'A' | 'B' | null })[] = [];
    const processed = new Set<string>();

    // Find tokens that are InBattle, VictoryPending, or Listed (recent winners)
    const battlingTokens = allTokens.filter(t =>
      t.battleStatus === BattleStatus.InBattle ||
      t.battleStatus === BattleStatus.VictoryPending ||
      t.battleStatus === BattleStatus.Listed
    );

    for (const token of battlingTokens) {
      const mintStr = token.mint.toString();
      if (processed.has(mintStr)) continue;

      // Find opponent
      const opponentMint = token.opponentMint?.toString();
      if (!opponentMint || opponentMint === '11111111111111111111111111111111') continue;

      // Opponent può essere in battlingTokens O in allTokens (se è Qualified dopo sconfitta)
      const opponent = allTokens.find(t =>
        t.mint.toString() === opponentMint
      );

      if (opponent) {
        // Determine winner
        let winner: 'A' | 'B' | null = null;

        // Token A won if VictoryPending or Listed
        if (token.battleStatus === BattleStatus.VictoryPending ||
            token.battleStatus === BattleStatus.Listed) {
          winner = 'A';
        }
        // Token B won if VictoryPending or Listed
        else if (opponent.battleStatus === BattleStatus.VictoryPending ||
                 opponent.battleStatus === BattleStatus.Listed) {
          winner = 'B';
        }

        pairs.push({ tokenA: token, tokenB: opponent, winner });
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
        const mcUsd = lamportsToUsd(token.solCollected ?? 0);
        const volumeUsd = lamportsToUsd(token.totalTradeVolume ?? 0);

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
    marketCapUsd: lamportsToUsd(token.solCollected ?? 0),
    volumeUsd: lamportsToUsd(token.totalTradeVolume ?? 0),
    solCollected: (token.solCollected ?? 0) / 1e9 // Convert to SOL for display
  });

  // Count for display
  const getCount = () => {
    if (activeFilter === 'battle') return battlePairs.length;
    if (activeFilter === 'aboutToWin') return aboutToWinTokens.length;
    if (activeFilter === 'winners') return winners.length;
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

        <button
          onClick={() => setActiveFilter('winners')}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap ${activeFilter === 'winners'
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'
              : 'bg-bonk-card text-bonk-text hover:bg-bonk-border'
            }`}
        >
          👑 Winners
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
                winner={pair.winner}
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
      ) : activeFilter === 'winners' ? (
        // WINNERS TAB
        winners.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👑</div>
            <div className="text-xl font-bold text-white mb-2">No Winners Yet</div>
            <div className="text-bonk-text mb-6">
              When a token wins a battle, it will appear here!
              <br />
              Winners get listed on Raydium DEX.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {winners.map((winner) => (
              <div
                key={winner.mint}
                className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500/50 rounded-xl p-4 hover:border-yellow-400 transition-all"
              >
                {/* Winner Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-2 py-1 rounded">
                    👑 WINNER
                  </span>
                  {winner.pool_id && (
                    <a
                      href={winner.raydium_url || `https://raydium.io/swap/?inputMint=sol&outputMint=${winner.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Trade on Raydium →
                    </a>
                  )}
                </div>

                {/* Token Info */}
                <div className="flex items-center gap-3 mb-3">
                  {winner.image ? (
                    <img
                      src={winner.image}
                      alt={winner.symbol}
                      className="w-12 h-12 rounded-lg object-cover border-2 border-yellow-500"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center text-2xl">
                      👑
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-bold text-lg">{winner.symbol}</h3>
                    <p className="text-gray-400 text-sm">{winner.name}</p>
                  </div>
                </div>

                {/* Defeated */}
                {winner.loser_symbol && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
                    <span>Defeated</span>
                    {winner.loser_image && (
                      <img
                        src={winner.loser_image}
                        alt={winner.loser_symbol}
                        className="w-5 h-5 rounded-full opacity-50"
                      />
                    )}
                    <span className="text-red-400 line-through">{winner.loser_symbol}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-black/30 rounded p-2">
                    <div className="text-gray-500">Final MC</div>
                    <div className="text-yellow-400 font-bold">
                      ${Number(winner.final_mc_usd || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded p-2">
                    <div className="text-gray-500">Spoils</div>
                    <div className="text-green-400 font-bold">
                      +{Number(winner.spoils_sol || 0).toFixed(2)} SOL
                    </div>
                  </div>
                </div>

                {/* Victory Date */}
                <div className="mt-3 text-xs text-gray-500 text-center">
                  Won {new Date(winner.victory_timestamp).toLocaleDateString()}
                </div>
              </div>
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