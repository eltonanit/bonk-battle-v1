import { Connection, PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RPC_ENDPOINT } from '@/config/solana';
import { rpcQueue } from '@/lib/utils/request-queue';

export interface TokenMetadata {
    name: string;
    symbol: string;
    uri: string;
    image?: string;
}

const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

/**
 * Helper to parse metadata that might be stored as JSON string
 * Handles cases where name/symbol/uri contain the full JSON object
 */
function parseMetadataField(value: string, field: 'name' | 'symbol' | 'image' | 'description'): string {
    if (!value) return '';

    // Check if the value looks like JSON (starts with { or [)
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const parsed = JSON.parse(trimmed);
            // Try common field names (case insensitive)
            const fieldLower = field.toLowerCase();
            const fieldUpper = field.toUpperCase();
            return parsed[field] || parsed[fieldLower] || parsed[fieldUpper] || parsed.NAME || parsed.name || '';
        } catch {
            // Not valid JSON, return as is
            return value;
        }
    }

    return value;
}

// Cache to avoid re-fetching the same metadata
const metadataCache: Record<string, TokenMetadata> = {};

export function useTokenMetadata(mintAddress: string) {
    const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!mintAddress) return;

        // Check cache first
        if (metadataCache[mintAddress]) {
            setMetadata(metadataCache[mintAddress]);
            setLoading(false);
            return;
        }

        let isMounted = true;

        async function fetchMetadata() {
            try {
                setLoading(true);

                // 1. Try fetching from Supabase first
                const { data: tokenData, error: supabaseError } = await supabase
                    .from('tokens')
                    .select('name, symbol, uri, image')
                    .eq('mint', mintAddress)
                    .single();

                if (tokenData && !supabaseError) {
                    // ⭐ Parse metadata - handle case where name/symbol contain JSON
                    const rawName = tokenData.name || '';
                    const rawSymbol = tokenData.symbol || '';
                    const name = parseMetadataField(rawName, 'name') || rawName;
                    const symbol = parseMetadataField(rawSymbol, 'symbol') ||
                                   parseMetadataField(rawName, 'symbol') || // Try to get symbol from name JSON
                                   rawSymbol;

                    // Only proceed if we have a valid name
                    if (name) {
                        // ⭐ Parse image from multiple sources
                        let image = tokenData.image || '';

                        // Try from rawName if it's JSON
                        if (!image && rawName) {
                            image = parseMetadataField(rawName, 'image') || '';
                        }

                        // If we have URI but no image in DB, try to fetch JSON (client-side, no RPC)
                        if (!image && tokenData.uri) {
                            try {
                                // First try parsing URI as JSON (in case metadata is embedded)
                                const uriStr = tokenData.uri.trim();
                                if (uriStr.startsWith('{')) {
                                    const uriJson = JSON.parse(uriStr);
                                    image = uriJson.image || uriJson.IMAGE || '';
                                } else {
                                    // Otherwise fetch from URL
                                    const response = await fetch(tokenData.uri);
                                    const json = await response.json();
                                    image = json.image;
                                }
                            } catch (e) {
                                console.warn('Failed to fetch metadata JSON from URI:', e);
                            }
                        }

                        const meta = {
                            name,
                            symbol,
                            uri: tokenData.uri,
                            image: image
                        };

                        metadataCache[mintAddress] = meta;
                        if (isMounted) {
                            setMetadata(meta);
                            setLoading(false);
                        }
                        return;
                    }
                }

                // 2. Fallback to RPC if not in DB
                console.warn('⚠️ Metadata not in Supabase, falling back to RPC for', mintAddress);

                // Use queue to rate limit requests
                await rpcQueue.add(async () => {
                    if (!isMounted) return;

                    // Double check cache in case it was populated while waiting in queue
                    if (metadataCache[mintAddress]) {
                        setMetadata(metadataCache[mintAddress]);
                        return;
                    }

                    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
                    const mint = new PublicKey(mintAddress);

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
                        // Manual deserialization of Metaplex Metadata
                        // This is a simplified parser, assuming standard layout
                        const data = accountInfo.data;

                        // Skip discriminator (1 byte) + update authority (32) + mint (32)
                        let offset = 1 + 32 + 32;

                        // Name (4 bytes length + string)
                        const nameLen = data.readUInt32LE(offset);
                        offset += 4;
                        const name = data.slice(offset, offset + nameLen).toString('utf8').replace(/\0/g, '').trim();
                        offset += nameLen;

                        // Symbol (4 bytes length + string)
                        const symbolLen = data.readUInt32LE(offset);
                        offset += 4;
                        const symbol = data.slice(offset, offset + symbolLen).toString('utf8').replace(/\0/g, '').trim();
                        offset += symbolLen;

                        // URI (4 bytes length + string)
                        const uriLen = data.readUInt32LE(offset);
                        offset += 4;
                        const uri = data.slice(offset, offset + uriLen).toString('utf8').replace(/\0/g, '').trim();

                        let image = '';
                        try {
                            // Fetch JSON from URI (this is usually IPFS or Arweave, not Solana RPC, so less rate limited)
                            // But we still want to be careful
                            const response = await fetch(uri);
                            const json = await response.json();
                            image = json.image;
                        } catch (e) {
                            console.warn('Failed to fetch metadata JSON:', e);
                        }

                        const meta = { name, symbol, uri, image };
                        metadataCache[mintAddress] = meta;

                        console.log('✅ Metadata loaded from RPC for', mintAddress, ':', meta);

                        if (isMounted) {
                            setMetadata(meta);
                        }
                    }
                });
            } catch (error) {
                console.error('Error fetching metadata:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchMetadata();

        return () => {
            isMounted = false;
        };
    }, [mintAddress]);

    return { metadata, loading };
}
