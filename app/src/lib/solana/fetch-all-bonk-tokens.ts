// app/src/lib/solana/fetch-all-bonk-tokens.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { BONK_BATTLE_PROGRAM_ID, BattleStatus } from './constants';
import { RPC_ENDPOINT } from '@/config/solana';
import type { ParsedTokenBattleState } from '@/types/bonk';

/**
 * Fetches all TokenBattleState accounts from the BONK BATTLE program
 * Returns array of parsed battle states with full on-chain data
 */
export async function fetchAllBonkTokens(): Promise<ParsedTokenBattleState[]> {
  try {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    console.log('🔍 Fetching all BONK Battle tokens...');
    console.log('📍 Program ID:', BONK_BATTLE_PROGRAM_ID.toString());

    // Get all accounts owned by BONK BATTLE program
    const accounts = await connection.getProgramAccounts(BONK_BATTLE_PROGRAM_ID, {
      filters: [
        {
          // Filter by account size (TokenBattleState is ~200 bytes)
          // Discriminator (8) + mint (32) + u64 fields + bools + enums + timestamps + bump
          dataSize: 200, // Approximate size, adjust if needed
        },
      ],
    });

    console.log(`📦 Found ${accounts.length} potential battle state accounts`);

    const parsedTokens: ParsedTokenBattleState[] = [];

    for (const account of accounts) {
      try {
        const data = account.account.data;

        // Check discriminator (first 8 bytes)
        // For TokenBattleState, discriminator should match account discriminator
        // Skip if data too small
        if (data.length < 200) {
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
        const battleStartTimestamp = readI64();
        const battleEndTimestamp = readI64();
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
          battleStartTimestamp: Number(battleStartTimestamp),
          battleEndTimestamp: Number(battleEndTimestamp),
          listingTimestamp: Number(listingTimestamp),
          bump,
        };

        parsedTokens.push(parsedState);
      } catch (parseError) {
        console.warn('⚠️ Failed to parse account:', parseError);
        // Skip invalid accounts
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
  return allTokens.filter((token) => token.isActive);
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
