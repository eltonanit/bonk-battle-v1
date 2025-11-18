// src/hooks/usePriceOracle.ts
import { useEffect, useState, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { getPriceOraclePDA } from '@/lib/solana/pdas';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';

/**
 * Price Oracle Hook Result
 */
export interface UsePriceOracleResult {
  /** Current SOL price in USD (e.g., 196.50) - null if not loaded */
  solPriceUsd: number | null;
  /** Last update timestamp (unix seconds) - null if not loaded */
  lastUpdate: number | null;
  /** Next allowed update timestamp (unix seconds) - null if not loaded */
  nextUpdate: number | null;
  /** Number of times price has been updated */
  updateCount: number | null;
  /** Keeper authority public key */
  keeperAuthority: string | null;
  /** Loading indicator */
  loading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Manual refetch function */
  refetch: () => Promise<void>;
}

/**
 * React hook to fetch and monitor SOL/USD price oracle
 *
 * This hook:
 * - Fetches the PriceOracle account from the blockchain
 * - Parses SOL/USD price with 6 decimals (e.g., 100_000_000 = $100.00)
 * - Parses timestamps (last update, next update)
 * - Auto-refetches every 60 seconds (oracle updated daily by keeper)
 * - Provides manual refetch function
 *
 * The price oracle is used by the smart contract to calculate market caps in USD
 * and determine battle qualification thresholds.
 *
 * @returns Hook result with price, timestamps, and refetch function
 *
 * @example
 * ```typescript
 * function PriceDisplay() {
 *   const { solPriceUsd, lastUpdate, loading, error } = usePriceOracle();
 *
 *   if (loading) return <div>Loading price...</div>;
 *   if (error) return <div>Error loading price</div>;
 *
 *   return (
 *     <div>
 *       <p>SOL Price: ${solPriceUsd?.toFixed(2)}</p>
 *       <p>Last Update: {new Date(lastUpdate! * 1000).toLocaleString()}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePriceOracle(): UsePriceOracleResult {
  const { connection } = useConnection();
  const [solPriceUsd, setSolPriceUsd] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [nextUpdate, setNextUpdate] = useState<number | null>(null);
  const [updateCount, setUpdateCount] = useState<number | null>(null);
  const [keeperAuthority, setKeeperAuthority] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetches the price oracle from blockchain
   */
  const fetchPriceOracle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Derive Price Oracle PDA
      const [priceOraclePDA] = getPriceOraclePDA();

      console.log('🔍 Fetching Price Oracle...');
      console.log('📍 Price Oracle PDA:', priceOraclePDA.toString());

      // Fetch account info
      const accountInfo = await connection.getAccountInfo(priceOraclePDA);

      // Account doesn't exist - oracle not initialized
      if (!accountInfo) {
        throw new Error(
          'Price Oracle not initialized. Keeper must initialize it first.'
        );
      }

      // Check if account belongs to BONK BATTLE program
      if (!accountInfo.owner.equals(BONK_BATTLE_PROGRAM_ID)) {
        throw new Error(
          `Invalid account owner. Expected ${BONK_BATTLE_PROGRAM_ID.toString()}, got ${accountInfo.owner.toString()}`
        );
      }

      // Parse account data
      const data = accountInfo.data;

      // PriceOracle struct layout (from Anchor):
      // 8 bytes: discriminator
      // 8 bytes: sol_price_usd (u64 with 6 decimals)
      // 8 bytes: last_update_timestamp (i64)
      // 8 bytes: next_update_timestamp (i64)
      // 32 bytes: keeper_authority (Pubkey)
      // 8 bytes: update_count (u64)

      let offset = 8; // Skip discriminator

      // Parse u64 values (little-endian)
      const parseU64 = (offset: number): number => {
        let value = 0n;
        for (let i = 0; i < 8; i++) {
          value |= BigInt(data[offset + i]) << BigInt(i * 8);
        }
        return Number(value);
      };

      // Parse i64 values (little-endian, signed)
      const parseI64 = (offset: number): number => {
        let value = 0n;
        for (let i = 0; i < 8; i++) {
          value |= BigInt(data[offset + i]) << BigInt(i * 8);
        }
        // Handle signed 64-bit integer
        if (value > 0x7fffffffffffffffn) {
          value = value - 0x10000000000000000n;
        }
        return Number(value);
      };

      // Parse sol_price_usd (u64 with 6 decimals)
      const priceRaw = parseU64(offset);
      const price = priceRaw / 1_000_000; // Convert from micro-USD to USD
      offset += 8;

      // Parse last_update_timestamp (i64)
      const lastUpdateTs = parseI64(offset);
      offset += 8;

      // Parse next_update_timestamp (i64)
      const nextUpdateTs = parseI64(offset);
      offset += 8;

      // Parse keeper_authority (32 bytes Pubkey)
      const keeperBytes = data.slice(offset, offset + 32);
      const keeper = Buffer.from(keeperBytes).toString('base64'); // Store as base64 for now
      offset += 32;

      // Parse update_count (u64)
      const count = parseU64(offset);

      console.log('✅ Price Oracle fetched successfully:');
      console.log('  SOL Price:', `$${price.toFixed(2)}`);
      console.log('  Last Update:', new Date(lastUpdateTs * 1000).toLocaleString());
      console.log('  Next Update:', new Date(nextUpdateTs * 1000).toLocaleString());
      console.log('  Update Count:', count);

      setSolPriceUsd(price);
      setLastUpdate(lastUpdateTs);
      setNextUpdate(nextUpdateTs);
      setUpdateCount(count);
      setKeeperAuthority(keeper);
      setError(null);

    } catch (err) {
      console.error('❌ Error fetching Price Oracle:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setSolPriceUsd(null);
      setLastUpdate(null);
      setNextUpdate(null);
      setUpdateCount(null);
      setKeeperAuthority(null);
    } finally {
      setLoading(false);
    }
  }, [connection]);

  // Initial fetch and setup polling
  useEffect(() => {
    // Initial fetch
    fetchPriceOracle();

    // Poll every 60 seconds (oracle updated daily but we poll for safety)
    const intervalId = setInterval(() => {
      fetchPriceOracle();
    }, 60_000);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchPriceOracle]);

  return {
    solPriceUsd,
    lastUpdate,
    nextUpdate,
    updateCount,
    keeperAuthority,
    loading,
    error,
    refetch: fetchPriceOracle,
  };
}

/**
 * Helper hook to check if price oracle needs update
 *
 * @returns True if current time is past nextUpdate timestamp
 *
 * @example
 * ```typescript
 * const needsUpdate = usePriceOracleNeedsUpdate();
 * if (needsUpdate) {
 *   return <Alert>Price oracle needs update (keeper action required)</Alert>;
 * }
 * ```
 */
export function usePriceOracleNeedsUpdate(): boolean {
  const { nextUpdate } = usePriceOracle();
  if (!nextUpdate) return false;

  const now = Math.floor(Date.now() / 1000); // Current unix timestamp in seconds
  return now >= nextUpdate;
}

/**
 * Helper hook to calculate market cap in USD
 *
 * @param solAmount - Amount in SOL (lamports)
 * @returns Market cap in USD, or null if price not loaded
 *
 * @example
 * ```typescript
 * const mcUsd = useCalculateMarketCapUsd(solCollected);
 * return <div>Market Cap: ${mcUsd?.toFixed(2)}</div>;
 * ```
 */
export function useCalculateMarketCapUsd(solAmount: number): number | null {
  const { solPriceUsd } = usePriceOracle();

  if (!solPriceUsd) return null;

  // Convert lamports to SOL, then to USD
  const solValue = solAmount / 1e9;
  return solValue * solPriceUsd;
}
