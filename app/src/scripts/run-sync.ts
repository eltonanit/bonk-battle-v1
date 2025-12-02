// src/scripts/run-sync.ts
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { syncTokensToSupabase } from '../lib/indexer/sync-tokens';

async function main() {
    console.log('🚀 Running manual token sync...\n');

    try {
        const result = await syncTokensToSupabase();
        console.log('\n✅ Sync completed!');
        console.log(`   Tokens synced: ${result.count}`);
    } catch (error) {
        console.error('\n❌ Sync failed:', error);
        process.exit(1);
    }
}

main();
