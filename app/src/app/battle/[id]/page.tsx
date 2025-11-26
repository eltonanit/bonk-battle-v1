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
import { BattleStatus } from '@/types/bonk';
import { VIRTUAL_RESERVE, VIRTUAL_SUPPLY } from '@/config/solana';

// Victory targets (devnet)
const VICTORY_MC_USD = 5500;
const VICTORY_VOLUME_USD = 100;

export default function BattleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const battleId = params.id as string; // Format: "tokenA_mint-tokenB_mint"
  
  // Parse battle ID to get both token mints
  const [tokenAMint, tokenBMint] = useMemo(() => {
    if (!battleId) return [null, null];
    const parts = battleId.split('-');
    if (parts.length !== 2) return [null, null];
    try {
      return [new PublicKey(parts[0]), new PublicKey(parts[1])];
    } catch {
      return [null, null];
    }
  }, [battleId]);

  // Currently selected token for trading
  const [selectedToken, setSelectedToken] = useState<'A' | 'B'>('A');

  // Fetch both token states
  const { state: stateA, loading: loadingA, refetch: refetchA } = useTokenBattleState(tokenAMint);
  const { state: stateB, loading: loadingB, refetch: refetchB } = useTokenBattleState(tokenBMint);

  // Get SOL price from oracle
  const { solPriceUsd, loading: priceLoading } = usePriceOracle();

  // Convert lamports to USD
  const lamportsToUsd = (lamports: number): number => {
    if (!solPriceUsd) return 0;
    return (lamports / 1e9) * solPriceUsd;
  };

  // Calculate progress percentages
  const getProgress = (state: typeof stateA) => {
    if (!state || !solPriceUsd) return { mc: 0, vol: 0, mcUsd: 0, volUsd: 0 };
    
    const mcUsd = lamportsToUsd(state.solCollected);
    const volUsd = lamportsToUsd(state.totalTradeVolume);
    
    return {
      mc: Math.min((mcUsd / VICTORY_MC_USD) * 100, 100),
      vol: Math.min((volUsd / VICTORY_VOLUME_USD) * 100, 100),
      mcUsd,
      volUsd
    };
  };

  const progressA = getProgress(stateA);
  const progressB = getProgress(stateB);

  // Calculate scores (objectives reached)
  const scoreA = (progressA.mc >= 100 ? 1 : 0) + (progressA.vol >= 100 ? 1 : 0);
  const scoreB = (progressB.mc >= 100 ? 1 : 0) + (progressB.vol >= 100 ? 1 : 0);

  // Currently displayed token state
  const currentState = selectedToken === 'A' ? stateA : stateB;
  const currentMint = selectedToken === 'A' ? tokenAMint : tokenBMint;
  const currentProgress = selectedToken === 'A' ? progressA : progressB;

  // Format USD
  const formatUsd = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Get token image
  const getTokenImage = (state: typeof stateA) => {
    return state?.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${state?.symbol || 'token'}`;
  };

  // Loading state
  const isLoading = loadingA || loadingB || priceLoading;

  if (!tokenAMint || !tokenBMint) {
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
          <div className="text-4xl mb-4 animate-bounce">⚔️</div>
          <div className="text-xl font-bold">Loading battle...</div>
        </div>
      </div>
    );
  }

  if (!stateA || !stateB) {
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
      <DesktopHeader />
      <Header />
      <Sidebar />

      <div className="pt-32 lg:pt-0 lg:ml-56 lg:mt-16">
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
              {stateA.symbol} vs {stateB.symbol} Battle
            </h1>
            {solPriceUsd && (
              <span className="text-xs text-gray-500 ml-auto">
                SOL: <span className="text-green-400">${solPriceUsd.toFixed(2)}</span>
              </span>
            )}
          </div>

          {/* Battle Score Header */}
          <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              {/* Token A */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#2a3544]">
                  <Image
                    src={getTokenImage(stateA)}
                    alt={stateA.symbol || 'Token A'}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <div className="font-bold text-lg">{stateA.symbol}</div>
                  <div className="text-xs text-gray-400">{stateA.name}</div>
                </div>
              </div>

              {/* Score */}
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">SCORE</div>
                <div className="text-3xl font-black text-yellow-400">
                  {scoreA} - {scoreB}
                </div>
              </div>

              {/* Token B */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-bold text-lg">{stateB.symbol}</div>
                  <div className="text-xs text-gray-400">{stateB.name}</div>
                </div>
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#2a3544]">
                  <Image
                    src={getTokenImage(stateB)}
                    alt={stateB.symbol || 'Token B'}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN - Token Details */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Token Toggle */}
              <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4">
                <div className="flex bg-white/5 rounded-lg p-1 mb-6">
                  <button
                    onClick={() => setSelectedToken('A')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      selectedToken === 'A'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {stateA.symbol}
                  </button>
                  <button
                    onClick={() => setSelectedToken('B')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      selectedToken === 'B'
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {stateB.symbol}
                  </button>
                </div>

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

                {/* Progress Bars */}
                <div className="bg-white/5 rounded-xl p-4 space-y-5">
                  {/* Market Cap Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-yellow-400">
                          {currentProgress.mc >= 100 ? '1' : '0'}
                        </span>
                        <span className="font-semibold">Market Cap Progress</span>
                      </div>
                      <span className={`font-bold ${currentProgress.mc >= 100 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {currentProgress.mc.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>Current: {formatUsd(currentProgress.mcUsd)}</span>
                      <span>Target: {formatUsd(VICTORY_MC_USD)}</span>
                    </div>
                    <div className="h-3 bg-[#2a3544] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          currentProgress.mc >= 100
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                            : 'bg-gradient-to-r from-green-400 to-green-600'
                        }`}
                        style={{ width: `${currentProgress.mc}%` }}
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
                      <span>Current: {formatUsd(currentProgress.volUsd)}</span>
                      <span>Target: {formatUsd(VICTORY_VOLUME_USD)}</span>
                    </div>
                    <div className="h-3 bg-[#2a3544] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          currentProgress.vol >= 100
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                            : 'bg-gradient-to-r from-orange-400 to-orange-600'
                        }`}
                        style={{ width: `${currentProgress.vol}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart */}
              {currentState && (
                <PriceChart token={{
                  solRaised: currentState.solCollected / 1e9,
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
                      MC ≥ {formatUsd(VICTORY_MC_USD)} + Vol ≥ {formatUsd(VICTORY_VOLUME_USD)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">{stateA.symbol} Progress</div>
                    <div className="font-semibold">
                      {((progressA.mc + progressA.vol) / 2).toFixed(1)}% avg
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">{stateB.symbol} Progress</div>
                    <div className="font-semibold">
                      {((progressB.mc + progressB.vol) / 2).toFixed(1)}% avg
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Trading */}
            <div className="lg:col-span-4 space-y-6">
              {/* Trading Panel */}
              {currentMint && (
                <TradingPanel 
                  mint={currentMint} 
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
                    <span className="text-gray-400">{stateA.symbol} MC</span>
                    <span className="font-semibold">{formatUsd(progressA.mcUsd)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{stateB.symbol} MC</span>
                    <span className="font-semibold">{formatUsd(progressB.mcUsd)}</span>
                  </div>
                  <div className="border-t border-gray-800 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{stateA.symbol} Vol</span>
                      <span className="font-semibold">{formatUsd(progressA.volUsd)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{stateB.symbol} Vol</span>
                    <span className="font-semibold">{formatUsd(progressB.volUsd)}</span>
                  </div>
                </div>
              </div>

              {/* Winner Prediction */}
              <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-xl p-4">
                <h3 className="font-bold mb-3">🏆 Leading</h3>
                {progressA.mc + progressA.vol > progressB.mc + progressB.vol ? (
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
                        {((progressA.mc + progressA.vol) / 2).toFixed(1)}% progress
                      </div>
                    </div>
                  </div>
                ) : progressB.mc + progressB.vol > progressA.mc + progressA.vol ? (
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
                        {((progressB.mc + progressB.vol) / 2).toFixed(1)}% progress
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
    </div>
  );
}