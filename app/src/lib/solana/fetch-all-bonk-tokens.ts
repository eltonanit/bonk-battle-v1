// app/src/lib/solana/fetch-all-bonk-tokens.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { BONK_BATTLE_PROGRAM_ID, BattleStatus } from './constants';
import { RPC_ENDPOINT } from '@/config/solana';
import { supabase } from '@/lib/supabase';
import type { ParsedTokenBattleState } from '@/types/bonk';

/**
 * Fetches all TokenBattleState accounts from the BONK BATTLE program
 * Returns array of parsed battle states with full on-chain data
 */
export async function fetchAllBonkTokens(): Promise<ParsedTokenBattleState[]> {
  try {
    // 1. Try to fetch from Supabase first
    const { data: dbTokens, error: dbError } = await supabase
      .from('tokens')
      .select('*')
      .order('creation_timestamp', { ascending: false });

    if (!dbError && dbTokens && dbTokens.length > 0) {
      console.log(`📦 Fetched ${dbTokens.length} tokens from Supabase cache`);

      // Map DB fields back to ParsedTokenBattleState
      return dbTokens.map(token => ({
        mint: new PublicKey(token.mint),
        solCollected: Number(token.sol_collected),
        tokensSold: Number(token.tokens_sold),
        totalTradeVolume: Number(token.total_trade_volume),
        isActive: token.is_active,
        battleStatus: token.battle_status as BattleStatus,
        opponentMint: new PublicKey(token.opponent_mint),
        creationTimestamp: Number(token.creation_timestamp),
        qualificationTimestamp: Number(token.qualification_timestamp),
        lastTradeTimestamp: Number(token.last_trade_timestamp),
        battleStartTimestamp: Number(token.battle_start_timestamp),
        victoryTimestamp: Number(token.victory_timestamp), // Handle naming diff if any
        listingTimestamp: Number(token.listing_timestamp),
        bump: token.bump,
        // Add any missing fields with defaults or derived values
        battleEndTimestamp: 0 // Not in DB yet, maybe derived?
      }));
    }

    // 2. If Supabase is empty or error, trigger Sync API (fire and forget)
    console.log('⚠️ Supabase cache miss or error, triggering sync...');

    // Trigger sync in background (don't await)
    fetch('/api/cron/sync').catch(err => console.error('Trigger sync failed:', err));

    // 3. Fallback to direct RPC fetch (using existing logic)
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    console.log('🔍 Fetching all BONK Battle tokens from RPC (Fallback)...');

    // Get all TokenBattleState accounts with retry logic
    let accounts = [];
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        const response = await connection.getProgramAccounts(BONK_BATTLE_PROGRAM_ID, {
          // Remove dataSize filter to allow for variable account sizes
        });
        accounts = response as any[]; // Cast to avoid readonly issue
        break;
      } catch (err: any) {
        console.warn(`⚠️ Fetch failed, retrying in ${delay}ms... (${retries} retries left)`);
        if (retries === 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
        retries--;
        delay *= 2;
      }
    }

    console.log(`📦 Found ${accounts.length} TokenBattleState accounts`);

    const parsedTokens: ParsedTokenBattleState[] = [];

    for (const account of accounts) {
      try {
        const data = account.account.data;

        if (data.length < 100) {
          continue;
        }

        // Parse TokenBattleState fields
        let offset = 8; // Skip discriminator

        // Helper functions
        function readPublicKey(): PublicKey {
          const pk = new PublicKey(data.slice(offset, offset + 32));
          offset += 32;
          return pk;
        }

        function readU64(): bigint {
          let value = 0n;
          for (let i = 0; i < 8; i++) {
            value |= BigInt(data[offset + i]) << BigInt(i * 8);
          }
          offset += 8;
          return value;
        }

        function readI64(): bigint {
          let value = 0n;
          for (let i = 0; i < 8; i++) {
            value |= BigInt(data[offset + i]) << BigInt(i * 8);
          }
          offset += 8;
          // Handle signed conversion
          if (value >= 0x8000000000000000n) {
            value = value - 0x10000000000000000n;
          }
          return value;
        }

        function readBool(): boolean {
          const value = data[offset] !== 0;
          offset += 1;
          return value;
        }

        function readU8(): number {
          const value = data[offset];
          offset += 1;
          return value;
        }

        // Parse all fields
        const mint = readPublicKey();
        const solCollected = readU64();
        const tokensSold = readU64();
        const totalTradeVolume = readU64();
        const isActive = readBool();

        // Battle status enum (u8)
        const battleStatusRaw = readU8();
        const battleStatusMap: { [key: number]: BattleStatus } = {
          0: BattleStatus.Created,
          1: BattleStatus.Qualified,
          2: BattleStatus.InBattle,
          3: BattleStatus.VictoryPending,
          4: BattleStatus.Listed,
        };
        const battleStatus = battleStatusMap[battleStatusRaw] ?? BattleStatus.Created;

        const opponentMint = readPublicKey();
        const creationTimestamp = readI64();
        const qualificationTimestamp = readI64();
        const lastTradeTimestamp = readI64();
        const battleStartTimestamp = readI64();
        const victoryTimestamp = readI64();
        const listingTimestamp = readI64();
        const bump = readU8();

        const parsedState: ParsedTokenBattleState = {
          mint,
          solCollected: Number(solCollected),
          tokensSold: Number(tokensSold),
          totalTradeVolume: Number(totalTradeVolume),
          isActive,
          battleStatus,
          opponentMint,
          creationTimestamp: Number(creationTimestamp),
          qualificationTimestamp: Number(qualificationTimestamp),
          lastTradeTimestamp: Number(lastTradeTimestamp),
          battleStartTimestamp: Number(battleStartTimestamp),
          victoryTimestamp: Number(victoryTimestamp),
          listingTimestamp: Number(listingTimestamp),
          bump,
        };

        parsedTokens.push(parsedState);
      } catch (parseError) {
        console.warn('⚠️ Failed to parse account:', parseError);
        continue;
      }
    }

    console.log(`✅ Successfully parsed ${parsedTokens.length} BONK Battle tokens`);

    // Sort by creation timestamp (newest first)
    parsedTokens.sort((a, b) => b.creationTimestamp - a.creationTimestamp);

    return parsedTokens;
  } catch (error) {
    console.error('❌ Error fetching BONK Battle tokens:', error);
    throw error;
  }
}

/**
 * Fetches only active BONK Battle tokens (isActive = true)
 */
export async function fetchActiveBonkTokens(): Promise<ParsedTokenBattleState[]> {
  const allTokens = await fetchAllBonkTokens();
  return allTokens.filter((token: ParsedTokenBattleState) => token.isActive);
}

/**
 * Fetches BONK Battle tokens by status
 */
export async function fetchBonkTokensByStatus(
  status: BattleStatus
): Promise<ParsedTokenBattleState[]> {
  const allTokens = await fetchAllBonkTokens();
  return allTokens.filter((token) => token.battleStatus === status);
}

/**
 * Fetches BONK Battle tokens in battle (InBattle status)
 */
export async function fetchTokensInBattle(): Promise<ParsedTokenBattleState[]> {
  return fetchBonkTokensByStatus(BattleStatus.InBattle);
}

/**
 * Fetches qualified BONK Battle tokens (ready for battles)
 */
export async function fetchQualifiedTokens(): Promise<ParsedTokenBattleState[]> {
  return fetchBonkTokensByStatus(BattleStatus.Qualified);
}
