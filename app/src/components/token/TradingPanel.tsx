// app/src/components/token/TradingPanel.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useUserTokenBalance } from '@/hooks/useUserTokenBalance';
import { buyToken } from '@/lib/solana/buy-token';
import { sellToken } from '@/lib/solana/sell-token';
import { TransactionSuccessPopup } from '@/components/shared/TransactionSuccessPopup';

// Victory targets (devnet TEST tier)
const VICTORY_MC_USD = 5500;
const VICTORY_VOLUME_USD = 100;

// Graduation threshold in SOL (TEST tier completes at ~5.67 SOL)
const GRADUATION_SOL_THRESHOLD = 5.67;

// Auto-disable threshold (97%)
const AUTO_DISABLE_THRESHOLD = 97;

interface TokenState {
  symbol: string;
  image: string;
  solCollected: number;      // in lamports
  totalTradeVolume: number;  // in lamports
  virtualSolReserves: number; // in lamports
  realSolReserves: number;   // in lamports
}

interface TradingPanelProps {
  mint: PublicKey;
  tokenState?: TokenState;
  solPriceUsd?: number;
  onSuccess?: () => void;
}

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

  // Fetch SOL balance
  useEffect(() => {
    if (!publicKey || !connection) return;
    connection.getBalance(publicKey).then((bal) => {
      setSolBalance(bal / 1e9);
    }).catch(console.error);
  }, [publicKey, connection]);

  // ============================================================
  // VICTORY PROGRESS CALCULATIONS
  // ============================================================
  const progressData = useMemo(() => {
    if (!tokenState || !solPriceUsd) {
      return {
        mcProgress: 0,
        volProgress: 0,
        overallProgress: 0,
        currentMcUsd: 0,
        currentVolUsd: 0,
        solCollectedSol: 0,
        maxBuyableSol: GRADUATION_SOL_THRESHOLD,
        isNearGraduation: false,
        isGraduationLocked: false,
      };
    }

    const solCollectedSol = tokenState.solCollected / 1e9;
    const totalVolumeSol = tokenState.totalTradeVolume / 1e9;

    // Calculate USD values
    const currentMcUsd = solCollectedSol * solPriceUsd;
    const currentVolUsd = totalVolumeSol * solPriceUsd;

    // Calculate progress percentages
    const mcProgress = Math.min((currentMcUsd / VICTORY_MC_USD) * 100, 100);
    const volProgress = Math.min((currentVolUsd / VICTORY_VOLUME_USD) * 100, 100);

    // Overall progress (use the higher of the two)
    const overallProgress = Math.max(mcProgress, volProgress);

    // Calculate max buyable before graduation
    const solRemaining = Math.max(0, GRADUATION_SOL_THRESHOLD - solCollectedSol);
    const maxBuyableSol = solRemaining * 0.95; // 5% buffer to avoid hitting exact limit

    // Check graduation states
    const isNearGraduation = overallProgress >= AUTO_DISABLE_THRESHOLD;
    const isGraduationLocked = overallProgress >= 100;

    return {
      mcProgress,
      volProgress,
      overallProgress,
      currentMcUsd,
      currentVolUsd,
      solCollectedSol,
      maxBuyableSol,
      isNearGraduation,
      isGraduationLocked,
    };
  }, [tokenState, solPriceUsd]);

  // Format USD helper
  const formatUsd = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  // ============================================================
  // BUY HANDLER
  // ============================================================
  const handleBuy = async () => {
    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet');
      return;
    }

    // Check if graduation locked
    if (progressData.isGraduationLocked) {
      setSuccessMessage('This token has reached victory! Finalizing battle...');
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

    // Warn if amount exceeds max buyable
    if (solAmount > progressData.maxBuyableSol && progressData.maxBuyableSol > 0) {
      const proceed = confirm(
        `Warning: This buy may trigger graduation!\n\n` +
        `Max safe buy: ${progressData.maxBuyableSol.toFixed(4)} SOL\n` +
        `Your amount: ${solAmount} SOL\n\n` +
        `Continue anyway?`
      );
      if (!proceed) return;
    }

    setLoading(true);
    try {
      const result = await buyToken(
        publicKey,
        mint,
        solAmount,
        signTransaction
      );

      console.log('Buy successful:', result);
      setSuccessMessage(`Bought tokens for ${solAmount} SOL`);
      setIsVictoryPopup(false);
      setShowSuccess(true);
      setAmount('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Buy error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Handle graduation/victory case - show success, not error!
      if (errorMessage.includes('GRADUATION_READY') ||
          errorMessage.includes('WouldExceedGraduation') ||
          errorMessage.includes('6024')) {
        setSuccessMessage('Victory threshold reached! Checking battle result...');
        setIsVictoryPopup(true);
        setShowSuccess(true);
        triggerVictoryCheck();
        if (onSuccess) onSuccess();
        return;
      }

      // Regular error - show alert
      alert(`Failed to buy tokens: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // VICTORY CHECK TRIGGER
  // ============================================================
  const triggerVictoryCheck = async () => {
    try {
      console.log('Triggering victory check for:', mint.toString());
      const response = await fetch('/api/battles/check-victory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenMint: mint.toString() })
      });
      const data = await response.json();
      console.log('Victory check result:', data);

      if (data.victory) {
        setSuccessMessage(`VICTORY! ${tokenState?.symbol || 'Token'} won the battle! Preparing for DEX listing...`);
      } else if (data.success) {
        setSuccessMessage(`Battle continues - checking victory conditions...`);
      } else {
        setSuccessMessage('Token at graduation threshold!');
      }
    } catch (victoryErr) {
      console.error('Victory check error:', victoryErr);
      setSuccessMessage('Token reached limit! Victory check in progress...');
    }
  };

  // ============================================================
  // SELL HANDLER
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

    const tokenAmountRaw = Math.floor(tokenAmount * 1e9); // 9 decimals

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

      console.log('Sell successful:', result);
      setSuccessMessage(`Sold ${tokenAmount.toFixed(2)} ${tokenState?.symbol || 'tokens'}`);
      setIsVictoryPopup(false);
      setShowSuccess(true);
      setAmount('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Sell error:', err);
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

  // ============================================================
  // PERCENTAGE BUTTONS
  // ============================================================
  const handlePercentage = (percent: number) => {
    if (mode === 'buy') {
      if (!solBalance) return;
      const maxUsable = Math.min(solBalance - 0.01, progressData.maxBuyableSol); // Keep 0.01 SOL for fees
      const value = Math.max(0, maxUsable * (percent / 100));
      setAmount(value.toFixed(4));
    } else {
      if (!balanceFormatted) return;
      const value = balanceFormatted * (percent / 100);
      setAmount(value.toFixed(6));
    }
  };

  // Token symbol for display
  const tokenSymbol = tokenState?.symbol || 'TOKEN';

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4">
      {/* Success Popup */}
      <TransactionSuccessPopup
        show={showSuccess}
        message={isVictoryPopup ? "Victory!" : "Transaction Successful"}
        subMessage={successMessage}
        onClose={handleSuccessClose}
        autoCloseMs={isVictoryPopup ? 5000 : 2500}
      />

      {/* ============================================================ */}
      {/* VICTORY PROGRESS SECTION */}
      {/* ============================================================ */}
      {tokenState && solPriceUsd > 0 && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-300">Victory Progress</span>
            <span className={`text-sm font-bold ${
              progressData.isGraduationLocked ? 'text-yellow-400' :
              progressData.isNearGraduation ? 'text-orange-400' : 'text-green-400'
            }`}>
              {progressData.overallProgress.toFixed(1)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-[#2a3544] rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressData.isGraduationLocked
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse'
                  : progressData.isNearGraduation
                    ? 'bg-gradient-to-r from-orange-400 to-red-500'
                    : 'bg-gradient-to-r from-green-400 to-green-600'
              }`}
              style={{ width: `${progressData.overallProgress}%` }}
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">MC:</span>
              <span className="ml-1 text-white">{formatUsd(progressData.currentMcUsd)}</span>
              <span className="text-gray-500">/{formatUsd(VICTORY_MC_USD)}</span>
            </div>
            <div>
              <span className="text-gray-500">Vol:</span>
              <span className="ml-1 text-white">{formatUsd(progressData.currentVolUsd)}</span>
              <span className="text-gray-500">/{formatUsd(VICTORY_VOLUME_USD)}</span>
            </div>
          </div>

          {/* Max Buy Warning */}
          {mode === 'buy' && progressData.isNearGraduation && !progressData.isGraduationLocked && (
            <div className="mt-2 p-2 bg-orange-500/20 border border-orange-500/30 rounded text-xs text-orange-300">
              Max buy: ~{progressData.maxBuyableSol.toFixed(4)} SOL before graduation
            </div>
          )}

          {/* Graduation Locked Warning */}
          {progressData.isGraduationLocked && (
            <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-300 text-center">
              GRADUATION COMPLETE - Token ready for DEX listing!
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
          ~ ${(parseFloat(amount || '0') * (mode === 'buy' ? solPriceUsd : (solPriceUsd * 0.00001))).toFixed(2)} USD
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
        className={`w-full py-3 rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          mode === 'buy' && progressData.isGraduationLocked
            ? 'bg-yellow-500/50 text-yellow-200 cursor-not-allowed'
            : mode === 'buy'
              ? 'bg-green-500 hover:bg-green-600 text-black'
              : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {loading
          ? 'Processing...'
          : mode === 'buy' && progressData.isGraduationLocked
            ? 'Graduation Complete'
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
          Token near victory! Large buys may trigger graduation.
        </div>
      )}
    </div>
  );
}
