// Verify keeper wallet address
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');

const KEYPAIR_PATH = 'C:\\Users\\Elton\\.config\\solana\\id.json';

console.log('🔍 Verifying Keeper Wallet...\n');

try {
    const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'));
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

    console.log('✅ Public Key from keypair file:');
    console.log(keypair.publicKey.toString());
    console.log();
    console.log('📋 Expected KEEPER_AUTHORITY (hardcoded in contract):');
    console.log('65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea');
    console.log();

    if (keypair.publicKey.toString() === '65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea') {
        console.log('✅ MATCH! The keypair file contains the correct keeper wallet!');
    } else {
        console.log('❌ MISMATCH! This keypair does NOT match the contract KEEPER_AUTHORITY!');
        console.log('   Contract expects: 65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea');
    }

} catch (error) {
    console.error('❌ Error:', error.message);
}
