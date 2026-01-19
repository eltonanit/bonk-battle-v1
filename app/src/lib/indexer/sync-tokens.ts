import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import { BONK_BATTLE_PROGRAM_ID, BattleStatus } from '@/lib/solana/constants';
import { RPC_ENDPOINT } from '@/config/solana';

// ⭐ Network detection from env
const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta';
const CURRENT_NETWORK_DB = SOLANA_NETWORK === 'mainnet-beta' ? 'mainnet' : 'devnet';

/**
 * Helper to parse metadata that might be stored as JSON string
 */
function parseMetadataField(value: string, field: 'name' | 'symbol' | 'image'): string {
    if (!value) return '';
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            return parsed[field] || parsed[field.toLowerCase()] || '';
        } catch {
            return value;
        }
    }
    return value;
}

export async function syncTokensToSupabase() {
    console.log('🔄 Starting token sync (V2)...');

    try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');

        // 1. Fetch all accounts from RPC
        const response = await connection.getProgramAccounts(BONK_BATTLE_PROGRAM_ID);
        const accounts = response as any[];

        console.log(`📦 Fetched ${accounts.length} accounts from RPC`);

        // TokenBattleState discriminator from IDL
        const TOKEN_BATTLE_STATE_DISCRIMINATOR = Buffer.from([54, 102, 185, 22, 231, 3, 228, 117]);

        const tokensToUpsert = [];

        for (const account of accounts) {
            try {
                const data = account.account.data;

                // Check discriminator
                const accountDiscriminator = data.slice(0, 8);
                if (!accountDiscriminator.equals(TOKEN_BATTLE_STATE_DISCRIMINATOR)) {
                    continue;
                }

                // ⭐ V2 STRUCTURE PARSING
                let offset = 8; // Skip discriminator

                // Helper functions
                const readPublicKey = (): PublicKey => {
                    const pk = new PublicKey(data.slice(offset, offset + 32));
                    offset += 32;
                    return pk;
                };

                const readU64 = (): number => {
                    let value = 0n;
                    for (let i = 0; i < 8; i++) {
                        value |= BigInt(data[offset + i]) << BigInt(i * 8);
                    }
                    offset += 8;
                    // Cap at safe JavaScript Number.MAX_SAFE_INTEGER to avoid precision loss
                    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
                    if (value > maxSafe) value = maxSafe;
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

                const readU8 = (): number => {
                    const value = data[offset];
                    offset += 1;
                    return value;
                };

                const readBool = (): boolean => {
                    const value = data[offset] !== 0;
                    offset += 1;
                    return value;
                };

                const readString = (): string => {
                    const length = data.readUInt32LE(offset);
                    offset += 4;
                    // Remove null bytes and trim
                    const str = data.slice(offset, offset + length).toString('utf8').replace(/\0/g, '').trim();
                    offset += length;
                    return str;
                };

                // Parse V2 fields
                const mint = readPublicKey();
                const tier = readU8();

                // V2: Virtual/Real reserves
                const virtualSolReserves = readU64();
                const virtualTokenReserves = readU64();
                const realSolReserves = readU64();
                const realTokenReserves = readU64();

                const tokensSold = readU64();
                const totalTradeVolume = readU64();
                const isActive = readBool();
                const battleStatusRaw = readU8();
                const opponentMint = readPublicKey();
                const creationTimestamp = readI64();
                const lastTradeTimestamp = readI64();
                const battleStartTimestamp = readI64();
                const victoryTimestamp = readI64();
                const listingTimestamp = readI64();
                const bump = readU8();

                // ⭐ V2: Read metadata directly from account (with bounds check)
                let rawName = '';
                let rawSymbol = '';
                let uri = '';

                // Check if there's enough data for metadata strings
                if (offset + 4 <= data.length) {
                    try {
                        rawName = readString();
                        if (offset + 4 <= data.length) {
                            rawSymbol = readString();
                            if (offset + 4 <= data.length) {
                                uri = readString();
                            }
                        }
                    } catch {
                        // V1 account without metadata strings - that's ok
                    }
                }

                // Parse metadata (may be JSON)
                let nameFromUri = '';
                let symbolFromUri = '';
                let imageFromUri = '';

                if (uri) {
                    nameFromUri = parseMetadataField(uri, 'name');
                    symbolFromUri = parseMetadataField(uri, 'symbol');
                    imageFromUri = parseMetadataField(uri, 'image');
                }

                // Clean strings of any remaining null bytes
                const cleanStr = (s: string) => s.replace(/\0/g, '').trim();

                const name = cleanStr(nameFromUri || parseMetadataField(rawName, 'name') || rawName);
                const symbol = cleanStr(symbolFromUri || parseMetadataField(rawSymbol, 'symbol') || parseMetadataField(rawName, 'symbol') || rawSymbol);
                let image = cleanStr(imageFromUri || parseMetadataField(rawName, 'image') || '');

                // Try fetching image from URI URL if still no image
                if (!image && uri && !uri.startsWith('{')) {
                    try {
                        const response = await fetch(uri);
                        const metadata = await response.json();
                        image = metadata.image || '';
                    } catch {
                        // Could not get image
                    }
                }

                // Prepare object for Supabase (V2 fields)
                tokensToUpsert.push({
                    mint: mint.toString(),
                    tier: tier,
                    network: CURRENT_NETWORK_DB, // ⭐ Save network (mainnet/devnet)
                    virtual_sol_reserves: virtualSolReserves,
                    virtual_token_reserves: virtualTokenReserves,
                    real_sol_reserves: realSolReserves,
                    real_token_reserves: realTokenReserves,
                    sol_collected: realSolReserves, // Backwards compatibility
                    tokens_sold: tokensSold,
                    total_trade_volume: totalTradeVolume,
                    is_active: isActive,
                    battle_status: battleStatusRaw,
                    opponent_mint: opponentMint.toString(),
                    creation_timestamp: creationTimestamp,
                    last_trade_timestamp: lastTradeTimestamp,
                    battle_start_timestamp: battleStartTimestamp,
                    victory_timestamp: victoryTimestamp,
                    listing_timestamp: listingTimestamp,
                    bump: bump,
                    name: name,
                    symbol: symbol,
                    uri: uri,
                    image: image,
                    updated_at: new Date().toISOString()
                });

            } catch (parseErr) {
                console.warn('⚠️ Failed to parse account for sync:', parseErr);
            }
        }

        if (tokensToUpsert.length > 0) {
            // 2. Upsert to Supabase
            const { error } = await supabase
                .from('tokens')
                .upsert(tokensToUpsert, {
                    onConflict: 'mint',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error('❌ Supabase upsert error:', error);
                throw error;
            }

            console.log(`✅ Successfully synced ${tokensToUpsert.length} tokens to Supabase`);
        } else {
            console.log('ℹ️ No tokens to sync');
        }

        // --- SYNC PRICE ORACLE ---
        try {
            console.log('🔮 Syncing Price Oracle...');
            const [priceOraclePDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('price_oracle')],
                BONK_BATTLE_PROGRAM_ID
            );

            const accountInfo = await connection.getAccountInfo(priceOraclePDA);
            if (accountInfo) {
                const data = accountInfo.data;
                let offset = 8; // Skip discriminator

                const readU64 = () => {
                    let value = 0n;
                    for (let i = 0; i < 8; i++) {
                        value |= BigInt(data[offset + i]) << BigInt(i * 8);
                    }
                    offset += 8;
                    return Number(value);
                };

                const readI64 = () => {
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

                const { error: oracleError } = await supabase
                    .from('price_oracle')
                    .upsert({
                        id: 1,
                        sol_price_usd: price,
                        last_update: lastUpdate,
                        next_update: nextUpdate,
                        update_count: updateCount,
                        keeper_authority: keeper,
                        updated_at: new Date().toISOString()
                    });

                if (oracleError) {
                    console.warn('⚠️ Failed to upsert oracle:', oracleError);
                } else {
                    console.log(`✅ Oracle synced: $${price.toFixed(2)}`);
                }
            }
        } catch (oracleErr) {
            console.warn('⚠️ Failed to sync oracle:', oracleErr);
        }

        return { success: true, count: tokensToUpsert.length };

    } catch (err) {
        console.error('❌ Sync failed:', err);
        throw err;
    }
}
