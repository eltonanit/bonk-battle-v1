import { Connection, Keypair, PublicKey } from '@solana/web3.js';
<<<<<<< HEAD
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { readFileSync } from 'fs';
import idl from '../src/idl/bonk_battle.json';

async function main() {
  console.log('🔄 Initializing Price Oracle...');
  console.log('═'.repeat(60));

  // 1. Fetch SOL price
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
  const data: any = await res.json();
  const solPrice = data.solana.usd;
  const priceMicro = Math.floor(solPrice * 1_000_000);
  
  console.log(`💰 Current SOL price: $${solPrice}`);
  console.log(`📊 Formatted: ${priceMicro} micro-USD`);
  
  // 2. Setup connection
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f',
    'confirmed'
  );
  
  // 3. Load wallet from Solana default keypair location
  const WALLET_PATH = 'C:\\Users\\Elton\\.config\\solana\\id.json';
  const keypairData = JSON.parse(readFileSync(WALLET_PATH, 'utf-8'));
  const keeper = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log(`🔑 Keeper: ${keeper.publicKey.toString()}`);
  
  // 4. Setup program
=======
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
  
>>>>>>> b81ca459f2cf6ab8ecfaf4bda0bc2a5e8610bc5b
  const wallet = new Wallet(keeper);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const programId = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');
  const program = new Program(idl as any, programId, provider);
  
<<<<<<< HEAD
  // 5. Find Price Oracle PDA
  const [priceOraclePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('price_oracle')],
    programId
  );
  
  console.log(`📍 Price Oracle PDA: ${priceOraclePDA.toString()}`);
  
  // 6. Initialize
  console.log('📤 Sending transaction...');
  
  const tx = await program.methods
    .initializePriceOracle(new BN(priceMicro))
=======
  console.log(`🔑 Keeper: ${keeper.publicKey.toString()}`);
  
  // 3. Initialize
  const tx = await program.methods
    .initializePriceOracle(solPrice)
>>>>>>> b81ca459f2cf6ab8ecfaf4bda0bc2a5e8610bc5b
    .accounts({
      keeperAuthority: keeper.publicKey,
    })
    .rpc();
  
<<<<<<< HEAD
  console.log('═'.repeat(60));
  console.log('✅ Price Oracle initialized successfully!');
  console.log(`   Transaction: ${tx}`);
  console.log(`   Solscan: https://solscan.io/tx/${tx}?cluster=devnet`);
  console.log('═'.repeat(60));
=======
  console.log(`✅ Price Oracle initialized!`);
  console.log(`   Tx: ${tx}`);
  console.log(`   Solscan: https://solscan.io/tx/${tx}?cluster=devnet`);
>>>>>>> b81ca459f2cf6ab8ecfaf4bda0bc2a5e8610bc5b
}

main().catch(console.error);