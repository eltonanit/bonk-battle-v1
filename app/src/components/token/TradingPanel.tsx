// app/src/components/token/TradingPanel.tsx
// ✅ CON POPUP BATTLE READY - Mostra quando token si qualifica
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useUserTokenBalance } from '@/hooks/useUserTokenBalance';
import { buyToken } from '@/lib/solana/buy-token';
import { sellToken } from '@/lib/solana/sell-token';
import { TransactionSuccessPopup } from '@/components/shared/TransactionSuccessPopup';
import { BattleReadyPopup } from '@/components/shared/BattleReadyPopup';
import { supabase } from '@/lib/supabase';

// ============================================================
// 🎯 VICTORY TARGETS (SOL-BASED - TEST TIER)
// ============================================================
const TARGET_SOL = 6.0;           // Target for graduation
const VICTORY_VOLUME_SOL = 6.6;   // Volume requirement (110%)
const TRADING_FEE = 0.02;         // 2% fee

// Legacy USD targets (for display only)
const VICTORY_MC_USD = 5500;
const VICTORY_VOLUME_USD = 100;

// Auto-disable threshold (97%)
const AUTO_DISABLE_THRESHOLD = 97;

interface TokenState {
  symbol: string;
  image: string;
  solCollected: number;      // in lamports
  totalTradeVolume: number;  // in lamports
  virtualSolReserves: number; // in lamports
  realSolReserves: number;   // in lamports
  battleStatus?: number;     // ⭐ 0=Created, 1=Qualified, 2=InBattle, 3=VictoryPending, 4=Listed
}

interface TradingPanelProps {
  mint: PublicKey;
  tokenState?: TokenState;
  solPriceUsd?: number;
  onSuccess?: () => void;
}

// ============================================================
// 🚀 GRADUATION POPUP COMPONENT
// ============================================================
interface GraduationPopupProps {
  show: boolean;
  onClose: () => void;
  onBuyExact: (amount: number) => void;
  onTriggerVictory: () => void;
  solRemaining: number;
  solCollected: number;
  targetSol: number;
  tokenSymbol: string;
  loading: boolean;
}

function GraduationPopup({
  show,
  onClose,
  onBuyExact,
  onTriggerVictory,
  solRemaining,
  solCollected,
  targetSol,
  tokenSymbol,
  loading
}: GraduationPopupProps) {
  if (!show) return null;

  const progressPercent = (solCollected / targetSol) * 100;
  const isAtLimit = solRemaining < 0.01;
  const maxSafeAmount = isAtLimit ? 0 : solRemaining * 0.99;
  const safeAmount = Math.floor(maxSafeAmount * 10000) / 10000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-[#1a1f2e] border-2 border-yellow-500/50 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-yellow-500/20">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{isAtLimit ? '🏆' : '⚠️'}</div>
          <h2 className="text-xl font-bold text-yellow-400">
            {isAtLimit ? 'Graduation Ready!' : 'Graduation in Progress!'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {isAtLimit
              ? `${tokenSymbol} has reached the bonding curve limit!`
              : `${tokenSymbol} is about to complete bonding curve`
            }
          </p>
        </div>

        <div className="bg-black/30 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">SOL Collected</span>
            <span className="text-white font-bold">{solCollected.toFixed(4)} SOL</span>
          </div>

          <div className="h-3 bg-[#2a3544] rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isAtLimit
                ? 'bg-gradient-to-r from-green-400 to-green-500 animate-pulse'
                : 'bg-gradient-to-r from-yellow-400 to-orange-500'
                }`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Target: {targetSol} SOL</span>
            <span className={`font-bold ${isAtLimit ? 'text-green-400' : 'text-yellow-400'}`}>
              {progressPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {isAtLimit ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
            <div className="text-center">
              <p className="text-green-400 font-bold text-lg mb-2">
                🎯 Victory Threshold Reached!
              </p>
              <p className="text-gray-400 text-sm">
                The bonding curve is complete. Click below to check victory conditions.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">Maximum safe buy amount:</p>
              <p className="text-3xl font-bold text-yellow-400">
                {safeAmount.toFixed(4)} SOL
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Remaining: {solRemaining.toFixed(4)} SOL
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {isAtLimit ? (
            <button
              onClick={onTriggerVictory}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-black font-bold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Checking Victory...
                </>
              ) : (
                <>
                  🏆 Check Victory Conditions
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => onBuyExact(safeAmount)}
              disabled={loading || safeAmount <= 0}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Processing...
                </>
              ) : (
                <>
                  🚀 Buy {safeAmount.toFixed(4)} SOL
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            disabled={loading}
            className="w-full py-3 bg-[#2a3544] hover:bg-[#3a4554] text-gray-400 font-medium rounded-xl transition-all disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <p className="text-center text-gray-500 text-xs mt-4">
          {isAtLimit
            ? '⚡ Victory check will verify both SOL and Volume conditions'
            : '⚡ This amount will bring the token closer to graduation'
          }
        </p>
      </div>
    </div>
  );
}

// ============================================================
// 🎮 MAIN TRADING PANEL
// ============================================================
export function TradingPanel({ mint, tokenState, solPriceUsd = 0, onSuccess }: TradingPanelProps) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const { balance, balanceFormatted } = useUserTokenBalance(mint);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isVictoryPopup, setIsVictoryPopup] = useState(false);

  // 🚀 GRADUATION POPUP STATE
  const [showGraduationPopup, setShowGraduationPopup] = useState(false);
  const [graduationLoading, setGraduationLoading] = useState(false);

  // ⚔️ BATTLE READY POPUP STATE
  const [showBattleReady, setShowBattleReady] = useState(false);

  // Fetch SOL balance
  useEffect(() => {
    if (!publicKey || !connection) return;
    connection.getBalance(publicKey).then((bal) => {
      setSolBalance(bal / 1e9);
    }).catch(console.error);
  }, [publicKey, connection]);

  // ============================================================
  // 🎯 SOL-BASED PROGRESS CALCULATIONS
  // ============================================================
  const progressData = useMemo(() => {
    if (!tokenState) {
      return {
        mcProgress: 0,
        volProgress: 0,
        overallProgress: 0,
        currentMcUsd: 0,
        currentVolUsd: 0,
        solCollectedSol: 0,
        totalVolumeSol: 0,
        solRemaining: TARGET_SOL,
        maxBuyableSol: TARGET_SOL,
        isNearGraduation: false,
        isGraduationLocked: false,
      };
    }

    const solCollectedSol = tokenState.solCollected / 1e9;
    const totalVolumeSol = tokenState.totalTradeVolume / 1e9;

    const solProgress = (solCollectedSol / TARGET_SOL) * 100;
    const volumeProgress = (totalVolumeSol / VICTORY_VOLUME_SOL) * 100;

    const currentMcUsd = solCollectedSol * (solPriceUsd || 0);
    const currentVolUsd = totalVolumeSol * (solPriceUsd || 0);
    const mcProgress = Math.min((currentMcUsd / VICTORY_MC_USD) * 100, 100);
    const volProgress = Math.min((currentVolUsd / VICTORY_VOLUME_USD) * 100, 100);

    const overallProgress = solProgress;

    const solRemaining = Math.max(0, TARGET_SOL - solCollectedSol);
    const maxBuyableSol = solRemaining / (1 - TRADING_FEE);

    const isNearGraduation = solProgress >= AUTO_DISABLE_THRESHOLD;
    const isGraduationLocked = solProgress >= 100 || solRemaining <= 0.001;

    return {
      mcProgress,
      volProgress,
      overallProgress,
      currentMcUsd,
      currentVolUsd,
      solCollectedSol,
      totalVolumeSol,
      solRemaining,
      maxBuyableSol,
      isNearGraduation,
      isGraduationLocked,
      solProgress,
      volumeProgress,
    };
  }, [tokenState, solPriceUsd]);

  // ============================================================
  // ⚔️ CHECK IF TOKEN JUST QUALIFIED
  // ============================================================
  const checkQualification = useCallback(async (statusBeforeBuy: number | undefined) => {
    try {
      console.log('⚔️ Checking qualification. Status before buy:', statusBeforeBuy);

      // Fetch current status from Supabase
      const { data } = await supabase
        .from('tokens')
        .select('battle_status')
        .eq('mint', mint.toString())
        .single();

      console.log('⚔️ Current status from DB:', data?.battle_status);

      // Check if status changed from 0 (Created) to 1 (Qualified)
      if (data && data.battle_status === 1 && statusBeforeBuy === 0) {
        // Token just qualified! Show popup
        console.log('⚔️ Token just qualified! Showing Battle Ready popup');
        setShowBattleReady(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error checking qualification:', err);
      return false;
    }
  }, [mint]);

  // ============================================================
  // 🛒 BUY HANDLER
  // ============================================================
  const handleBuy = async () => {
    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet');
      return;
    }

    if (progressData.isGraduationLocked) {
      setSuccessMessage('🏆 This token has reached victory! Finalizing battle...');
      setIsVictoryPopup(true);
      setShowSuccess(true);
      triggerVictoryCheck();
      return;
    }

    const solAmount = parseFloat(amount);
    if (isNaN(solAmount) || solAmount <= 0) {
      alert('Please enter a valid SOL amount');
      return;
    }

    if (solAmount < 0.001) {
      alert('Minimum buy amount is 0.001 SOL');
      return;
    }

    // ⚔️ SAVE STATUS BEFORE BUY
    const statusBeforeBuy = tokenState?.battleStatus;
    console.log('⚔️ Status BEFORE buy:', statusBeforeBuy);

    setLoading(true);
    try {
      const result = await buyToken(
        publicKey,
        mint,
        solAmount,
        signTransaction,
        0,
        tokenState?.battleStatus
      );

      console.log('✅ Buy successful:', result);

      // ⚔️ Check if token just qualified after buy
      // Wait for webhook to sync
      setTimeout(async () => {
        const qualified = await checkQualification(statusBeforeBuy);
        if (!qualified) {
          // Normal success popup
          setSuccessMessage(`Bought tokens for ${solAmount} SOL`);
          setIsVictoryPopup(false);
          setShowSuccess(true);
        }
      }, 2500); // 2.5 seconds for webhook sync

      setAmount('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('❌ Buy error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage.includes('GRADUATION_READY') ||
        errorMessage.includes('WouldExceedGraduation') ||
        errorMessage.includes('0x1786') ||
        errorMessage.includes('6022')) {
        console.log('🚀 Showing graduation popup');
        setShowGraduationPopup(true);
        return;
      }

      alert(`Failed to buy tokens: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🚀 GRADUATION BUY HANDLER
  // ============================================================
  const handleGraduationBuy = async (exactAmount: number) => {
    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet');
      return;
    }

    setGraduationLoading(true);
    try {
      console.log(`🚀 Graduation buy: ${exactAmount} SOL`);

      const result = await buyToken(
        publicKey,
        mint,
        exactAmount,
        signTransaction,
        0,
        tokenState?.battleStatus
      );

      console.log('✅ Graduation buy successful:', result);
      setShowGraduationPopup(false);
      setSuccessMessage(`🏆 Graduation complete! Bought ${exactAmount} SOL`);
      setIsVictoryPopup(true);
      setShowSuccess(true);
      setAmount('');

      triggerVictoryCheck();

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('❌ Graduation buy error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage.includes('GRADUATION_READY') ||
        errorMessage.includes('WouldExceedGraduation')) {
        setShowGraduationPopup(false);
        setSuccessMessage('🏆 Token at graduation threshold! Checking victory...');
        setIsVictoryPopup(true);
        setShowSuccess(true);
        triggerVictoryCheck();
        return;
      }

      alert(`Failed: ${errorMessage}`);
    } finally {
      setGraduationLoading(false);
    }
  };

  // ============================================================
  // 🏆 VICTORY CHECK FROM POPUP
  // ============================================================
  const handleVictoryFromPopup = async () => {
    setGraduationLoading(true);
    try {
      console.log('🏆 Triggering victory check from graduation popup');
      await triggerVictoryCheck();

      setShowGraduationPopup(false);
      setSuccessMessage('🏆 Victory conditions checked! See results above.');
      setIsVictoryPopup(true);
      setShowSuccess(true);

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Victory check error:', err);
      alert('Failed to check victory conditions. Please try again.');
    } finally {
      setGraduationLoading(false);
    }
  };

  // ============================================================
  // 🏆 VICTORY CHECK TRIGGER
  // ============================================================
  const triggerVictoryCheck = async () => {
    try {
      console.log('🏆 Triggering victory check for:', mint.toString());
      const response = await fetch('/api/battles/check-victory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenMint: mint.toString() })
      });
      const data = await response.json();
      console.log('🏆 Victory check result:', data);

      if (data.victory) {
        setSuccessMessage(`🏆 VICTORY! ${tokenState?.symbol || 'Token'} won the battle! Preparing for DEX listing...`);
      } else if (data.success) {
        setSuccessMessage(`⚔️ Battle continues - checking victory conditions...`);
      } else {
        setSuccessMessage(`🏆 Token at graduation threshold!`);
      }
    } catch (victoryErr) {
      console.error('Victory check error:', victoryErr);
      setSuccessMessage('🏆 Token reached limit! Victory check in progress...');
    }
  };

  // ============================================================
  // 💰 SELL HANDLER
  // ============================================================
  const handleSell = async () => {
    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet');
      return;
    }

    const tokenAmount = parseFloat(amount);
    if (isNaN(tokenAmount) || tokenAmount <= 0) {
      alert('Please enter a valid token amount');
      return;
    }

    const tokenAmountRaw = Math.floor(tokenAmount * 1e9);

    if (balance === null || tokenAmountRaw > balance) {
      alert('Insufficient token balance');
      return;
    }

    setLoading(true);
    try {
      const result = await sellToken(
        publicKey,
        mint,
        tokenAmountRaw,
        signTransaction
      );

      console.log('✅ Sell successful:', result);
      setSuccessMessage(`Sold ${tokenAmount.toFixed(2)} ${tokenState?.symbol || 'tokens'}`);
      setIsVictoryPopup(false);
      setShowSuccess(true);
      setAmount('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('❌ Sell error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to sell tokens: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = useCallback(() => {
    setShowSuccess(false);
    setIsVictoryPopup(false);
  }, []);

  const handleBattleReadyClose = useCallback(() => {
    setShowBattleReady(false);
  }, []);

  // ============================================================
  // 🎮 PERCENTAGE BUTTONS
  // ============================================================
  const handlePercentage = (percent: number) => {
    if (mode === 'buy') {
      if (!solBalance) return;
      const maxUsable = Math.min(solBalance - 0.01, progressData.maxBuyableSol);
      const value = Math.max(0, maxUsable * (percent / 100));
      setAmount(value.toFixed(4));
    } else {
      if (!balanceFormatted) return;
      const value = balanceFormatted * (percent / 100);
      setAmount(value.toFixed(6));
    }
  };

  const tokenSymbol = tokenState?.symbol || 'TOKEN';

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4">
      {/* 🚀 GRADUATION POPUP */}
      <GraduationPopup
        show={showGraduationPopup}
        onClose={() => setShowGraduationPopup(false)}
        onBuyExact={handleGraduationBuy}
        onTriggerVictory={handleVictoryFromPopup}
        solRemaining={progressData.solRemaining}
        solCollected={progressData.solCollectedSol}
        targetSol={TARGET_SOL}
        tokenSymbol={tokenSymbol}
        loading={graduationLoading}
      />

      {/* ⚔️ BATTLE READY POPUP */}
      <BattleReadyPopup
        show={showBattleReady}
        onClose={handleBattleReadyClose}
        tokenImage={tokenState?.image || ''}
        tokenSymbol={tokenSymbol}
        tokenMint={mint.toString()}
      />

      {/* Success Popup */}
      <TransactionSuccessPopup
        show={showSuccess}
        message={isVictoryPopup ? "🏆 Victory!" : "Transaction Successful"}
        subMessage={successMessage}
        onClose={handleSuccessClose}
        autoCloseMs={isVictoryPopup ? 5000 : 2500}
      />

      {/* ============================================================ */}
      {/* 🏆 VICTORY PROGRESS SECTION */}
      {/* ============================================================ */}
      {tokenState && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-300">🏆 Victory Progress</span>
            <span className={`text-sm font-bold ${progressData.isGraduationLocked ? 'text-yellow-400' :
              progressData.isNearGraduation ? 'text-orange-400' : 'text-green-400'
              }`}>
              {progressData.overallProgress.toFixed(1)}%
            </span>
          </div>

          <div className="h-2 bg-[#2a3544] rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressData.isGraduationLocked
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse'
                : progressData.isNearGraduation
                  ? 'bg-gradient-to-r from-orange-400 to-red-500'
                  : 'bg-gradient-to-r from-green-400 to-green-600'
                }`}
              style={{ width: `${progressData.overallProgress}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">SOL:</span>
              <span className="ml-1 text-white">{progressData.solCollectedSol.toFixed(3)}</span>
              <span className="text-gray-500">/{TARGET_SOL}</span>
            </div>
            <div>
              <span className="text-gray-500">Vol:</span>
              <span className="ml-1 text-white">{progressData.totalVolumeSol.toFixed(2)}</span>
              <span className="text-gray-500">/{VICTORY_VOLUME_SOL}</span>
            </div>
          </div>

          {mode === 'buy' && progressData.solRemaining > 0 && progressData.solRemaining < 1 && (
            <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-300">
              ⚡ Only <span className="font-bold">{progressData.solRemaining.toFixed(4)} SOL</span> remaining to graduate!
            </div>
          )}

          {progressData.isGraduationLocked && (
            <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-300 text-center">
              🏆 GRADUATION COMPLETE - Token ready for DEX listing!
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* BUY/SELL TOGGLE */}
      {/* ============================================================ */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setMode('buy'); setAmount(''); }}
          className={`flex-1 py-2 rounded-lg font-bold transition-all ${mode === 'buy'
            ? 'bg-green-500 text-black'
            : 'bg-[#2a3544] text-gray-400 hover:bg-[#3a4554]'
            }`}
        >
          Buy
        </button>
        <button
          onClick={() => { setMode('sell'); setAmount(''); }}
          className={`flex-1 py-2 rounded-lg font-bold transition-all ${mode === 'sell'
            ? 'bg-red-500 text-white'
            : 'bg-[#2a3544] text-gray-400 hover:bg-[#3a4554]'
            }`}
        >
          Sell
        </button>
      </div>

      {/* ============================================================ */}
      {/* BALANCE DISPLAY */}
      {/* ============================================================ */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-400">Balance:</span>
        <span className="text-sm font-bold text-white">
          {mode === 'buy'
            ? `${solBalance?.toFixed(4) ?? '0.0000'} SOL`
            : `${balanceFormatted?.toFixed(2) ?? '0.00'} ${tokenSymbol}`
          }
        </span>
      </div>

      {/* ============================================================ */}
      {/* AMOUNT INPUT */}
      {/* ============================================================ */}
      <div className="relative mb-3">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-[#2a3544] border border-[#3a4554] rounded-lg pl-20 pr-4 py-3 text-white text-right text-lg focus:outline-none focus:border-green-500"
          step={mode === 'buy' ? '0.01' : '1'}
          disabled={loading || (mode === 'buy' && progressData.isGraduationLocked)}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {mode === 'buy' ? (
            <>
              <img src="/solana-icon.png" alt="SOL" className="w-6 h-6" />
              <span className="text-gray-400 text-sm font-medium">SOL</span>
            </>
          ) : (
            <>
              <img
                src={tokenState?.image || '/BONK-LOGO.svg'}
                alt={tokenSymbol}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-gray-400 text-sm font-medium">{tokenSymbol}</span>
            </>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* PERCENTAGE BUTTONS */}
      {/* ============================================================ */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setAmount('')}
          className="px-3 py-1.5 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-xs text-gray-400 transition-colors"
          disabled={loading}
        >
          Reset
        </button>
        {[25, 50, 75, 100].map((percent) => (
          <button
            key={percent}
            onClick={() => handlePercentage(percent)}
            className="flex-1 py-1.5 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-xs font-bold transition-colors"
            disabled={loading || (mode === 'buy' && progressData.isGraduationLocked)}
          >
            {percent}%
          </button>
        ))}
      </div>

      {/* USD Estimate */}
      {solPriceUsd > 0 && amount && (
        <div className="text-center text-xs text-gray-500 mb-3">
          ≈ ${(parseFloat(amount || '0') * (mode === 'buy' ? solPriceUsd : (solPriceUsd * 0.00001))).toFixed(2)} USD
        </div>
      )}

      {/* ============================================================ */}
      {/* SUBMIT BUTTON */}
      {/* ============================================================ */}
      <button
        onClick={mode === 'buy' ? handleBuy : handleSell}
        disabled={
          loading ||
          !publicKey ||
          !amount ||
          parseFloat(amount) <= 0 ||
          (mode === 'buy' && progressData.isGraduationLocked)
        }
        className={`w-full py-3 rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'buy' && progressData.isGraduationLocked
          ? 'bg-yellow-500/50 text-yellow-200 cursor-not-allowed'
          : mode === 'buy'
            ? 'bg-green-500 hover:bg-green-600 text-black'
            : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
      >
        {loading
          ? 'Processing...'
          : mode === 'buy' && progressData.isGraduationLocked
            ? '🏆 Graduation Complete'
            : mode === 'buy'
              ? `Buy ${tokenSymbol}`
              : `Sell ${tokenSymbol}`
        }
      </button>

      {/* ============================================================ */}
      {/* WARNINGS */}
      {/* ============================================================ */}
      {!publicKey && (
        <div className="mt-4 text-center text-sm text-yellow-500">
          Please connect your wallet to trade
        </div>
      )}

      {mode === 'buy' && progressData.isNearGraduation && !progressData.isGraduationLocked && (
        <div className="mt-3 text-center text-xs text-orange-400">
          ⚡ Token near victory! Large buys may trigger graduation.
        </div>
      )}
    </div>
  );
}