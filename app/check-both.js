const { Connection, PublicKey } = require("@solana/web3.js");

const RPC = "https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f";
const PROGRAM_ID = new PublicKey("6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq");

const tokens = [
  { mint: "EsavhZJepP3234XkWvhMn1wkBxrHnwuLwTPERiE1Lg8C", name: "wbhook" },
  { mint: "6TBHvFfsZEqCn7vNdLPx9hTiLgf3BjtTGyBkR8yVr8SP", name: "newss" }
];

async function checkBothTokens() {
  const connection = new Connection(RPC, "confirmed");
  
  console.log("Checking both tokens on-chain status...\n");
  
  for (const token of tokens) {
    const mint = new PublicKey(token.mint);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("battle_state"), mint.toBuffer()],
      PROGRAM_ID
    );
    
    const info = await connection.getAccountInfo(pda);
    if (!info) {
      console.log(`${token.name}: ❌ NOT FOUND`);
      continue;
    }
    
    const isActive = info.data[96];
    const battleStatus = info.data[97];
    const statusNames = ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed'];
    
    console.log(`${token.name} (${token.mint.slice(0,8)}...):`);
    console.log(`  is_active: ${isActive} (${isActive === 1 ? 'true' : 'false'})`);
    console.log(`  battle_status: ${battleStatus} (${statusNames[battleStatus] || 'UNKNOWN'})`);
    console.log(`  ${battleStatus === 1 ? '✅ QUALIFIED' : '❌ NOT QUALIFIED'}\n`);
  }
}

checkBothTokens().catch(console.error);
