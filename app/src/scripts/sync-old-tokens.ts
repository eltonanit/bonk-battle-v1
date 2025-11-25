/**
 * Script per sincronizzare token vecchi (pre-webhook)
 * che hanno name/symbol NULL in Supabase
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { PublicKey } from '@solana/web3.js';
import { syncSingleToken } from '../lib/indexer/sync-single-token';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function syncOldTokens() {
  console.log('🔄 Starting sync of old tokens...\n');

  // 1. Trova tutti i token con name NULL
  const { data: tokens, error } = await supabase
    .from('tokens')
    .select('mint')
    .is('name', null)
    .order('updated_at', { ascending: false }); // ✅ FIX: updated_at

  if (error) {
    console.error('❌ Error fetching tokens:', error);
    return;
  }

  if (!tokens || tokens.length === 0) {
    console.log('✅ No tokens to sync!');
    return;
  }

  console.log(`📊 Found ${tokens.length} tokens to sync\n`);

  let successCount = 0;
  let errorCount = 0;

  // 2. Sync ogni token
  for (let i = 0; i < tokens.length; i++) {
    const { mint } = tokens[i];
    console.log(`[${i + 1}/${tokens.length}] Syncing ${mint}...`);

    try {
      const result = await syncSingleToken(mint);

      if (result.success) {
        console.log(`✅ Success\n`);
        successCount++;
      } else {
        console.log(`❌ Failed: ${result.error}\n`);
        errorCount++;
      }

      // Pausa per evitare rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.log(`❌ Error: ${err}\n`);
      errorCount++;
    }
  }

  console.log('\n📊 SUMMARY:');
  console.log(`   Total: ${tokens.length}`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
}

// Esegui
syncOldTokens()
  .then(() => {
    console.log('\n✅ Sync completed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });