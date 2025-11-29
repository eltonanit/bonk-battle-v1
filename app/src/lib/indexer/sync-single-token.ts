// app/src/lib/indexer/sync-single-token.ts
// ═══════════════════════════════════════════════════════════════════════════
// BONK BATTLE V2 - Correct parsing matching DEPLOYED smart contract
// ═══════════════════════════════════════════════════════════════════════════
//
// TokenBattleState V2 struct layout (from smart contract):
// ───────────────────────────────────────────────────────────────────────────
// Offset  | Size   | Field
// ───────────────────────────────────────────────────────────────────────────
// 0       | 8      | discriminator
// 8       | 32     | mint: Pubkey
// 40      | 1      | tier: BattleTier (u8)
// 41      | 8      | virtual_sol_reserves: u64
// 49      | 8      | virtual_token_reserves: u64
// 57      | 8      | real_sol_reserves: u64
// 65      | 8      | real_token_reserves: u64
// 73      | 8      | tokens_sold: u64
// 81      | 8      | total_trade_volume: u64
// 89      | 1      | is_active: bool
// 90      | 1      | battle_status: u8
// 91      | 32     | opponent_mint: Pubkey
// 123     | 8      | creation_timestamp: i64
// 131     | 8      | last_trade_timestamp: i64
// 139     | 8      | battle_start_timestamp: i64
// 147     | 8      | victory_timestamp: i64
// 155     | 8      | listing_timestamp: i64
// 163     | 1      | bump: u8
// 164     | 4+N    | name: String (Borsh: 4 byte length + content)
// ...     | 4+M    | symbol: String
// ...     | 4+P    | uri: String
// ═══════════════════════════════════════════════════════════════════════════

import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';
import { getBattleStatePDA } from '@/lib/solana/pdas';
import { RPC_ENDPOINT } from '@/config/solana';

export async function syncSingleToken(mint: string): Promise<{ success: boolean; error?: string }> {
    console.log(`🔄 Syncing single token V2: ${mint}`);

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

        // Minimum size check
        if (data.length < 164) {
            console.warn(`⚠️ Invalid account data size: ${data.length}`);
            return { success: false, error: 'Invalid data size' };
        }

        // ═══════════════════════════════════════════════════════════════════
        // 3. Parse Battle State V2 with CORRECT offsets
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
        // PARSE V2 FIELDS IN EXACT ORDER FROM SMART CONTRACT
        // ═══════════════════════════════════════════════════════════════════

        // mint: Pubkey (32 bytes) - offset 8 → 40
        const mintFromData = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        console.log(`📍 After mint, offset: ${offset}`); // Should be 40

        // tier: BattleTier (1 byte) - offset 40 → 41
        const tier = data[offset];
        offset += 1;
        console.log(`📍 After tier (${tier}), offset: ${offset}`); // Should be 41

        // virtual_sol_reserves: u64 (8 bytes) - offset 41 → 49
        const virtualSolReserves = readU64();
        console.log(`📍 After virtual_sol_reserves (${virtualSolReserves}), offset: ${offset}`); // Should be 49

        // virtual_token_reserves: u64 (8 bytes) - offset 49 → 57
        const virtualTokenReserves = readU64();
        console.log(`📍 After virtual_token_reserves (${virtualTokenReserves}), offset: ${offset}`); // Should be 57

        // real_sol_reserves: u64 (8 bytes) - offset 57 → 65
        const realSolReserves = readU64();
        console.log(`📍 After real_sol_reserves (${realSolReserves}), offset: ${offset}`); // Should be 65

        // real_token_reserves: u64 (8 bytes) - offset 65 → 73
        const realTokenReserves = readU64();
        console.log(`📍 After real_token_reserves (${realTokenReserves}), offset: ${offset}`); // Should be 73

        // tokens_sold: u64 (8 bytes) - offset 73 → 81
        const tokensSold = readU64();
        console.log(`📍 After tokens_sold (${tokensSold}), offset: ${offset}`); // Should be 81

        // total_trade_volume: u64 (8 bytes) - offset 81 → 89
        const totalTradeVolume = readU64();
        console.log(`📍 After total_trade_volume (${totalTradeVolume}), offset: ${offset}`); // Should be 89

        // is_active: bool (1 byte) - offset 89 → 90
        const isActive = data[offset] !== 0;
        offset += 1;
        console.log(`📍 After is_active (${isActive}), offset: ${offset}`); // Should be 90

        // battle_status: u8 (1 byte) - offset 90 → 91
        const battleStatusRaw = data[offset];
        offset += 1;
        console.log(`📍 After battle_status (${battleStatusRaw}), offset: ${offset}`); // Should be 91

        // opponent_mint: Pubkey (32 bytes) - offset 91 → 123
        const opponentMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;
        console.log(`📍 After opponent_mint, offset: ${offset}`); // Should be 123

        // TIMESTAMPS (5 x i64 = 40 bytes)
        // creation_timestamp: i64 - offset 123 → 131
        const creationTimestamp = readI64();

        // last_trade_timestamp: i64 - offset 131 → 139
        const lastTradeTimestamp = readI64();

        // battle_start_timestamp: i64 - offset 139 → 147
        const battleStartTimestamp = readI64();

        // victory_timestamp: i64 - offset 147 → 155
        const victoryTimestamp = readI64();

        // listing_timestamp: i64 - offset 155 → 163
        const listingTimestamp = readI64();
        console.log(`📍 After timestamps, offset: ${offset}`); // Should be 163

        // bump: u8 (1 byte) - offset 163 → 164
        const bump = data[offset];
        offset += 1;
        console.log(`📍 After bump (${bump}), offset: ${offset}`); // Should be 164

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
                if (!(err instanceof Error && err.name === 'AbortError')) {
                    console.warn(`⚠️ Failed to extract image from URI:`, err);
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // LOG PARSED DATA FOR VERIFICATION
        // ═══════════════════════════════════════════════════════════════════

        console.log(`✅ Parsed battle state V2 for ${mint}`);
        console.log(`   📝 name: "${name}"`);
        console.log(`   📝 symbol: "${symbol}"`);
        console.log(`   📝 uri: "${uri.slice(0, 60)}${uri.length > 60 ? '...' : ''}"`);
        console.log(`   📝 image: "${image.slice(0, 60)}${image.length > 60 ? '...' : ''}"`);
        console.log(`   🎯 tier: ${tier}`);
        console.log(`   💰 virtual_sol_reserves: ${virtualSolReserves} (${(virtualSolReserves / 1e9).toFixed(4)} SOL)`);
        console.log(`   🪙 virtual_token_reserves: ${virtualTokenReserves}`);
        console.log(`   💵 real_sol_reserves: ${realSolReserves} (${(realSolReserves / 1e9).toFixed(4)} SOL)`);
        console.log(`   📊 tokens_sold: ${tokensSold}`);
        console.log(`   📈 total_trade_volume: ${totalTradeVolume}`);
        console.log(`   ⚔️ battle_status: ${battleStatusRaw}`);
        console.log(`   ⏱️ creation_timestamp: ${creationTimestamp}`);

        // ═══════════════════════════════════════════════════════════════════
        // 4. UPSERT TO SUPABASE (V2 fields)
        // ═══════════════════════════════════════════════════════════════════

        const tokenData = {
            mint: mint,
            name: name || null,
            symbol: symbol || null,
            uri: uri || null,
            image: image || null,
            // V2 specific fields
            tier: tier,
            virtual_sol_reserves: virtualSolReserves,
            virtual_token_reserves: virtualTokenReserves,
            real_sol_reserves: realSolReserves,
            real_token_reserves: realTokenReserves,
            // Common fields
            tokens_sold: tokensSold,
            total_trade_volume: totalTradeVolume,
            is_active: isActive,
            battle_status: battleStatusRaw,
            opponent_mint: opponentMint.toString() !== '11111111111111111111111111111111'
                ? opponentMint.toString()
                : null,
            creation_timestamp: creationTimestamp || null,
            last_trade_timestamp: lastTradeTimestamp || null,
            battle_start_timestamp: battleStartTimestamp || null,
            victory_timestamp: victoryTimestamp || null,
            listing_timestamp: listingTimestamp || null,
            bump: bump,
            updated_at: new Date().toISOString()
        };

        console.log(`📝 Upserting V2 to Supabase:`, {
            mint: tokenData.mint.slice(0, 8) + '...',
            name: tokenData.name,
            symbol: tokenData.symbol,
            tier: tokenData.tier,
            virtual_sol_reserves: tokenData.virtual_sol_reserves,
            battle_status: tokenData.battle_status
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

        console.log(`✅ Successfully synced V2 ${mint} to Supabase`);
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