import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";

const PROGRAM_ID = new PublicKey("54zTTRA9QVbGMk86dU7A51f51QjdvwD9gLPFNEt5kdYw");
const TREASURY = new PublicKey("A84TUvSQLpMoTGqoqNbEuTHJSheVC5cTSjsv3EMwYLmn");
const mint = new PublicKey("FshxUZS3FnDVFkZx5CDBNV3bRq5LBp93BizbRPk6VrkA");

async function testBuy() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const idl = JSON.parse(require("fs").readFileSync("./target/idl/stonks_fan.json", "utf8"));
  const program = new Program(idl, PROGRAM_ID, provider);
  
  const [tokenLaunchPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("launch"), mint.toBuffer()],
    PROGRAM_ID
  );
  
  const [buyerRecordPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("buyer"), tokenLaunchPDA.toBuffer(), provider.wallet.publicKey.toBuffer()],
    PROGRAM_ID
  );
  
  const buyerTokenAccount = getAssociatedTokenAddressSync(mint, provider.wallet.publicKey);
  
  try {
    const tx = await program.methods
      .buyTokens(new anchor.BN(0.01 * LAMPORTS_PER_SOL), new anchor.BN(0))
      .accounts({
        buyer: provider.wallet.publicKey,
        tokenLaunch: tokenLaunchPDA,
        buyerRecord: buyerRecordPDA,
        mint: mint,
        buyerTokenAccount: buyerTokenAccount,
        treasury: TREASURY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
      
    console.log("Success! Transaction:", tx);
  } catch (e) {
    console.error("Error:", e);
    if (e.logs) {
      console.log("Program logs:");
      e.logs.forEach(log => console.log(log));
    }
  }
}

testBuy();
