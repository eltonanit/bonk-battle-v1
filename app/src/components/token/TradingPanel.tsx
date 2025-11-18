// app/src/components/token/TradingPanel.tsx
'use client';

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUserTokenBalance } from '@/hooks/useUserTokenBalance';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { buyToken } from '@/lib/solana/buy-token';
import { sellToken } from '@/lib/solana/sell-token';

interface TradingPanelProps {
  mint: PublicKey;
  onSuccess?: () => void;
}

export function TradingPanel({ mint, onSuccess }: TradingPanelProps) {
  const { publicKey, signTransaction } = useWallet();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const { balance, balanceFormatted } = useUserTokenBalance(mint);
  const { solPriceUsd } = usePriceOracle();

  const handleBuy = async () => {
    if (!publicKey || !signTransaction) {
      alert('Please connect your wallet');
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
      const result = await buyToken(
        publicKey,
        mint,
        solAmount,
        signTransaction
      );

      console.log('✅ Buy successful:', result);
      alert(
        `✅ Tokens purchased!\n\n` +
        `Tokens Received: ${(result.tokensReceived / 1e6).toFixed(6)}\n` +
        `Signature: ${result.signature.substring(0, 20)}...`
      );
      setAmount('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('❌ Buy error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to buy tokens: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

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

    const tokenAmountRaw = Math.floor(tokenAmount * 1e6); // Convert to raw

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
      alert(
        `✅ Tokens sold!\n\n` +
        `SOL Received: ${(result.solReceived / 1e9).toFixed(6)} SOL\n` +
        `Signature: ${result.signature.substring(0, 20)}...`
      );
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

  return (
    <div className="bg-[#2d2d2d] rounded-xl p-6">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('buy')}
          className={`flex-1 py-3 rounded-lg font-bold transition-all ${
            mode === 'buy'
              ? 'bg-green-500 text-white'
              : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setMode('sell')}
          className={`flex-1 py-3 rounded-lg font-bold transition-all ${
            mode === 'sell'
              ? 'bg-red-500 text-white'
              : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Balance Display */}
      {mode === 'sell' && (
        <div className="mb-4 p-3 bg-[#1a1a1a] rounded-lg">
          <div className="text-sm text-gray-400">Your Balance</div>
          <div className="text-lg font-bold">
            {balanceFormatted?.toFixed(6) ?? 0} tokens
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          {mode === 'buy' ? 'SOL Amount' : 'Token Amount'}
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={mode === 'buy' ? '0.1' : '1000'}
          className="w-full bg-[#1a1a1a] rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
          step={mode === 'buy' ? '0.01' : '0.000001'}
          disabled={loading}
        />
      </div>

      {/* Quick Buttons */}
      {mode === 'buy' && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[0.1, 0.5, 1, 5].map((val) => (
            <button
              key={val}
              onClick={() => setAmount(val.toString())}
              className="py-2 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg font-semibold text-sm transition-all"
              disabled={loading}
            >
              {val}
            </button>
          ))}
        </div>
      )}

      {mode === 'sell' && balance !== null && balance > 0 && (
        <button
          onClick={() => setAmount((balance / 1e6).toString())}
          className="w-full mb-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg font-semibold transition-all"
          disabled={loading}
        >
          MAX ({(balance / 1e6).toFixed(6)})
        </button>
      )}

      {/* Submit Button */}
      <button
        onClick={mode === 'buy' ? handleBuy : handleSell}
        disabled={loading || !publicKey || !amount}
        className={`w-full py-4 rounded-lg font-bold text-lg transition-all disabled:bg-gray-600 disabled:cursor-not-allowed ${
          mode === 'buy'
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-red-500 hover:bg-red-600'
        }`}
      >
        {loading
          ? 'Processing...'
          : mode === 'buy'
          ? 'Buy Tokens'
          : 'Sell Tokens'}
      </button>

      {/* Price Info */}
      {solPriceUsd && (
        <div className="mt-4 text-xs text-gray-400 text-center">
          SOL Price: ${solPriceUsd.toFixed(2)}
        </div>
      )}

      {/* Wallet Connection Warning */}
      {!publicKey && (
        <div className="mt-4 text-center text-sm text-yellow-500">
          Please connect your wallet to trade
        </div>
      )}
    </div>
  );
}
