const { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, sendAndConfirmTransaction, Keypair } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } = require("@solana/spl-token");
const fs = require("fs");

async function testBuy() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Carica il wallet
  const walletData = JSON.parse(fs.readFileSync("C:/Users/Elton/.config/solana/id.json", "utf8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  console.log("Testing with wallet:", wallet.publicKey.toString());
  
  const PROGRAM_ID = new PublicKey("54zTTRA9QVbGMk86dU7A51f51QjdvwD9gLPFNEt5kdYw");
  const mint = new PublicKey("FshxUZS3FnDVFkZx5CDBNV3bRq5LBp93BizbRPk6VrkA");
  const TREASURY = new PublicKey("A84TUvSQLpMoTGqoqNbEuTHJSheVC5cTSjsv3EMwYLmn");
  
  // Derive PDAs
  const [tokenLaunchPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("launch"), mint.toBuffer()],
    PROGRAM_ID
  );
  
  const [buyerRecordPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("buyer"), tokenLaunchPDA.toBuffer(), wallet.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  const buyerTokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey);
  
  console.log("TokenLaunch PDA:", tokenLaunchPDA.toString());
  console.log("BuyerRecord PDA:", buyerRecordPDA.toString());
  
  // Build instruction
  const discriminator = Buffer.from([0xbd, 0x15, 0xe6, 0x85, 0xf7, 0x02, 0x6e, 0x2a]);
  const solAmount = Buffer.alloc(8);
  solAmount.writeBigUInt64LE(10000000n); // 0.01 SOL
  const minTokens = Buffer.alloc(8);
  minTokens.writeBigUInt64LE(0n);
  
  const data = Buffer.concat([discriminator, solAmount, minTokens]);
  
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    data,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: tokenLaunchPDA, isSigner: false, isWritable: true },
      { pubkey: buyerRecordPDA, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
    ],
  });
  
  const tx = new Transaction().add(ix);
  
  try {
    console.log("Simulating transaction...");
    const sim = await connection.simulateTransaction(tx, [wallet]);
    console.log("Simulation result:", JSON.stringify(sim, null, 2));
    
    if (sim.value.err) {
      console.error("FAILED! Check logs below:");
      if (sim.value.logs) {
        sim.value.logs.forEach(log => console.log(log));
      }
    } else {
      console.log("SUCCESS! Would work. Now sending for real...");
      const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
      console.log("Transaction successful:", sig);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

testBuy().catch(console.error);
