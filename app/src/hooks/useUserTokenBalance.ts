// src/hooks/useUserTokenBalance.ts
import { useEffect, useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { rpcQueue } from '@/lib/utils/request-queue';

/**
 * User Token Balance Hook Result
 */
export interface UseUserTokenBalanceResult {
  /** Token balance (raw amount with decimals, e.g., 1_000_000 = 1 token with 6 decimals) */
  balance: number | null;
  /** Token balance in display format (divided by decimals) */
  balanceFormatted: number | null;
  /** Loading indicator */
  loading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Manual refetch function */
  refetch: () => Promise<void>;
}

/**
 * React hook to fetch and monitor user's token balance
 *
 * This hook:
 * - Fetches the user's associated token account (ATA)
 * - Parses the token balance (u64 with decimals)
 * - Returns both raw and formatted balance
 * - Auto-refetches when wallet changes
 * - Handles account not found gracefully (balance = 0)
 *
 * @param mint - Token mint public key (null to disable fetching)
 * @param decimals - Token decimals for formatting (default: 6 for BONK tokens)
 * @returns Hook result with balance, loading, error, and refetch function
 *
 * @example
 * ```typescript
 * function UserBalance({ mintAddress }: { mintAddress: string }) {
 *   const mint = new PublicKey(mintAddress);
 *   const { balance, balanceFormatted, loading, error } = useUserTokenBalance(mint);
 *
 *   if (loading) return <div>Loading balance...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <p>Balance: {balanceFormatted} tokens</p>
 *       <p>Raw: {balance}</p>
 *     </div>
 *   );
 * }
 * ```
 */
// Global promise map for deduplication
const globalBalancePromises = new Map<string, Promise<number | null>>();

export function useUserTokenBalance(
  mint: PublicKey | null,
  decimals: number = 6
): UseUserTokenBalanceResult {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceFormatted, setBalanceFormatted] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!mint || !publicKey) {
      setBalance(null);
      setBalanceFormatted(null);
      setError(null);
      setLoading(false);
      return;
    }

    const key = `${mint.toString()}-${publicKey.toString()}`;

    // Return existing promise if active
    if (globalBalancePromises.has(key)) {
      try {
        setLoading(true);
        const result = await globalBalancePromises.get(key);
        if (result !== null && result !== undefined) {
          setBalance(result);
          setBalanceFormatted(result / Math.pow(10, decimals));
        }
        return;
      } catch (err) {
        // Fall through to new fetch
      } finally {
        setLoading(false);
      }
    }

    try {
      setLoading(true);
      setError(null);

      const promise = rpcQueue.add(async () => {
        const userTokenAccount = getAssociatedTokenAddressSync(
          mint,
          publicKey,
          false
        );

        console.log('🔍 Fetching token balance for wallet:', publicKey.toString());

        let accountInfo = null;
        let retries = 3;
        let delay = 1000;

        while (retries > 0) {
          try {
            accountInfo = await connection.getAccountInfo(userTokenAccount);
            break;
          } catch (err: any) {
            if (err.message?.includes('429')) {
              console.warn(`⚠️ Rate limit hit (Balance), retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              retries--;
              delay *= 2;
            } else {
              throw err;
            }
          }
        }

        if (!accountInfo) {
          return 0;
        }

        const data = accountInfo.data;
        if (data.length < 72) throw new Error('Invalid token account data');

        let amount = 0n;
        for (let i = 0; i < 8; i++) {
          amount |= BigInt(data[64 + i]) << BigInt(i * 8);
        }

        return Number(amount);
      });

      globalBalancePromises.set(key, promise);

      const result = await promise;

      // Clear promise after short delay to allow other components to use it
      setTimeout(() => {
        globalBalancePromises.delete(key);
      }, 2000);

      if (result !== null) {
        setBalance(result);
        setBalanceFormatted(result / Math.pow(10, decimals));
        setError(null);
      }

    } catch (err) {
      console.error('❌ Error fetching token balance:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setBalance(null);
      setBalanceFormatted(null);
      globalBalancePromises.delete(key);
    } finally {
      setLoading(false);
    }
  }, [mint, publicKey, connection, decimals]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    balanceFormatted,
    loading,
    error,
    refetch: async () => {
      // Force clear promise to ensure fresh fetch
      if (mint && publicKey) {
        globalBalancePromises.delete(`${mint.toString()}-${publicKey.toString()}`);
      }
      await fetchBalance();
    },
  };
}

export function useHasSufficientBalance(
  mint: PublicKey | null,
  requiredAmount: number
): boolean {
  const { balance } = useUserTokenBalance(mint);
  if (balance === null) return false;
  return balance >= requiredAmount;
}

export function useMultipleTokenBalances(
  mints: PublicKey[],
  decimals: number = 6
): Record<string, number> {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balances, setBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!publicKey || mints.length === 0) {
      setBalances({});
      return;
    }

    const fetchAllBalances = async () => {
      try {
        // Batch fetch all token accounts
        const atas = mints.map(mint =>
          getAssociatedTokenAddressSync(mint, publicKey, false)
        );

        // Split into chunks of 100 (RPC limit)
        const chunks = [];
        for (let i = 0; i < atas.length; i += 100) {
          chunks.push(atas.slice(i, i + 100));
        }

        const balanceMap: Record<string, number> = {};

        for (const chunk of chunks) {
          const accountInfos = await connection.getMultipleAccountsInfo(chunk);

          accountInfos.forEach((info, index) => {
            const mintAddress = mints[atas.indexOf(chunk[index])].toString();

            if (!info || info.data.length < 72) {
              balanceMap[mintAddress] = 0;
              return;
            }

            let amount = 0n;
            for (let i = 0; i < 8; i++) {
              amount |= BigInt(info.data[64 + i]) << BigInt(i * 8);
            }

            balanceMap[mintAddress] = Number(amount) / Math.pow(10, decimals);
          });
        }

        setBalances(balanceMap);
      } catch (err) {
        console.error('Error fetching multiple balances:', err);
      }
    };

    fetchAllBalances();
  }, [mints, publicKey, connection, decimals]);

  return balances;
}

/**
 * Hook to format token amount for display
 *
 * @param rawAmount - Raw token amount with decimals
 * @param decimals - Token decimals (default: 6)
 * @returns Formatted amount as string
 *
 * @example
 * ```typescript
 * const formatted = useFormatTokenAmount(1_000_000, 6);
 * console.log(formatted); // "1.000000"
 * ```
 */
export function useFormatTokenAmount(
  rawAmount: number | null,
  decimals: number = 6
): string {
  if (rawAmount === null) return '0';

  const formatted = rawAmount / Math.pow(10, decimals);
  return formatted.toFixed(decimals);
}
