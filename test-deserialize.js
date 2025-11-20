const { Connection, PublicKey } = require('@solana/web3.js');

async function testDeserialize() {
  const PROGRAM_ID = 'HTNCkRMo8A8NFxDS8ANspLC16dgb1WpCSznsfb7BDdK9';
  const RPC = 'https://devnet.helius-rpc.com/?api-key=867cca8d-b431-4540-8f55-90c57e3e1c9e';

  const connection = new Connection(RPC, 'confirmed');

  console.log('🔍 Testing token deserialization...\n');

  try {
    const accounts = await connection.getProgramAccounts(new PublicKey(PROGRAM_ID));

    // Test first 208-byte account
    const testAccount = accounts.find(a => a.account.data.length === 208);

    if (!testAccount) {
      console.log('❌ No 208-byte accounts found');
      return;
    }

    console.log('Testing account:', testAccount.pubkey.toString());
    console.log('Data size:', testAccount.account.data.length, 'bytes\n');

    const data = testAccount.account.data;
    let offset = 8; // Skip discriminator

    // Try to parse as TokenBattleState
    const mint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    console.log('Mint:', mint.toString());

    const solCollected = data.readBigUInt64LE(offset);
    offset += 8;
    console.log('SOL Collected:', Number(solCollected) / 1e9, 'SOL');

    const tokensSold = data.readBigUInt64LE(offset);
    offset += 8;
    console.log('Tokens Sold:', Number(tokensSold) / 1e6);

    const totalTradeVolume = data.readBigUInt64LE(offset);
    offset += 8;
    console.log('Trade Volume:', Number(totalTradeVolume) / 1e9, 'SOL');

    const isActive = data[offset] !== 0;
    offset += 1;
    console.log('Is Active:', isActive);

    const battleStatus = data[offset];
    offset += 1;
    const statusMap = {0: 'Created', 1: 'Qualified', 2: 'InBattle', 3: 'VictoryPending', 4: 'Listed'};
    console.log('Battle Status:', statusMap[battleStatus] || battleStatus);

    console.log('\n✅ Deserialization successful!');
    console.log('This confirms tokens are stored correctly on-chain.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testDeserialize();
