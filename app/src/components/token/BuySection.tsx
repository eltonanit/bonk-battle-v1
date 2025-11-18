'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { calculateTokensFromSol } from '@/lib/bonding-curve/calculate-tokens';
import { buyTokens } from '@/lib/solana/transactions/buy-tokens';

interface BuySectionProps {
  token: {
    mint: PublicKey | string;
    virtualSolInit: number;
    solRaised: number;
    constantK: string;
    status: number;
  };
  onSuccess: () => void;
}

export function BuySection({ token, onSuccess }: BuySectionProps) {
  // ⭐ AGGIUNTO signTransaction
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenMint = typeof token.mint === 'string'
    ? new PublicKey(token.mint)
    : token.mint;

  useEffect(() => {
    if (publicKey) {
      connection.getBalance(publicKey).then(bal => {
        setBalance(bal / LAMPORTS_PER_SOL);
      });
    }
  }, [publicKey, connection]);

  const solAmount = parseFloat(amount) || 0;
  const currentVirtualSol = token.virtualSolInit + token.solRaised;
  const tokensReceived = solAmount > 0
    ? calculateTokensFromSol(solAmount, currentVirtualSol, token.constantK)
    : 0;

  const handleBuy = async () => {
    // ⭐ CHECK signTransaction
    if (!connected || !publicKey || !signTransaction) {
      setError('Please connect your wallet');
      return;
    }

    if (solAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (solAmount > balance) {
      setError('Insufficient SOL balance');
      return;
    }

    if (solAmount > 10) {
      setError('Maximum 10 SOL per transaction');
      return;
    }

    setBuying(true);
    setError(null);

    try {
      console.log('🔄 Buying tokens...');
      console.log('  Mint:', tokenMint.toString());
      console.log('  Amount:', solAmount, 'SOL');

      // ⭐ PASSA signTransaction invece di sendTransaction
      const signature = await buyTokens(
        publicKey,
        tokenMint,
        solAmount,
        signTransaction
      );

      // ✅ CHECK IF ALREADY PROCESSED
      if (signature === 'already_processed_success') {
        alert('✅ Transaction completed successfully!\n\nRefreshing page...');
        window.location.reload();
        return;
      }

      // Normal success flow
      const solscanUrl = `https://solscan.io/tx/${signature}?cluster=devnet`;

      if (confirm(
        `✅ Transaction successful!\n\n` +
        `You bought ${(tokensReceived / 1_000_000).toFixed(2)}M tokens!\n\n` +
        `Signature: ${signature.slice(0, 20)}...\n\n` +
        `Click OK to view on Solscan`
      )) {
        window.open(solscanUrl, '_blank');
      }

      setAmount('');
      onSuccess();

    } catch (err: unknown) {
      console.error('Buy failed:', err);

      // Type-safe error message extraction
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed. Check console for details.';

      setError(errorMessage);
    } finally {
      setBuying(false);
    }
  };

  const setQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const setMaxAmount = () => {
    const max = Math.min(balance - 0.01, 10);
    setAmount(max > 0 ? max.toFixed(4) : '0');
  };

  if (token.status !== 0) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="font-bold text-yellow-400 mb-2">
            {token.status === 1 ? 'Token Graduated!' : 'Token Ended'}
          </div>
          <div className="text-sm text-gray-400">
            {token.status === 1
              ? 'This token has been listed on Meteora DEX. Trade there!'
              : 'This token did not reach its target. Claim your refund.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="flex gap-3 mb-6">
        <button className="flex-1 bg-green-500 text-black font-bold py-3 rounded-xl">
          Buy
        </button>
        <button className="flex-1 bg-white/5 text-gray-400 font-bold py-3 rounded-xl cursor-not-allowed">
          Sell
        </button>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Amount</span>
          <span className="text-sm text-gray-400">
            balance: <span className="text-white">{balance.toFixed(4)} SOL</span>
          </span>
        </div>

        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            max="10"
            disabled={buying}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 pr-20 text-2xl text-white focus:border-green-500 focus:outline-none disabled:opacity-50"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">
            SOL
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setAmount('')}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors"
        >
          Reset
        </button>
        <button
          onClick={() => setQuickAmount(0.1)}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors"
        >
          0.1 SOL
        </button>
        <button
          onClick={() => setQuickAmount(0.5)}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors"
        >
          0.5 SOL
        </button>
        <button
          onClick={() => setQuickAmount(1)}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors"
        >
          1 SOL
        </button>
        <button
          onClick={setMaxAmount}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors"
        >
          Max
        </button>
      </div>

      {solAmount > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
          <div className="text-sm text-gray-400 mb-1">You will receive:</div>
          <div className="text-2xl font-bold text-green-400">
            {(tokensReceived / 1_000_000).toFixed(2)}M tokens
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={handleBuy}
        disabled={buying || !connected || solAmount <= 0}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all transform hover:scale-105 disabled:transform-none"
      >
        {buying ? 'BUYING...' : connected ? 'Buy & Hold 💎' : 'CONNECT WALLET'}
      </button>

      <div className="mt-4 text-xs text-center text-gray-500">
        ⚠️ Tokens will be FROZEN until listing. No selling until target reached!
      </div>
    </div>
  );
} 