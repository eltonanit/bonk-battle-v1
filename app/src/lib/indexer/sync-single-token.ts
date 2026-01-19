// app/src/lib/indexer/sync-single-token.ts
// ═══════════════════════════════════════════════════════════════════════════════
// BONK BATTLE - Token Sync from On-Chain Data
// Matches ACTUAL Rust struct (NO tier field in smart contract!)
// ═══════════════════════════════════════════════════════════════════════════════

import { Connection, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { getBattleStatePDA } from '@/lib/solana/pdas';
import { RPC_ENDPOINT } from '@/config/solana';

// ⭐ Use service role to bypass RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_REALISTIC_SOL_LAMPORTS = 1_000_000_000_000_000; // 1M SOL max
const MAX_REALISTIC_TOKENS = 10_000_000_000_000_000_000n; // 10B tokens with 9 decimals
const MIN_VALID_TIMESTAMP = 1577836800; // Jan 1, 2020
const MAX_VALID_TIMESTAMP = 4102444800; // Jan 1, 2100

// ⭐ Network types
export type NetworkType = 'mainnet' | 'devnet';

export interface SyncOptions {
    network?: NetworkType;
    rpcEndpoint?: string;
}

/**
 * Sync a single token from on-chain data
 * @param mint - Token mint address
 * @param options - Optional network and RPC endpoint override
 */
export async function syncSingleToken(
    mint: string,
    options?: SyncOptions
): Promise<{ success: boolean; error?: string }> {
    // Use provided network or fall back to env var
    const networkDb: NetworkType = options?.network ||
        (process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? 'devnet' : 'mainnet');
    const rpcEndpoint = options?.rpcEndpoint || RPC_ENDPOINT;

    console.log(`🔄 Syncing token: ${mint.slice(0, 8)}... (network: ${networkDb})`);

    try {
        const connection = new Connection(rpcEndpoint, 'confirmed');
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

        // Minimum size check
        if (data.length < 139) {
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

            // Validate timestamp range (0 is valid for "not set")
            if (num !== 0 && (num < MIN_VALID_TIMESTAMP || num > MAX_VALID_TIMESTAMP)) {
                console.warn(`⚠️ ${fieldName} timestamp ${num} out of range, returning 0`);
                return 0;
            }
            return num;
        };

        // Helper to read Borsh String
        const readString = (fieldName: string): string => {
            if (offset + 4 > data.length) {
                console.warn(`⚠️ ${fieldName}: not enough data for length prefix at offset ${offset}`);
                return '';
            }

            const len = data.readUInt32LE(offset);
            offset += 4;

            if (len === 0) {
                return '';
            }

            if (len > 500 || offset + len > data.length) {
                console.warn(`⚠️ Invalid ${fieldName} length ${len} at offset ${offset - 4}`);
                return '';
            }

            const str = data.slice(offset, offset + len).toString('utf8').replace(/\0/g, '').trim();
            offset += len;
            return str;
        };

        // ═══════════════════════════════════════════════════════════════════════
        // PARSE ACTUAL RUST STRUCT (from lib.rs lines 838-855)
        // ═══════════════════════════════════════════════════════════════════════
        // pub struct TokenBattleState {
        //     pub mint: Pubkey,              // 32 bytes
        //     pub sol_collected: u64,        // 8 bytes
        //     pub tokens_sold: u64,          // 8 bytes
        //     pub total_trade_volume: u64,   // 8 bytes
        //     pub is_active: bool,           // 1 byte
        //     pub battle_status: BattleStatus, // 1 byte
        //     pub opponent_mint: Pubkey,     // 32 bytes
        //     pub creation_timestamp: i64,   // 8 bytes
        //     pub last_trade_timestamp: i64, // 8 bytes
        //     pub battle_start_timestamp: i64, // 8 bytes
        //     pub victory_timestamp: i64,    // 8 bytes
        //     pub listing_timestamp: i64,    // 8 bytes
        //     pub bump: u8,                  // 1 byte
        //     pub name: String,              // 4 + len
        //     pub symbol: String,            // 4 + len
        //     pub uri: String,               // 4 + len
        // }
        // NOTE: NO tier field in deployed contract!

        // mint: Pubkey (32 bytes)
        const mintFromData = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // sol_collected: u64 (8 bytes)
        const solCollected = readU64('sol_collected');

        // tokens_sold: u64 (8 bytes)
        const tokensSold = readU64('tokens_sold', Number(MAX_REALISTIC_TOKENS));

        // total_trade_volume: u64 (8 bytes)
        const totalTradeVolume = readU64('total_trade_volume');

        // is_active: bool (1 byte)
        const isActive = data[offset] !== 0;
        offset += 1;

        // battle_status: BattleStatus enum (1 byte)
        const battleStatusRaw = data[offset];
        offset += 1;

        // opponent_mint: Pubkey (32 bytes)
        const opponentMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // Timestamps (5 x i64 = 40 bytes)
        const creationTimestamp = readI64('creation_timestamp');
        const lastTradeTimestamp = readI64('last_trade_timestamp');
        const battleStartTimestamp = readI64('battle_start_timestamp');
        const victoryTimestamp = readI64('victory_timestamp');
        const listingTimestamp = readI64('listing_timestamp');

        // bump: u8 (1 byte)
        const bump = data[offset];
        offset += 1;

        console.log(`📍 Offset before strings: ${offset} (should be ~139)`);

        // Strings
        const name = readString('name');
        const symbol = readString('symbol');
        const uri = readString('uri');

        // ═══════════════════════════════════════════════════════════════════════
        // CALCULATE VIRTUAL RESERVES (for MC calculation)
        // ═══════════════════════════════════════════════════════════════════════
        // The deployed contract doesn't store virtual reserves, so we calculate them
        // using the bonding curve formula:
        //   virtual_sol = VIRTUAL_SOL_INIT + sol_collected
        //   virtual_tokens = BONDING_CURVE_SUPPLY - tokens_sold

        const VIRTUAL_SOL_INIT = 2_050_000_000; // 2.05 SOL in lamports
        const BONDING_CURVE_SUPPLY = BigInt("800000000000000000"); // 800M * 10^9

        const calculatedVirtualSol = VIRTUAL_SOL_INIT + solCollected;
        const calculatedVirtualTokens = BONDING_CURVE_SUPPLY - BigInt(tokensSold);

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
                console.warn(`⚠️ Failed to fetch metadata from URI: ${uri.slice(0, 50)}...`);
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // LOG PARSED DATA
        // ═══════════════════════════════════════════════════════════════════════

        console.log(`✅ Parsed: ${mint.slice(0, 8)}...`);
        console.log(`   📝 name: "${name}" | symbol: "${symbol}"`);
        console.log(`   💰 sol_collected: ${(solCollected / 1e9).toFixed(4)} SOL`);
        console.log(`   📊 tokens_sold: ${tokensSold}`);
        console.log(`   📈 total_volume: ${(totalTradeVolume / 1e9).toFixed(4)} SOL`);
        console.log(`   🎯 status: ${battleStatusRaw} | active: ${isActive}`);
        console.log(`   💎 virtual_sol: ${(calculatedVirtualSol / 1e9).toFixed(4)} SOL`);
        console.log(`   🪙 virtual_tokens: ${calculatedVirtualTokens.toString()}`);
        console.log(`   🖼️ image: ${image ? image.slice(0, 50) + '...' : 'none'}`);

        // ═══════════════════════════════════════════════════════════════════════
        // UPSERT TO SUPABASE
        // ═══════════════════════════════════════════════════════════════════════

        // ⭐ Tier is determined by USE_TEST_TIER constant in smart contract
        // Since we can't read it from on-chain, we use the frontend constant
        // Import from constants or hardcode based on deployment
        const tier = 1; // 1 = Production (era 0 = Test)

        // Check if token already exists to preserve created_at
        const { data: existingToken } = await supabase
            .from('tokens')
            .select('created_at')
            .eq('mint', mint)
            .single();

        const tokenData = {
            mint: mint,
            name: name || null,
            symbol: symbol || null,
            uri: uri || null,
            image: image || null,
            tier: tier,
            network: networkDb, // ⭐ Save network (mainnet/devnet) - from options or env
            virtual_sol_reserves: calculatedVirtualSol,
            virtual_token_reserves: calculatedVirtualTokens.toString(),
            real_sol_reserves: solCollected,
            real_token_reserves: 0,
            sol_collected: solCollected,
            tokens_sold: tokensSold,
            total_trade_volume: totalTradeVolume,
            is_active: isActive,
            battle_status: battleStatusRaw <= 5 ? battleStatusRaw : 0,
            opponent_mint: opponentMint.toString() !== '11111111111111111111111111111111'
                ? opponentMint.toString()
                : null,
            creation_timestamp: creationTimestamp || null,
            qualification_timestamp: null,
            last_trade_timestamp: lastTradeTimestamp || null,
            battle_start_timestamp: battleStartTimestamp || null,
            victory_timestamp: victoryTimestamp || null,
            listing_timestamp: listingTimestamp || null,
            bump: bump,
            updated_at: new Date().toISOString(),
            // Set created_at only for new tokens
            ...(existingToken ? {} : { created_at: new Date().toISOString() })
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

        console.log(`✅ Synced ${mint.slice(0, 8)}... to Supabase | sol: ${(solCollected / 1e9).toFixed(4)} SOL`);
        return { success: true };

    } catch (err) {
        console.error(`❌ Sync failed for ${mint.slice(0, 8)}...:`, err);
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

/**
 * Re-sync all tokens from a list of mints
 * @param mints - Array of token mint addresses
 * @param options - Optional network and RPC endpoint override
 */
export async function resyncAllTokens(
    mints: string[],
    options?: SyncOptions
): Promise<{ success: number; failed: number }> {
    console.log(`🔄 Re-syncing ${mints.length} tokens... (network: ${options?.network || 'default'})`);

    let success = 0;
    let failed = 0;

    for (const mint of mints) {
        const result = await syncSingleToken(mint, options);
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