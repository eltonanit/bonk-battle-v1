import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import { BONK_BATTLE_PROGRAM_ID, BattleStatus } from '@/lib/solana/constants';
import { RPC_ENDPOINT } from '@/config/solana';

export async function syncTokensToSupabase() {
    console.log('🔄 Starting token sync...');

    try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

        // 1. Fetch all accounts from RPC
        // We remove filters to ensure we get everything, then filter in memory
        const response = await connection.getProgramAccounts(BONK_BATTLE_PROGRAM_ID);
        const accounts = response as any[];

        console.log(`📦 Fetched ${accounts.length} accounts from RPC`);

        const tokensToUpsert = [];

        for (const account of accounts) {
            try {
                const data = account.account.data;

                // Basic validation
                if (data.length < 100) continue;

                // Parse Logic
                let offset = 8; // Skip discriminator

                const mint = new PublicKey(data.slice(offset, offset + 32));
                offset += 32;

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
                    // Handle signed
                    if (value >= 0x8000000000000000n) {
                        value = value - 0x10000000000000000n;
                    }
                    return Number(value);
                };

                const solCollected = readU64();
                const tokensSold = readU64();
                const totalTradeVolume = readU64();

                const isActive = data[offset] !== 0;
                offset += 1;

                const battleStatusRaw = data[offset];
                offset += 1;

                const opponentMint = new PublicKey(data.slice(offset, offset + 32));
                offset += 32;

                const creationTimestamp = readI64();
                const qualificationTimestamp = readI64();
                const lastTradeTimestamp = readI64();
                const battleStartTimestamp = readI64();
                const victoryTimestamp = readI64();
                const listingTimestamp = readI64();
                const bump = data[offset];

                // --- METADATA FETCHING ---
                let name = '';
                let symbol = '';
                let uri = '';
                // let image = ''; // We can fetch this later or client-side from URI

                try {
                    const [metadataPDA] = PublicKey.findProgramAddressSync(
                        [
                            Buffer.from('metadata'),
                            METADATA_PROGRAM_ID.toBuffer(),
                            mint.toBuffer(),
                        ],
                        METADATA_PROGRAM_ID
                    );

                    const accountInfo = await connection.getAccountInfo(metadataPDA);
                    if (accountInfo) {
                        const metaData = accountInfo.data;
                        // Skip discriminator (1) + update authority (32) + mint (32)
                        let metaOffset = 1 + 32 + 32;

                        const nameLen = metaData.readUInt32LE(metaOffset);
                        metaOffset += 4;
                        name = metaData.slice(metaOffset, metaOffset + nameLen).toString('utf8').replace(/\0/g, '').trim();
                        metaOffset += nameLen;

                        const symbolLen = metaData.readUInt32LE(metaOffset);
                        metaOffset += 4;
                        symbol = metaData.slice(metaOffset, metaOffset + symbolLen).toString('utf8').replace(/\0/g, '').trim();
                        metaOffset += symbolLen;

                        const uriLen = metaData.readUInt32LE(metaOffset);
                        metaOffset += 4;
                        uri = metaData.slice(metaOffset, metaOffset + uriLen).toString('utf8').replace(/\0/g, '').trim();
                    }
                } catch (metaErr) {
                    console.warn(`⚠️ Failed to fetch metadata for ${mint.toString()}:`, metaErr);
                }

                // Prepare object for Supabase
                tokensToUpsert.push({
                    mint: mint.toString(),
                    sol_collected: solCollected,
                    tokens_sold: tokensSold,
                    total_trade_volume: totalTradeVolume,
                    is_active: isActive,
                    battle_status: battleStatusRaw,
                    opponent_mint: opponentMint.toString(),
                    creation_timestamp: creationTimestamp,
                    qualification_timestamp: qualificationTimestamp,
                    last_trade_timestamp: lastTradeTimestamp,
                    battle_start_timestamp: battleStartTimestamp,
                    victory_timestamp: victoryTimestamp,
                    listing_timestamp: listingTimestamp,
                    bump: bump,
                    name: name,
                    symbol: symbol,
                    uri: uri,
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
