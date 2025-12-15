const { Connection, PublicKey } = require('@solana/web3.js');

async function check() {
  const conn = new Connection('https://api.devnet.solana.com');
  const programId = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');
  const mint = new PublicKey('BffyGfe8Jvc8FbgyqN6m9GnUrRt9kN6gvK83ysodG6uz');
  
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('battle_state'), mint.toBuffer()],
    programId
  );
  
  console.log('PDA:', pda.toString());
  
  const info = await conn.getAccountInfo(pda);
  if (!info) { console.log('Account not found'); return; }
  
  const data = info.data;
  let offset = 40;
  
  let solCollected = 0n;
  for (let i = 0; i < 8; i++) solCollected |= BigInt(data[offset + i]) << BigInt(i * 8);
  offset += 8;
  
  let tokensSold = 0n;
  for (let i = 0; i < 8; i++) tokensSold |= BigInt(data[offset + i]) << BigInt(i * 8);
  offset += 8;
  
  let volume = 0n;
  for (let i = 0; i < 8; i++) volume |= BigInt(data[offset + i]) << BigInt(i * 8);
  
  console.log('=== ON-CHAIN RAW DATA ===');
  console.log('sol_collected:', Number(solCollected) / 1e9, 'SOL');
  console.log('tokens_sold:', Number(tokensSold) / 1e9, 'M tokens');
  console.log('total_volume:', Number(volume) / 1e9, 'SOL');
}

check().catch(console.error);
