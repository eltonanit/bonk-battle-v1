// app/src/lib/indexer/sync-single-token.ts
// ═══════════════════════════════════════════════════════════════════════════════
// BONK BATTLE V2 - FIXED: Proper validation to prevent MAX_SAFE_INTEGER garbage
// ═══════════════════════════════════════════════════════════════════════════════

import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';
import { getBattleStatePDA } from '@/lib/solana/pdas';
import { RPC_ENDPOINT } from '@/config/solana';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION CONSTANTS - Prevent garbage data
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_REALISTIC_SOL_LAMPORTS = 1_000_000_000_000_000; // 1M SOL max
const MAX_REALISTIC_TOKENS = 10_000_000_000_000_000_000n; // 10B tokens with 9 decimals
const MIN_VALID_TIMESTAMP = 1577836800; // Jan 1, 2020
const MAX_VALID_TIMESTAMP = 4102444800; // Jan 1, 2100

export async function syncSingleToken(mint: string): Promise<{ success: boolean; error?: string }> {
    console.log(`🔄 Syncing token: ${mint.slice(0, 8)}...`);

    try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const mintPubkey = new PublicKey(mint);

        // 1. Get Battle State PDA
        const [battleStatePDA] = getBattleStatePDA(mintPubkey);

        // 2. Fetch account info
        const accountInfo = await connection.getAccountInfo(battleStatePDA);

        if (!accountInfo) {
            console.warn(`⚠️ No battle state found for ${mint.slice(0, 8)}...`);
            return { success: false, error: 'Battle state not found' };
        }

        const data = accountInfo.data;
        console.log(`📦 Account data length: ${data.length} bytes`);

        // Minimum size check for V2 structure
        if (data.length < 164) {
            console.warn(`⚠️ Invalid account data size: ${data.length}`);
            return { success: false, error: 'Invalid data size' };
        }

        // ═══════════════════════════════════════════════════════════════════════
        // HELPER FUNCTIONS WITH VALIDATION
        // ═══════════════════════════════════════════════════════════════════════

        let offset = 8; // Skip discriminator

        // Helper to read u64 with validation
        const readU64 = (fieldName: string, maxValue: number = MAX_REALISTIC_SOL_LAMPORTS): number => {
            const bytes = data.slice(offset, offset + 8);
            let value = 0n;
            for (let i = 0; i < 8; i++) {
                value |= BigInt(bytes[i]) << BigInt(i * 8);
            }
            offset += 8;

            // ⭐ CRITICAL FIX: Return 0 for invalid/garbage data instead of MAX_SAFE_INTEGER
            if (value > BigInt(maxValue)) {
                console.warn(`⚠️ ${fieldName} value ${value} exceeds max ${maxValue}, returning 0`);
                return 0;
            }

            return Number(value);
        };

        // Helper to read i64 (timestamp) with validation
        const readI64 = (fieldName: string): number => {
            const bytes = data.slice(offset, offset + 8);
            let value = 0n;
            for (let i = 0; i < 8; i++) {
                value |= BigInt(bytes[i]) << BigInt(i * 8);
            }
            offset += 8;

            // Handle signed conversion
            if (value >= 0x8000000000000000n) {
                value = value - 0x10000000000000000n;
            }

            const num = Number(value);

            // Validate timestamp range
            if (num !== 0 && (num < MIN_VALID_TIMESTAMP || num > MAX_VALID_TIMESTAMP)) {
                console.warn(`⚠️ ${fieldName} timestamp ${num} out of range, returning 0`);
                return 0;
            }
            return num;
        };

        // Helper to read Borsh String
        const readString = (fieldName: string): string => {
            if (offset + 4 > data.length) {
                return '';
            }

            const len = data.readUInt32LE(offset);
            offset += 4;

            if (len === 0) {
                return '';
            }

            if (len > 500 || offset + len > data.length) {
                console.warn(`⚠️ Invalid ${fieldName} length ${len}`);
                return '';
            }

            const str = data.slice(offset, offset + len).toString('utf8').replace(/\0/g, '').trim();
            offset += len;
            return str;
        };

        // ═══════════════════════════════════════════════════════════════════════
        // PARSE V2 FIELDS
        // ═══════════════════════════════════════════════════════════════════════

        // mint: Pubkey (32 bytes)
        const mintFromData = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // tier: u8 (1 byte)
        const tier = data[offset];
        offset += 1;

        // Reserves
        const virtualSolReserves = readU64('virtual_sol_reserves');
        const virtualTokenReserves = readU64('virtual_token_reserves', Number(MAX_REALISTIC_TOKENS));
        const realSolReserves = readU64('real_sol_reserves');
        const realTokenReserves = readU64('real_token_reserves', Number(MAX_REALISTIC_TOKENS));
        const tokensSold = readU64('tokens_sold', Number(MAX_REALISTIC_TOKENS));
        const totalTradeVolume = readU64('total_trade_volume');

        // Flags
        const isActive = data[offset] !== 0;
        offset += 1;

        const battleStatusRaw = data[offset];
        offset += 1;

        // opponent_mint: Pubkey (32 bytes)
        const opponentMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // Timestamps
        const creationTimestamp = readI64('creation_timestamp');
        const lastTradeTimestamp = readI64('last_trade_timestamp');
        const battleStartTimestamp = readI64('battle_start_timestamp');
        const victoryTimestamp = readI64('victory_timestamp');
        const listingTimestamp = readI64('listing_timestamp');

        // bump: u8
        const bump = data[offset];
        offset += 1;

        // Strings
        const name = readString('name');
        const symbol = readString('symbol');
        const uri = readString('uri');

        // ═══════════════════════════════════════════════════════════════════════
        // EXTRACT IMAGE FROM URI
        // ═══════════════════════════════════════════════════════════════════════

        let image = '';
        if (uri) {
            try {
                if (uri.startsWith('http')) {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 5000);
                    const response = await fetch(uri, { signal: controller.signal });
                    clearTimeout(timeout);
                    const metadata = await response.json();
                    image = metadata.image || '';
                } else if (uri.startsWith('{')) {
                    const metadata = JSON.parse(uri);
                    image = metadata.image || '';
                }
            } catch (err) {
                // Ignore fetch errors
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // LOG PARSED DATA
        // ═══════════════════════════════════════════════════════════════════════

        console.log(`✅ Parsed: ${mint.slice(0, 8)}...`);
        console.log(`   📝 name: "${name}" | symbol: "${symbol}"`);
        console.log(`   🎯 tier: ${tier} | status: ${battleStatusRaw}`);
        console.log(`   💰 virtual_sol: ${(virtualSolReserves / 1e9).toFixed(4)} SOL`);
        console.log(`   💵 real_sol: ${(realSolReserves / 1e9).toFixed(4)} SOL`);

        // ═══════════════════════════════════════════════════════════════════════
        // UPSERT TO SUPABASE
        // ═══════════════════════════════════════════════════════════════════════

        const tokenData = {
            mint: mint,
            name: name || null,
            symbol: symbol || null,
            uri: uri || null,
            image: image || null,
            tier: tier <= 1 ? tier : 0,
            virtual_sol_reserves: virtualSolReserves,
            virtual_token_reserves: virtualTokenReserves,
            real_sol_reserves: realSolReserves,
            real_token_reserves: realTokenReserves,
            sol_collected: realSolReserves, // Backwards compat
            tokens_sold: tokensSold,
            total_trade_volume: totalTradeVolume,
            is_active: isActive,
            battle_status: battleStatusRaw <= 5 ? battleStatusRaw : 0,
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

        console.log(`✅ Synced ${mint.slice(0, 8)}... to Supabase`);
        return { success: true };

    } catch (err) {
        console.error(`❌ Sync failed for ${mint.slice(0, 8)}...:`, err);
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
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Re-sync complete: ${success} success, ${failed} failed`);
    return { success, failed };
}