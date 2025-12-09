'use client';

/**
 * MobileTradingDrawer - Bottom sheet trading panel for mobile/tablet
 *
 * - Fixed "Buy" button at bottom of screen
 * - Opens drawer with Buy/Sell tabs
 * - Only visible on screens < 810px
 */

import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useUserTokenBalance } from '@/hooks/useUserTokenBalance';
import { buyToken } from '@/lib/solana/buy-token';
import { sellToken } from '@/lib/solana/sell-token';
import { TransactionSuccessPopup } from '@/components/shared/TransactionSuccessPopup';
import { addPointsForBuyToken, addPointsForSellToken } from '@/lib/points';
import Image from 'next/image';

interface TokenState {
  symbol: string;
  image: string;
  solCollected: number;
  totalTradeVolume: number;
  virtualSolReserves: number;
  realSolReserves: number;
  battleStatus?: number;
}

interface MobileTradingDrawerProps {
  mint: PublicKey;
  tokenState?: TokenState;
  onSuccess?: () => void;
}

export function MobileTradingDrawer({ mint, tokenState, onSuccess }: MobileTradingDrawerProps) {
  const { publicKey, signTransaction } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { connection } = useConnection();

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const { balance, balanceFormatted } = useUserTokenBalance(mint);
  const [solBalance, setSolBalance] = useState<number | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const tokenSymbol = tokenState?.symbol || 'TOKEN';
  const tokenImage = tokenState?.image || '/BONK-LOGO.svg';

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
        mint,
        solAmount,
        signTransaction,
        0,
        tokenState?.battleStatus
      );

      addPointsForBuyToken(
        publicKey.toString(),
        mint.toString(),
        tokenState?.symbol,
        tokenState?.image
      ).catch(console.error);

      setSuccessMessage(`Bought tokens for ${solAmount} SOL`);
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

    const tokenAmountRaw = Math.floor(tokenAmount * 1e9);

    if (balance === null || tokenAmountRaw > balance) {
      alert('Insufficient token balance');
      return;
    }

    setLoading(true);
    try {
      await sellToken(publicKey, mint, tokenAmountRaw, signTransaction);

      addPointsForSellToken(
        publicKey.toString(),
        mint.toString(),
        tokenState?.symbol,
        tokenState?.image
      ).catch(console.error);

      setSuccessMessage(`Sold ${tokenAmount.toFixed(2)} ${tokenSymbol}`);
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

  const handleQuickAmount = (value: number | string) => {
    if (value === 'reset') {
      setAmount('');
      return;
    }

    if (mode === 'buy') {
      setAmount(String(value));
    } else {
      // For sell, value is percentage
      if (!balanceFormatted) return;
      const percent = Number(value);
      const tokenAmount = balanceFormatted * (percent / 100);
      setAmount(tokenAmount.toFixed(2));
    }
  };

  const handleSuccessClose = useCallback(() => {
    setShowSuccess(false);
  }, []);

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
        className={`fixed bottom-0 left-0 right-0 z-50 bg-[#12151c] rounded-t-3xl transition-transform duration-300 ease-out tablet-trading:hidden ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
        </div>

        {/* Header with Buy/Sell tabs and close */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setMode('buy'); setAmount(''); }}
              className={`px-14 py-2 font-medium transition-all ${
                mode === 'buy'
                  ? 'text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={mode === 'buy' ? { backgroundColor: '#1FD978' } : {}}
            >
              Buy
            </button>
            <button
              onClick={() => { setMode('sell'); setAmount(''); }}
              className={`px-14 py-2 font-medium transition-all ${
                mode === 'sell'
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

          {/* Balance display */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">
              {mode === 'buy' ? 'balance:' : `${tokenSymbol} balance:`}
            </span>
            <span className="text-white font-medium">
              {mode === 'buy'
                ? `${solBalance?.toFixed(4) ?? '0'} SOL`
                : balanceFormatted?.toFixed(0) ?? '0'
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
                {mode === 'buy' ? 'SOL' : tokenSymbol}
              </span>
              {mode === 'buy' ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">◎</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src={tokenImage}
                    alt={tokenSymbol}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              )}
            </div>
          </div>

          {/* Quick amount buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickAmount('reset')}
              className="px-4 py-2 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-sm text-gray-400 transition-colors"
              disabled={loading}
            >
              Reset
            </button>

            {mode === 'buy' ? (
              // SOL amounts for buy
              <>
                <button
                  onClick={() => handleQuickAmount(0.1)}
                  className="flex-1 py-2 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-sm font-medium transition-colors"
                  disabled={loading}
                >
                  0.1 SOL
                </button>
                <button
                  onClick={() => handleQuickAmount(0.5)}
                  className="flex-1 py-2 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-sm font-medium transition-colors"
                  disabled={loading}
                >
                  0.5 SOL
                </button>
                <button
                  onClick={() => handleQuickAmount(1)}
                  className="flex-1 py-2 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-sm font-medium transition-colors"
                  disabled={loading}
                >
                  1 SOL
                </button>
                <button
                  onClick={() => setAmount(String(Math.max(0, (solBalance || 0) - 0.01).toFixed(4)))}
                  className="px-4 py-2 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-sm font-medium transition-colors"
                  disabled={loading}
                >
                  Max
                </button>
              </>
            ) : (
              // Percentage amounts for sell
              <>
                <button
                  onClick={() => handleQuickAmount(25)}
                  className="flex-1 py-2 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-sm font-medium transition-colors"
                  disabled={loading}
                >
                  25%
                </button>
                <button
                  onClick={() => handleQuickAmount(50)}
                  className="flex-1 py-2 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-sm font-medium transition-colors"
                  disabled={loading}
                >
                  50%
                </button>
                <button
                  onClick={() => handleQuickAmount(75)}
                  className="flex-1 py-2 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-sm font-medium transition-colors"
                  disabled={loading}
                >
                  75%
                </button>
                <button
                  onClick={() => handleQuickAmount(100)}
                  className="flex-1 py-2 bg-[#2a3544] hover:bg-[#3a4554] rounded-lg text-sm font-medium transition-colors"
                  disabled={loading}
                >
                  100%
                </button>
              </>
            )}
          </div>

          {/* Submit button */}
          <button
            onClick={mode === 'buy' ? handleBuy : handleSell}
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'buy'
                ? 'bg-green-500 hover:bg-green-600 text-black'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {loading
              ? 'Processing...'
              : mode === 'buy'
                ? `Buy ${tokenSymbol}`
                : `Sell ${tokenSymbol}`
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

      {/* ════════════════════════════════════════════════════════════ */}
      {/* TAILWIND CUSTOM CLASS - Add to globals.css */}
      {/* ════════════════════════════════════════════════════════════ */}
      <style jsx global>{`
        /* Hide MobileTradingDrawer on desktop (>= 810px) */
        @media (min-width: 810px) {
          .tablet-trading\\:hidden {
            display: none !important;
          }
        }

        /* Show TradingPanel only on desktop (>= 810px) */
        .tablet-trading\\:block {
          display: none !important;
        }
        @media (min-width: 810px) {
          .tablet-trading\\:block {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
