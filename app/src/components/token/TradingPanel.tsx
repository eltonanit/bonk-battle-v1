// app/src/components/token/TradingPanel.tsx
// SOL-BASED PROGRESS - Uses actual smart contract targets
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useUserTokenBalance } from '@/hooks/useUserTokenBalance';
import { buyToken } from '@/lib/solana/buy-token';
import { sellToken } from '@/lib/solana/sell-token';
import { TransactionSuccessPopup } from '@/components/shared/TransactionSuccessPopup';

// =================================================================
// TIER TARGETS FROM SMART CONTRACT (SOL-based!)
// =================================================================
const TIER_CONFIG = {
  TEST: {
    TARGET_SOL: 6,           // 6 SOL = graduation
    VICTORY_VOLUME_SOL: 0.87, // ~$200 at $230/SOL (dynamic in reality)
    VIRTUAL_SOL_INIT: 2.05,   // Starting virtual SOL
  },
  PRODUCTION: {
    TARGET_SOL: 127.5,       // 127.5 SOL = graduation  
    VICTORY_VOLUME_SOL: 87,  // ~$20,000 at $230/SOL
    VIRTUAL_SOL_INIT: 9.3,
  }
};

// Use TEST tier for devnet
const CURRENT_TIER = TIER_CONFIG.TEST;

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
  // 🎯 SOL-BASED PROGRESS CALCULATIONS
  // ============================================================
  const progressData = useMemo(() => {
    if (!tokenState) {
      return {
        solProgress: 0,
        volProgress: 0,
        overallProgress: 0,
        solCollectedSol: 0,
        volumeSol: 0,
        solRemaining: CURRENT_TIER.TARGET_SOL,
        maxBuyableSol: CURRENT_TIER.TARGET_SOL,
        isNearGraduation: false,
        isGraduationLocked: false,
      };
    }

    // Convert lamports to SOL
    const solCollectedSol = tokenState.solCollected / 1e9;
    const volumeSol = tokenState.totalTradeVolume / 1e9;

    // ⭐ SOL-based progress (not USD!)
    const solProgress = Math.min((solCollectedSol / CURRENT_TIER.TARGET_SOL) * 100, 100);
    const volProgress = Math.min((volumeSol / CURRENT_TIER.VICTORY_VOLUME_SOL) * 100, 100);

    // Overall = average of both
    const overallProgress = (solProgress + volProgress) / 2;

    // How much SOL remaining before graduation
    const solRemaining = Math.max(0, CURRENT_TIER.TARGET_SOL - solCollectedSol);
    const maxBuyableSol = solRemaining * 0.95; // 5% buffer

    // Graduation states
    const isNearGraduation = solProgress >= 90; // Near 90%
    const isGraduationLocked = solProgress >= 100 && volProgress >= 100;

    return {
      solProgress,
      volProgress,
      overallProgress,
      solCollectedSol,
      volumeSol,
      solRemaining,
      maxBuyableSol,
      isNearGraduation,
      isGraduationLocked,
    };
  }, [tokenState]);

  // ============================================================
  // 🛒 BUY HANDLER
  // ============================================================
  const handleBuy = async () => {
    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet');
      return;
    }

    if (progressData.isGraduationLocked) {
      setSuccessMessage('🏆 This token has WON! Ready for DEX listing!');
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

    // Warn if exceeds remaining SOL before graduation
    if (solAmount > progressData.maxBuyableSol && progressData.maxBuyableSol > 0.01) {
      const proceed = confirm(
        `⚠️ Warning: This buy may trigger graduation!\n\n` +
        `SOL remaining: ${progressData.solRemaining.toFixed(4)} SOL\n` +
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

      console.log('✅ Buy successful:', result);
      setSuccessMessage(`Bought tokens for ${solAmount} SOL`);
      setIsVictoryPopup(false);
      setShowSuccess(true);
      setAmount('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('❌ Buy error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Handle graduation error
      if (errorMessage.includes('GRADUATION_READY') ||
        errorMessage.includes('WouldExceedGraduation') ||
        errorMessage.includes('6024')) {
        setSuccessMessage('🏆 Graduation reached! Checking victory...');
        setIsVictoryPopup(true);
        setShowSuccess(true);
        triggerVictoryCheck();
        if (onSuccess) onSuccess();
        return;
      }

      alert(`Failed to buy tokens: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🏆 VICTORY CHECK
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
        setSuccessMessage(`🏆 VICTORY! ${tokenState?.symbol || 'Token'} won!`);
      } else if (data.success) {
        setSuccessMessage(`⚔️ Checking victory conditions...`);
      }
    } catch (err) {
      console.error('Victory check error:', err);
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

  // ============================================================
  // 🎮 PERCENTAGE BUTTONS
  // ============================================================
  const handlePercentage = (percent: number) => {
    if (mode === 'buy') {
      if (!solBalance) return;
      const maxUsable = solBalance - 0.01;
      const value = Math.max(0, maxUsable * (percent / 100));
      setAmount(value.toFixed(4));
    } else {
      if (!balanceFormatted) return;
      const value = balanceFormatted * (percent / 100);
      setAmount(value.toFixed(6));
    }
  };

  const tokenSymbol = tokenState?.symbol || 'TOKEN';
  const solDone = progressData.solProgress >= 100;
  const volDone = progressData.volProgress >= 100;

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4">
      {/* Success Popup */}
      <TransactionSuccessPopup
        show={showSuccess}
        message={isVictoryPopup ? "🏆 Victory!" : "Transaction Successful"}
        subMessage={successMessage}
        onClose={handleSuccessClose}
        autoCloseMs={isVictoryPopup ? 5000 : 2500}
      />

      {/* ============================================================ */}
      {/* 🏆 SOL-BASED PROGRESS SECTION */}
      {/* ============================================================ */}
      {tokenState && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-300">🏆 Graduation Progress</span>
            <span className={`text-sm font-bold ${progressData.isGraduationLocked ? 'text-yellow-400' :
                progressData.isNearGraduation ? 'text-orange-400' : 'text-green-400'
              }`}>
              {progressData.overallProgress.toFixed(1)}%
            </span>
          </div>

          {/* Dual Progress Bars */}
          <div className="space-y-2 mb-3">
            {/* SOL Collected Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">SOL {solDone ? '✅' : ''}</span>
                <span className={solDone ? 'text-green-400' : 'text-gray-400'}>
                  {progressData.solProgress.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-[#2a3544] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${solDone ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                    }`}
                  style={{ width: `${progressData.solProgress}%` }}
                />
              </div>
            </div>

            {/* Volume Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Volume {volDone ? '✅' : ''}</span>
                <span className={volDone ? 'text-green-400' : 'text-gray-400'}>
                  {progressData.volProgress.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-[#2a3544] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${volDone ? 'bg-green-500' : 'bg-gradient-to-r from-orange-500 to-yellow-500'
                    }`}
                  style={{ width: `${Math.min(progressData.volProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* SOL Stats Row */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-black/20 rounded px-2 py-1">
              <span className="text-gray-500">Collected:</span>
              <span className={`ml-1 font-bold ${solDone ? 'text-green-400' : 'text-white'}`}>
                {progressData.solCollectedSol.toFixed(2)}
              </span>
              <span className="text-gray-500">/{CURRENT_TIER.TARGET_SOL} SOL</span>
            </div>
            <div className="bg-black/20 rounded px-2 py-1">
              <span className="text-gray-500">Volume:</span>
              <span className={`ml-1 font-bold ${volDone ? 'text-green-400' : 'text-white'}`}>
                {progressData.volumeSol.toFixed(2)}
              </span>
              <span className="text-gray-500"> SOL</span>
            </div>
          </div>

          {/* Status Messages */}
          {progressData.isGraduationLocked ? (
            <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs text-yellow-300 text-center animate-pulse">
              🏆 VICTORY! Ready for DEX listing!
            </div>
          ) : progressData.isNearGraduation ? (
            <div className="mt-2 p-2 bg-orange-500/20 border border-orange-500/30 rounded text-xs text-orange-300">
              ⚡ Almost there! Only {progressData.solRemaining.toFixed(3)} SOL to graduation
            </div>
          ) : null}
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
      {solPriceUsd > 0 && amount && mode === 'buy' && (
        <div className="text-center text-xs text-gray-500 mb-3">
          ≈ ${(parseFloat(amount || '0') * solPriceUsd).toFixed(2)} USD
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
            ? '🏆 Victory Achieved!'
            : mode === 'buy'
              ? `Buy ${tokenSymbol}`
              : `Sell ${tokenSymbol}`
        }
      </button>

      {/* Wallet Warning */}
      {!publicKey && (
        <div className="mt-4 text-center text-sm text-yellow-500">
          Please connect your wallet to trade
        </div>
      )}
    </div>
  );
}