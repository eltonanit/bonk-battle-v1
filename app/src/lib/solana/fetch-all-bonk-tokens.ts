// app/src/lib/solana/fetch-all-bonk-tokens.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { BONK_BATTLE_PROGRAM_ID, BattleStatus } from './constants';
import { BattleTier } from '@/types/bonk';
import { RPC_ENDPOINT } from '@/config/solana';
import { supabase } from '@/lib/supabase';
import type { ParsedTokenBattleState } from '@/types/bonk';

/**
 * Helper to parse metadata that might be stored as JSON string
 * Handles cases where name/symbol/uri contain the full JSON object
 */
function parseMetadataField(value: string, field: 'name' | 'symbol' | 'image' | 'description'): string {
  if (!value) return '';

  // Check if the value looks like JSON (starts with { or [)
  const trimmed = value.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      // Try common field names (case insensitive)
      const fieldLower = field.toLowerCase();
      const fieldUpper = field.toUpperCase();
      return parsed[field] || parsed[fieldLower] || parsed[fieldUpper] || parsed.NAME || parsed.name || '';
    } catch {
      // Not valid JSON, return as is
      return value;
    }
  }

  return value;
}

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
          // ⭐ Parse metadata - try URI JSON FIRST, then fallback to name/symbol fields
          // Try to extract from URI first (which might contain full JSON metadata)
          let nameFromUri = '';
          let symbolFromUri = '';
          let imageFromUri = '';

          if (token.uri) {
            nameFromUri = parseMetadataField(token.uri, 'name');
            symbolFromUri = parseMetadataField(token.uri, 'symbol');
            imageFromUri = parseMetadataField(token.uri, 'image');
          }

          const rawName = token.name || '';
          const rawSymbol = token.symbol || '';

          // Priority: URI JSON > name field JSON > raw name field
          const name = nameFromUri || parseMetadataField(rawName, 'name') || rawName;
          const symbol = symbolFromUri ||
                         parseMetadataField(rawSymbol, 'symbol') ||
                         parseMetadataField(rawName, 'symbol') ||
                         rawSymbol;

          // ⭐ Parse image from multiple sources
          // Priority: direct image > URI JSON > rawName JSON
          let image = token.image || imageFromUri || '';

          // Try from rawName if it's JSON and still no image
          if (!image && rawName) {
            image = parseMetadataField(rawName, 'image') || '';
          }

          return {
            mint: new PublicKey(token.mint),
            tier: (token.tier ?? BattleTier.Test) as BattleTier,
            virtualSolReserves: token.virtual_sol_reserves || 0,
            virtualTokenReserves: token.virtual_token_reserves || 0,
            realSolReserves: token.real_sol_reserves || 0,
            realTokenReserves: token.real_token_reserves || 0,
            tokensSold: token.tokens_sold || 0,
            totalTradeVolume: token.total_trade_volume || 0,
            isActive: token.is_active ?? true,
            battleStatus: token.battle_status || BattleStatus.Created,
            opponentMint: new PublicKey(token.opponent_mint || '11111111111111111111111111111111'),
            creationTimestamp: token.creation_timestamp || Math.floor(Date.now() / 1000),
            lastTradeTimestamp: token.last_trade_timestamp || 0,
            battleStartTimestamp: token.battle_start_timestamp || 0,
            victoryTimestamp: token.victory_timestamp || 0,
            listingTimestamp: token.listing_timestamp || 0,
            bump: token.bump || 0,
            name,
            symbol,
            uri: token.uri || '',
            image,
            // ⭐ Backwards compatibility
            solCollected: token.real_sol_reserves || token.sol_collected || 0,
            creator: token.creator ? new PublicKey(token.creator) : undefined,
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

        // ========================================================================
        // Parse all fields - V2 STRUCTURE
        // ========================================================================
        const mint = readPublicKey();

        // Parse tier (1 byte) - V2
        const tier = readU8() as BattleTier;

        // Parse virtual/real reserves (V2)
        const virtualSolReserves = readU64();
        const virtualTokenReserves = readU64();
        const realSolReserves = readU64();
        const realTokenReserves = readU64();

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
        const bump = readU8();

        // ⭐ NEW: Read metadata fields
        const rawName = readString();
        const rawSymbol = readString();
        const uri = readString();

        // ⭐ Parse metadata - try URI JSON FIRST, then fallback to name/symbol fields
        let nameFromUri = '';
        let symbolFromUri = '';
        let imageFromUri = '';

        if (uri) {
          nameFromUri = parseMetadataField(uri, 'name');
          symbolFromUri = parseMetadataField(uri, 'symbol');
          imageFromUri = parseMetadataField(uri, 'image');
        }

        // Priority: URI JSON > name field JSON > raw name field
        const name = nameFromUri || parseMetadataField(rawName, 'name') || rawName;
        const symbol = symbolFromUri ||
                       parseMetadataField(rawSymbol, 'symbol') ||
                       parseMetadataField(rawName, 'symbol') ||
                       rawSymbol;

        // ⭐ Parse image from multiple sources
        // Priority: URI JSON > rawName JSON > fetch from URI URL
        let image: string | undefined = imageFromUri || undefined;

        // Try from rawName if it's JSON and still no image
        if (!image && rawName) {
          image = parseMetadataField(rawName, 'image') || undefined;
        }

        // Try fetching from URI URL if still no image
        if (!image && uri && !uri.startsWith('{')) {
          try {
            const response = await fetch(uri);
            const metadata = await response.json();
            image = metadata.image;
          } catch {
            // Could not get image
          }
        }

        const parsedState: ParsedTokenBattleState = {
          mint,
          tier,
          virtualSolReserves: Number(virtualSolReserves),
          virtualTokenReserves: Number(virtualTokenReserves),
          realSolReserves: Number(realSolReserves),
          realTokenReserves: Number(realTokenReserves),
          tokensSold: Number(tokensSold),
          totalTradeVolume: Number(totalTradeVolume),
          isActive,
          battleStatus,
          opponentMint,
          creationTimestamp: Number(creationTimestamp),
          lastTradeTimestamp: Number(lastTradeTimestamp),
          battleStartTimestamp: Number(battleStartTimestamp),
          victoryTimestamp: Number(victoryTimestamp),
          listingTimestamp: Number(listingTimestamp),
          bump,
          // ⭐ Metadata (parsed from JSON if needed)
          name,
          symbol,
          uri,
          image,
          // ⭐ Backwards compatibility
          solCollected: Number(realSolReserves),
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
