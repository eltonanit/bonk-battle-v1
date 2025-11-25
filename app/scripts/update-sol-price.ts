// scripts/update-sol-price.ts
/**
 * BONK BATTLE - Keeper Script per aggiornare prezzo SOL
 *
 * Esegui con: npx ts-node scripts/update-sol-price.ts
 * Oppure: npm run update-price (dopo aver aggiunto script in package.json)
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURAZIONE
// ============================================================================

const RPC_ENDPOINT = 'https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f';
const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');

// Supabase config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://jfpuluquxjnamvyzocad.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Discriminator per update_sol_price (from IDL)
const UPDATE_SOL_PRICE_DISCRIMINATOR = Buffer.from([166, 98, 183, 175, 125, 81, 109, 119]);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Derive Price Oracle PDA
 */
function getPriceOraclePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('price_oracle')],
    PROGRAM_ID
  );
}

/**
 * Serialize u64 to little-endian bytes
 */
function serializeU64(value: bigint): Buffer {
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    buf[i] = Number((value >> BigInt(i * 8)) & BigInt(0xff));
  }
  return buf;
}

/**
 * Fetch SOL price from CoinGecko (free, no API key)
 */
async function fetchSolPrice(): Promise<number> {
  console.log('📊 Fetching SOL price from CoinGecko...');

  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data = await response.json() as { solana: { usd: number } };
  const price = data.solana.usd;

  console.log(`✅ Current SOL price: $${price}`);
  return price;
}

/**
 * Load keeper keypair from file
 */
function loadKeeperKeypair(): Keypair {
  // ⭐ CORRECT KEEPER - matches on-chain price_oracle authority
  const keeperPath = path.join(__dirname, 'price-keeper.json');

  console.log(`🔍 Looking for keypair at: ${keeperPath}`);

  if (!fs.existsSync(keeperPath)) {
    throw new Error(`Keeper keypair not found at: ${keeperPath}`);
  }

  const keypairData = JSON.parse(fs.readFileSync(keeperPath, 'utf-8'));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log(`🔑 Loaded keypair from: ${keeperPath}`);
  console.log(`🔑 Pubkey: ${keypair.publicKey.toString()}`);

  // Verify it's the correct keeper (ON-CHAIN authority!)
  const expectedKeeper = '6b2sGwy1YUSH4QpaP73iSAA4fgo2Qmr8kZ9eeN7eDRRy';
  if (keypair.publicKey.toString() !== expectedKeeper) {
    throw new Error(`Wrong keeper! Expected ${expectedKeeper}, got ${keypair.publicKey.toString()}`);
  }

  console.log(`✅ Verified: This is the authorized keeper!`);
  return keypair;
}

/**
 * Update SOL price on-chain
 */
async function updatePriceOnChain(
  connection: Connection,
  keeper: Keypair,
  newPriceUsd: number
): Promise<string> {
  console.log('\n🔗 Updating price on-chain...');

  // Convert price to u64 with 6 decimals
  // $124.07 -> 124070000
  const priceWithDecimals = BigInt(Math.round(newPriceUsd * 1_000_000));

  console.log(`💰 Price in micro-USD: ${priceWithDecimals}`);

  // Get PDA
  const [priceOraclePDA] = getPriceOraclePDA();
  console.log(`📍 Price Oracle PDA: ${priceOraclePDA.toString()}`);

  // Build instruction data
  const instructionData = Buffer.concat([
    UPDATE_SOL_PRICE_DISCRIMINATOR,
    serializeU64(priceWithDecimals),
  ]);

  // Build instruction
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: priceOraclePDA, isSigner: false, isWritable: true },
      { pubkey: keeper.publicKey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  // Build transaction
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

  const messageV0 = new TransactionMessage({
    payerKey: keeper.publicKey,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([keeper]);

  // Send transaction
  console.log('📤 Sending transaction...');

  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  console.log(`📝 Signature: ${signature}`);
  console.log(`🔗 Solscan: https://solscan.io/tx/${signature}?cluster=devnet`);

  // Wait for confirmation
  console.log('⏳ Waiting for confirmation...');

  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  }, 'confirmed');

  console.log('✅ Transaction confirmed!');

  return signature;
}

/**
 * Update price in Supabase
 */
async function updatePriceInSupabase(newPriceUsd: number): Promise<void> {
  if (!SUPABASE_KEY) {
    console.warn('⚠️ Supabase key not found, skipping database update');
    return;
  }

  console.log('\n💾 Updating price in Supabase...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Price in micro-USD format (same as on-chain)
  const priceWithDecimals = Math.round(newPriceUsd * 1_000_000);

  const { error } = await supabase
    .from('price_oracle')
    .update({
      sol_price_usd: priceWithDecimals,
      last_update: Math.floor(Date.now() / 1000),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) {
    console.error('❌ Supabase update error:', error);
    throw error;
  }

  console.log('✅ Supabase updated!');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 BONK BATTLE - SOL Price Keeper');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📅 Time: ${new Date().toISOString()}`);

  try {
    // 1. Fetch current SOL price
    const solPriceUsd = await fetchSolPrice();

    // 2. Load keeper keypair
    const keeper = loadKeeperKeypair();
    console.log(`🔑 Keeper: ${keeper.publicKey.toString()}`);

    // 3. Connect to Solana
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    // Check keeper balance
    const balance = await connection.getBalance(keeper.publicKey);
    console.log(`💰 Keeper balance: ${balance / 1e9} SOL`);

    if (balance < 0.01 * 1e9) {
      throw new Error('Insufficient keeper balance! Need at least 0.01 SOL');
    }

    // 4. Update on-chain
    const signature = await updatePriceOnChain(connection, keeper, solPriceUsd);

    // 5. Update Supabase
    await updatePriceInSupabase(solPriceUsd);

    // Done!
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ PRICE UPDATE COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`💵 New SOL price: $${solPriceUsd}`);
    console.log(`📝 Transaction: ${signature}`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

// Run
main();
