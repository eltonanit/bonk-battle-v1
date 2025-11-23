// app/src/lib/indexer/sync-single-token.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase';
import { BONK_BATTLE_PROGRAM_ID } from '@/lib/solana/constants';
import { getBattleStatePDA } from '@/lib/solana/pdas';
import { RPC_ENDPOINT } from '@/config/solana';

const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

/**
 * Sync a single token to Supabase
 * Called by webhook when token events occur
 * 
 * @param mint - Token mint address
 * @returns Success status
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

        // Basic validation
        if (data.length < 100) {
            console.warn(`⚠️ Invalid account data size: ${data.length}`);
            return { success: false, error: 'Invalid data size' };
        }

        // 3. Parse Battle State
        let offset = 8; // Skip discriminator

        const mintFromData = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        // Helper functions
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

        console.log(`✅ Parsed battle state for ${mint}`);

        // 4. Fetch Metadata (name, symbol, uri, image)
        let name = '';
        let symbol = '';
        let uri = '';
        let image = '';

        try {
            const [metadataPDA] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('metadata'),
                    METADATA_PROGRAM_ID.toBuffer(),
                    mintPubkey.toBuffer(),
                ],
                METADATA_PROGRAM_ID
            );

            const metadataAccount = await connection.getAccountInfo(metadataPDA);
            if (metadataAccount) {
                const metaData = metadataAccount.data;
                let metaOffset = 1 + 32 + 32; // Skip discriminator + update authority + mint

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

                // Fetch image from URI (optional)
                if (uri) {
                    try {
                        const response = await fetch(uri);
                        const metadata = await response.json();
                        image = metadata.image || '';
                    } catch (err) {
                        console.warn(`⚠️ Failed to fetch metadata JSON from ${uri}`);
                    }
                }

                console.log(`✅ Fetched metadata: ${name} (${symbol})`);
            }
        } catch (metaErr) {
            console.warn(`⚠️ Failed to fetch metadata for ${mint}:`, metaErr);
        }

        // 5. Get creator from first signature (fee payer)
        let creator = '';
        try {
            const signatures = await connection.getSignaturesForAddress(mintPubkey, { limit: 1000 });
            if (signatures.length > 0) {
                // Last signature is the oldest (creation)
                const creationSig = signatures[signatures.length - 1];
                const tx = await connection.getTransaction(creationSig.signature, {
                    maxSupportedTransactionVersion: 0
                });

                if (tx?.transaction?.message) {
                    const message = tx.transaction.message;
                    // Get fee payer (first account)
                    if ('staticAccountKeys' in message && message.staticAccountKeys.length > 0) {
                        creator = message.staticAccountKeys[0].toString();
                    } else if ('accountKeys' in message && message.accountKeys.length > 0) {
                        creator = message.accountKeys[0].toString();
                    }
                }
            }
        } catch (creatorErr) {
            console.warn(`⚠️ Failed to fetch creator for ${mint}:`, creatorErr);
        }

        // 6. Upsert to Supabase
        const tokenData = {
            mint: mint,
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
            name: name || null,
            symbol: symbol || null,
            uri: uri || null,
            image: image || null,
            creator: creator || null,
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

        console.log(`✅ Successfully synced ${mint} to Supabase`);
        return { success: true };

    } catch (err) {
        console.error(`❌ Sync failed for ${mint}:`, err);
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}