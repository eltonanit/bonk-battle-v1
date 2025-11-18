// src/hooks/useUserTokenBalance.ts
import { useEffect, useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

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

  /**
   * Fetches the user's token balance
   */
  const fetchBalance = useCallback(async () => {
    // Reset if no mint or wallet
    if (!mint || !publicKey) {
      setBalance(null);
      setBalanceFormatted(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user's associated token account address
      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        publicKey,
        false // allowOwnerOffCurve
      );

      console.log('🔍 Fetching token balance for wallet:', publicKey.toString());
      console.log('📍 Token Mint:', mint.toString());
      console.log('📍 User Token Account:', userTokenAccount.toString());

      // Fetch account info
      const accountInfo = await connection.getAccountInfo(userTokenAccount);

      // Account doesn't exist - user has no tokens (balance = 0)
      if (!accountInfo) {
        console.log('ℹ️ Token account not found (user has no tokens)');
        setBalance(0);
        setBalanceFormatted(0);
        setError(null);
        setLoading(false);
        return;
      }

      // Parse token account data
      const data = accountInfo.data;

      // SPL Token Account structure:
      // 0-32: mint (Pubkey)
      // 32-64: owner (Pubkey)
      // 64-72: amount (u64, little-endian)
      // 72+: delegate, state, etc.

      if (data.length < 72) {
        throw new Error('Invalid token account data (too short)');
      }

      // Parse amount (u64 at offset 64)
      let amount = 0n;
      for (let i = 0; i < 8; i++) {
        amount |= BigInt(data[64 + i]) << BigInt(i * 8);
      }

      const balanceRaw = Number(amount);
      const balanceFmt = balanceRaw / Math.pow(10, decimals);

      console.log('✅ Token balance fetched successfully:');
      console.log('  Raw Balance:', balanceRaw);
      console.log('  Formatted Balance:', balanceFmt.toFixed(decimals));

      setBalance(balanceRaw);
      setBalanceFormatted(balanceFmt);
      setError(null);

    } catch (err) {
      console.error('❌ Error fetching token balance:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setBalance(null);
      setBalanceFormatted(null);
    } finally {
      setLoading(false);
    }
  }, [mint, publicKey, connection, decimals]);

  // Initial fetch and re-fetch when wallet or mint changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    balanceFormatted,
    loading,
    error,
    refetch: fetchBalance,
  };
}

/**
 * Helper hook to check if user has sufficient balance
 *
 * @param mint - Token mint public key
 * @param requiredAmount - Required amount (raw with decimals)
 * @returns True if user has sufficient balance
 *
 * @example
 * ```typescript
 * const hasSufficientBalance = useHasSufficientBalance(mint, 1_000_000);
 * if (!hasSufficientBalance) {
 *   return <Alert>Insufficient balance</Alert>;
 * }
 * ```
 */
export function useHasSufficientBalance(
  mint: PublicKey | null,
  requiredAmount: number
): boolean {
  const { balance } = useUserTokenBalance(mint);
  if (balance === null) return false;
  return balance >= requiredAmount;
}

/**
 * Hook to get balances for multiple tokens at once
 *
 * @param mints - Array of token mint public keys
 * @param decimals - Token decimals (default: 6)
 * @returns Map of mint address to balance
 *
 * @example
 * ```typescript
 * const balances = useMultipleTokenBalances([mint1, mint2, mint3]);
 * console.log('Token 1 balance:', balances[mint1.toString()]);
 * ```
 */
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
      const balanceMap: Record<string, number> = {};

      for (const mint of mints) {
        try {
          const userTokenAccount = getAssociatedTokenAddressSync(
            mint,
            publicKey,
            false
          );

          const accountInfo = await connection.getAccountInfo(userTokenAccount);

          if (!accountInfo) {
            balanceMap[mint.toString()] = 0;
            continue;
          }

          const data = accountInfo.data;
          if (data.length < 72) {
            balanceMap[mint.toString()] = 0;
            continue;
          }

          // Parse amount
          let amount = 0n;
          for (let i = 0; i < 8; i++) {
            amount |= BigInt(data[64 + i]) << BigInt(i * 8);
          }

          balanceMap[mint.toString()] = Number(amount) / Math.pow(10, decimals);

        } catch (err) {
          console.error(`Error fetching balance for ${mint.toString()}:`, err);
          balanceMap[mint.toString()] = 0;
        }
      }

      setBalances(balanceMap);
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
