// app/src/app/battle/[id]/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { PublicKey } from '@solana/web3.js';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { TradingPanel } from '@/components/token/TradingPanel';
import { PriceChart } from '@/components/token/PriceChart';
import { useTokenBattleState } from '@/hooks/useTokenBattleState';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { BattleStatus } from '@/types/bonk';
import { VIRTUAL_RESERVE, VIRTUAL_SUPPLY } from '@/config/solana';
import { VictoryModal } from '@/components/battle/VictoryModal';
import { BattleMobileTradingDrawer } from '@/components/battle/BattleMobileTradingDrawer';

// =================================================================
// TIER TARGETS FROM SMART CONTRACT (SOL-based!)
// =================================================================
const TIER_CONFIG = {
  TEST: {
    TARGET_SOL: 6,           // 6 SOL = graduation
    VICTORY_VOLUME_SOL: 6.6, // 110% of TARGET_SOL (SOL-based!)
  },
  PRODUCTION: {
    TARGET_SOL: 37.7,        // 37.7 SOL = graduation
    VICTORY_VOLUME_SOL: 41.5, // 110% of TARGET_SOL (SOL-based!)
  }
};
const CURRENT_TIER = TIER_CONFIG.TEST;

export default function BattleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const battleId = params.id as string;

  // Parse battle ID to get both token mints
  const [tokenAMint, tokenBMint] = useMemo(() => {
    if (!battleId) return [null, null];
    const parts = battleId.split('-');
    try {
      if (parts.length === 2) {
        return [new PublicKey(parts[0]), new PublicKey(parts[1])];
      } else if (parts.length === 1) {
        return [new PublicKey(parts[0]), null];
      }
      return [null, null];
    } catch {
      return [null, null];
    }
  }, [battleId]);

  // Currently selected token for trading
  const [selectedToken, setSelectedToken] = useState<'A' | 'B'>('A');

  // Tab state for Comments/Trade section
  const [activeTab, setActiveTab] = useState<'comments' | 'trade'>('comments');

  // ═══════════════════════════════════════════════════════════════
  // VICTORY STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [victoryProcessing, setVictoryProcessing] = useState(false);
  const [victoryTriggered, setVictoryTriggered] = useState(false);
  const [victoryData, setVictoryData] = useState<{
    winnerMint: string;
    winnerSymbol: string;
    winnerImage: string;
    loserSymbol?: string;
    loserImage?: string;
    solCollected: number;
    volumeSol: number;
    poolId?: string;
    raydiumUrl?: string;
  } | null>(null);

  // Battle animation states
  const [attackA, setAttackA] = useState(false);
  const [attackB, setAttackB] = useState(false);
  const [clash, setClash] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // CHECK IF BATTLE ALREADY COMPLETED ON LOAD
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    async function checkBattleStatus() {
      const parts = battleId.split('-');
      if (parts.length !== 2) return;

      const [mintA, mintB] = parts;

      // Check both tokens for completed status
      for (const mint of [mintA, mintB]) {
        try {
          const res = await fetch(`/api/tokens/${mint}`);
          if (!res.ok) continue;

          const data = await res.json();

          // If token is Listed or PoolCreated, battle is over
          if (data.battle_status >= 4) { // Listed = 4, PoolCreated = 5
            console.log('🏆 Battle already completed! Winner:', mint);

            // Check if this token is in winners table
            const winnersRes = await fetch(`/api/winners/${mint}`);
            if (winnersRes.ok) {
              const winnerData = await winnersRes.json();
              if (winnerData) {
                // Redirect to winner's token page
                router.replace(`/token/${mint}`);
                return;
              }
            }
          }
        } catch (err) {
          console.error('Error checking token status:', err);
        }
      }
    }

    checkBattleStatus();
  }, [battleId, router]);

  // Battle animations effect
  useEffect(() => {
    // Don't animate if victory modal is showing
    if (showVictoryModal) return;

    let timeoutId: NodeJS.Timeout;
    let animationTimeoutId: NodeJS.Timeout;
    let isMounted = true;

    const startBattleAnimations = () => {
      if (!isMounted) return;

      const randomInterval = Math.random() * 1000 + 2000;

      timeoutId = setTimeout(() => {
        if (!isMounted) return;

        const action = Math.random();

        if (action < 0.45) {
          setAttackA(true);
          animationTimeoutId = setTimeout(() => {
            if (isMounted) setAttackA(false);
          }, 500);
        } else if (action < 0.9) {
          setAttackB(true);
          animationTimeoutId = setTimeout(() => {
            if (isMounted) setAttackB(false);
          }, 500);
        } else {
          setClash(true);
          animationTimeoutId = setTimeout(() => {
            if (isMounted) setClash(false);
          }, 500);
        }

        startBattleAnimations();
      }, randomInterval);
    };

    startBattleAnimations();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (animationTimeoutId) clearTimeout(animationTimeoutId);
    };
  }, [showVictoryModal]);

  // Fetch token A state first
  const { state: stateA, loading: loadingA, refetch: refetchA } = useTokenBattleState(tokenAMint);

  // Determine token B mint: from URL or from stateA.opponentMint
  const effectiveTokenBMint = useMemo(() => {
    if (tokenBMint) return tokenBMint;
    if (stateA?.opponentMint && !stateA.opponentMint.equals(PublicKey.default)) {
      return stateA.opponentMint;
    }
    return null;
  }, [tokenBMint, stateA?.opponentMint]);

  // Fetch token B state using effective mint
  const { state: stateB, loading: loadingB, refetch: refetchB } = useTokenBattleState(effectiveTokenBMint);

  // Get SOL price from oracle
  const { solPriceUsd, loading: priceLoading } = usePriceOracle();

  // Get token image helper
  const getTokenImage = useCallback((state: typeof stateA) => {
    return state?.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${state?.symbol || 'token'}`;
  }, []);

  // Calculate progress percentages (SOL-based!)
  const getProgress = useCallback((state: typeof stateA) => {
    if (!state) return { sol: 0, vol: 0, solCollected: 0, volumeSol: 0 };

    const solCollected = state.realSolReserves / 1e9;
    const volumeSol = state.totalTradeVolume / 1e9;

    return {
      sol: Math.min((solCollected / CURRENT_TIER.TARGET_SOL) * 100, 100),
      vol: Math.min((volumeSol / CURRENT_TIER.VICTORY_VOLUME_SOL) * 100, 100),
      solCollected,
      volumeSol
    };
  }, []);

  const progressA = getProgress(stateA);
  const progressB = getProgress(stateB);

  // ═══════════════════════════════════════════════════════════════
  // AUTO-VICTORY DETECTION & PROCESSING
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    // Guards
    if (!stateA) return;
    if (victoryTriggered) return; // Already triggered
    if (victoryProcessing) return;
    if (victoryData?.poolId) return; // Already has pool

    // Check victory conditions
    const tokenAWon = progressA.sol >= 99.5 && progressA.vol >= 99.5; // 99.5% tolerance
    const tokenBWon = stateB && progressB.sol >= 99.5 && progressB.vol >= 99.5;

    if (!tokenAWon && !tokenBWon) return;

    // Determine winner
    const isTokenAWinner = tokenAWon;
    const winnerMint = isTokenAWinner ? tokenAMint?.toString() : effectiveTokenBMint?.toString();
    const winnerState = isTokenAWinner ? stateA : stateB;
    const loserState = isTokenAWinner ? stateB : stateA;

    if (!winnerMint || !winnerState) return;

    console.log('🏆 VICTORY DETECTED!', winnerState.symbol, 'wins!');

    // Mark as triggered to prevent re-runs
    setVictoryTriggered(true);

    // Set initial victory data and show modal
    setVictoryData({
      winnerMint,
      winnerSymbol: winnerState.symbol || 'TOKEN',
      winnerImage: getTokenImage(winnerState),
      loserSymbol: loserState?.symbol,
      loserImage: loserState ? getTokenImage(loserState) : undefined,
      solCollected: isTokenAWinner ? progressA.solCollected : progressB.solCollected,
      volumeSol: isTokenAWinner ? progressA.volumeSol : progressB.volumeSol,
    });
    setShowVictoryModal(true);

    // Process victory automatically
    const processVictory = async () => {
      setVictoryProcessing(true);
      console.log('🚀 Auto-processing victory for:', winnerMint.slice(0, 8) + '...');

      try {
        const response = await fetch('/api/battles/auto-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenMint: winnerMint }),
        });

        const result = await response.json();
        console.log('🎉 Victory result:', result);

        if (result.success && result.poolId) {
          // Update victory data with pool info
          setVictoryData(prev => prev ? {
            ...prev,
            poolId: result.poolId,
            raydiumUrl: result.raydiumUrl,
          } : null);

          // Refetch states to update UI
          refetchA();
          refetchB();
        } else {
          console.error('Victory processing failed:', result.error);
          // Still show modal but without pool info
        }
      } catch (error) {
        console.error('Victory processing error:', error);
      } finally {
        setVictoryProcessing(false);
      }
    };

    // Small delay before processing to let modal render
    setTimeout(processVictory, 500);

  }, [
    stateA, stateB,
    progressA.sol, progressA.vol, progressA.solCollected, progressA.volumeSol,
    progressB.sol, progressB.vol, progressB.solCollected, progressB.volumeSol,
    tokenAMint, effectiveTokenBMint,
    victoryTriggered, victoryProcessing, victoryData?.poolId,
    getTokenImage, refetchA, refetchB
  ]);

  // Calculate scores (objectives reached)
  const scoreA = (progressA.sol >= 100 ? 1 : 0) + (progressA.vol >= 100 ? 1 : 0);
  const scoreB = (progressB.sol >= 100 ? 1 : 0) + (progressB.vol >= 100 ? 1 : 0);

  // Currently displayed token state
  const currentState = selectedToken === 'A' ? stateA : stateB;
  const currentMint = selectedToken === 'A' ? tokenAMint : effectiveTokenBMint;
  const currentProgress = selectedToken === 'A' ? progressA : progressB;

  // Loading state
  const isLoading = loadingA || loadingB || priceLoading;

  // ═══════════════════════════════════════════════════════════════
  // ERROR STATES
  // ═══════════════════════════════════════════════════════════════

  if (!tokenAMint) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl font-bold mb-2">Invalid Battle ID</div>
          <div className="text-gray-400 mb-4">The battle URL format is incorrect.</div>
          <Link href="/" className="text-orange-400 hover:underline">← Back to Home</Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 animate-bounce">
            <Image
              src="/BONK-LOGO.svg"
              alt="Bonk Battle"
              width={64}
              height={64}
              className="mx-auto"
            />
          </div>
          <div className="text-xl font-bold">Loading Bonk Battle...</div>
        </div>
      </div>
    );
  }

  if (!stateA) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl font-bold mb-2">Battle Not Found</div>
          <div className="text-gray-400 mb-4">Could not load token data for this battle.</div>
          <Link href="/" className="text-orange-400 hover:underline">← Back to Home</Link>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      {/* Tickers - Mobile only */}
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

          {/* Back Button + Battle Title - Centered */}
          <div className="flex items-center justify-center gap-4 mb-6 relative">
            <button
              onClick={() => router.back()}
              className="absolute left-0 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500">
                <Image
                  src={getTokenImage(stateA)}
                  alt={stateA.symbol || 'Token A'}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <span className="text-white font-bold text-sm">VS</span>
              <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-red-500">
                <Image
                  src={stateB ? getTokenImage(stateB) : '/placeholder-token.png'}
                  alt={stateB?.symbol || 'Token B'}
                  width={28}
                  height={28}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            </div>
            {/* Live indicator */}
            {stateA.battleStatus === BattleStatus.InBattle && (
              <span className="flex items-center gap-1 text-sm bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          {/* Battle Score Header */}
          <div className="battle-grid-bg border border-[#2a3544] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              {/* Token A */}
              <div
                className={`rounded-xl p-3 transition-all ${attackA || clash ? 'ticker-shake' : ''}`}
                style={{
                  backgroundColor: clash ? '#EFFE16' : '#4DB5FF',
                  boxShadow: attackA ? '0 0 20px rgba(77, 181, 255, 0.6)' : clash ? '0 0 20px rgba(239, 254, 22, 0.6)' : 'none'
                }}
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/20">
                  <Image
                    src={getTokenImage(stateA)}
                    alt={stateA.symbol || 'Token A'}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              </div>

              {/* SOL Values Only */}
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-400">
                  {progressA.solCollected.toFixed(2)} - {progressB.solCollected.toFixed(2)}
                </div>
              </div>

              {/* Token B */}
              <div
                className={`rounded-xl p-3 transition-all ${attackB || clash ? 'ticker-shake' : ''}`}
                style={{
                  backgroundColor: clash ? '#EFFE16' : '#FF5A8E',
                  boxShadow: attackB ? '0 0 20px rgba(255, 90, 142, 0.6)' : clash ? '0 0 20px rgba(239, 254, 22, 0.6)' : 'none'
                }}
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/20">
                  {stateB ? (
                    <Image
                      src={getTokenImage(stateB)}
                      alt={stateB.symbol || 'Token B'}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">❓</div>
                  )}
                </div>
              </div>
            </div>

            {/* Tekken Style Progress Bar */}
            <div className="mt-4">
              <div className="h-6 bg-[#2a3544] rounded-full overflow-hidden flex relative">
                {/* Blue side (Token A) */}
                <div
                  className="h-full bg-gradient-to-r from-[#4DB5FF] to-[#2196F3] transition-all duration-500"
                  style={{ width: `${((progressA.sol + progressA.vol) / 2)}%` }}
                />
                {/* Gap in the middle */}
                <div className="flex-1 bg-[#2a3544]" />
                {/* Pink side (Token B) */}
                <div
                  className="h-full bg-gradient-to-l from-[#FF5A8E] to-[#E91E63] transition-all duration-500"
                  style={{ width: `${stateB ? ((progressB.sol + progressB.vol) / 2) : 0}%` }}
                />
                {/* VS in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-black text-xs bg-black/50 px-2 py-0.5 rounded">VS</span>
                </div>
              </div>
              {/* Progress percentages */}
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-[#4DB5FF] font-bold">{((progressA.sol + progressA.vol) / 2).toFixed(1)}%</span>
                <span className="text-[#FF5A8E] font-bold">{stateB ? ((progressB.sol + progressB.vol) / 2).toFixed(1) : 0}%</span>
              </div>
            </div>
          </div>

          {/* Token Toggle */}
          <div className="mb-4">
            <div className="flex bg-white/5 rounded-lg p-1 max-w-xs">
              <button
                onClick={() => setSelectedToken('A')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${selectedToken === 'A'
                    ? 'bg-[#4DB5FF] text-white border-2 border-orange-500'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                {stateA.symbol}
              </button>
              {stateB && (
                <button
                  onClick={() => setSelectedToken('B')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${selectedToken === 'B'
                      ? 'text-white border-2 border-orange-500'
                      : 'text-gray-400 hover:text-white'
                    }`}
                  style={selectedToken === 'B' ? { backgroundColor: '#FF5A8E' } : {}}
                >
                  {stateB.symbol}
                </button>
              )}
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN - Token Details */}
            <div className="lg:col-span-8 space-y-6">

              {/* Token Info Card - Photo position matches button position */}
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4">
                <div className={`flex items-start justify-between gap-5 mb-6 ${selectedToken === 'A' ? '' : 'flex-row-reverse'}`}>
                  <div className="w-28 h-28 rounded-xl overflow-hidden bg-[#2a3544] flex-shrink-0">
                    <Image
                      src={getTokenImage(currentState)}
                      alt={currentState?.symbol || 'Token'}
                      width={112}
                      height={112}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className={`flex-1 ${selectedToken === 'A' ? '' : 'text-right'}`}>
                    <h2 className="text-2xl font-bold mb-3">${currentState?.symbol}</h2>
                    <div className={`flex items-center gap-2 text-xs ${selectedToken === 'A' ? '' : 'justify-end'}`}>
                      <span className="text-gray-500">CA:</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(currentMint?.toString() || '')}
                        className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded text-gray-400 font-mono hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Click to copy"
                      >
                        {currentMint?.toString().slice(0, 8)}...{currentMint?.toString().slice(-6)}
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="bg-white/5 rounded-xl p-4 space-y-5">
                  {/* Market Cap */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Market Cap</span>
                      <span className="font-bold text-white">
                        {currentProgress.sol.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-400">{currentProgress.solCollected.toFixed(2)} SOL</span>
                      <span className="text-yellow-400">🏆 Target: {CURRENT_TIER.TARGET_SOL} SOL</span>
                    </div>
                    <div className="h-3 bg-[#2a3544] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${currentProgress.sol >= 100
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                            : 'bg-gradient-to-r from-green-400 to-green-600'
                          }`}
                        style={{ width: `${currentProgress.sol}%` }}
                      />
                    </div>
                  </div>

                  {/* Volume */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">Volume</span>
                      <span className="font-bold text-white">
                        {currentProgress.vol.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-gray-400">{currentProgress.volumeSol.toFixed(2)} SOL</span>
                      <span className="text-yellow-400">🏆 Target: {CURRENT_TIER.VICTORY_VOLUME_SOL.toFixed(2)} SOL</span>
                    </div>
                    <div className="h-3 bg-[#2a3544] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${currentProgress.vol >= 100
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                            : 'bg-gradient-to-r from-orange-400 to-orange-600'
                          }`}
                        style={{ width: `${Math.min(currentProgress.vol, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart */}
              {currentState && (
                <PriceChart token={{
                  solRaised: currentState.realSolReserves / 1e9,
                  virtualSolInit: VIRTUAL_RESERVE / 1e9,
                  constantK: (BigInt(VIRTUAL_RESERVE) * BigInt(VIRTUAL_SUPPLY)).toString(),
                  createdAt: currentState.creationTimestamp,
                  name: currentState.name || 'Token',
                  symbol: currentState.symbol || 'TKN'
                }} />
              )}

              {/* Comments/Trade Tabs Section */}
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-[#2a3544]">
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
                      activeTab === 'comments'
                        ? 'text-orange-400 border-b-2 border-orange-400 bg-white/5'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    💬 Comments
                  </button>
                  <button
                    onClick={() => setActiveTab('trade')}
                    className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors ${
                      activeTab === 'trade'
                        ? 'text-orange-400 border-b-2 border-orange-400 bg-white/5'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    📊 Trade
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-4">
                  {activeTab === 'comments' ? (
                    <>
                      {/* Add Comment */}
                      <div className="flex gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                          ?
                        </div>
                        <div className="flex-1">
                          <textarea
                            placeholder="Add a comment..."
                            className="w-full bg-[#2a3544] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-orange-500/50"
                            rows={2}
                          />
                          <div className="flex justify-end mt-2">
                            <button className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-black font-bold text-sm rounded-lg transition-colors">
                              Post
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-4">
                        <div className="text-center text-gray-500 text-sm py-4">
                          No comments yet. Be the first to comment!
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Trade Tab Content */
                    <div className="space-y-4">
                      <div className="text-center py-6">
                        <div className="text-4xl mb-3">📈</div>
                        <p className="text-gray-400 text-sm mb-4">Recent trades for {currentState?.symbol}</p>
                      </div>

                      {/* Trade History Placeholder */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs text-gray-500 px-2">
                          <span>Type</span>
                          <span>Amount</span>
                          <span>Time</span>
                        </div>
                        <div className="text-center text-gray-500 text-sm py-4">
                          No trades yet
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Trading */}
            <div className="lg:col-span-4 space-y-6">
              {/* Trading Panel - Hidden on mobile/tablet (<810px), shown on desktop */}
              <div className="hidden tablet-trading:block">
              {currentMint && currentState && (
                <TradingPanel
                  mint={currentMint}
                  tokenState={{
                    symbol: currentState.symbol || 'TOKEN',
                    image: getTokenImage(currentState),
                    solCollected: currentState.realSolReserves,
                    totalTradeVolume: currentState.totalTradeVolume,
                    virtualSolReserves: currentState.virtualSolReserves,
                    realSolReserves: currentState.realSolReserves,
                  }}
                  solPriceUsd={solPriceUsd || 0}
                  onSuccess={() => {
                    refetchA();
                    refetchB();
                  }}
                />
              )}
              </div>

              {/* Battle Info - Tekken Style */}
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  ⚔️ Battle Info
                </h3>

                {/* Tekken Style Progress Bar */}
                <div className="relative">
                  {/* Token Photos */}
                  <div className="flex justify-between mb-2">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-[#4DB5FF] bg-[#2a3544]">
                        <Image
                          src={getTokenImage(stateA)}
                          alt={stateA.symbol || 'Token A'}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                      <span className="text-xs text-[#4DB5FF] font-bold mt-1">{stateA.symbol}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-[#FF5A8E] bg-[#2a3544]">
                        {stateB ? (
                          <Image
                            src={getTokenImage(stateB)}
                            alt={stateB.symbol || 'Token B'}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">❓</div>
                        )}
                      </div>
                      <span className="text-xs text-[#FF5A8E] font-bold mt-1">{stateB?.symbol || '???'}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-6 bg-[#2a3544] rounded-full overflow-hidden flex relative">
                    {/* Blue side (Token A) */}
                    <div
                      className="h-full bg-gradient-to-r from-[#4DB5FF] to-[#2196F3] transition-all duration-500"
                      style={{ width: `${((progressA.sol + progressA.vol) / 2)}%` }}
                    />
                    {/* Gap in the middle */}
                    <div className="flex-1 bg-[#2a3544]" />
                    {/* Pink side (Token B) */}
                    <div
                      className="h-full bg-gradient-to-l from-[#FF5A8E] to-[#E91E63] transition-all duration-500"
                      style={{ width: `${stateB ? ((progressB.sol + progressB.vol) / 2) : 0}%` }}
                    />
                    {/* VS in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-black text-xs bg-black/50 px-2 py-0.5 rounded">VS</span>
                    </div>
                  </div>

                  {/* Progress percentages */}
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-[#4DB5FF] font-bold">{((progressA.sol + progressA.vol) / 2).toFixed(1)}%</span>
                    <span className="text-[#FF5A8E] font-bold">{stateB ? ((progressB.sol + progressB.vol) / 2).toFixed(1) : 0}%</span>
                  </div>
                </div>
              </div>

              {/* Leading */}
              <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-xl p-4">
                <h3 className="font-bold mb-3">🏆 Leading</h3>
                {!stateB ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden">
                      <Image
                        src={getTokenImage(stateA)}
                        alt={stateA.symbol || ''}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="font-bold text-orange-400">{stateA.symbol}</div>
                      <div className="text-xs text-gray-400">Waiting for opponent</div>
                    </div>
                  </div>
                ) : progressA.sol + progressA.vol > progressB.sol + progressB.vol ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden">
                      <Image
                        src={getTokenImage(stateA)}
                        alt={stateA.symbol || ''}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="font-bold text-orange-400">{stateA.symbol}</div>
                      <div className="text-xs text-gray-400">
                        {((progressA.sol + progressA.vol) / 2).toFixed(1)}% progress
                      </div>
                    </div>
                  </div>
                ) : progressB.sol + progressB.vol > progressA.sol + progressA.vol ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden">
                      <Image
                        src={getTokenImage(stateB)}
                        alt={stateB.symbol || ''}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="font-bold text-orange-400">{stateB.symbol}</div>
                      <div className="text-xs text-gray-400">
                        {((progressB.sol + progressB.vol) / 2).toFixed(1)}% progress
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    ⚖️ Tied! Keep trading to break the tie.
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4">
                <h3 className="font-bold mb-4">⚡ Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-[#4DB5FF]">
                        <Image src={getTokenImage(stateA)} alt={stateA.symbol || ''} width={24} height={24} className="w-full h-full object-cover" unoptimized />
                      </div>
                      <span className="text-gray-400">{stateA.symbol} SOL</span>
                    </div>
                    <span className="font-semibold">{progressA.solCollected.toFixed(2)} SOL</span>
                  </div>
                  {stateB && (
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-[#FF5A8E]">
                          <Image src={getTokenImage(stateB)} alt={stateB.symbol || ''} width={24} height={24} className="w-full h-full object-cover" unoptimized />
                        </div>
                        <span className="text-gray-400">{stateB.symbol} SOL</span>
                      </div>
                      <span className="font-semibold">{progressB.solCollected.toFixed(2)} SOL</span>
                    </div>
                  )}
                  <div className="border-t border-gray-800 pt-3">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-[#4DB5FF]">
                          <Image src={getTokenImage(stateA)} alt={stateA.symbol || ''} width={24} height={24} className="w-full h-full object-cover" unoptimized />
                        </div>
                        <span className="text-gray-400">{stateA.symbol} Vol</span>
                      </div>
                      <span className="font-semibold">{progressA.volumeSol.toFixed(2)} SOL</span>
                    </div>
                  </div>
                  {stateB && (
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-[#FF5A8E]">
                          <Image src={getTokenImage(stateB)} alt={stateB.symbol || ''} width={24} height={24} className="w-full h-full object-cover" unoptimized />
                        </div>
                        <span className="text-gray-400">{stateB.symbol} Vol</span>
                      </div>
                      <span className="font-semibold">{progressB.volumeSol.toFixed(2)} SOL</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Trading Drawer - Only visible < 810px */}
      {tokenAMint && stateA && (
        <BattleMobileTradingDrawer
          tokenA={{
            mint: tokenAMint,
            symbol: stateA.symbol || 'TOKEN A',
            image: getTokenImage(stateA),
            battleStatus: stateA.battleStatus,
            solCollected: stateA.realSolReserves,
          }}
          tokenB={effectiveTokenBMint && stateB ? {
            mint: effectiveTokenBMint,
            symbol: stateB.symbol || 'TOKEN B',
            image: getTokenImage(stateB),
            battleStatus: stateB.battleStatus,
            solCollected: stateB.realSolReserves,
          } : undefined}
          selectedToken={selectedToken}
          onSelectToken={setSelectedToken}
          onSuccess={() => {
            refetchA();
            refetchB();
          }}
        />
      )}

      <MobileBottomNav />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* VICTORY MODAL - Auto-processes and redirects */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showVictoryModal && victoryData && (
        <VictoryModal
          winnerSymbol={victoryData.winnerSymbol}
          winnerImage={victoryData.winnerImage}
          winnerMint={victoryData.winnerMint}
          loserSymbol={victoryData.loserSymbol}
          loserImage={victoryData.loserImage}
          solCollected={victoryData.solCollected}
          volumeSol={victoryData.volumeSol}
          poolId={victoryData.poolId}
          raydiumUrl={victoryData.raydiumUrl}
          isProcessing={victoryProcessing}
          onClose={() => setShowVictoryModal(false)}
        />
      )}
    </div>
  );
}