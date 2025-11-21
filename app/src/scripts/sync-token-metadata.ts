// src/scripts/sync-token-metadata.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    'https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f';

/**
 * Decode hex string to JSON
 */
function hexToJson(hex: string): any {
    try {
        const buffer = Buffer.from(hex, 'hex');
        const jsonStr = buffer.toString('utf8');
        return JSON.parse(jsonStr);
    } catch {
        return null;
    }
}

/**
 * Get creation transaction for a mint
 */
async function getCreationTransaction(connection: Connection, mint: string) {
    try {
        const pubkey = new PublicKey(mint);

        // Get all signatures for this account
        const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 1000 });

        if (signatures.length === 0) return null;

        // Last signature is the oldest (creation)
        const creationSig = signatures[signatures.length - 1];

        // Get full transaction
        const tx = await connection.getTransaction(creationSig.signature, {
            maxSupportedTransactionVersion: 0
        });

        return tx;
    } catch (error) {
        console.error(`❌ Error getting tx for ${mint}:`, error);
        return null;
    }
}

/**
 * Parse transaction metadata
 */
function parseTransactionMetadata(tx: any): {
    name?: string;
    symbol?: string;
    image?: string;
    creator?: string;
} | null {
    try {
        if (!tx) return null;

        // Extract creator (fee payer) - handle both legacy and versioned tx
        let creator: string;
        let instructions: any[];

        if (tx.transaction.message.accountKeys) {
            // Legacy transaction
            creator = tx.transaction.message.accountKeys[0].toString();
            instructions = tx.transaction.message.instructions;
        } else if (tx.transaction.message.staticAccountKeys) {
            // Versioned transaction
            creator = tx.transaction.message.staticAccountKeys[0].toString();
            instructions = tx.transaction.message.compiledInstructions || [];
        } else {
            console.log('   ⚠️ Unknown transaction format');
            return null;
        }

        // Look for instruction data with metadata
        for (const instruction of instructions) {
            const data = instruction.data;
            if (!data) continue;

            // Convert to hex
            let hexData: string;
            if (typeof data === 'string') {
                // It's base58/base64 encoded
                try {
                    const buffer = Buffer.from(data, 'base64');
                    hexData = buffer.toString('hex');
                } catch {
                    continue;
                }
            } else if (Buffer.isBuffer(data)) {
                hexData = data.toString('hex');
            } else {
                hexData = Buffer.from(data).toString('hex');
            }

            // Look for JSON metadata in hex
            // JSON starts with 7b ("{"in hex)
            const jsonPattern = '7b226e616d65'; // {"name"
            const jsonStartIndex = hexData.indexOf(jsonPattern);

            if (jsonStartIndex !== -1) {
                const jsonHex = hexData.slice(jsonStartIndex);

                // Find end of JSON (7d = "}")
                let jsonEndIndex = -1;
                let braceCount = 0;
                for (let i = 0; i < jsonHex.length; i += 2) {
                    const byte = jsonHex.slice(i, i + 2);
                    if (byte === '7b') braceCount++;
                    if (byte === '7d') {
                        braceCount--;
                        if (braceCount === 0) {
                            jsonEndIndex = i + 2;
                            break;
                        }
                    }
                }

                if (jsonEndIndex !== -1) {
                    const jsonHexComplete = jsonHex.slice(0, jsonEndIndex);
                    const metadata = hexToJson(jsonHexComplete);

                    if (metadata && metadata.name) {
                        return {
                            name: metadata.name,
                            symbol: metadata.symbol,
                            image: metadata.image,
                            creator
                        };
                    }
                }
            }
        }

        return { creator };
    } catch (error) {
        console.error(`❌ Error parsing transaction:`, error);
        return null;
    }
}

/**
 * Main sync function
 */
async function syncTokenMetadata() {
    console.log('🔄 Starting metadata sync...');
    console.log('='.repeat(60));

    try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        console.log(`📡 Connected to: ${RPC_ENDPOINT.slice(0, 50)}...`);

        // 1. Fetch all tokens from DB
        const { data: tokens, error } = await supabase
            .from('tokens')
            .select('mint, name, symbol, image, creator')
            .order('creation_timestamp', { ascending: false });

        if (error) throw error;

        if (!tokens || tokens.length === 0) {
            console.log('ℹ️ No tokens found in database');
            return;
        }

        console.log(`📦 Found ${tokens.length} tokens in database\n`);

        // 2. Process each token
        let updated = 0;
        let skipped = 0;
        let failed = 0;

        for (const token of tokens) {
            console.log(`🔍 Processing: ${token.mint.slice(0, 8)}...`);

            // Skip if already has metadata
            if (token.name && token.symbol && token.image && token.creator) {
                console.log(`   ✓ Already has complete metadata, skipping\n`);
                skipped++;
                continue;
            }

            // 3. Get creation transaction
            console.log(`   📡 Fetching creation transaction...`);
            const tx = await getCreationTransaction(connection, token.mint);

            if (!tx) {
                console.log(`   ❌ No transaction found\n`);
                failed++;
                continue;
            }

            console.log(`   ✓ Found creation transaction`);

            // 4. Parse metadata
            console.log(`   🔍 Parsing metadata...`);
            const metadata = parseTransactionMetadata(tx);

            if (!metadata || !metadata.name) {
                console.log(`   ❌ Failed to parse metadata\n`);
                failed++;
                continue;
            }

            console.log(`   ✓ Found: ${metadata.name} (${metadata.symbol})`);
            if (metadata.creator) {
                console.log(`   ✓ Creator: ${metadata.creator.slice(0, 8)}...`);
            }

            // 5. Update database
            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            if (metadata.name) updateData.name = metadata.name;
            if (metadata.symbol) updateData.symbol = metadata.symbol;
            if (metadata.image) updateData.image = metadata.image;
            if (metadata.creator) updateData.creator = metadata.creator;

            const { error: updateError } = await supabase
                .from('tokens')
                .update(updateData)
                .eq('mint', token.mint);

            if (updateError) {
                console.log(`   ❌ Failed to update: ${updateError.message}\n`);
                failed++;
            } else {
                console.log(`   ✅ Database updated!\n`);
                updated++;
            }

            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Summary
        console.log('='.repeat(60));
        console.log('✅ SYNC COMPLETED!');
        console.log(`   Total tokens: ${tokens.length}`);
        console.log(`   ✅ Updated: ${updated}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Sync failed:', error);
        throw error;
    }
}

// Run
syncTokenMetadata()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });