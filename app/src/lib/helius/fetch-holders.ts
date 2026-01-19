/**
 * ========================================================================
 * BONK BATTLE - REAL TOKEN HOLDERS FETCHER (HELIUS API)
 * ========================================================================
 *
 * Fetches real on-chain holder counts using Helius RPC
 * Returns actual token account holders with balance > 0
 *
 * ========================================================================
 */

import { RPC_ENDPOINT } from '@/config/solana';

const HELIUS_RPC_URL = RPC_ENDPOINT;
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

/**
 * Get real holder count for a token using RPC getProgramAccounts
 * Counts unique owners of token accounts with balance > 0
 */
export async function fetchRealHolders(mint: string): Promise<number> {
  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'holders-query',
        method: 'getProgramAccounts',
        params: [
          TOKEN_PROGRAM_ID,
          {
            encoding: 'jsonParsed',
            filters: [
              { dataSize: 165 }, // SPL Token account size
              {
                memcmp: {
                  offset: 0, // Mint address is at offset 0
                  bytes: mint,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`RPC error: ${response.status}`);
      return 0;
    }

    const data = await response.json();

    if (data.error) {
      console.error(`RPC error:`, data.error);
      return 0;
    }

    // Filter accounts with balance > 0 and count unique owners
    const accounts = data.result || [];
    const uniqueOwners = new Set<string>();

    for (const acc of accounts) {
      const info = acc.account?.data?.parsed?.info;
      if (info && info.tokenAmount?.uiAmount > 0) {
        uniqueOwners.add(info.owner);
      }
    }

    return uniqueOwners.size;
  } catch (error) {
    console.error(`Error fetching holders for ${mint}:`, error);
    return 0;
  }
}

/**
 * Batch fetch real holders for multiple tokens
 * Uses sequential requests to avoid rate limits
 */
export async function fetchBatchRealHolders(
  mints: string[],
  concurrency = 3
): Promise<Map<string, number>> {
  const holdersMap = new Map<string, number>();

  if (mints.length === 0) return holdersMap;

  // Process in small batches to avoid rate limits
  for (let i = 0; i < mints.length; i += concurrency) {
    const batch = mints.slice(i, i + concurrency);

    const promises = batch.map(async (mint) => {
      const count = await fetchRealHolders(mint);
      return { mint, count };
    });

    const results = await Promise.all(promises);

    results.forEach(({ mint, count }) => {
      holdersMap.set(mint, count);
    });

    // Delay between batches to respect rate limits
    if (i + concurrency < mints.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return holdersMap;
}
