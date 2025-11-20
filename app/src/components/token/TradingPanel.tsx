// app/src/components/token/TradingPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
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
  const { connection } = useConnection();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const { balance, balanceFormatted } = useUserTokenBalance(mint);
  const { solPriceUsd } = usePriceOracle();
  const [solBalance, setSolBalance] = useState<number | null>(null);

  // Fetch SOL balance
  useEffect(() => {
    if (!publicKey || !connection) return;
    connection.getBalance(publicKey).then((bal) => {
      setSolBalance(bal / 1e9);
    }).catch(console.error);
  }, [publicKey, connection]);

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
    <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
      {/* Buy/Sell Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('buy')}
          className={`flex-1 py-2 rounded-lg font-bold transition-all ${mode === 'buy'
            ? 'bg-bonk-green text-black'
            : 'bg-bonk-dark text-gray-400 hover:bg-bonk-dark/50'
            }`}
        >
          Buy
        </button>
        <button
          onClick={() => setMode('sell')}
          className={`flex-1 py-2 rounded-lg font-bold transition-all ${mode === 'sell'
            ? 'bg-bonk-red text-white'
            : 'bg-bonk-dark text-gray-400 hover:bg-bonk-dark/50'
            }`}
        >
          Sell
        </button>
      </div>

      {/* Settings Row */}
      <div className="flex justify-between mb-4">
        <button className="bg-bonk-dark border border-bonk-border rounded-lg px-3 py-1 text-xs text-gray-300">
          Switch to {mode === 'buy' ? 'KINGS' : 'SOL'}
        </button>
        <button className="bg-bonk-dark border border-bonk-border rounded-lg px-3 py-1 text-xs text-gray-300">
          Set max slippage
        </button>
      </div>

      {/* Balance Display */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-400">balance:</span>
        <span className="text-sm font-bold text-white">
          {mode === 'buy' ? `${solBalance?.toFixed(4) ?? 0} SOL` : `${balanceFormatted?.toFixed(2) ?? 0} TOK`}
        </span>
      </div>

      {/* Amount Input */}
      <div className="relative mb-4">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-bonk-dark border border-bonk-border rounded-lg px-4 py-3 text-white text-right focus:outline-none focus:border-bonk-green"
          step={mode === 'buy' ? '0.01' : '0.000001'}
          disabled={loading}
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <span className="text-gray-400 text-sm">SOL</span>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
        </div>
      </div>

      {/* Quick Buttons */}
      {mode === 'buy' && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setAmount('')} className="px-3 py-1 bg-bonk-dark rounded-lg text-xs text-gray-400">Reset</button>
          {[0.1, 0.5, 1].map((val) => (
            <button
              key={val}
              onClick={() => setAmount(val.toString())}
              className="flex-1 py-1 bg-bonk-dark hover:bg-bonk-border rounded-lg text-xs font-bold transition-all"
              disabled={loading}
            >
              {val} SOL
            </button>
          ))}
          <button className="px-3 py-1 bg-bonk-dark rounded-lg text-xs text-gray-400">Max</button>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={mode === 'buy' ? handleBuy : handleSell}
        disabled={loading || !publicKey || !amount}
        className={`w-full py-3 rounded-lg font-bold text-lg transition-all disabled:bg-bonk-border disabled:cursor-not-allowed ${mode === 'buy'
          ? 'bg-bonk-green hover:bg-bonk-green/90 text-black'
          : 'bg-bonk-red hover:bg-bonk-red/90 text-white'
          }`}
      >
        {loading
          ? 'Processing...'
          : mode === 'buy'
            ? 'Buy KINGS'
            : 'Sell KINGS'}
      </button>

      {/* Wallet Connection Warning */}
      {!publicKey && (
        <div className="mt-4 text-center text-sm text-yellow-500">
          Please connect your wallet to trade
        </div>
      )}
    </div>
  );
}
