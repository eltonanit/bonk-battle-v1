/**
 * EXAMPLE USAGE: React Hooks for BONK BATTLE
 *
 * This file demonstrates how to use all the custom hooks in React components.
 */

import { PublicKey } from '@solana/web3.js';
import { useTokenBattleState, useIsTokenInBattle, useCanTokenBattle } from './useTokenBattleState';
import { usePriceOracle, usePriceOracleNeedsUpdate, useCalculateMarketCapUsd } from './usePriceOracle';
import {
  useUserTokenBalance,
  useHasSufficientBalance,
  useMultipleTokenBalances,
  useFormatTokenAmount
} from './useUserTokenBalance';
import { BattleStatus } from '@/types/bonk';

/**
 * EXAMPLE 1: Token Detail Page
 *
 * Shows complete token information with battle state, price, and user balance.
 */
export function TokenDetailPage({ mintAddress }: { mintAddress: string }) {
  const mint = new PublicKey(mintAddress);

  // Fetch token battle state
  const {
    state: battleState,
    loading: stateLoading,
    error: stateError,
    refetch: refetchState
  } = useTokenBattleState(mint);

  // Fetch SOL price
  const { solPriceUsd, loading: priceLoading } = usePriceOracle();

  // Fetch user balance
  const { balanceFormatted, loading: balanceLoading } = useUserTokenBalance(mint);

  // Calculate market cap in USD
  const marketCapUsd = useCalculateMarketCapUsd(battleState?.solCollected ?? 0);

  if (stateLoading || priceLoading) {
    return (
      <div className="loading">
        <p>Loading token details...</p>
      </div>
    );
  }

  if (stateError) {
    return (
      <div className="error">
        <p>Error loading token: {stateError.message}</p>
        <button onClick={refetchState}>Retry</button>
      </div>
    );
  }

  if (!battleState) {
    return (
      <div className="not-found">
        <p>Token not found</p>
      </div>
    );
  }

  return (
    <div className="token-detail">
      <header>
        <h1>Token Details</h1>
        <span className={`status ${battleState.battleStatus}`}>
          {BattleStatus[battleState.battleStatus]}
        </span>
      </header>

      <section className="stats">
        <div className="stat">
          <label>Market Cap</label>
          <value>${marketCapUsd?.toFixed(2) ?? 'Loading...'}</value>
        </div>

        <div className="stat">
          <label>SOL Collected</label>
          <value>{(battleState.solCollected / 1e9).toFixed(4)} SOL</value>
        </div>

        <div className="stat">
          <label>Tokens Sold</label>
          <value>{(battleState.tokensSold / 1e6).toFixed(2)}</value>
        </div>

        <div className="stat">
          <label>Trading Volume</label>
          <value>{(battleState.totalTradeVolume / 1e9).toFixed(4)} SOL</value>
        </div>

        <div className="stat">
          <label>SOL Price</label>
          <value>${solPriceUsd?.toFixed(2) ?? '...'}</value>
        </div>
      </section>

      <section className="user-balance">
        <h3>Your Balance</h3>
        {balanceLoading ? (
          <p>Loading...</p>
        ) : (
          <p>{balanceFormatted?.toFixed(6) ?? 0} tokens</p>
        )}
      </section>

      {battleState.battleStatus === BattleStatus.InBattle && (
        <section className="battle-info">
          <h3>⚔️ In Battle!</h3>
          <p>Opponent: {battleState.opponentMint.toString()}</p>
          <p>Started: {new Date(battleState.battleStartTimestamp * 1000).toLocaleString()}</p>
        </section>
      )}

      <section className="timestamps">
        <p>Created: {new Date(battleState.creationTimestamp * 1000).toLocaleString()}</p>
        {battleState.lastTradeTimestamp > 0 && (
          <p>Last Trade: {new Date(battleState.lastTradeTimestamp * 1000).toLocaleString()}</p>
        )}
      </section>

      <button onClick={refetchState}>Refresh Data</button>
    </div>
  );
}

/**
 * EXAMPLE 2: Trading Panel with Balance Check
 */
export function TradingPanel({ mintAddress }: { mintAddress: string }) {
  const mint = new PublicKey(mintAddress);
  const { balance, balanceFormatted } = useUserTokenBalance(mint);
  const hasSufficientBalance = useHasSufficientBalance(mint, 1_000_000); // 1 token

  return (
    <div className="trading-panel">
      <div className="balance">
        <p>Your Balance: {balanceFormatted?.toFixed(6) ?? 0}</p>
      </div>

      <div className="actions">
        <button className="buy">Buy Tokens</button>
        <button
          className="sell"
          disabled={!hasSufficientBalance}
        >
          Sell Tokens
        </button>
      </div>

      {!hasSufficientBalance && (
        <p className="warning">
          You need at least 1 token to sell
        </p>
      )}
    </div>
  );
}

/**
 * EXAMPLE 3: Battle Status Indicator
 */
export function BattleStatusIndicator({ mintAddress }: { mintAddress: string }) {
  const mint = new PublicKey(mintAddress);
  const isInBattle = useIsTokenInBattle(mint);
  const canBattle = useCanTokenBattle(mint);

  if (isInBattle) {
    return (
      <div className="status in-battle">
        ⚔️ In Battle
      </div>
    );
  }

  if (canBattle) {
    return (
      <div className="status qualified">
        ✅ Qualified - Ready to Battle
      </div>
    );
  }

  return (
    <div className="status">
      📈 Accumulating Power
    </div>
  );
}

/**
 * EXAMPLE 4: Price Oracle Display
 */
export function PriceOracleDisplay() {
  const {
    solPriceUsd,
    lastUpdate,
    nextUpdate,
    updateCount,
    loading,
    error,
    refetch
  } = usePriceOracle();

  const needsUpdate = usePriceOracleNeedsUpdate();

  if (loading) return <div>Loading price...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="price-oracle">
      <h3>SOL Price Oracle</h3>

      <div className="price">
        <span className="label">Current Price:</span>
        <span className="value">${solPriceUsd?.toFixed(2)}</span>
      </div>

      <div className="meta">
        <p>Last Update: {lastUpdate ? new Date(lastUpdate * 1000).toLocaleString() : 'Never'}</p>
        <p>Next Update: {nextUpdate ? new Date(nextUpdate * 1000).toLocaleString() : 'Unknown'}</p>
        <p>Updates: {updateCount}</p>
      </div>

      {needsUpdate && (
        <div className="alert">
          ⚠️ Price oracle needs update (keeper action required)
        </div>
      )}

      <button onClick={refetch}>Refresh Price</button>
    </div>
  );
}

/**
 * EXAMPLE 5: Multiple Token Balances (Portfolio View)
 */
export function PortfolioView({ tokenMints }: { tokenMints: string[] }) {
  const mints = tokenMints.map(addr => new PublicKey(addr));
  const balances = useMultipleTokenBalances(mints);

  return (
    <div className="portfolio">
      <h2>Your Portfolio</h2>

      <table>
        <thead>
          <tr>
            <th>Token</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {tokenMints.map((mintAddr) => (
            <tr key={mintAddr}>
              <td>{mintAddr.substring(0, 8)}...</td>
              <td>{balances[mintAddr]?.toFixed(6) ?? '0'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * EXAMPLE 6: Token Card with All Data
 */
export function TokenCard({ mintAddress }: { mintAddress: string }) {
  const mint = new PublicKey(mintAddress);
  const { state } = useTokenBattleState(mint);
  const { solPriceUsd } = usePriceOracle();
  const { balanceFormatted } = useUserTokenBalance(mint);
  const marketCapUsd = useCalculateMarketCapUsd(state?.solCollected ?? 0);

  if (!state) return null;

  return (
    <div className="token-card">
      <div className="header">
        <h3>{mintAddress.substring(0, 8)}...</h3>
        <span className={`badge ${state.battleStatus}`}>
          {BattleStatus[state.battleStatus]}
        </span>
      </div>

      <div className="stats-grid">
        <div>
          <label>MC</label>
          <value>${marketCapUsd?.toFixed(0) ?? '-'}</value>
        </div>
        <div>
          <label>Volume</label>
          <value>{(state.totalTradeVolume / 1e9).toFixed(2)} SOL</value>
        </div>
        <div>
          <label>Your Balance</label>
          <value>{balanceFormatted?.toFixed(2) ?? '0'}</value>
        </div>
      </div>

      <div className="progress">
        <label>Progress to Qualification ($5,100)</label>
        <progress
          value={marketCapUsd ?? 0}
          max={5100}
        />
      </div>
    </div>
  );
}

/**
 * EXAMPLE 7: Real-time Battle Monitor
 */
export function BattleMonitor({ mintAddress }: { mintAddress: string }) {
  const mint = new PublicKey(mintAddress);
  const { state, refetch } = useTokenBattleState(mint);
  const isInBattle = useIsTokenInBattle(mint);

  // Auto-refetch every 5 seconds if in battle
  useEffect(() => {
    if (!isInBattle) return;

    const interval = setInterval(refetch, 5000);
    return () => clearInterval(interval);
  }, [isInBattle, refetch]);

  if (!isInBattle || !state) return null;

  return (
    <div className="battle-monitor">
      <h2>⚔️ Battle in Progress</h2>

      <div className="combatants">
        <div className="token">
          <h3>This Token</h3>
          <p>MC: ${useCalculateMarketCapUsd(state.solCollected)?.toFixed(2)}</p>
          <p>Volume: {(state.totalTradeVolume / 1e9).toFixed(4)} SOL</p>
        </div>

        <div className="vs">VS</div>

        <div className="token">
          <h3>Opponent</h3>
          <p>{state.opponentMint.toString().substring(0, 12)}...</p>
        </div>
      </div>

      <div className="battle-info">
        <p>Battle Started: {new Date(state.battleStartTimestamp * 1000).toLocaleString()}</p>
        <p>
          Duration: {Math.floor((Date.now() / 1000 - state.battleStartTimestamp) / 60)} minutes
        </p>
      </div>
    </div>
  );
}

/**
 * USAGE NOTES:
 *
 * 1. ALL HOOKS ARE REAL-TIME
 *    - Auto-fetch on mount
 *    - Auto-refetch on interval
 *    - Manual refetch available
 *
 * 2. ERROR HANDLING
 *    - Check `loading` before rendering data
 *    - Check `error` for error messages
 *    - Check `state !== null` for data existence
 *
 * 3. WALLET INTEGRATION
 *    - useUserTokenBalance requires connected wallet
 *    - Returns null if wallet not connected
 *    - Auto-updates when wallet changes
 *
 * 4. PERFORMANCE
 *    - Hooks use proper memoization
 *    - Polling intervals optimized (10s for battles, 60s for price)
 *    - Manual refetch available for user actions
 *
 * 5. TYPE SAFETY
 *    - All hooks return typed results
 *    - Use ParsedTokenBattleState type
 *    - BattleStatus enum for status checks
 */

import { useEffect } from 'react';
