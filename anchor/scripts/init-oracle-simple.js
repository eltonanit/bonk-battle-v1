const { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram } = require('@solana/web3.js');
const fs = require('fs');

async function main() {
  console.log('🔄 Initializing Price Oracle on MAINNET...');
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // Load keeper keypair
  const keeperKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync('/home/vscode/keeper.json', 'utf-8')))
  );
  
  console.log(`🔑 Keeper: ${keeperKeypair.publicKey.toString()}`);
  
  // MAINNET Program ID
  const programId = new PublicKey('F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD');
  
  // Derive price_oracle PDA
  const [priceOraclePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('price_oracle')],
    programId
  );
  
  console.log(`📍 Oracle PDA: ${priceOraclePDA.toString()}`);
  
  // Get SOL price
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
  const data = await res.json();
  const solPriceUsd = Math.floor(data.solana.usd * 1_000_000);
  
  console.log(`💰 SOL Price: $${data.solana.usd} (${solPriceUsd} micro-USD)`);
  
  // Build instruction data
  // Discriminator for initialize_price_oracle: [61, 200, 206, 137, 205, 74, 242, 172]
  const discriminator = Buffer.from([61, 200, 206, 137, 205, 74, 242, 172]);
  const priceBuffer = Buffer.alloc(8);
  priceBuffer.writeBigUInt64LE(BigInt(solPriceUsd));
  const instructionData = Buffer.concat([discriminator, priceBuffer]);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: priceOraclePDA, isSigner: false, isWritable: true },
      { pubkey: keeperKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: instructionData,
  });
  
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  const transaction = new Transaction({
    feePayer: keeperKeypair.publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(instruction);
  
  console.log('📤 Sending transaction...');
  
  const signature = await connection.sendTransaction(transaction, [keeperKeypair]);
  
  console.log('⏳ Confirming...');
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
  
  console.log('✅ Oracle initialized on MAINNET!');
  console.log(`🔗 https://solscan.io/tx/${signature}`);
}

main().catch(console.error);
