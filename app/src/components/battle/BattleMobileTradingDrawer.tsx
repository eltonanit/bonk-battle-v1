'use client';

/**
 * BattleMobileTradingDrawer - Bottom sheet trading panel for battle pages
 *
 * - Fixed "Buy" button at bottom of screen
 * - Opens drawer with Token selector + Buy/Sell tabs
 * - Only visible on screens < 810px
 * - ✅ FIXED: Now matches TradingPanel behavior for percentage buttons
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useUserTokenBalance } from '@/hooks/useUserTokenBalance';
import { buyToken } from '@/lib/solana/buy-token';
import { sellToken } from '@/lib/solana/sell-token';
import { TransactionSuccessPopup } from '@/components/shared/TransactionSuccessPopup';
import { addPointsForBuyToken, addPointsForSellToken } from '@/lib/points';
import Image from 'next/image';

// ============================================================
// 🎯 VICTORY TARGETS (must match TradingPanel)
// ============================================================
const TARGET_SOL = 6.0;
const TRADING_FEE = 0.02;

interface TokenData {
  mint: PublicKey;
  symbol: string;
  image: string;
  battleStatus?: number;
  solCollected?: number; // ⭐ Added for graduation calculation
}

interface BattleMobileTradingDrawerProps {
  tokenA: TokenData;
  tokenB?: TokenData;
  selectedToken: 'A' | 'B';
  onSelectToken: (token: 'A' | 'B') => void;
  onSuccess?: () => void;
}

export function BattleMobileTradingDrawer({
  tokenA,
  tokenB,
  selectedToken,
  onSelectToken,
  onSuccess,
}: BattleMobileTradingDrawerProps) {
  const { publicKey, signTransaction } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { connection } = useConnection();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Current token based on selection
  const currentToken = selectedToken === 'A' ? tokenA : (tokenB || tokenA);
  const currentMint = currentToken.mint;

  const { balance, balanceFormatted, refetch: refetchBalance } = useUserTokenBalance(currentMint);
  const [solBalance, setSolBalance] = useState<number | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ============================================================
  // 🎯 CALCULATE MAX BUYABLE SOL (same as TradingPanel)
  // ============================================================
  const progressData = useMemo(() => {
    const solCollected = currentToken.solCollected;
    if (solCollected === undefined) {
      return {
        solRemaining: TARGET_SOL,
        maxBuyableSol: TARGET_SOL,
        isGraduationLocked: false,
      };
    }

    const solCollectedSol = solCollected / 1e9;
    const solRemaining = Math.max(0, TARGET_SOL - solCollectedSol);
    const maxBuyableSol = solRemaining / (1 - TRADING_FEE);
    const isGraduationLocked = solRemaining <= 0.001;

    return {
      solRemaining,
      maxBuyableSol,
      isGraduationLocked,
    };
  }, [currentToken]);

  // Fetch SOL balance
  useEffect(() => {
    if (!publicKey || !connection) return;
    connection.getBalance(publicKey).then((bal) => {
      setSolBalance(bal / 1e9);
    }).catch(console.error);
  }, [publicKey, connection]);

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset amount when token changes
  useEffect(() => {
    setAmount('');
  }, [selectedToken]);

  // ============================================================
  // 🎮 PERCENTAGE BUTTONS - SAME AS TRADING PANEL
  // ============================================================
  const handlePercentage = (percent: number) => {
    if (mode === 'buy') {
      if (!solBalance) return;
      // ⭐ Same logic as TradingPanel
      const maxUsable = Math.min(solBalance - 0.01, progressData.maxBuyableSol);
      const value = Math.max(0, maxUsable * (percent / 100));
      setAmount(value.toFixed(4));
    } else {
      // ⭐ For sell: use balanceFormatted (already divided by 1e9)
      if (balanceFormatted === null || balanceFormatted === 0) return;
      const value = balanceFormatted * (percent / 100);
      // ⭐ No decimals for whole token amounts
      setAmount(Math.floor(value).toString());
    }
  };

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleBuy = async () => {
    if (!publicKey || !signTransaction) {
      setWalletModalVisible(true);
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

    setLoading(true);
    try {
      await buyToken(
        publicKey,
        currentMint,
        solAmount,
        signTransaction,
        0,
        currentToken.battleStatus
      );

      addPointsForBuyToken(
        publicKey.toString(),
        currentMint.toString(),
        currentToken.symbol,
        currentToken.image
      ).catch(console.error);

      // ⭐ Refresh balance after buy
      setTimeout(() => refetchBalance(), 2000);

      setSuccessMessage(`Bought ${currentToken.symbol} for ${solAmount} SOL`);
      setShowSuccess(true);
      setAmount('');
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Buy error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to buy: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!publicKey || !signTransaction) {
      setWalletModalVisible(true);
      return;
    }

    const tokenAmount = parseFloat(amount);
    if (isNaN(tokenAmount) || tokenAmount <= 0) {
      alert('Please enter a valid token amount');
      return;
    }

    // ⭐ FIX: Convert display amount to raw amount (multiply by 1e9)
    const tokenAmountRaw = Math.floor(tokenAmount * 1e9);

    // ⭐ FIX: Compare raw amounts correctly
    if (balance === null || tokenAmountRaw > balance) {
      alert(`Insufficient token balance. You have ${balanceFormatted?.toLocaleString() ?? 0} ${currentToken.symbol}`);
      return;
    }

    setLoading(true);
    try {
      await sellToken(publicKey, currentMint, tokenAmountRaw, signTransaction);

      addPointsForSellToken(
        publicKey.toString(),
        currentMint.toString(),
        currentToken.symbol,
        currentToken.image
      ).catch(console.error);

      // ⭐ Refresh balance after sell
      setTimeout(() => refetchBalance(), 2000);

      setSuccessMessage(`Sold ${tokenAmount.toLocaleString()} ${currentToken.symbol}`);
      setShowSuccess(true);
      setAmount('');
      setIsOpen(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Sell error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to sell: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = useCallback(() => {
    setShowSuccess(false);
  }, []);

  // ⭐ Format balance for display with commas (same as TradingPanel)
  const displayBalance = balanceFormatted !== null
    ? Math.floor(balanceFormatted).toLocaleString()
    : '0';

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      {/* Success Popup */}
      <TransactionSuccessPopup
        show={showSuccess}
        message="Transaction Successful"
        subMessage={successMessage}
        onClose={handleSuccessClose}
        autoCloseMs={2500}
      />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* FIXED BUY BUTTON - Only visible on mobile/tablet (<810px) */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-24 left-6 right-6 z-40 tablet-trading:hidden">
        <button
          onClick={() => {
            setMode('buy');
            setIsOpen(true);
          }}
          className="w-full py-2 text-black text-lg rounded-xl transition-all shadow-xl"
          style={{ backgroundColor: '#1FD978', fontWeight: 500 }}
        >
          Buy
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* DRAWER OVERLAY */}
      {/* ════════════════════════════════════════════════════════════ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm tablet-trading:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* DRAWER CONTENT */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-[#12151c] rounded-t-3xl transition-transform duration-300 ease-out tablet-trading:hidden ${isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* TOKEN SELECTOR TAB */}
        {/* ════════════════════════════════════════════════════════════ */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-center gap-2 bg-white/5 rounded-xl p-1">
            {/* Token A */}
            <button
              onClick={() => onSelectToken('A')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${selectedToken === 'A'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              <div className="w-9 h-9 rounded-full overflow-hidden">
                <Image
                  src={tokenA.image || '/BONK-LOGO.svg'}
                  alt={tokenA.symbol}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <span className="font-semibold text-sm">{tokenA.symbol}</span>
            </button>

            {/* Token B */}
            {tokenB && (
              <button
                onClick={() => onSelectToken('B')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${selectedToken === 'B'
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                  }`}
                style={selectedToken === 'B' ? { backgroundColor: '#FF5A8E' } : {}}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden">
                  <Image
                    src={tokenB.image || '/BONK-LOGO.svg'}
                    alt={tokenB.symbol}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <span className="font-semibold text-sm">{tokenB.symbol}</span>
              </button>
            )}
          </div>
        </div>

        {/* Header with Buy/Sell tabs and close */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setMode('buy'); setAmount(''); }}
              className={`px-14 py-2 font-medium transition-all ${mode === 'buy'
                  ? 'text-black'
                  : 'text-gray-400 hover:text-white'
                }`}
              style={mode === 'buy' ? { backgroundColor: '#1FD978' } : {}}
            >
              Buy
            </button>
            <button
              onClick={() => { setMode('sell'); setAmount(''); }}
              className={`px-14 py-2 font-medium transition-all ${mode === 'sell'
                  ? 'text-white bg-red-500'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              Sell
            </button>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-6 space-y-4">

          {/* Slippage button */}
          <div className="flex justify-end">
            <button className="px-3 py-1.5 bg-white/10 rounded-lg text-sm text-gray-300">
              Set max slippage
            </button>
          </div>

          {/* Balance display - FIXED to match TradingPanel */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Balance:</span>
            <span className="text-white font-medium">
              {mode === 'buy'
                ? `${solBalance?.toFixed(4) ?? '0.0000'} SOL`
                : `${displayBalance} ${currentToken.symbol}`
              }
            </span>
          </div>

          {/* Amount input */}
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#2a3544] border border-[#3a4554] rounded-xl px-4 py-4 text-white text-lg focus:outline-none focus:border-green-500"
              step={mode === 'buy' ? '0.01' : '1'}
              disabled={loading}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-gray-300 font-medium">
                {mode === 'buy' ? 'SOL' : currentToken.symbol}
              </span>
              {mode === 'buy' ? (
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src="/solana-icon.png"
                    alt="SOL"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src={currentToken.image || '/BONK-LOGO.svg'}
                    alt={currentToken.symbol}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* PERCENTAGE BUTTONS - SAME AS TRADING PANEL */}
          {/* ============================================================ */}
          <div className="flex gap-2">
            <button
              onClick={() => setAmount('')}
              className="px-4 py-2 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-sm text-gray-400 transition-colors"
              disabled={loading}
            >
              Reset
            </button>

            {mode === 'buy' ? (
              // ⭐ PERCENTAGE buttons for buy (same as TradingPanel)
              <>
                {[25, 50, 75, 100].map((percent) => (
                  <button
                    key={percent}
                    onClick={() => handlePercentage(percent)}
                    className="flex-1 py-2 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-sm font-medium transition-colors"
                    disabled={loading || progressData.isGraduationLocked}
                  >
                    {percent}%
                  </button>
                ))}
              </>
            ) : (
              // ⭐ PERCENTAGE buttons for sell (same as TradingPanel)
              <>
                {[25, 50, 75, 100].map((percent) => (
                  <button
                    key={percent}
                    onClick={() => handlePercentage(percent)}
                    className="flex-1 py-2 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-sm font-medium transition-colors"
                    disabled={loading}
                  >
                    {percent}%
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Submit button */}
          <button
            onClick={mode === 'buy' ? handleBuy : handleSell}
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'buy'
                ? 'bg-green-500 hover:bg-green-600 text-black'
                : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
          >
            {loading
              ? 'Processing...'
              : mode === 'buy'
                ? `Buy ${currentToken.symbol}`
                : `Sell ${currentToken.symbol}`
            }
          </button>

          {/* Connect wallet message */}
          {!publicKey && (
            <p className="text-center text-sm text-yellow-500">
              Connect wallet to trade
            </p>
          )}
        </div>

        {/* Bottom safe area for mobile nav */}
        <div className="h-20" />
      </div>

    </>
  );
}