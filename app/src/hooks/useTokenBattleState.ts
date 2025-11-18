// src/hooks/useTokenBattleState.ts
import { useEffect, useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { getBattleStatePDA } from '@/lib/solana/pdas';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';
import { ParsedTokenBattleState, BattleStatus } from '@/types/bonk';

/**
 * Token Battle State Hook Result
 */
export interface UseTokenBattleStateResult {
  /** Parsed token battle state (null if not found or loading) */
  state: ParsedTokenBattleState | null;
  /** Loading indicator */
  loading: boolean;
  /** Error if fetch failed (null if account doesn't exist) */
  error: Error | null;
  /** Manual refetch function */
  refetch: () => Promise<void>;
}

/**
 * React hook to fetch and monitor TokenBattleState for a given token mint
 *
 * This hook:
 * - Fetches the TokenBattleState account from the blockchain
 * - Parses all fields from BN (BigNumber) to number
 * - Auto-refetches every 10 seconds if token is in battle or has pending victory
 * - Provides manual refetch function for immediate updates
 * - Handles account not found gracefully (returns null, not error)
 *
 * @param mint - Token mint public key (null to disable fetching)
 * @returns Hook result with state, loading, error, and refetch function
 *
 * @example
 * ```typescript
 * function TokenDetails({ mintAddress }: { mintAddress: string }) {
 *   const mint = new PublicKey(mintAddress);
 *   const { state, loading, error, refetch } = useTokenBattleState(mint);
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!state) return <div>Token not found</div>;
 *
 *   return (
 *     <div>
 *       <h2>Battle Status: {state.battleStatus}</h2>
 *       <p>SOL Collected: {state.solCollected / 1e9} SOL</p>
 *       <p>Tokens Sold: {state.tokensSold / 1e6}</p>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTokenBattleState(
  mint: PublicKey | null
): UseTokenBattleStateResult {
  const { connection } = useConnection();
  const [state, setState] = useState<ParsedTokenBattleState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetches the token battle state from blockchain
   */
  const fetchState = useCallback(async () => {
    if (!mint) {
      setState(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Derive Battle State PDA
      const [battleStatePDA] = getBattleStatePDA(mint);

      console.log('🔍 Fetching Battle State for mint:', mint.toString());
      console.log('📍 Battle State PDA:', battleStatePDA.toString());

      // Fetch account info
      const accountInfo = await connection.getAccountInfo(battleStatePDA);

      // Account doesn't exist - this is OK, not an error
      if (!accountInfo) {
        console.log('ℹ️ Battle State account not found (token may not exist yet)');
        setState(null);
        setError(null);
        setLoading(false);
        return;
      }

      // Check if account belongs to BONK BATTLE program
      if (!accountInfo.owner.equals(BONK_BATTLE_PROGRAM_ID)) {
        throw new Error(
          `Invalid account owner. Expected ${BONK_BATTLE_PROGRAM_ID.toString()}, got ${accountInfo.owner.toString()}`
        );
      }

      // Parse account data
      const data = accountInfo.data;

      // TokenBattleState struct layout (from Anchor):
      // 8 bytes: discriminator
      // 32 bytes: mint (Pubkey)
      // 8 bytes: sol_collected (u64)
      // 8 bytes: tokens_sold (u64)
      // 8 bytes: total_trade_volume (u64)
      // 1 byte: is_active (bool)
      // 1 byte: battle_status (enum, 1 byte for variant index)
      // 32 bytes: opponent_mint (Pubkey)
      // 8 bytes: creation_timestamp (i64)
      // 8 bytes: last_trade_timestamp (i64)
      // 8 bytes: battle_start_timestamp (i64)
      // 8 bytes: victory_timestamp (i64)
      // 8 bytes: listing_timestamp (i64)
      // 1 byte: bump

      let offset = 8; // Skip discriminator

      // Parse mint (32 bytes)
      const mintPubkey = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // Parse u64 values (little-endian)
      const parseU64 = (offset: number): number => {
        let value = 0n;
        for (let i = 0; i < 8; i++) {
          value |= BigInt(data[offset + i]) << BigInt(i * 8);
        }
        return Number(value);
      };

      const solCollected = parseU64(offset);
      offset += 8;

      const tokensSold = parseU64(offset);
      offset += 8;

      const totalTradeVolume = parseU64(offset);
      offset += 8;

      // Parse bool (1 byte)
      const isActive = data[offset] !== 0;
      offset += 1;

      // Parse battle_status enum (1 byte for variant index)
      const battleStatusIndex = data[offset];
      const battleStatusMap: Record<number, BattleStatus> = {
        0: BattleStatus.Created,
        1: BattleStatus.Qualified,
        2: BattleStatus.InBattle,
        3: BattleStatus.VictoryPending,
        4: BattleStatus.Listed,
      };
      const battleStatus = battleStatusMap[battleStatusIndex] ?? BattleStatus.Created;
      offset += 1;

      // Parse opponent_mint (32 bytes)
      const opponentMint = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;

      // Parse i64 timestamps (little-endian)
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

      const creationTimestamp = parseI64(offset);
      offset += 8;

      const lastTradeTimestamp = parseI64(offset);
      offset += 8;

      const battleStartTimestamp = parseI64(offset);
      offset += 8;

      const victoryTimestamp = parseI64(offset);
      offset += 8;

      const listingTimestamp = parseI64(offset);
      offset += 8;

      // Parse bump (1 byte)
      const bump = data[offset];

      // Create parsed state object
      const parsedState: ParsedTokenBattleState = {
        mint: mintPubkey,
        solCollected,
        tokensSold,
        totalTradeVolume,
        isActive,
        battleStatus,
        opponentMint,
        creationTimestamp,
        lastTradeTimestamp,
        battleStartTimestamp,
        victoryTimestamp,
        listingTimestamp,
        bump,
      };

      console.log('✅ Battle State fetched successfully:', parsedState);
      setState(parsedState);
      setError(null);

    } catch (err) {
      console.error('❌ Error fetching Battle State:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [mint, connection]);

  // Initial fetch and setup polling
  useEffect(() => {
    // Initial fetch
    fetchState();

    // Determine polling interval based on battle status
    const shouldPollFast =
      state?.battleStatus === BattleStatus.InBattle ||
      state?.battleStatus === BattleStatus.VictoryPending;

    const pollInterval = shouldPollFast ? 10_000 : 30_000; // 10s if active, 30s otherwise

    // Setup polling
    const intervalId = setInterval(() => {
      fetchState();
    }, pollInterval);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchState, state?.battleStatus]);

  return {
    state,
    loading,
    error,
    refetch: fetchState,
  };
}

/**
 * Helper hook to check if token is in active battle
 *
 * @param mint - Token mint public key
 * @returns True if token is currently in battle
 *
 * @example
 * ```typescript
 * const isInBattle = useIsTokenInBattle(mint);
 * if (isInBattle) {
 *   return <BattleView mint={mint} />;
 * }
 * ```
 */
export function useIsTokenInBattle(mint: PublicKey | null): boolean {
  const { state } = useTokenBattleState(mint);
  return state?.battleStatus === BattleStatus.InBattle;
}

/**
 * Helper hook to check if token can enter battle (is qualified)
 *
 * @param mint - Token mint public key
 * @returns True if token is qualified for battle
 *
 * @example
 * ```typescript
 * const canBattle = useCanTokenBattle(mint);
 * if (canBattle) {
 *   return <button onClick={startBattle}>Find Match</button>;
 * }
 * ```
 */
export function useCanTokenBattle(mint: PublicKey | null): boolean {
  const { state } = useTokenBattleState(mint);
  return state?.battleStatus === BattleStatus.Qualified;
}
