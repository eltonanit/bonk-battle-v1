const { Connection, PublicKey } = require("@solana/web3.js");

const RPC = "https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f";
const PROGRAM_ID = new PublicKey("6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq");

function readU64(data, offset) {
  let value = BigInt(0);
  for (let i = 0; i < 8; i++) {
    value |= BigInt(data[offset + i]) << BigInt(i * 8);
  }
  return Number(value);
}

async function checkToken() {
  const connection = new Connection(RPC, "confirmed");
  const mint = new PublicKey("EsavhZJepP3234XkWvhMn1wkBxrHnwuLwTPERiE1Lg8C");
  
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("battle_state"), mint.toBuffer()],
    PROGRAM_ID
  );
  
  const info = await connection.getAccountInfo(pda);
  const data = info.data;
  
  // Cerco 98000000 (0x05D75C80) nei dati
  console.log("Searching for sol_collected = 98000000...\n");
  
  for (let i = 0; i < data.length - 8; i++) {
    const val = readU64(data, i);
    if (val === 98000000) {
      console.log(`Found 98000000 at offset ${i}!`);
      console.log(`  Offset ${i}: sol_collected = ${val}`);
      console.log(`  Offset ${i-1}: byte before = ${data[i-1]}`);
      console.log(`  Offset ${i+8}: next u64 = ${readU64(data, i+8)}`);
      console.log(`  Offset ${i+16}: next u64 = ${readU64(data, i+16)}`);
      console.log(`  Offset ${i+24}: is_active = ${data[i+24]}`);
      console.log(`  Offset ${i+25}: battle_status = ${data[i+25]}`);
      
      // Leggiamo i 32 bytes prima per vedere il mint
      const mintOffset = i - 32;
      if (mintOffset >= 8) {
        const possibleMint = new PublicKey(data.slice(mintOffset, mintOffset + 32));
        console.log(`  Possible mint at ${mintOffset}: ${possibleMint.toString()}`);
      }
    }
  }
  
  // Cerco anche pattern 01 01 (is_active + battle_status = Qualified)
  console.log("\nSearching for is_active=1, battle_status=1 pattern...");
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i] === 1 && data[i+1] === 1) {
      console.log(`Found 01 01 at offset ${i}`);
    }
  }
}

checkToken().catch(console.error);
