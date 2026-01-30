// app/src/components/home/TokenGrid.BONK.tsx
// ⭐ UPDATED: Uses each token's tier to get correct targets
'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import type { ParsedTokenBattleState } from '@/types/bonk';
import { BattleStatus, BattleTier } from '@/types/bonk';
import { TokenCardBonk } from '@/components/shared/TokenCard.BONK';
import { BattleCard } from '@/components/shared/BattleCard';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { supabase } from '@/lib/supabase';
import { lamportsToSol } from '@/lib/solana/constants';
import { FEATURES } from '@/config/features';

// ⭐ TIER TARGETS - Must match smart contract!
const TIER_TARGETS = {
  [BattleTier.Test]: {
    TARGET_SOL: 6,
    VICTORY_VOLUME_SOL: 6.6,
  },
  [BattleTier.Production]: {
    TARGET_SOL: 37.7,
    VICTORY_VOLUME_SOL: 41.5,
  },
} as const;

// ⭐ Helper to get tier-specific targets from a token
function getTierTargets(tier: BattleTier | number | undefined) {
  const tierValue = tier ?? BattleTier.Test;
  const targets = TIER_TARGETS[tierValue as BattleTier] ?? TIER_TARGETS[BattleTier.Test];
  return {
    targetSol: targets.TARGET_SOL,
    victoryVolumeSol: targets.VICTORY_VOLUME_SOL,
  };
}

type FilterTab = 'battle' | 'new' | 'aboutToWin' | 'winners';

// Token corrotti da nascondere (battle_status corrotto on-chain)
const BLACKLISTED_MINTS = new Set([
  // Batch 1 - Originali
  "8JLi2gGmSWtfLXdCdbdftDQqTm2jrhZUvqpjEJeRFk3L", // Only998
  "536mB3r9kyVYmT2xEZmhV7cRscLYWsh2NqpVeuauyhxp", // Enoc998
  "339SUaivgtTFCHfHemoPypz7BV4zie8gZqqkwtDFrgp2", // LIQ2
  // Batch 2 - Altri corrotti
  "34iyko5Knev5znq6phXqGNQYeuSvwUTABjH6eonXB6tu", // 98JO
  "5dny6aCdc88c6pSEgoZy3RFBVQnAYeyNbyBxGXftJhjU", // BHHHB
  "278CzMrqZ23ah2NQcKgcjLFxdhmjrzR2HQijPhTGViET", // 3E3
  "BEiwbsbyY7nhtMFqydwhvHEp6uvEPbZBPAuQYNo2QEDs", // VBVV
  "FUnqTqYt4nW8y8AAGC1rAu27NbH2yHaKFwpaXoxke4i4", // RTY6
  "71neaXPN4SG8uHZNca24YXCZJgLBTpDRdwMkzVBzi3xZ", // 007
  "FN9DYK9QN6on8aMfjEygHjFoBnfQEVtSd6qY8deM7gXz", // 2DFS
  "CzvfUNx4AePvRNJw94d7FtjFCVyyKvaLtrGA3Fa5Q4SK", // GHH
  "93BPpgX76EBfekvDP1hCnGNXQm5cS3KTNhMrbpczVXXC", // PR2
  "6bRBfTvM6MpGefGfa8TTE7RemHW8uywn4ntWwqwqh6ZP", // FEE
  "HdPAmHrPToDqtm916Xuhz3Z7SxsKqbmn9KBcQQqkA9po", // DEFC
  "6YbTATxVrRX9TybWnt18WfuLT5e2jAqLbJ4CSZztLiPz", // 1Q2
  "GhHpd4757tCrgmroN5bkCked5JRgC7CEoP35ZbiDDjan", // 123W
  "Efz37LsoKDw7jKKgnnT1N2ngigaoPUEUcim7MVM9TDFA", // DDDD
  "DaFj1JYrPaGqGQx6xKho1DYEH5qeYJWK1JBm9JKa8tnN", // ETST1
  "5Mfgrz2WwEdY3MaXbPNtsH2K4nTH2N9sUpesY4gX9b3Q", // 1QQ2
  "A2jDkCvpB4EMjcvHxhHrJET2LGvCi89t3DTTSb2s6h5k", // E434
  "E4eg651HG5T9L66B5KqrXBKACCwZMdUzUq5Hm4ax1Cdg", // 77Y7
  "4qwjvFxEER1Rype26PHPMyjLsCxxjtBVoEVRJ6i66ikb", // WDW
  "12YWjkCX4iJyhaq6CK4rwc8GiDaULXAZ68o18rHA29J", // HHHH
  "2PZHPdPGeDHG1gsW7QvKumBpMq3ZFcN7CSABDMezPKUz", // TOP
  "A6MHG4mo52zT6RjuB9KUubpbbbYwZb66WBvnmq531vFT", // RVR
  "9WafT1QLi786w1Lt3tKqhZM9H6FX1LKhfmLZogr6DHaL", // OK1
]);

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
  const [poolData, setPoolData] = useState<Record<string, any>>({});
  // ⭐ Creator profiles cache (wallet -> avatar_url)
  const [creatorAvatars, setCreatorAvatars] = useState<Record<string, string | null>>({});

  // 🔥 PUMP.FUN ANIMATIONS - Visual shuffle every 5 seconds
  const [shakingCards, setShakingCards] = useState<Set<string>>(new Set());
  const [flashingCards, setFlashingCards] = useState<Set<string>>(new Set());
  const [animCounter, setAnimCounter] = useState(0);
  const battlePairsRef = useRef<(BattlePair & { winner?: 'A' | 'B' | null })[]>([]);
  // Persistent display order: array of pairKeys that accumulates reorder changes
  const [displayOrder, setDisplayOrder] = useState<string[]>([]);
  const displayOrderRef = useRef<string[]>([]);

  const gridRef = useRef<HTMLDivElement>(null);

  // 🔥 Trigger animation: shake -> flash -> move to top (persistent order)
  const triggerTradeAnimation = useCallback((mintAddress: string) => {
    console.log('🔥 TRADE ANIMATION:', mintAddress);
    setShakingCards(prev => new Set(prev).add(mintAddress));
    setAnimCounter(c => c + 1);

    // Update persistent display order: move this pair to index 0
    setDisplayOrder(prev => {
      const pairIdx = prev.findIndex(key => key.includes(mintAddress));
      if (pairIdx <= 0) return prev; // already at top or not found
      const next = [...prev];
      const [moved] = next.splice(pairIdx, 1);
      next.unshift(moved);
      return next;
    });

    setTimeout(() => {
      setShakingCards(prev => {
        const next = new Set(prev);
        next.delete(mintAddress);
        return next;
      });
      setFlashingCards(prev => new Set(prev).add(mintAddress));
    }, 500);

    setTimeout(() => {
      setFlashingCards(prev => {
        const next = new Set(prev);
        next.delete(mintAddress);
        return next;
      });
    }, 1200);
  }, []);

  // ⭐ REAL SOL PRICE from on-chain oracle
  const { solPriceUsd, loading: priceLoading } = usePriceOracle();

  useEffect(() => {
    async function loadTokens() {
      try {
        setLoading(true);
        console.log('📊 TokenGridBonk: Loading all BONK Battle tokens...');
        const tokens = await fetchAllBonkTokens();
        console.log(`✅ TokenGridBonk: Found ${tokens.length} BONK tokens`);

        // 🧹 Filter out blacklisted (corrupted) tokens
        const cleanTokens = tokens.filter(t => !BLACKLISTED_MINTS.has(t.mint.toString()));
        console.log(`🧹 After blacklist filter: ${cleanTokens.length} tokens (removed ${tokens.length - cleanTokens.length})`);

        setAllTokens(cleanTokens);

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
  }, []);

  // ⭐ Fetch creator profiles for avatar photos
  useEffect(() => {
    async function fetchCreatorProfiles() {
      if (allTokens.length === 0) return;

      // Get unique creator wallets
      const uniqueCreators = [...new Set(
        allTokens
          .map(t => t.creator?.toString())
          .filter((w): w is string => !!w)
      )];

      if (uniqueCreators.length === 0) return;

      console.log(`👤 Fetching profiles for ${uniqueCreators.length} unique creators...`);

      // Fetch profiles from users table
      const { data: profiles, error } = await supabase
        .from('users')
        .select('wallet_address, avatar_url')
        .in('wallet_address', uniqueCreators);

      if (error) {
        console.error('❌ Error fetching creator profiles:', error);
        return;
      }

      // Build avatar map
      const avatarMap: Record<string, string | null> = {};
      profiles?.forEach(p => {
        if (p.avatar_url) {
          avatarMap[p.wallet_address] = p.avatar_url;
        }
      });

      console.log(`✅ Found ${Object.keys(avatarMap).length} profiles with avatars`);
      setCreatorAvatars(avatarMap);
    }

    fetchCreatorProfiles();
  }, [allTokens]);

  // ⭐ Fetch real-time pool data for winners
  useEffect(() => {
    async function fetchPoolData() {
      if (winners.length === 0) return;

      const newPoolData: Record<string, any> = {};

      for (const winner of winners) {
        if (winner.pool_id) {
          try {
            const res = await fetch(`/api/raydium/pool-info?poolId=${winner.pool_id}`);
            const data = await res.json();
            if (data.success) {
              newPoolData[winner.mint] = data;
            }
          } catch (error) {
            console.error(`Error fetching pool for ${winner.symbol}:`, error);
          }
        }
      }

      setPoolData(newPoolData);
    }

    fetchPoolData();
    const interval = setInterval(() => {
      if (activeFilter === 'winners') {
        fetchPoolData();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [winners, activeFilter]);

  // ⭐ NEW COINS: Only Created (0) and Qualified (1) tokens
  // Filter out tokens with invalid timestamps (before 2024 or in the future)
  const MIN_VALID_TIMESTAMP = 1704067200; // Jan 1, 2024
  const MAX_VALID_TIMESTAMP = Math.floor(Date.now() / 1000) + 86400; // Tomorrow

  const newAndQualifiedTokens = useMemo((): ParsedTokenBattleState[] => {
    return allTokens
      .filter(t =>
        (t.battleStatus === BattleStatus.Created ||
          t.battleStatus === BattleStatus.Qualified) &&
        // Filter out invalid timestamps
        t.creationTimestamp > MIN_VALID_TIMESTAMP &&
        t.creationTimestamp < MAX_VALID_TIMESTAMP &&
        // Filter out tokens with missing/invalid metadata
        t.name && t.name.length >= 2 &&
        t.symbol && t.symbol.length >= 2 &&
        !t.name.includes('...') &&
        !t.symbol.includes('...')
      )
      .sort((a, b) => b.creationTimestamp - a.creationTimestamp);
  }, [allTokens]);

  // ⭐ Group tokens into battle pairs WITH TIER INFO
  const battlePairs = useMemo((): (BattlePair & { winner?: 'A' | 'B' | null })[] => {
    const pairs: (BattlePair & { winner?: 'A' | 'B' | null })[] = [];
    const processed = new Set<string>();

    const battlingTokens = allTokens.filter(t =>
      t.battleStatus === BattleStatus.InBattle ||
      t.battleStatus === BattleStatus.VictoryPending ||
      t.battleStatus === BattleStatus.Listed
    );

    for (const token of battlingTokens) {
      const mintStr = token.mint.toString();
      if (processed.has(mintStr)) continue;

      const opponentMint = token.opponentMint?.toString();
      if (!opponentMint || opponentMint === '11111111111111111111111111111111') continue;

      const opponent = allTokens.find(t =>
        t.mint.toString() === opponentMint
      );

      if (opponent) {
        let winner: 'A' | 'B' | null = null;

        if (token.battleStatus === BattleStatus.VictoryPending ||
          token.battleStatus === BattleStatus.Listed) {
          winner = 'A';
        }
        else if (opponent.battleStatus === BattleStatus.VictoryPending ||
          opponent.battleStatus === BattleStatus.Listed) {
          winner = 'B';
        }

        pairs.push({ tokenA: token, tokenB: opponent, winner });
        processed.add(mintStr);
        processed.add(opponentMint);
      }
    }

    const firstInBattleIndex = pairs.findIndex(p =>
      p.tokenA.battleStatus === BattleStatus.InBattle && !p.winner
    );
    if (firstInBattleIndex !== -1) {
      pairs.splice(firstInBattleIndex, 1);
    }

    return pairs;
  }, [allTokens]);

  // 🔥 Keep battlePairs ref in sync + initialize display order
  useEffect(() => {
    battlePairsRef.current = battlePairs;
    // Initialize displayOrder from battlePairs keys (only if not yet set or pairs changed)
    const newKeys = battlePairs.map(p => `${p.tokenA.mint.toString()}-${p.tokenB.mint.toString()}`);
    setDisplayOrder(prev => {
      if (prev.length === 0) return newKeys;
      // Keep existing order, add any new pairs, remove stale ones
      const newSet = new Set(newKeys);
      const kept = prev.filter(k => newSet.has(k));
      const added = newKeys.filter(k => !kept.includes(k));
      const result = [...kept, ...added];
      displayOrderRef.current = result;
      return result;
    });
  }, [battlePairs]);

  // Keep displayOrderRef in sync
  useEffect(() => {
    displayOrderRef.current = displayOrder;
  }, [displayOrder]);

  useEffect(() => {
    console.log('🔥 SHUFFLE INTERVAL: Starting');
    const interval = setInterval(() => {
      const order = displayOrderRef.current;
      if (order.length <= 1) return;

      // Pick a random pair that's NOT currently at visual position #1
      const randomIdx = Math.floor(Math.random() * (order.length - 1)) + 1;
      const pairKey = order[randomIdx];
      if (pairKey) {
        // Extract mintA from the pairKey (format: "mintA-mintB")
        const mintA = pairKey.split('-')[0];
        console.log('🔥 SHUFFLING visual pos', randomIdx, '→ #1 (total:', order.length, ')');
        triggerTradeAnimation(mintA);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [triggerTradeAnimation]);

  // ⭐ Get tokens "About to Win" - uses each token's tier for progress calculation
  const aboutToWinTokens = useMemo((): ParsedTokenBattleState[] => {
    return allTokens
      .filter(t => t.battleStatus === BattleStatus.InBattle)
      .map(token => {
        const solCollected = lamportsToSol(token.realSolReserves ?? 0);
        const volumeSol = lamportsToSol(token.totalTradeVolume ?? 0);

        // ⭐ Use token's tier for correct targets
        const { targetSol, victoryVolumeSol } = getTierTargets(token.tier);

        const solProgress = Math.min((solCollected / targetSol) * 100, 100);
        const volProgress = Math.min((volumeSol / victoryVolumeSol) * 100, 100);
        const avgProgress = (solProgress + volProgress) / 2;

        return { token, avgProgress, solProgress, volProgress };
      })
      .filter(({ avgProgress }) => avgProgress >= 50)
      .sort((a, b) => b.avgProgress - a.avgProgress)
      .map(({ token }) => token);
  }, [allTokens]);

  const getFilteredTokens = (): ParsedTokenBattleState[] => {
    if (activeFilter === 'battle') return [];
    if (activeFilter === 'aboutToWin') return aboutToWinTokens;
    if (activeFilter === 'new') return newAndQualifiedTokens;

    return [];
  };

  const filteredTokens = getFilteredTokens();

  const TOTAL_SUPPLY = 1_000_000_000;

  const calculateMarketCapUsd = (token: ParsedTokenBattleState): number => {
    const virtualSol = token.virtualSolReserves ?? 0;
    const virtualToken = token.virtualTokenReserves ?? 0;

    if (virtualToken === 0 || !solPriceUsd) return 0;

    const mcInLamports = (virtualSol * TOTAL_SUPPLY) / (virtualToken / 1e9);
    const mcInUsd = (mcInLamports / 1e9) * solPriceUsd;

    return mcInUsd;
  };

  const toBattleToken = (token: ParsedTokenBattleState) => {
    const creatorWallet = token.creator?.toString() || null;
    return {
      mint: token.mint.toString(),
      name: token.name || 'Unknown',
      symbol: token.symbol || '???',
      image: token.image || null,
      marketCapUsd: calculateMarketCapUsd(token),
      solCollected: lamportsToSol(token.realSolReserves ?? 0),
      totalVolumeSol: lamportsToSol(token.totalTradeVolume ?? 0),
      // ⭐ Pass creator wallet and avatar for BattleCard
      creatorWallet,
      creatorAvatarUrl: creatorWallet ? creatorAvatars[creatorWallet] || null : null,
    };
  };

  const getCount = () => {
    if (activeFilter === 'battle') return battlePairs.length;
    if (activeFilter === 'aboutToWin') return aboutToWinTokens.length;
    if (activeFilter === 'winners') return winners.length;
    if (activeFilter === 'new') return newAndQualifiedTokens.length;
    return filteredTokens.length;
  };

  // ⭐ Count by status for display
  const newCount = useMemo(() =>
    allTokens.filter(t => t.battleStatus === BattleStatus.Created).length,
    [allTokens]
  );
  const qualifiedCount = useMemo(() =>
    allTokens.filter(t => t.battleStatus === BattleStatus.Qualified).length,
    [allTokens]
  );

  const isLoading = loading || priceLoading;

  return (
    <div className="px-5 lg:px-6 pb-32">
      {/* Filter Tabs - HIDDEN in Season 1 */}
      {(FEATURES.SHOW_BATTLE_TAB || FEATURES.SHOW_NEW_COINS_TAB || FEATURES.SHOW_ABOUT_TO_WIN_TAB || FEATURES.SHOW_WINNERS_TAB) && (
        <div className="flex gap-3 mb-6 overflow-x-auto scrollbar-hide">
          {FEATURES.SHOW_BATTLE_TAB && (
            <button
              onClick={() => setActiveFilter('battle')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap ${activeFilter === 'battle'
                ? 'bg-bonk-orange text-white'
                : 'bg-bonk-card text-bonk-text hover:bg-bonk-border'
                }`}
            >
              ⚔️ Battle
            </button>
          )}

          {FEATURES.SHOW_NEW_COINS_TAB && (
            <button
              onClick={() => setActiveFilter('new')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap ${activeFilter === 'new'
                ? 'bg-bonk-blue-dark text-white'
                : 'bg-bonk-card text-bonk-text hover:bg-bonk-border'
                }`}
            >
              🆕 New Coins
            </button>
          )}

          {FEATURES.SHOW_ABOUT_TO_WIN_TAB && (
            <button
              onClick={() => setActiveFilter('aboutToWin')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap ${activeFilter === 'aboutToWin'
                ? 'bg-bonk-gold text-black'
                : 'bg-bonk-card text-bonk-text hover:bg-bonk-border'
                }`}
            >
              🏆 About to Win
            </button>
          )}

          {FEATURES.SHOW_WINNERS_TAB && (
            <button
              onClick={() => setActiveFilter('winners')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap ${activeFilter === 'winners'
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'
                : 'bg-bonk-card text-bonk-text hover:bg-bonk-border'
                }`}
            >
              👑 Winners
            </button>
          )}
        </div>
      )}

      {/* Count Display - HIDDEN in Season 1 when tabs are hidden */}
      {(FEATURES.SHOW_BATTLE_TAB || FEATURES.SHOW_NEW_COINS_TAB || FEATURES.SHOW_ABOUT_TO_WIN_TAB || FEATURES.SHOW_WINNERS_TAB) && (
        <div className="mb-4 text-sm text-bonk-text">
          {isLoading ? (
            'Loading tokens...'
          ) : activeFilter === 'battle' ? (
            `${battlePairs.length} active battle${battlePairs.length !== 1 ? 's' : ''}`
          ) : activeFilter === 'new' ? (
            `${newAndQualifiedTokens.length} tokens (${newCount} new, ${qualifiedCount} qualified)`
          ) : (
            `${getCount()} token${getCount() !== 1 ? 's' : ''} found`
          )}
        </div>
      )}

      {/* Content Based on Active Tab - HIDDEN in Season 1 when tabs are hidden */}
      {(FEATURES.SHOW_BATTLE_TAB || FEATURES.SHOW_NEW_COINS_TAB || FEATURES.SHOW_ABOUT_TO_WIN_TAB || FEATURES.SHOW_WINNERS_TAB) && (isLoading ? (
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
        // BATTLE TAB - ⭐ UPDATED: Uses each battle's tier
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
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              // 🔥 Reorder using persistent displayOrder
              const pairsMap = new Map(
                battlePairs.map(p => [`${p.tokenA.mint.toString()}-${p.tokenB.mint.toString()}`, p])
              );
              const orderedPairs: typeof battlePairs = [];
              // Add pairs in displayOrder sequence
              for (const key of displayOrder) {
                const pair = pairsMap.get(key);
                if (pair) {
                  orderedPairs.push(pair);
                  pairsMap.delete(key);
                }
              }
              // Add any remaining pairs not in displayOrder
              for (const pair of pairsMap.values()) {
                orderedPairs.push(pair);
              }

              return orderedPairs.map((pair, idx) => {
                const { targetSol, victoryVolumeSol } = getTierTargets(pair.tokenA.tier);
                const mintA = pair.tokenA.mint.toString();
                const mintB = pair.tokenB.mint.toString();
                const pairKey = `${mintA}-${mintB}`;
                const isShaking = shakingCards.has(mintA) || shakingCards.has(mintB);
                const isFlashing = flashingCards.has(mintA) || flashingCards.has(mintB);
                // Clash animation when card arrives at #1
                const isTopAnimated = idx === 0 && (isShaking || isFlashing);

                return (
                  <div key={pairKey} data-pair-key={pairKey}>
                    <BattleCard
                      tokenA={toBattleToken(pair.tokenA)}
                      tokenB={toBattleToken(pair.tokenB)}
                      targetSol={targetSol}
                      targetVolumeSol={victoryVolumeSol}
                      winner={pair.winner}
                      enableAnimations={false}
                      goldenAnimations={false}
                      isTradeShaking={isShaking}
                      isFlashSweep={isFlashing}
                      forceClash={isTopAnimated}
                    />
                  </div>
                );
              });
            })()}
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
                solPriceUsd={solPriceUsd ?? undefined}
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
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="bg-black/30 rounded p-2">
                    <div className="text-gray-500">Market Cap</div>
                    <div className="text-yellow-400 font-bold">
                      {poolData[winner.mint] ? (
                        `$${poolData[winner.mint].marketCapUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      ) : (
                        <span className="animate-pulse text-gray-500">Loading...</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded p-2">
                    <div className="text-gray-500">Spoils</div>
                    <div className="text-green-400 font-bold">
                      +{Number(winner.spoils_sol || 0).toFixed(2)} SOL
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 mb-2">
                  <a
                    href={`/token/${winner.mint}`}
                    className="flex-1 bg-bonk-card hover:bg-bonk-border text-white text-center text-sm font-semibold py-2 px-3 rounded-lg transition-all"
                  >
                    View Token
                  </a>
                  {winner.pool_id && (
                    <a
                      href={`https://raydium.io/swap/?inputMint=sol&outputMint=${winner.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-center text-sm font-semibold py-2 px-3 rounded-lg transition-all"
                    >
                      Trade on Raydium →
                    </a>
                  )}
                </div>

                {/* Victory Date */}
                <div className="text-xs text-gray-500 text-center">
                  Won {new Date(winner.victory_timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        // NEW COINS TAB
        newAndQualifiedTokens.length === 0 ? (
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
            {newAndQualifiedTokens.map((token) => (
              <TokenCardBonk
                key={token.mint.toString()}
                tokenState={token}
                solPriceUsd={solPriceUsd ?? undefined}
              />
            ))}
          </div>
        )
      ))}
    </div>
  );
}