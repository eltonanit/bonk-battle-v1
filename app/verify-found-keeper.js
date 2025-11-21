// Verify the found keeper wallet
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');

const FOUND_KEEPER_PATH = 'C:\\Users\\Elton\\bonk-battle-contract\\keeper\\keeper-wallet.json';
const EXPECTED_ADDRESS = 'Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH';

console.log('🔍 Verifying Found Keeper Wallet...\n');

try {
    const keypairData = JSON.parse(fs.readFileSync(FOUND_KEEPER_PATH, 'utf-8'));
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

    console.log('✅ Public Key from found file:');
    console.log(keypair.publicKey.toString());
    console.log();
    console.log('📋 Expected keeper address:');
    console.log(EXPECTED_ADDRESS);
    console.log();

    if (keypair.publicKey.toString() === EXPECTED_ADDRESS) {
        console.log('🎉 SUCCESS! This is the correct keeper wallet!');
        console.log();
        console.log('Now copying to ~/.config/solana/id.json...');

        const OUTPUT_PATH = 'C:\\Users\\Elton\\.config\\solana\\id.json';
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(keypairData));
        console.log(`✅ Keypair copied to: ${OUTPUT_PATH}`);
    } else {
        console.log('❌ ERROR: This is NOT the correct keeper wallet!');
    }

} catch (error) {
    console.error('❌ Error:', error.message);
}
