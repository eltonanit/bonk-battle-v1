// app/src/lib/indexer/sync-single-token.ts
// ═══════════════════════════════════════════════════════════════════════════
// FIXED VERSION - Correct parsing matching ACTUAL on-chain TokenBattleState
// ═══════════════════════════════════════════════════════════════════════════
//
// TokenBattleState struct layout (from smart contract):
// ───────────────────────────────────────────────────────────────────────────
// Offset  | Size   | Field
// ───────────────────────────────────────────────────────────────────────────
// 0       | 8      | discriminator
// 8       | 32     | mint: Pubkey
// 40      | 8      | sol_collected: u64
// 48      | 8      | tokens_sold: u64
// 56      | 8      | total_trade_volume: u64
// 64      | 1      | is_active: bool
// 65      | 1      | battle_status: u8
// 66      | 32     | opponent_mint: Pubkey
// 98      | 8      | creation_timestamp: i64
// 106     | 8      | last_trade_timestamp: i64
// 114     | 8      | battle_start_timestamp: i64
// 122     | 8      | victory_timestamp: i64
// 130     | 8      | listing_timestamp: i64
// 138     | 8      | qualification_timestamp: i64
// 146     | 1      | bump: u8
// 147     | 4+N    | name: String (Borsh: 4 byte length + content)
// 147+N   | 4+M    | symbol: String
// ...     | 4+P    | uri: String
// ═══════════════════════════════════════════════════════════════════════════

import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';
import { getBattleStatePDA } from '@/lib/solana/pdas';
import { RPC_ENDPOINT } from '@/config/solana';

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

        // Minimum size: 8 (discriminator) + 32 (mint) + 8*3 (u64s) + 2 (bools) + 32 (opponent) + 8*6 (timestamps) + 1 (bump) = 147 bytes minimum
        if (data.length < 147) {
            console.warn(`⚠️ Invalid account data size: ${data.length}`);
            return { success: false, error: 'Invalid data size' };
        }

        // ═══════════════════════════════════════════════════════════════════
        // 3. Parse Battle State with CORRECT offsets (NO CREATOR FIELD!)
        // ═══════════════════════════════════════════════════════════════════

        let offset = 8; // Skip discriminator

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

        // Helper to read Borsh String (4 byte length + variable content)
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
            offset += len;
            return str;
        };

        // ═══════════════════════════════════════════════════════════════════
        // PARSE FIELDS IN EXACT ORDER FROM SMART CONTRACT
        // ═══════════════════════════════════════════════════════════════════

        // mint: Pubkey (32 bytes) - offset 8 → 40
        const mintFromData = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        console.log(`📍 After mint, offset: ${offset}`); // Should be 40

        // sol_collected: u64 (8 bytes) - offset 40 → 48
        const solCollected = readU64();
        console.log(`📍 After sol_collected (${solCollected}), offset: ${offset}`); // Should be 48

        // tokens_sold: u64 (8 bytes) - offset 48 → 56
        const tokensSold = readU64();
        console.log(`📍 After tokens_sold (${tokensSold}), offset: ${offset}`); // Should be 56

        // total_trade_volume: u64 (8 bytes) - offset 56 → 64
        const totalTradeVolume = readU64();
        console.log(`📍 After total_trade_volume (${totalTradeVolume}), offset: ${offset}`); // Should be 64

        // is_active: bool (1 byte) - offset 64 → 65
        const isActive = data[offset] !== 0;
        offset += 1;
        console.log(`📍 After is_active (${isActive}), offset: ${offset}`); // Should be 65

        // battle_status: u8 (1 byte) - offset 65 → 66
        const battleStatusRaw = data[offset];
        offset += 1;
        console.log(`📍 After battle_status (${battleStatusRaw}), offset: ${offset}`); // Should be 66

        // opponent_mint: Pubkey (32 bytes) - offset 66 → 98
        const opponentMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        console.log(`📍 After opponent_mint, offset: ${offset}`); // Should be 98

        // TIMESTAMPS (6 x i64 = 48 bytes total)
        // creation_timestamp: i64 - offset 98 → 106
        const creationTimestamp = readI64();

        // last_trade_timestamp: i64 - offset 106 → 114
        const lastTradeTimestamp = readI64();

        // battle_start_timestamp: i64 - offset 114 → 122
        const battleStartTimestamp = readI64();

        // victory_timestamp: i64 - offset 122 → 130
        const victoryTimestamp = readI64();

        // listing_timestamp: i64 - offset 130 → 138
        const listingTimestamp = readI64();

        // qualification_timestamp: i64 - offset 138 → 146
        const qualificationTimestamp = readI64();
        console.log(`📍 After timestamps, offset: ${offset}`); // Should be 146

        // bump: u8 (1 byte) - offset 146 → 147
        const bump = data[offset];
        offset += 1;
        console.log(`📍 After bump (${bump}), offset: ${offset}`); // Should be 147

        // ═══════════════════════════════════════════════════════════════════
        // VARIABLE-LENGTH STRINGS (Borsh format: 4-byte length + content)
        // ═══════════════════════════════════════════════════════════════════

        console.log(`📍 Reading name at offset: ${offset}`);
        const name = readString();

        console.log(`📍 Reading symbol at offset: ${offset}`);
        const symbol = readString();

        console.log(`📍 Reading uri at offset: ${offset}`);
        const uri = readString();

        // ═══════════════════════════════════════════════════════════════════
        // EXTRACT IMAGE FROM URI (JSON metadata)
        // ═══════════════════════════════════════════════════════════════════

        let image = '';
        if (uri) {
            try {
                if (uri.startsWith('http')) {
                    // Fetch from URL with timeout
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 5000);

                    const response = await fetch(uri, { signal: controller.signal });
                    clearTimeout(timeout);

                    const metadata = await response.json();
                    image = metadata.image || '';
                    console.log(`✅ Fetched image from URL: ${image.slice(0, 50)}...`);
                } else if (uri.startsWith('{')) {
                    // URI contains JSON directly
                    const metadata = JSON.parse(uri);
                    image = metadata.image || '';
                    console.log(`✅ Parsed image from JSON URI: ${image.slice(0, 50)}...`);
                }
            } catch (err) {
                // Silently handle timeout errors
                if (!(err instanceof Error && err.name === 'AbortError')) {
                    console.warn(`⚠️ Failed to extract image from URI:`, err);
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // LOG PARSED DATA FOR VERIFICATION
        // ═══════════════════════════════════════════════════════════════════

        console.log(`✅ Parsed battle state for ${mint}`);
        console.log(`   📝 name: "${name}"`);
        console.log(`   📝 symbol: "${symbol}"`);
        console.log(`   📝 uri: "${uri.slice(0, 60)}${uri.length > 60 ? '...' : ''}"`);
        console.log(`   📝 image: "${image.slice(0, 60)}${image.length > 60 ? '...' : ''}"`);
        console.log(`   💰 sol_collected: ${solCollected} (${(solCollected / 1e9).toFixed(4)} SOL)`);
        console.log(`   🪙 tokens_sold: ${tokensSold}`);
        console.log(`   📊 total_trade_volume: ${totalTradeVolume}`);
        console.log(`   ⚔️ battle_status: ${battleStatusRaw}`);
        console.log(`   ⏱️ creation_timestamp: ${creationTimestamp}`);

        // ═══════════════════════════════════════════════════════════════════
        // 4. UPSERT TO SUPABASE
        // ═══════════════════════════════════════════════════════════════════

        const tokenData = {
            mint: mint,
            name: name || null,
            symbol: symbol || null,
            uri: uri || null,
            image: image || null,
            // NOTE: 'creator' field doesn't exist in on-chain struct!
            // If you need creator, derive it from first transaction signature
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

        console.log(`📝 Upserting to Supabase:`, {
            mint: tokenData.mint.slice(0, 8) + '...',
            name: tokenData.name,
            symbol: tokenData.symbol,
            battle_status: tokenData.battle_status,
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

/**
 * Re-sync all tokens from a list of mints
 */
export async function resyncAllTokens(mints: string[]): Promise<{ success: number; failed: number }> {
    console.log(`🔄 Re-syncing ${mints.length} tokens...`);

    let success = 0;
    let failed = 0;

    for (const mint of mints) {
        const result = await syncSingleToken(mint);
        if (result.success) {
            success++;
        } else {
            failed++;
            console.error(`❌ Failed to sync ${mint}: ${result.error}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Re-sync complete: ${success} success, ${failed} failed`);
    return { success, failed };
}