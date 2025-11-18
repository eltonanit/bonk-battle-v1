// lib/solana/fetch-token-holders.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, RPC_ENDPOINT } from '@/config/solana';

/**
 * Recupera il numero di holders unici per un token
 * Conta i BuyerRecord (106 bytes) associati al token
 */
export async function fetchTokenHolders(mint: string): Promise<number> {
    try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const programId = new PublicKey(PROGRAM_ID);
        const mintPubkey = new PublicKey(mint);

        // Trova il TokenLaunch PDA
        const [tokenLaunchPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('launch'), mintPubkey.toBuffer()],
            programId
        );

        // Query per tutti i BuyerRecord (106 bytes) associati a questo TokenLaunch
        const buyerRecords = await connection.getProgramAccounts(programId, {
            filters: [
                { dataSize: 106 }, // BuyerRecord size
                {
                    memcmp: {
                        offset: 8, // Dopo discriminator (8 bytes)
                        bytes: tokenLaunchPDA.toBase58(),
                    },
                },
            ],
        });

        return buyerRecords.length;
    } catch (error) {
        console.error(`Error fetching holders for ${mint}:`, error);
        return 0;
    }
}

/**
 * Batch fetch holders per più token
 */
export async function fetchBatchHolders(mints: string[]): Promise<Map<string, number>> {
    const holdersMap = new Map<string, number>();

    // Fetch in parallelo per performance
    const promises = mints.map(async (mint) => {
        const count = await fetchTokenHolders(mint);
        return { mint, count };
    });

    const results = await Promise.all(promises);

    results.forEach(({ mint, count }) => {
        holdersMap.set(mint, count);
    });

    return holdersMap;
}