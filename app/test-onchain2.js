const { Connection, PublicKey } = require("@solana/web3.js");

const RPC = "https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f";
const PROGRAM_ID = new PublicKey("6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq");

const tokens = [
  "EsavhZJepP3234XkWvhMn1wkBxrHnwuLwTPERiE1Lg8C",
  "6TBHvFfsZEqCn7vNdLPx9hTiLgf3BjtTGyBkR8yVr8SP"
];

function readU64(data, offset) {
  let value = BigInt(0);
  for (let i = 0; i < 8; i++) {
    value |= BigInt(data[offset + i]) << BigInt(i * 8);
  }
  return value;
}

async function checkTokens() {
  const connection = new Connection(RPC, "confirmed");
  
  for (const mintStr of tokens) {
    const mint = new PublicKey(mintStr);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("battle_state"), mint.toBuffer()],
      PROGRAM_ID
    );
    
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Token: ${mintStr}`);
    console.log(`PDA: ${pda.toString()}`);
    
    const info = await connection.getAccountInfo(pda);
    if (!info) {
      console.log("❌ Account NOT FOUND!");
      continue;
    }
    
    const data = info.data;
    console.log(`Account size: ${data.length} bytes`);
    
    // Parse according to struct:
    // 8 discriminator + 32 mint + 8 sol + 8 tokens + 8 volume + 1 active + 1 status
    let offset = 8; // Skip discriminator
    
    const tokenMint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    console.log(`Mint: ${tokenMint.toString()}`);
    
    const solCollected = readU64(data, offset);
    offset += 8;
    console.log(`SOL Collected: ${solCollected} lamports (${Number(solCollected) / 1e9} SOL)`);
    
    const tokensSold = readU64(data, offset);
    offset += 8;
    console.log(`Tokens Sold: ${tokensSold}`);
    
    const totalVolume = readU64(data, offset);
    offset += 8;
    console.log(`Total Volume: ${totalVolume}`);
    
    const isActive = data[offset];
    offset += 1;
    console.log(`Is Active: ${isActive} (${isActive === 1 ? 'true' : 'false'})`);
    
    const battleStatus = data[offset];
    offset += 1;
    const statusNames = ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed'];
    console.log(`Battle Status: ${battleStatus} (${statusNames[battleStatus] || 'UNKNOWN'})`);
    
    if (battleStatus === 1) {
      console.log("✅ TOKEN IS QUALIFIED FOR BATTLE!");
    } else {
      console.log("❌ Token NOT qualified");
    }
  }
}

checkTokens().catch(console.error);
