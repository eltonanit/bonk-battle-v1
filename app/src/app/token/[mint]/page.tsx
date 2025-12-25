'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { useTokenBattleState, calculateMarketCapFromReserves, calculatePricePerToken } from '@/hooks/useTokenBattleState';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { BattleStatus, BattleTier } from '@/types/bonk';
import { TIER_CONFIG } from '@/lib/solana/constants';
import { TradingPanel } from '@/components/token/TradingPanel';
import { TokenHero } from '@/components/token/TokenHero';
import { PriceChart } from '@/components/token/PriceChart';
import { BondingCurveCard } from '@/components/token/BondingCurveCard';
import { QualificationPopup } from '@/components/token/QualificationPopup';
import { TradesList } from '@/components/token/TradesList';
import { MobileTradingDrawer } from '@/components/token/MobileTradingDrawer';

/**
 * Validates if a string is a valid Solana public key
 */
function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export default function TokenDetailPage() {
  const params = useParams();
  const mintAddress = params.mint as string;
  const { publicKey } = useWallet();

  // ⭐ Stato per tracciare se popup è stato chiuso
  const [qualificationPopupDismissed, setQualificationPopupDismissed] = useState(false);

  // ⭐ Tab state for Thread/Trades/Holders
  const [activeTab, setActiveTab] = useState<'thread' | 'trades' | 'holders'>('trades');

  // ⭐ Winner state for Raydium pool integration
  const [isWinner, setIsWinner] = useState(false);
  const [winnerData, setWinnerData] = useState<any>(null);
  const [poolData, setPoolData] = useState<any>(null);

  // ⭐ Validate mint address before parsing
  const isValidMint = isValidPublicKey(mintAddress);

  // Parse mint PublicKey (only if valid) - use null for invalid
  const mint = isValidMint ? new PublicKey(mintAddress) : null;

  // ⭐ ALL HOOKS MUST BE CALLED UNCONDITIONALLY - BEFORE ANY RETURNS
  // Fetch token battle state (pass null if invalid mint - hook handles it)
  const { state, loading, error, refetch } = useTokenBattleState(mint);

  // Fetch SOL price oracle
  const { solPriceUsd } = usePriceOracle();

  // ⭐ V2: Calculate market cap from virtual reserves (after hooks)
  const marketCapUsd = state && solPriceUsd
    ? calculateMarketCapFromReserves(
      state.virtualSolReserves,
      state.virtualTokenReserves,
      solPriceUsd
    )
    : null;

  // ⭐ V2: Calculate price per token
  const pricePerToken = state && solPriceUsd
    ? calculatePricePerToken(
      state.virtualSolReserves,
      state.virtualTokenReserves,
      solPriceUsd
    )
    : null;

  // ⭐ V3: Get tier config (using string keys)
  const tierKey = (state?.tier ?? BattleTier.Test) === BattleTier.Test ? 'TEST' : 'PRODUCTION';
  const tierConfig = TIER_CONFIG[tierKey];

  // ⭐ INCREMENT VIEW quando user entra nella pagina
  useEffect(() => {
    if (publicKey && mintAddress && isValidMint) {
      incrementView(mintAddress, publicKey.toString());
    }
  }, [publicKey, mintAddress, isValidMint]);

  async function incrementView(tokenMint: string, wallet: string) {
    try {
      const { error } = await supabase
        .from('token_views')
        .upsert({
          token_mint: tokenMint,
          wallet_address: wallet,
          last_viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'token_mint,wallet_address',
        });

      if (!error) {
        console.log('✅ View counted');
      }
    } catch (err) {
      console.error('Failed to increment view:', err);
    }
  }

  // ⭐ DEBUG: Log state data to see what we're getting
  useEffect(() => {
    if (state) {
      console.log('🔍 Token State V2 Debug:', {
        name: state.name,
        symbol: state.symbol,
        uri: state.uri,
        image: state.image,
        tier: state.tier,
        virtualSolReserves: state.virtualSolReserves,
        virtualTokenReserves: state.virtualTokenReserves,
        realSolReserves: state.realSolReserves,
        realTokenReserves: state.realTokenReserves,
        battleStatus: state.battleStatus,
      });
    }
  }, [state]);

  // ⭐ Check if token is a winner with Raydium pool
  // Use a ref to track if we've already confirmed winner status (prevents infinite polling)
  const winnerConfirmedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    async function checkWinnerStatus() {
      if (!mintAddress || !isValidMint) return;

      // If already confirmed as winner, skip the check
      if (winnerConfirmedRef.current) {
        return;
      }

      try {
        // First check tokens table (faster, more reliable)
        const { data: tokenData, error: tokenError } = await supabase
          .from('tokens')
          .select('battle_status, raydium_pool_id, sol_collected, total_trade_volume')
          .eq('mint', mintAddress)
          .maybeSingle();

        if (tokenError) {
          console.warn('Token query error:', tokenError);
          return;
        }

        if (tokenData && (tokenData.battle_status === 4 || tokenData.battle_status === 5)) {
          console.log('🏆 Token is a winner (from tokens table)');

          if (isMounted) {
            setIsWinner(true);
            winnerConfirmedRef.current = true; // Stop future polling

            setWinnerData({
              pool_id: tokenData.raydium_pool_id,
              raydium_url: `https://raydium.io/swap/?inputMint=sol&outputMint=${mintAddress}`,
              final_sol_collected: tokenData.sol_collected,
              final_volume_sol: tokenData.total_trade_volume
            });

            // Clear interval since we found the winner
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }

          // Try to get additional winner data using direct fetch (bypasses Supabase client issues)
          try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            const response = await fetch(
              `${supabaseUrl}/rest/v1/winners?select=*&mint=eq.${mintAddress}`,
              {
                headers: {
                  'apikey': supabaseKey || '',
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                }
              }
            );

            if (response.ok) {
              const winners = await response.json();
              const winner = winners?.[0]; // Get first result from array

              if (winner && isMounted) {
                console.log('🏆 Winner data from winners table:', winner);
                setWinnerData((prevData: Record<string, unknown> | null) => ({
                  ...prevData,
                  ...winner
                }));

                // Fetch pool data if available
                if (winner.pool_id) {
                  const poolRes = await fetch(`/api/raydium/pool-info?poolId=${winner.pool_id}`);
                  const pool = await poolRes.json();
                  if (pool.success && isMounted) {
                    setPoolData(pool);
                  }
                }
              }
            } else {
              console.warn('Winners fetch response not ok:', response.status);
            }
          } catch (winnerErr) {
            // Optional data - log but don't fail
            console.warn('Winners fetch error (non-critical):', winnerErr);
          }
        }
      } catch (err) {
        // Not a winner or error - that's ok, don't spam console
        console.log('Token winner check error:', err);
      }
    }

    checkWinnerStatus();

    // Only poll if not already confirmed as winner - every 30 seconds (not 10)
    if (!winnerConfirmedRef.current) {
      intervalId = setInterval(checkWinnerStatus, 30000);
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [mintAddress, isValidMint]);

  // ═══════════════════════════════════════════════════════════════
  // ⭐ ALL CONDITIONAL RETURNS MUST BE AFTER ALL HOOKS
  // ═══════════════════════════════════════════════════════════════

  // Show error for invalid mint address
  if (!isValidMint || !mint) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl font-bold mb-2">Invalid Token Address</div>
          <div className="text-gray-400 text-sm mb-4">
            The token address &quot;{mintAddress}&quot; is not a valid Solana address.
          </div>
          <a href="/" className="text-cyan-400 hover:text-cyan-300">
            ← Back to Home
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white flex items-center justify-center">
        <div className="text-center">
          <img src="/BONK-LOGO.svg" alt="Loading" className="w-16 h-16 mx-auto mb-4 animate-bounce" />
          <div className="text-xl font-bold">Loading token data...</div>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl font-bold mb-2">Error Loading Token</div>
          <div className="text-red-400 text-sm mb-4">
            {error ? error.message : 'Token state not found'}
          </div>
        </div>
      </div>
    );
  }

  // ⭐ V2: Calculate SOL raised from real reserves
  const solRaised = state.realSolReserves / 1e9;

  // ⭐ V3 FIX: Determina se mostrare il popup di qualificazione
  const shouldShowQualificationPopup =
    state.realSolReserves === 0 &&
    !qualificationPopupDismissed &&
    state.battleStatus !== BattleStatus.InBattle &&
    state.battleStatus !== BattleStatus.Listed &&
    !isWinner;

  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      {/* ⭐ V3 FIX: Qualification Popup */}
      {shouldShowQualificationPopup && (
        <QualificationPopup
          mint={mint}
          tokenSymbol={state.symbol || 'TOKEN'}
          tokenImage={state.image || ''}
          onQualified={() => {
            refetch();
            setQualificationPopupDismissed(true);
          }}
          onClose={() => {
            setQualificationPopupDismissed(true);
          }}
        />
      )}

      {/* ⭐ Tickers SOPRA Header - SOLO mobile/tablet (< lg) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
        <div className="flex items-center gap-2 px-2 justify-center xs:justify-start">
          <FOMOTicker />
          <div className="hidden sm:block">
            <CreatedTicker />
          </div>
        </div>
      </div>

      <DesktopHeader />
      <Header />
      <Sidebar />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16">
        <div className="max-w-[1600px] mx-auto p-4 lg:p-6">

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ⭐ WINNER BANNER - Shows when isWinner is true */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {isWinner && (
            <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 p-1 rounded-xl mb-6">
              <div className="bg-black/90 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl animate-bounce">🏆</span>
                    <div>
                      <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400">
                        CHAMPION!
                      </h2>
                      <p className="text-gray-400 text-sm">
                        This token won its battle and is now listed!
                      </p>
                    </div>
                  </div>

                  {/* Battle Stats - from state if winnerData not available */}
                  <div className="flex gap-4 text-sm">
                    <div className="text-center bg-black/30 rounded-lg px-3 py-2">
                      <div className="text-yellow-400 font-bold text-lg">
                        {winnerData?.final_sol_collected?.toFixed(2) || (state.realSolReserves / 1e9).toFixed(2)} SOL
                      </div>
                      <div className="text-gray-500 text-xs">Final SOL</div>
                    </div>
                    <div className="text-center bg-black/30 rounded-lg px-3 py-2">
                      <div className="text-green-400 font-bold text-lg">
                        {winnerData?.final_volume_sol?.toFixed(2) || (state.totalTradeVolume / 1e9).toFixed(2)} SOL
                      </div>
                      <div className="text-gray-500 text-xs">Volume</div>
                    </div>
                    {winnerData?.spoils_sol && winnerData.spoils_sol > 0 && (
                      <div className="text-center bg-black/30 rounded-lg px-3 py-2">
                        <div className="text-purple-400 font-bold text-lg">
                          +{winnerData.spoils_sol?.toFixed(2)} SOL
                        </div>
                        <div className="text-gray-500 text-xs">Spoils Won</div>
                      </div>
                    )}
                  </div>

                  {/* Real-time pool stats */}
                  {poolData && (
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-yellow-400 font-bold">{poolData.solInPool?.toFixed(2)} SOL</div>
                        <div className="text-gray-500 text-xs">Liquidity</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-400 font-bold">${poolData.marketCapUsd?.toLocaleString()}</div>
                        <div className="text-gray-500 text-xs">Market Cap</div>
                      </div>
                    </div>
                  )}

                  {/* Trade Button - Always show for winners */}
                  <a
                    href={winnerData?.raydium_url || `https://raydium.io/swap/?inputMint=sol&outputMint=${mintAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold px-6 py-3 rounded-xl hover:from-blue-400 hover:to-purple-400 transition-all flex items-center gap-2 shadow-lg shadow-purple-500/30"
                  >
                    <span>Trade on Raydium</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                {/* Defeated opponent info */}
                {winnerData?.loser_symbol && (
                  <div className="mt-4 pt-4 border-t border-yellow-500/30 flex items-center gap-3">
                    <span className="text-gray-500 text-sm">Defeated:</span>
                    <span className="text-red-400 line-through font-semibold">${winnerData.loser_symbol}</span>
                    <span className="text-gray-600">💀</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN (Main Content) - 8 cols */}
            <div className="lg:col-span-8 space-y-6">
              {/* Token Header */}
              <TokenHero
                token={{
                  name: state.name || mintAddress.slice(0, 8) + '...',
                  symbol: state.symbol || 'UNK',
                  metadataUri: state.uri || '',
                  creator: state.creatorWallet || null,
                  createdAt: state.creationTimestamp,
                  mint: mintAddress,
                  marketCapUsd: marketCapUsd ?? undefined
                }}
                preloadedMetadata={{
                  name: state.name || mintAddress.slice(0, 8) + '...',
                  symbol: state.symbol || 'UNK',
                  uri: state.uri || '',
                  image: state.image
                }}
                battleId={
                  state.battleStatus === BattleStatus.InBattle && state.opponentMint
                    ? `${mintAddress}-${state.opponentMint.toString()}`
                    : undefined
                }
                battleStatus={state.battleStatus}
              />

              {/* Chart Section */}
              <PriceChart token={{
                mint: mintAddress,
                solRaised: solRaised,
                virtualSolInit: state.virtualSolReserves / 1e9,
                constantK: (BigInt(state.virtualSolReserves) * BigInt(state.virtualTokenReserves)).toString(),
                createdAt: state.creationTimestamp,
                name: state.name || mintAddress.slice(0, 8),
                symbol: state.symbol || 'BONK',
                marketCapUsd: marketCapUsd ?? undefined,
              }} />

              {/* Tabs Section */}
              <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
                <div className="flex gap-6 border-b border-gray-800 pb-4 mb-4">
                  <button
                    onClick={() => setActiveTab('thread')}
                    className={`font-bold pb-4 -mb-4.5 transition-colors ${activeTab === 'thread'
                      ? 'text-white border-b-2 border-bonk-green'
                      : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    Thread
                  </button>
                  <button
                    onClick={() => setActiveTab('trades')}
                    className={`font-bold pb-4 -mb-4.5 transition-colors ${activeTab === 'trades'
                      ? 'text-white border-b-2 border-bonk-green'
                      : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    Trades
                  </button>
                  <button
                    onClick={() => setActiveTab('holders')}
                    className={`font-bold pb-4 -mb-4.5 transition-colors ${activeTab === 'holders'
                      ? 'text-white border-b-2 border-bonk-green'
                      : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    Holders
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'thread' && (
                  <div className="text-center py-12 text-gray-500">
                    No comments yet. Be the first to start the conversation!
                  </div>
                )}

                {activeTab === 'trades' && (
                  <TradesList
                    tokenMint={mintAddress}
                    tokenSymbol={state.symbol || 'TOKEN'}
                  />
                )}

                {activeTab === 'holders' && (
                  <div className="text-center py-12 text-gray-500">
                    Holder distribution coming soon...
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN (Sidebar) - 4 cols */}
            <div className="lg:col-span-4 space-y-6">
              {/* Trading Panel - Hidden on mobile/tablet (<810px), shown on desktop */}
              <div className="hidden tablet-trading:block">
                {!isWinner ? (
                  <TradingPanel mint={mint} onSuccess={refetch} />
                ) : (
                  <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500/50 rounded-xl p-6 text-center">
                    <div className="text-4xl mb-3">🎉</div>
                    <h3 className="text-xl font-bold text-yellow-400 mb-2">Trading on Raydium!</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      This token graduated and is now available on Raydium DEX
                    </p>
                    <a
                      href={winnerData?.raydium_url || `https://raydium.io/swap/?inputMint=sol&outputMint=${mintAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 rounded-xl hover:from-blue-400 hover:to-purple-400 transition-all"
                    >
                      Trade on Raydium →
                    </a>
                  </div>
                )}
              </div>

              {/* User Position (Placeholder) */}
              <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">$0.00</span>
                    <span className="text-gray-500">0 {state.symbol}</span>
                  </div>
                  <div className="text-gray-500">-</div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Position</span>
                  <span className="text-gray-600">⇄</span>
                  <span className="text-gray-400">Trades</span>
                </div>
                <div className="w-full bg-gray-800 h-1 mt-4 rounded-full overflow-hidden">
                  <div className="bg-gray-600 h-full w-1/2"></div>
                </div>
                <div className="text-xs text-gray-500 mt-2">Profit indicator</div>
              </div>

              {/* Bonding Curve Progress - V3: SOL-based (price independent) */}
              {!isWinner && (
                <BondingCurveCard
                  solCollected={state.realSolReserves / 1e9}
                  totalVolumeSol={state.totalTradeVolume / 1e9}
                  battleStatus={state.battleStatus}
                  tier={state.tier ?? BattleTier.Test}
                />
              )}

              {/* Winner Stats Card */}
              {isWinner && winnerData && (
                <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-4">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    🏆 Victory Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Final SOL</span>
                      <span className="text-yellow-400 font-bold">
                        {winnerData.final_sol_collected?.toFixed(4)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Final Volume</span>
                      <span className="text-green-400 font-bold">
                        {winnerData.final_volume_sol?.toFixed(4)} SOL
                      </span>
                    </div>
                    {winnerData.spoils_sol > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Spoils Won</span>
                        <span className="text-purple-400 font-bold">
                          +{winnerData.spoils_sol?.toFixed(4)} SOL
                        </span>
                      </div>
                    )}
                    {winnerData.loser_symbol && (
                      <div className="flex justify-between text-sm border-t border-gray-700 pt-3">
                        <span className="text-gray-400">Defeated</span>
                        <span className="text-red-400 line-through">
                          ${winnerData.loser_symbol}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Holder Distribution (Placeholder) */}
              <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
                <h3 className="font-bold mb-4">Holder Distribution</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">1. Bonding Curve</span>
                    <span>80.00%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">2. Creator</span>
                    <span>5.00%</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Mobile Trading Drawer - Only visible < 810px */}
      {!isWinner && (
        <MobileTradingDrawer
          mint={mint}
          tokenState={{
            symbol: state.symbol || 'TOKEN',
            image: state.image || '',
            solCollected: state.realSolReserves,
            totalTradeVolume: state.totalTradeVolume,
            virtualSolReserves: state.virtualSolReserves,
            realSolReserves: state.realSolReserves,
            battleStatus: state.battleStatus,
          }}
          onSuccess={refetch}
        />
      )}

      <MobileBottomNav />
    </div>
  );
}