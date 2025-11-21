import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { readFileSync } from 'fs';
import idl from '../src/idl/bonk_battle.json' assert { type: 'json' };

async function main() {
  // 1. Fetch current SOL price
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
  const data = await res.json();
  const solPrice = Math.floor(data.solana.usd * 1_000_000);
  
  console.log(`💰 Current SOL price: $${data.solana.usd}`);
  console.log(`📊 Formatted: ${solPrice} micro-USD`);
  
  // 2. Setup
  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f');
  const keypairData = JSON.parse(readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf-8'));
  const keeper = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  const wallet = new Wallet(keeper);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const programId = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');
  const program = new Program(idl as any, programId, provider);
  
  console.log(`🔑 Keeper: ${keeper.publicKey.toString()}`);
  
  // 3. Initialize
  const tx = await program.methods
    .initializePriceOracle(solPrice)
    .accounts({
      keeperAuthority: keeper.publicKey,
    })
    .rpc();
  
  console.log(`✅ Price Oracle initialized!`);
  console.log(`   Tx: ${tx}`);
  console.log(`   Solscan: https://solscan.io/tx/${tx}?cluster=devnet`);
}

main().catch(console.error);