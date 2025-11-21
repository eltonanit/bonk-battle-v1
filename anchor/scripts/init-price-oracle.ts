const anchor = require("@coral-xyz/anchor");
const fs = require("fs");

async function main() {
  console.log('🔄 Initializing Price Oracle...');
  console.log('═'.repeat(60));

  // Setup connection e wallet manualmente
  const connection = new anchor.web3.Connection(
    'https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f',
    'confirmed'
  );
  
  const walletKeypair = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(process.env.HOME + '/.config/solana/id.json', 'utf-8')))
  );
  
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);
  
  console.log(`🔑 Wallet: ${provider.wallet.publicKey.toString()}`);
  
  // Load IDL
  const idl = JSON.parse(fs.readFileSync('./target/idl/bonk_battle.json', 'utf8'));
  const programId = new anchor.web3.PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');
  const program = new anchor.Program(idl, programId, provider);
  
  console.log(`📍 Program: ${program.programId.toString()}`);
  
  // Fetch SOL price
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
  const data = await res.json();
  const solPrice = Math.floor(data.solana.usd * 1_000_000);
  
  console.log(`💰 SOL Price: $${data.solana.usd}`);
  console.log(`📊 Formatted: ${solPrice} micro-USD`);
  
  // Initialize
  console.log('📤 Sending transaction...');
  
  const tx = await program.methods
    .initializePriceOracle(new anchor.BN(solPrice))
    .accounts({
      keeperAuthority: provider.wallet.publicKey,
    })
    .rpc();
  
  console.log('═'.repeat(60));
  console.log('✅ Price Oracle initialized successfully!');
  console.log(`   Transaction: ${tx}`);
  console.log(`   Solscan: https://solscan.io/tx/${tx}?cluster=devnet`);
  console.log('═'.repeat(60));
}

main().catch(console.error);