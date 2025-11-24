// app/src/lib/indexer/sync-single-token.ts
// FIXED VERSION V4 - Variable length strings (no padding!)

import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';
import { getBattleStatePDA } from '@/lib/solana/pdas';
import { RPC_ENDPOINT } from '@/config/solana';

/**
 * TokenBattleState struct layout:
 * - 8 bytes: discriminator
 * - 32 bytes: mint
 * - 32 bytes: creator
 * - 8 bytes: sol_collected (u64)
 * - 8 bytes: tokens_sold (u64)
 * - 8 bytes: total_trade_volume (u64)
 * - 1 byte: is_active (bool)
 * - 1 byte: battle_status (u8)
 * - 32 bytes: opponent_mint
 * - 8 bytes: creation_timestamp (i64)
 * - 8 bytes: last_trade_timestamp (i64)
 * - 8 bytes: battle_start_timestamp (i64)
 * - 8 bytes: victory_timestamp (i64)
 * - 8 bytes: listing_timestamp (i64)
 * - 8 bytes: qualification_timestamp (i64)
 * - 1 byte: bump (u8)
 * - String: name (4 + len bytes, VARIABLE!)
 * - String: symbol (4 + len bytes, VARIABLE!)
 * - String: uri (4 + len bytes, VARIABLE!)
 */

export async function syncSingleToken(mint: string): Promise<{ success: boolean; error?: string }> {
    console.log(`🔄 Syncing single token: ${mint}`);

    try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const mintPubkey = new PublicKey(mint);

        // 1. Get Battle State PDA
        const [battleStatePDA] = getBattleStatePDA(mintPubkey);

        // 2. Fetch account info
        const accountInfo = await connection.getAccountInfo(battleStatePDA);

        if (!accountInfo) {
            console.warn(`⚠️ No battle state found for ${mint}`);
            return { success: false, error: 'Battle state not found' };
        }

        const data = accountInfo.data;
        console.log(`📦 Account data length: ${data.length} bytes`);

        if (data.length < 200) {
            console.warn(`⚠️ Invalid account data size: ${data.length}`);
            return { success: false, error: 'Invalid data size' };
        }

        // 3. Parse Battle State with CORRECT offsets
        let offset = 8; // Skip discriminator

        // mint: Pubkey (32 bytes)
        const mintFromData = new PublicKey(data.slice(offset, offset + 32));
        offset += 32; // offset = 40

        // creator: Pubkey (32 bytes)
        const creatorPubkey = new PublicKey(data.slice(offset, offset + 32));
        const creator = creatorPubkey.toString();
        offset += 32; // offset = 72

        console.log(`👤 Creator from battle state: ${creator.slice(0, 8)}...`);

        // Helper to read u64 safely
        const readU64 = (): number => {
            const bytes = data.slice(offset, offset + 8);
            let value = 0n;
            for (let i = 0; i < 8; i++) {
                value |= BigInt(bytes[i]) << BigInt(i * 8);
            }
            offset += 8;
            if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
                return Number.MAX_SAFE_INTEGER;
            }
            return Number(value);
        };

        // Helper to read i64 (timestamp) safely
        const readI64 = (): number => {
            const bytes = data.slice(offset, offset + 8);
            let value = 0n;
            for (let i = 0; i < 8; i++) {
                value |= BigInt(bytes[i]) << BigInt(i * 8);
            }
            offset += 8;

            if (value >= 0x8000000000000000n) {
                value = value - 0x10000000000000000n;
            }

            const num = Number(value);

            // Validate timestamp (between 2020 and 2100)
            if (num < 1577836800 || num > 4102444800) {
                return 0;
            }
            return num;
        };

        // Helper to read Borsh String (4 byte length + variable content, NO PADDING!)
        const readString = (): string => {
            if (offset + 4 > data.length) {
                console.warn(`⚠️ Not enough bytes for string length at offset ${offset}`);
                return '';
            }

            const len = data.readUInt32LE(offset);
            offset += 4;

            // Sanity check: length should be reasonable
            if (len === 0) {
                return '';
            }
            if (len > 500 || offset + len > data.length) {
                console.warn(`⚠️ Invalid string length ${len} at offset ${offset - 4}`);
                return '';
            }

            const str = data.slice(offset, offset + len).toString('utf8').replace(/\0/g, '').trim();
            offset += len; // Move only by ACTUAL length, not fixed padding!
            return str;
        };

        // Parse numeric fields in CORRECT ORDER
        const solCollected = readU64();      // offset 72 -> 80
        const tokensSold = readU64();        // offset 80 -> 88
        const totalTradeVolume = readU64();  // offset 88 -> 96

        const isActive = data[offset] !== 0; // offset 96
        offset += 1;

        const battleStatusRaw = data[offset]; // offset 97
        offset += 1;

        const opponentMint = new PublicKey(data.slice(offset, offset + 32)); // offset 98 -> 130
        offset += 32;

        // Timestamps in CORRECT ORDER
        const creationTimestamp = readI64();      // 130 -> 138
        const lastTradeTimestamp = readI64();     // 138 -> 146
        const battleStartTimestamp = readI64();   // 146 -> 154
        const victoryTimestamp = readI64();       // 154 -> 162
        const listingTimestamp = readI64();       // 162 -> 170
        const qualificationTimestamp = readI64(); // 170 -> 178

        const bump = data[offset]; // offset 178
        offset += 1; // offset = 179

        // Read variable-length strings
        console.log(`📍 Reading name at offset: ${offset}`);
        const name = readString();

        console.log(`📍 Reading symbol at offset: ${offset}`);
        const symbol = readString();

        console.log(`📍 Reading uri at offset: ${offset}`);
        const uri = readString();

        console.log(`✅ Parsed battle state for ${mint}`);
        console.log(`   name: "${name}", symbol: "${symbol}"`);
        console.log(`   uri: "${uri.slice(0, 50)}..."`);
        console.log(`   sol_collected: ${solCollected}, tokens_sold: ${tokensSold}`);
        console.log(`   creation_timestamp: ${creationTimestamp}`);
        console.log(`   creator: ${creator.slice(0, 8)}...`);

        // 4. Extract image from URI
        let image = '';
        if (uri) {
            try {
                // URI might be a URL or direct JSON
                if (uri.startsWith('http')) {
                    // Fetch from URL
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 5000);

                    const response = await fetch(uri, { signal: controller.signal });
                    clearTimeout(timeout);

                    const metadata = await response.json();
                    image = metadata.image || '';
                    console.log(`✅ Fetched image from URL`);
                } else if (uri.startsWith('{')) {
                    // URI contains JSON directly
                    const metadata = JSON.parse(uri);
                    image = metadata.image || '';
                    console.log(`✅ Parsed image from JSON URI`);
                }
            } catch (err) {
                // Silently ignore timeout errors for image fetch
                if (!(err instanceof Error && err.name === 'TimeoutError')) {
                    console.warn(`⚠️ Failed to extract image from URI`);
                }
            }
        }

        // 5. Upsert to Supabase
        const tokenData = {
            mint: mint,
            name: name || null,
            symbol: symbol || null,
            uri: uri || null,
            image: image || null,
            creator: creator || null,
            sol_collected: solCollected,
            tokens_sold: tokensSold,
            total_trade_volume: totalTradeVolume,
            is_active: isActive,
            battle_status: battleStatusRaw,
            opponent_mint: opponentMint.toString() !== '11111111111111111111111111111111'
                ? opponentMint.toString()
                : null,
            creation_timestamp: creationTimestamp || null,
            qualification_timestamp: qualificationTimestamp || null,
            last_trade_timestamp: lastTradeTimestamp || null,
            battle_start_timestamp: battleStartTimestamp || null,
            victory_timestamp: victoryTimestamp || null,
            listing_timestamp: listingTimestamp || null,
            bump: bump,
            updated_at: new Date().toISOString()
        };

        console.log(`📝 Upserting:`, {
            mint: tokenData.mint.slice(0, 8) + '...',
            name: tokenData.name,
            symbol: tokenData.symbol,
            creator: tokenData.creator?.slice(0, 8) + '...',
            sol_collected: tokenData.sol_collected
        });

        const { error } = await supabase
            .from('tokens')
            .upsert(tokenData, {
                onConflict: 'mint',
                ignoreDuplicates: false
            });

        if (error) {
            console.error(`❌ Supabase upsert error:`, error);
            return { success: false, error: error.message };
        }

        console.log(`✅ Successfully synced ${mint} to Supabase`);
        return { success: true };

    } catch (err) {
        console.error(`❌ Sync failed for ${mint}:`, err);
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}