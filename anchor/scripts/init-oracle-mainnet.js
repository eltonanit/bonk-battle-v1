const anchor = require("@coral-xyz/anchor");
const fs = require("fs");

async function main() {
  console.log('🔄 Initializing Price Oracle on MAINNET...');
  console.log('═'.repeat(60));

  const connection = new anchor.web3.Connection(
    'https://api.mainnet-beta.solana.com',
    'confirmed'
  );
  
  const keeperKeypair = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('/home/vscode/keeper.json', 'utf-8')))
  );
  
  const wallet = new anchor.Wallet(keeperKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  
  console.log(`🔑 Keeper: ${provider.wallet.publicKey.toString()}`);
  
const idl = JSON.parse(fs.readFileSync('/workspaces/bonk-battle-v1/app/src/idl/bonk_battle.json', 'utf8'));  const programId = new anchor.web3.PublicKey('5G6Pp5kVJkfeXCJMuMRYyEHsdWLCXMQ7j3MQqCj9ha6H');
  const program = new anchor.Program(idl, programId, provider);
  
  console.log(`📍 Program: ${program.programId.toString()}`);
  
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
  const data = await res.json();
  const solPrice = Math.floor(data.solana.usd * 1_000_000);
  
  console.log(`💰 SOL Price: $${data.solana.usd}`);
  console.log('📤 Sending transaction...');
  
  const tx = await program.methods
    .initializePriceOracle(new anchor.BN(solPrice))
    .accounts({
      keeperAuthority: provider.wallet.publicKey,
    })
    .rpc();
  
  console.log('✅ Price Oracle initialized on MAINNET!');
  console.log(`   Solscan: https://solscan.io/tx/${tx}`);
}

main().catch(console.error);
