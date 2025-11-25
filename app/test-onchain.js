const { Connection, PublicKey } = require("@solana/web3.js");

const RPC = "https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f";
const PROGRAM_ID = new PublicKey("6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq");

const tokens = [
  "EsavhZJepP3234XkWvhMn1wkBxrHnwuLwTPERiE1Lg8C",
  "6TBHvFfsZEqCn7vNdLPx9hTiLgf3BjtTGyBkR8yVr8SP"
];

async function checkTokens() {
  const connection = new Connection(RPC, "confirmed");
  
  for (const mintStr of tokens) {
    const mint = new PublicKey(mintStr);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("battle_state"), mint.toBuffer()],
      PROGRAM_ID
    );
    
    console.log(`\n🔍 Token: ${mintStr.slice(0,8)}...`);
    console.log(`   PDA: ${pda.toString()}`);
    
    const info = await connection.getAccountInfo(pda);
    if (!info) {
      console.log("   ❌ Account NOT FOUND on-chain!");
      continue;
    }
    
    const data = info.data;
    console.log(`   ✅ Account found, size: ${data.length} bytes`);
    
    // Parse status at different offsets to find the right one
    const offset65 = data[65];
    const offset66 = data[66];
    const offset73 = data[73];
    
    console.log(`   Byte[65]: ${offset65}`);
    console.log(`   Byte[66]: ${offset66}`);
    console.log(`   Byte[73]: ${offset73}`);
    
    // Also check is_active (should be at offset 64)
    const isActive = data[64];
    console.log(`   is_active (byte 64): ${isActive}`);
    console.log(`   battle_status (byte 65): ${offset65} ${offset65 === 1 ? "✅ QUALIFIED" : "❌ NOT QUALIFIED"}`);
  }
}

checkTokens().catch(console.error);
