import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { StonksFan } from "../target/types/stonks_fan";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.StonksFan as Program<StonksFan>;

(async () => {
  const mintSeed = new anchor.BN(Date.now());
  const creator = provider.wallet.publicKey;
  
  const [mint] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), creator.toBuffer(), mintSeed.toArrayLike(Buffer, "le", 8)],
    program.programId
  );
  
  const [tokenLaunch] = PublicKey.findProgramAddressSync(
    [Buffer.from("launch"), mint.toBuffer()],
    program.programId
  );
  
  const tx = await program.methods
    .createToken(mintSeed, 1, "Test", "TEST", "{}")
    .accounts({
      creator,
      tokenLaunch,
      mint,
      treasury: new PublicKey("A84TUvSQLpMoTGqoqNbEuTHJSheVC5cTSjsv3EMwYLmn"),
      tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();
  
  console.log("Success! TX:", tx);
})();
