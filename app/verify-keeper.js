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
    console.log('📋 Expected keeper address:');
    console.log('Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH');
    console.log();
    console.log('📋 Address you imported in Phantom:');
    console.log('753pndtcJx31bTXJNQPYvnesghXyQpBwTaYEACz7wQE3');
    console.log();

    if (keypair.publicKey.toString() === 'Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH') {
        console.log('✅ MATCH! The keypair file contains the correct keeper wallet!');
    } else if (keypair.publicKey.toString() === '753pndtcJx31bTXJNQPYvnesghXyQpBwTaYEACz7wQE3') {
        console.log('❌ MISMATCH! The imported wallet matches the keypair file,');
        console.log('   but this is NOT the keeper authority expected by the contract!');
    } else {
        console.log('❌ Neither address matches!');
    }

} catch (error) {
    console.error('❌ Error:', error.message);
}
