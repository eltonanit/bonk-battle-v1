/**
 * EXAMPLE USAGE: buyToken() and sellToken()
 *
 * This file demonstrates how to use the buy and sell functions
 * in a React component with Solana wallet adapter.
 */

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { buyToken } from './buy-token';
import { sellToken, getUserTokenBalance } from './sell-token';
import { useState, useEffect } from 'react';

/**
 * EXAMPLE 1: Buy Token Component
 */
export function BuyTokenExample() {
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [solAmount, setSolAmount] = useState('0.1');

  const handleBuy = async (mintAddress: string) => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mint = new PublicKey(mintAddress);
      const amount = parseFloat(solAmount);

      console.log('Buying tokens...');

      const result = await buyToken(
        publicKey,
        mint,
        amount,
        signTransaction
      );

      console.log('Success!', result);
      setResult(result);

      // Show success message or update UI
      // The actual tokens received can be checked by querying the user's token account

    } catch (err) {
      console.error('Error buying tokens:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="number"
        value={solAmount}
        onChange={(e) => setSolAmount(e.target.value)}
        placeholder="SOL amount"
        step="0.01"
        min="0.001"
      />

      <button
        onClick={() => handleBuy('your-mint-address')}
        disabled={!publicKey || loading}
      >
        {loading ? 'Buying...' : `Buy with ${solAmount} SOL`}
      </button>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="success">
          <h3>Purchase Successful!</h3>
          <p>Signature: {result.signature}</p>
          <p>SOL Spent: {result.solAmount / 1e9} SOL</p>
          <a
            href={`https://solscan.io/tx/${result.signature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Solscan
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * EXAMPLE 2: Sell Token Component
 */
export function SellTokenExample() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [tokenAmount, setTokenAmount] = useState('');

  const mintAddress = 'your-mint-address';

  // Fetch user's token balance
  useEffect(() => {
    if (!publicKey) return;

    const fetchBalance = async () => {
      try {
        const mint = new PublicKey(mintAddress);
        const bal = await getUserTokenBalance(connection, publicKey, mint);
        setBalance(bal);
      } catch (err) {
        console.error('Error fetching balance:', err);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [publicKey, connection]);

  const handleSell = async () => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mint = new PublicKey(mintAddress);
      const amount = parseFloat(tokenAmount);

      if (amount <= 0 || amount > balance) {
        throw new Error('Invalid amount');
      }

      console.log('Selling tokens...');

      const result = await sellToken(
        publicKey,
        mint,
        amount,
        signTransaction
      );

      console.log('Success!', result);
      setResult(result);

      // Refresh balance
      const newBalance = await getUserTokenBalance(connection, publicKey, mint);
      setBalance(newBalance);

    } catch (err) {
      console.error('Error selling tokens:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSellAll = () => {
    setTokenAmount(balance.toString());
  };

  return (
    <div>
      <p>Your Balance: {balance / 1e6} tokens</p>

      <input
        type="number"
        value={tokenAmount}
        onChange={(e) => setTokenAmount(e.target.value)}
        placeholder="Token amount"
        max={balance}
      />

      <button onClick={handleSellAll} disabled={!publicKey || balance === 0}>
        Sell All
      </button>

      <button
        onClick={handleSell}
        disabled={!publicKey || loading || !tokenAmount}
      >
        {loading ? 'Selling...' : 'Sell Tokens'}
      </button>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="success">
          <h3>Sale Successful!</h3>
          <p>Signature: {result.signature}</p>
          <p>Tokens Sold: {result.tokenAmount / 1e6}</p>
          <a
            href={`https://solscan.io/tx/${result.signature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Solscan
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * EXAMPLE 3: Combined Trading Component
 */
export function TokenTradingPanel({ mintAddress }: { mintAddress: string }) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');

  // Fetch balance
  useEffect(() => {
    if (!publicKey) return;

    const fetchBalance = async () => {
      const mint = new PublicKey(mintAddress);
      const bal = await getUserTokenBalance(connection, publicKey, mint);
      setBalance(bal);
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [publicKey, connection, mintAddress]);

  const handleTrade = async () => {
    if (!publicKey || !signTransaction) return;

    setLoading(true);

    try {
      const mint = new PublicKey(mintAddress);
      const value = parseFloat(amount);

      if (mode === 'buy') {
        await buyToken(publicKey, mint, value, signTransaction);
        alert('Tokens purchased successfully!');
      } else {
        await sellToken(publicKey, mint, value * 1e6, signTransaction);
        alert('Tokens sold successfully!');
      }

      // Refresh balance
      const newBalance = await getUserTokenBalance(connection, publicKey, mint);
      setBalance(newBalance);
      setAmount('');

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trading-panel">
      {/* Mode toggle */}
      <div className="mode-toggle">
        <button
          onClick={() => setMode('buy')}
          className={mode === 'buy' ? 'active' : ''}
        >
          Buy
        </button>
        <button
          onClick={() => setMode('sell')}
          className={mode === 'sell' ? 'active' : ''}
        >
          Sell
        </button>
      </div>

      {/* Balance display */}
      {mode === 'sell' && (
        <p>Balance: {(balance / 1e6).toFixed(6)} tokens</p>
      )}

      {/* Amount input */}
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={mode === 'buy' ? 'SOL amount' : 'Token amount'}
        step="0.01"
      />

      {/* Quick amounts */}
      {mode === 'buy' && (
        <div className="quick-amounts">
          <button onClick={() => setAmount('0.1')}>0.1 SOL</button>
          <button onClick={() => setAmount('0.5')}>0.5 SOL</button>
          <button onClick={() => setAmount('1')}>1 SOL</button>
        </div>
      )}

      {mode === 'sell' && (
        <button onClick={() => setAmount((balance / 1e6).toString())}>
          Max
        </button>
      )}

      {/* Trade button */}
      <button
        onClick={handleTrade}
        disabled={!publicKey || loading || !amount}
        className="trade-button"
      >
        {loading
          ? 'Processing...'
          : mode === 'buy'
          ? `Buy Tokens`
          : `Sell Tokens`}
      </button>
    </div>
  );
}

/**
 * USAGE NOTES:
 *
 * 1. BUY TOKENS:
 *    - User specifies SOL amount (e.g., 0.1 SOL)
 *    - Smart contract calculates tokens received based on bonding curve
 *    - User's token account is created automatically if needed (init_if_needed)
 *    - Transaction confirms → tokens appear in user's wallet
 *
 * 2. SELL TOKENS:
 *    - User specifies token amount (raw amount with decimals)
 *    - Smart contract calculates SOL to return based on bonding curve
 *    - 2% platform fee is deducted from SOL returned
 *    - Tokens are burned, SOL sent back to user
 *
 * 3. ERROR HANDLING:
 *    - Insufficient balance (SOL or tokens)
 *    - Trading inactive (token paused)
 *    - Amount too small/large
 *    - Bonding curve errors (overflow, invalid state)
 *
 * 4. TESTING:
 *    - Test on devnet first!
 *    - Get devnet SOL from faucet
 *    - Create a test token
 *    - Buy some tokens
 *    - Verify balance in wallet
 *    - Try selling back
 *    - Check Solscan for all transactions
 *
 * 5. PRODUCTION CONSIDERATIONS:
 *    - Add slippage protection (min tokens out, max sol in)
 *    - Show estimated amounts before transaction
 *    - Display current price from bonding curve
 *    - Add transaction history
 *    - Implement retry logic for failed transactions
 */
