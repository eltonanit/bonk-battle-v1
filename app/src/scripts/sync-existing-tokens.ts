// src/scripts/sync-existing-tokens.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// ⭐ CARICA .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// ⭐ SUPABASE CLIENT
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ⭐ USA VARIABILI D'AMBIENTE
const BONK_BATTLE_PROGRAM_ID = new PublicKey(
    process.env.NEXT_PUBLIC_PROGRAM_ID || 'HTNCkRMo8A8NFxDS8ANspLC16dgb1WpCSznsfb7BDdK9'
);
const RPC_ENDPOINT =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    'https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f';
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

/**
 * ========================================================================
 * ONE-TIME SYNC SCRIPT - SUPABASE VERSION
 * ========================================================================
 */

interface ParsedTokenData {
    mint: string;
    sol_collected: number;
    tokens_sold: number;
    total_trade_volume: number;
    is_active: boolean;
    battle_status: number;
    opponent_mint: string;
    creation_timestamp: number;
    qualification_timestamp: number;
    last_trade_timestamp: number;
    battle_start_timestamp: number;
    victory_timestamp: number;
    listing_timestamp: number;
    bump: number;
    name?: string;
    symbol?: string;
    uri?: string;
    image?: string;
}

/**
 * Parse TokenBattleState account data
 */
function parseTokenBattleState(data: Buffer, pubkey: PublicKey): ParsedTokenData | null {
    try {
        if (data.length < 100) {
            console.warn(`⚠️ Account too small: ${pubkey.toString()}`);
            return null;
        }

        let offset = 8;
        const mint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        const readU64 = (): number => {
            let value = 0n;
            for (let i = 0; i < 8; i++) {
                value |= BigInt(data[offset + i]) << BigInt(i * 8);
            }
            offset += 8;
            return Number(value);
        };

        const readI64 = (): number => {
            let value = 0n;
            for (let i = 0; i < 8; i++) {
                value |= BigInt(data[offset + i]) << BigInt(i * 8);
            }
            offset += 8;
            if (value >= 0x8000000000000000n) {
                value = value - 0x10000000000000000n;
            }
            return Number(value);
        };

        const sol_collected = readU64();
        const tokens_sold = readU64();
        const total_trade_volume = readU64();
        const is_active = data[offset] !== 0;
        offset += 1;
        const battle_status = data[offset];
        offset += 1;
        const opponent_mint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        const creation_timestamp = readI64();
        const last_trade_timestamp = readI64();
        const battle_start_timestamp = readI64();
        const victory_timestamp = readI64();
        const listing_timestamp = readI64();
        const qualification_timestamp = readI64();
        const bump = data[offset];

        return {
            mint: mint.toString(),
            sol_collected,
            tokens_sold,
            total_trade_volume,
            is_active,
            battle_status,
            opponent_mint: opponent_mint.toString(),
            creation_timestamp,
            qualification_timestamp,
            last_trade_timestamp,
            battle_start_timestamp,
            victory_timestamp,
            listing_timestamp,
            bump,
        };
    } catch (error) {
        console.error(`❌ Error parsing account ${pubkey.toString()}:`, error);
        return null;
    }
}

/**
 * Fetch metadata from Metaplex
 */
async function fetchMetadata(
    connection: Connection,
    mint: PublicKey
): Promise<{ name?: string; symbol?: string; uri?: string; image?: string }> {
    try {
        const [metadataPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            METADATA_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(metadataPDA);
        if (!accountInfo) return {};

        const data = accountInfo.data;
        let offset = 1 + 32 + 32;

        const nameLen = data.readUInt32LE(offset);
        offset += 4;
        const name = data.slice(offset, offset + nameLen).toString('utf8').replace(/\0/g, '').trim();
        offset += nameLen;

        const symbolLen = data.readUInt32LE(offset);
        offset += 4;
        const symbol = data.slice(offset, offset + symbolLen).toString('utf8').replace(/\0/g, '').trim();
        offset += symbolLen;

        const uriLen = data.readUInt32LE(offset);
        offset += 4;
        const uri = data.slice(offset, offset + uriLen).toString('utf8').replace(/\0/g, '').trim();

        let image: string | undefined;
        if (uri.startsWith('http')) {
            try {
                const response = await fetch(uri);
                if (response.ok) {
                    const json = await response.json();
                    image = json.image;
                }
            } catch { }
        } else if (uri.startsWith('{')) {
            try {
                const json = JSON.parse(uri);
                image = json.image;
            } catch { }
        }

        return { name, symbol, uri, image };
    } catch (error) {
        console.warn(`⚠️ Failed to fetch metadata for ${mint.toString()}`);
        return {};
    }
}

/**
 * Main sync function
 */
async function syncExistingTokens() {
    console.log('🔄 Starting one-time sync of existing tokens...');
    console.log('='.repeat(60));

    try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        console.log(`📡 Connected to: ${RPC_ENDPOINT}`);
        console.log(`🎯 Program ID: ${BONK_BATTLE_PROGRAM_ID.toString()}`);

        // 1. Fetch all program accounts
        console.log('\n📦 Fetching all program accounts...');
        const accounts = await connection.getProgramAccounts(BONK_BATTLE_PROGRAM_ID);
        console.log(`✅ Found ${accounts.length} accounts`);

        // 2. Parse and collect token data
        console.log('\n🔍 Parsing token data...');
        const tokensToSync: ParsedTokenData[] = [];

        for (const account of accounts) {
            const parsed = parseTokenBattleState(account.account.data, account.pubkey);
            if (parsed) {
                tokensToSync.push(parsed);
                console.log(`   ✓ ${parsed.symbol || parsed.mint.slice(0, 8)}...`);
            }
        }

        console.log(`\n✅ Parsed ${tokensToSync.length} valid tokens`);

        // 3. Fetch metadata for each token
        console.log('\n🎨 Fetching metadata...');
        for (const token of tokensToSync) {
            const metadata = await fetchMetadata(connection, new PublicKey(token.mint));
            token.name = metadata.name;
            token.symbol = metadata.symbol;
            token.uri = metadata.uri;
            token.image = metadata.image;

            if (metadata.name) {
                console.log(`   ✓ ${metadata.name} (${metadata.symbol})`);
            }

            await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // 4. Upsert to database via Supabase
        console.log('\n💾 Syncing to database...');
        for (const token of tokensToSync) {
            const { error } = await supabase.from('tokens').upsert(
                {
                    mint: token.mint,
                    sol_collected: token.sol_collected,
                    tokens_sold: token.tokens_sold,
                    total_trade_volume: token.total_trade_volume,
                    is_active: token.is_active,
                    battle_status: token.battle_status,
                    opponent_mint: token.opponent_mint,
                    creation_timestamp: token.creation_timestamp,
                    qualification_timestamp: token.qualification_timestamp,
                    last_trade_timestamp: token.last_trade_timestamp,
                    battle_start_timestamp: token.battle_start_timestamp,
                    victory_timestamp: token.victory_timestamp,
                    listing_timestamp: token.listing_timestamp,
                    bump: token.bump,
                    name: token.name,
                    symbol: token.symbol,
                    uri: token.uri,
                    image: token.image,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'mint' }
            );

            if (error) {
                console.error(`   ❌ Failed to sync ${token.mint}:`, error);
            } else {
                console.log(`   ✓ Synced: ${token.symbol || token.mint.slice(0, 8)}...`);
            }
        }

        // 5. Sync Price Oracle
        console.log('\n🔮 Syncing Price Oracle...');
        try {
            const [priceOraclePDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('price_oracle')],
                BONK_BATTLE_PROGRAM_ID
            );

            const accountInfo = await connection.getAccountInfo(priceOraclePDA);
            if (accountInfo) {
                const data = accountInfo.data;
                let offset = 8;

                const readU64 = (): number => {
                    let value = 0n;
                    for (let i = 0; i < 8; i++) {
                        value |= BigInt(data[offset + i]) << BigInt(i * 8);
                    }
                    offset += 8;
                    return Number(value);
                };

                const readI64 = (): number => {
                    let value = 0n;
                    for (let i = 0; i < 8; i++) {
                        value |= BigInt(data[offset + i]) << BigInt(i * 8);
                    }
                    offset += 8;
                    if (value >= 0x8000000000000000n) value -= 0x10000000000000000n;
                    return Number(value);
                };

                const priceRaw = readU64();
                const price = priceRaw / 1_000_000;
                const lastUpdate = readI64();
                const nextUpdate = readI64();
                const keeperBytes = data.slice(offset, offset + 32);
                const keeper = new PublicKey(keeperBytes).toString();
                offset += 32;
                const updateCount = readU64();

                await supabase.from('price_oracle').upsert({
                    id: 1,
                    sol_price_usd: price,
                    last_update: lastUpdate,
                    next_update: nextUpdate,
                    update_count: updateCount,
                    keeper_authority: keeper,
                    updated_at: new Date().toISOString(),
                });

                console.log(`   ✓ Oracle synced: $${price.toFixed(2)}`);
            }
        } catch (error) {
            console.warn('⚠️ Failed to sync oracle:', error);
        }

        // 6. Summary
        console.log('\n' + '='.repeat(60));
        console.log('✅ SYNC COMPLETED!');
        console.log(`   Tokens synced: ${tokensToSync.length}`);
        console.log('='.repeat(60));
    } catch (error) {
        console.error('\n❌ Sync failed:', error);
        throw error;
    }
}

// Run script
syncExistingTokens()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });