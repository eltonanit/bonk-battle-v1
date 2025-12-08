// app/src/app/battle/[id]/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
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
  const battleId = params.id as string; // Format: "tokenA_mint-tokenB_mint"
  
  // Parse battle ID to get both token mints
  // Format: "mintA-mintB" or just "mintA" (if opponent not yet assigned)
  const [tokenAMint, tokenBMint] = useMemo(() => {
    if (!battleId) return [null, null];
    const parts = battleId.split('-');
    try {
      if (parts.length === 2) {
        return [new PublicKey(parts[0]), new PublicKey(parts[1])];
      } else if (parts.length === 1) {
        // Single mint - will fetch opponent from on-chain data
        return [new PublicKey(parts[0]), null];
      }
      return [null, null];
    } catch {
      return [null, null];
    }
  }, [battleId]);

  // Currently selected token for trading
  const [selectedToken, setSelectedToken] = useState<'A' | 'B'>('A');

  // ═══════════════════════════════════════════════════════════════
  // CHECK IF BATTLE IS COMPLETED AND REDIRECT
  // ═══════════════════════════════════════════════════════════════
  const [battleEnded, setBattleEnded] = useState(false);
  const [winnerMint, setWinnerMint] = useState<string | null>(null);

  useEffect(() => {
    async function checkBattleCompletion() {
      // Extract mints from URL (format: mintA-mintB)
      const parts = battleId.split('-');
      if (parts.length !== 2) return;

      const [mintA, mintB] = parts;

      // Check both tokens for victory
      for (const mint of [mintA, mintB]) {
        try {
          const res = await fetch(`/api/battles/status?id=${mint}`);
          const data = await res.json();

          if (data.completed && data.winnerMint) {
            console.log('🏆 Battle completed! Winner:', data.winnerMint);
            setBattleEnded(true);
            setWinnerMint(data.winnerMint);

            // Redirect after 3 seconds
            setTimeout(() => {
              router.push(`/token/${data.winnerMint}`);
            }, 3000);
            return;
          }
        } catch (err) {
          console.error('Error checking battle status:', err);
        }
      }
    }

    checkBattleCompletion();

    // Check every 5 seconds during active battle
    const interval = setInterval(checkBattleCompletion, 5000);
    return () => clearInterval(interval);
  }, [battleId, router]);

  // Show victory screen
  if (battleEnded && winnerMint) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-900/20 to-black">
        <div className="text-center">
          <div className="text-8xl mb-6 animate-bounce">🏆</div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 mb-4">
            BATTLE COMPLETE!
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            Redirecting to winner&apos;s token page...
          </p>
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  // Victory modal states
  const [showVictoryModal, setShowVictoryModal] = useState(false);
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

  // Battle animations effect
  useEffect(() => {
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
  }, []);

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

  // Convert lamports to USD
  const lamportsToUsd = (lamports: number): number => {
    if (!solPriceUsd) return 0;
    return (lamports / 1e9) * solPriceUsd;
  };

  // Calculate progress percentages (SOL-based!)
  const getProgress = (state: typeof stateA) => {
    if (!state) return { sol: 0, vol: 0, solCollected: 0, volumeSol: 0 };

    // Convert lamports to SOL
    const solCollected = state.realSolReserves / 1e9;
    const volumeSol = state.totalTradeVolume / 1e9;

    return {
      // SOL-based progress!
      sol: Math.min((solCollected / CURRENT_TIER.TARGET_SOL) * 100, 100),
      vol: Math.min((volumeSol / CURRENT_TIER.VICTORY_VOLUME_SOL) * 100, 100),
      solCollected,
      volumeSol
    };
  };

  const progressA = getProgress(stateA);
  const progressB = getProgress(stateB);

  // Check for victory condition
  useEffect(() => {
    if (!stateA || !stateB) return;

    const checkForVictory = () => {
      // Check if token A won
      if (progressA.sol >= 100 && progressA.vol >= 100) {
        setVictoryData({
          winnerMint: tokenAMint!.toString(),
          winnerSymbol: stateA.symbol || 'TOKEN',
          winnerImage: getTokenImage(stateA),
          loserSymbol: stateB?.symbol,
          loserImage: stateB ? getTokenImage(stateB) : undefined,
          solCollected: progressA.solCollected,
          volumeSol: progressA.volumeSol,
        });
        setShowVictoryModal(true);
        return;
      }

      // Check if token B won
      if (progressB.sol >= 100 && progressB.vol >= 100) {
        setVictoryData({
          winnerMint: effectiveTokenBMint!.toString(),
          winnerSymbol: stateB!.symbol || 'TOKEN',
          winnerImage: getTokenImage(stateB),
          loserSymbol: stateA.symbol,
          loserImage: getTokenImage(stateA),
          solCollected: progressB.solCollected,
          volumeSol: progressB.volumeSol,
        });
        setShowVictoryModal(true);
      }
    };

    checkForVictory();
  }, [progressA.sol, progressA.vol, progressB.sol, progressB.vol, stateA, stateB, tokenAMint, effectiveTokenBMint]);

  // Handle claim victory
  const handleClaimVictory = async () => {
    if (!victoryData) return;

    try {
      const response = await fetch('/api/battles/auto-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenMint: victoryData.winnerMint }),
      });

      const result = await response.json();

      if (result.success && result.poolId) {
        setVictoryData(prev => prev ? {
          ...prev,
          poolId: result.poolId,
          raydiumUrl: result.raydiumUrl,
        } : null);

        // Refetch states
        refetchA();
        refetchB();
      } else {
        console.error('Claim victory failed:', result.error);
        alert(`Failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Claim victory error:', error);
    }
  };

  // Calculate scores (objectives reached)
  const scoreA = (progressA.sol >= 100 ? 1 : 0) + (progressA.vol >= 100 ? 1 : 0);
  const scoreB = (progressB.sol >= 100 ? 1 : 0) + (progressB.vol >= 100 ? 1 : 0);

  // Currently displayed token state
  const currentState = selectedToken === 'A' ? stateA : stateB;
  const currentMint = selectedToken === 'A' ? tokenAMint : effectiveTokenBMint;
  const currentProgress = selectedToken === 'A' ? progressA : progressB;

  // Format SOL
  const formatSol = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K SOL`;
    return `${value.toFixed(2)} SOL`;
  };

  // Get token image
  const getTokenImage = (state: typeof stateA) => {
    return state?.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${state?.symbol || 'token'}`;
  };

  // Loading state
  const isLoading = loadingA || loadingB || priceLoading;

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

  return (
    <div className="min-h-screen bg-bonk-dark text-white">
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

          {/* Back Button + Battle Title */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold">
              {stateA.symbol} vs {stateB?.symbol || '???'} Battle
            </h1>
          </div>

          {/* Battle Score Header */}
          <div className="battle-grid-bg border border-[#2a3544] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              {/* Token A - Blue Background */}
              <div
                className={`rounded-xl p-3 ${attackA || clash ? 'ticker-shake' : ''}`}
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

              {/* Score */}
              <div className="text-center">
                <div className="text-[10px] text-gray-400 uppercase">target</div>
                <div className="text-sm font-bold text-yellow-400 mb-1">
                  {scoreA} - {scoreB}
                </div>
                <div className="text-xs text-gray-400 uppercase">SOL Collected</div>
                <div className="text-lg font-black text-white">
                  {progressA.solCollected.toFixed(2)} - {progressB.solCollected.toFixed(2)} SOL
                </div>
              </div>

              {/* Token B - Red/Pink Background */}
              <div
                className={`rounded-xl p-3 ${attackB || clash ? 'ticker-shake' : ''}`}
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
          </div>

          {/* Token Toggle - Above Grid, Narrower */}
          <div className="mb-4">
            <div className="flex bg-white/5 rounded-lg p-1 max-w-xs">
              <button
                onClick={() => setSelectedToken('A')}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                  selectedToken === 'A'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {stateA.symbol}
              </button>
              {stateB && (
                <button
                  onClick={() => setSelectedToken('B')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                    selectedToken === 'B'
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
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

              {/* Token Info Card */}
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4">
                {/* Token Display */}
                <div className="flex items-start gap-5 mb-6">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#2a3544] flex-shrink-0">
                    <Image
                      src={getTokenImage(currentState)}
                      alt={currentState?.symbol || 'Token'}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1">{currentState?.symbol}</h2>
                    <div className="text-gray-400 mb-3">{currentState?.name}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">CA:</span>
                      <code className="bg-white/5 px-2 py-1 rounded text-green-400 font-mono">
                        {currentMint?.toString().slice(0, 8)}...{currentMint?.toString().slice(-6)}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(currentMint?.toString() || '')}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bars - SOL BASED */}
                <div className="bg-white/5 rounded-xl p-4 space-y-5">
                  {/* SOL Collected Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-yellow-400">
                          {currentProgress.sol >= 100 ? '1' : '0'}
                        </span>
                        <span className="font-semibold">SOL Progress</span>
                      </div>
                      <span className={`font-bold ${currentProgress.sol >= 100 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {currentProgress.sol.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>Current: {currentProgress.solCollected.toFixed(2)} SOL</span>
                      <span>Target: {CURRENT_TIER.TARGET_SOL} SOL</span>
                    </div>
                    <div className="h-3 bg-[#2a3544] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          currentProgress.sol >= 100
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                            : 'bg-gradient-to-r from-green-400 to-green-600'
                        }`}
                        style={{ width: `${currentProgress.sol}%` }}
                      />
                    </div>
                  </div>

                  {/* Volume Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-yellow-400">
                          {currentProgress.vol >= 100 ? '1' : '0'}
                        </span>
                        <span className="font-semibold">Volume Progress</span>
                      </div>
                      <span className={`font-bold ${currentProgress.vol >= 100 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {currentProgress.vol.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>Current: {currentProgress.volumeSol.toFixed(2)} SOL</span>
                      <span>Target: {CURRENT_TIER.VICTORY_VOLUME_SOL.toFixed(2)} SOL</span>
                    </div>
                    <div className="h-3 bg-[#2a3544] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          currentProgress.vol >= 100
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

              {/* Battle Info */}
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  ⚔️ Battle Info
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400 mb-1">Battle Status</div>
                    <div className="font-semibold text-green-400">
                      {stateA.battleStatus === BattleStatus.InBattle ? '🔴 LIVE' : 'Pending'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Victory Condition</div>
                    <div className="font-semibold">
                      SOL ≥ {CURRENT_TIER.TARGET_SOL} + Vol ≥ {CURRENT_TIER.VICTORY_VOLUME_SOL.toFixed(2)} SOL
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">{stateA.symbol} Progress</div>
                    <div className="font-semibold">
                      {((progressA.sol + progressA.vol) / 2).toFixed(1)}% avg
                    </div>
                  </div>
                  {stateB && (
                    <div>
                      <div className="text-gray-400 mb-1">{stateB.symbol} Progress</div>
                      <div className="font-semibold">
                        {((progressB.sol + progressB.vol) / 2).toFixed(1)}% avg
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Trading */}
            <div className="lg:col-span-4 space-y-6">
              {/* Trading Panel */}
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

              {/* Quick Stats */}
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4">
                <h3 className="font-bold mb-4">⚡ Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{stateA.symbol} SOL</span>
                    <span className="font-semibold">{progressA.solCollected.toFixed(2)} SOL</span>
                  </div>
                  {stateB && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{stateB.symbol} SOL</span>
                      <span className="font-semibold">{progressB.solCollected.toFixed(2)} SOL</span>
                    </div>
                  )}
                  <div className="border-t border-gray-800 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{stateA.symbol} Vol</span>
                      <span className="font-semibold">{progressA.volumeSol.toFixed(2)} SOL</span>
                    </div>
                  </div>
                  {stateB && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{stateB.symbol} Vol</span>
                      <span className="font-semibold">{progressB.volumeSol.toFixed(2)} SOL</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Winner Prediction */}
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
            </div>
          </div>
        </div>
      </div>
      
      <MobileBottomNav />

      {/* Victory Modal */}
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
          onClaimVictory={handleClaimVictory}
          onClose={() => setShowVictoryModal(false)}
        />
      )}
    </div>
  );
}