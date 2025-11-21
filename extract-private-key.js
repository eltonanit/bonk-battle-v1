// Script temporaneo per estrarre la chiave privata del keeper
const fs = require('fs');
const bs58 = require('bs58');

const KEYPAIR_PATH = 'C:\\Users\\Elton\\.config\\solana\\id.json';

console.log('🔑 Extracting Private Key from Keeper Wallet...\n');

try {
    // Leggi il keypair
    const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'));

    // Converti in base58
    const privateKeyBase58 = bs58.encode(Buffer.from(keypairData));

    console.log('✅ Private Key (base58 format):');
    console.log('━'.repeat(80));
    console.log(privateKeyBase58);
    console.log('━'.repeat(80));
    console.log('\n📋 Copy this key and use it to import into Phantom wallet');
    console.log('⚠️  KEEP THIS KEY SECRET - DO NOT SHARE IT!\n');

} catch (error) {
    console.error('❌ Error:', error.message);
}
