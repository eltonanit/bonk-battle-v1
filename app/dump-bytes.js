const { Connection, PublicKey } = require("@solana/web3.js");

const RPC = "https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f";
const PROGRAM_ID = new PublicKey("6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq");

async function checkToken() {
  const connection = new Connection(RPC, "confirmed");
  const mint = new PublicKey("EsavhZJepP3234XkWvhMn1wkBxrHnwuLwTPERiE1Lg8C");
  
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("battle_state"), mint.toBuffer()],
    PROGRAM_ID
  );
  
  const info = await connection.getAccountInfo(pda);
  const data = info.data;
  
  console.log("First 100 bytes (hex):");
  console.log(Buffer.from(data.slice(0, 100)).toString("hex"));
  
  console.log("\nFirst 100 bytes (readable):");
  for (let i = 0; i < 100; i += 10) {
    const chunk = data.slice(i, i + 10);
    const hex = Buffer.from(chunk).toString("hex");
    const ascii = Array.from(chunk).map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : ".").join("");
    console.log(`${i.toString().padStart(3)}: ${hex.padEnd(20)} | ${ascii}`);
  }
}

checkToken().catch(console.error);
