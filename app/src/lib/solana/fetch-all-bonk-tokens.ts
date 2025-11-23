// app/src/lib/solana/fetch-all-bonk-tokens.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { BONK_BATTLE_PROGRAM_ID, BattleStatus } from './constants';
import { RPC_ENDPOINT } from '@/config/solana';
import { supabase } from '@/lib/supabase';
import type { ParsedTokenBattleState } from '@/types/bonk';
import { fetchTokenMetadata } from './fetch-token-metadata';

/**
 * Fetches all TokenBattleState accounts from the BONK BATTLE program
 * Returns array of parsed battle states with full on-chain data
 */
export async function fetchAllBonkTokens(): Promise<ParsedTokenBattleState[]> {
  try {
    // 1. Get tokens from Supabase (cached old tokens)
    const supabaseTokens: ParsedTokenBattleState[] = [];

    try {
      const { data: cachedTokens, error: supabaseError } = await supabase
        .from('tokens')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!supabaseError && cachedTokens && cachedTokens.length > 0) {

        // Convert Supabase data to ParsedTokenBattleState format
        supabaseTokens.push(...cachedTokens.map((token: any) => {
          // Parse image from URI if not already in image field
          let image = token.image || '';
          if (!image && token.uri) {
            try {
              const metadata = JSON.parse(token.uri);
              image = metadata.image || '';
            } catch {
              // URI is not JSON, keep empty
            }
          }

          return {
            mint: new PublicKey(token.mint),
            creator: new PublicKey(token.creator || token.mint), // ⭐ NUOVO: fallback a mint se non c'è creator
            solCollected: token.sol_collected || 0,
            tokensSold: token.tokens_sold || 0,
            totalTradeVolume: token.total_trade_volume || 0,
            isActive: token.is_active ?? true,
            battleStatus: token.battle_status || BattleStatus.Created,
            opponentMint: new PublicKey(token.opponent_mint || '11111111111111111111111111111111'),
            creationTimestamp: token.creation_timestamp || Math.floor(Date.now() / 1000),
            qualificationTimestamp: token.qualification_timestamp || 0,
            lastTradeTimestamp: token.last_trade_timestamp || 0,
            battleStartTimestamp: token.battle_start_timestamp || 0,
            victoryTimestamp: token.victory_timestamp || 0,
            listingTimestamp: token.listing_timestamp || 0,
            battleEndTimestamp: 0,
            bump: token.bump || 0,
            name: token.name || '',
            symbol: token.symbol || '',
            uri: token.uri || '',
            image,
          };
        }));
      }
    } catch (supabaseErr) {
      // Supabase failed, continue with blockchain only
    }

    // 2. ALWAYS read from blockchain to get fresh data
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

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
        if (retries === 1) throw err;
        await new Promise(resolve => setTimeout(resolve, delay));
        retries--;
        delay *= 2;
      }
    }

    const parsedTokens: ParsedTokenBattleState[] = [];

    // TokenBattleState discriminator from IDL: [54, 102, 185, 22, 231, 3, 228, 117]
    const TOKEN_BATTLE_STATE_DISCRIMINATOR = Buffer.from([54, 102, 185, 22, 231, 3, 228, 117]);

    for (const account of accounts) {
      try {
        const data = account.account.data;

        // Check if this is a TokenBattleState account by discriminator
        const accountDiscriminator = data.slice(0, 8);
        if (!accountDiscriminator.equals(TOKEN_BATTLE_STATE_DISCRIMINATOR)) {
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

        function readString(): string {
          // Read 4-byte length prefix
          const length = data.readUInt32LE(offset);
          offset += 4;
          // Read string bytes
          const str = data.slice(offset, offset + length).toString('utf8');
          offset += length;
          return str;
        }

        // Parse all fields
        const mint = readPublicKey();

        // ⭐ Read creator field (all tokens should have this after contract update)
        const creator = readPublicKey();

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
        const lastTradeTimestamp = readI64();
        const battleStartTimestamp = readI64();
        const victoryTimestamp = readI64();
        const listingTimestamp = readI64();
        const qualificationTimestamp = readI64(); // ← This was in the struct but not being read!
        const bump = readU8();

        // ⭐ NEW: Read metadata fields
        const name = readString();
        const symbol = readString();
        const uri = readString();

        // ⭐ Parse image from URI (URI contains the metadata JSON directly, not a URL)
        let image: string | undefined;
        if (uri) {
          try {
            // Try to parse URI as JSON first (it's the metadata object, not a URL)
            const metadata = JSON.parse(uri);
            image = metadata.image;
          } catch (jsonError) {
            // If it's not JSON, try fetching it as a URL (fallback)
            try {
              const response = await fetch(uri);
              const metadata = await response.json();
              image = metadata.image;
            } catch (fetchError) {
              // Could not get image
            }
          }
        }

        const parsedState: ParsedTokenBattleState = {
          mint,
          creator, // ⭐ NUOVO: wallet del creatore
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
          // ⭐ Metadata
          name,
          symbol,
          uri,
          image,
        };

        parsedTokens.push(parsedState);
      } catch (parseError) {
        continue;
      }
    }

    // 3. Merge: blockchain tokens + Supabase tokens (remove duplicates)
    const blockchainMints = new Set(parsedTokens.map(t => t.mint.toString()));

    // Add Supabase tokens that are NOT on blockchain
    const supabaseOnlyTokens = supabaseTokens.filter(
      t => !blockchainMints.has(t.mint.toString())
    );

    const allTokens = [...parsedTokens, ...supabaseOnlyTokens];

    // Sort by creation timestamp (newest first)
    allTokens.sort((a, b) => b.creationTimestamp - a.creationTimestamp);

    return allTokens;
  } catch (error) {
    console.error('❌ Error fetching BONK Battle tokens:', error);
    // Return empty array instead of throwing to prevent infinite loops
    return [];
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
