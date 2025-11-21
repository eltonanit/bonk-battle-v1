// Recover keeper wallet from seed phrase
const { Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');
const fs = require('fs');

const SEED_PHRASE = 'soul expire nest people easy dismiss friend destroy similar palm foster base';
const OUTPUT_PATH = 'C:\\Users\\Elton\\.config\\solana\\keeper-recovered.json';

console.log('🔐 Recovering Keeper Wallet from Seed Phrase...\n');

try {
    // Convert seed phrase to seed
    const seed = bip39.mnemonicToSeedSync(SEED_PHRASE, ''); // empty passphrase

    // Derive keypair using Solana's default derivation path
    const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
    const keypair = Keypair.fromSeed(derivedSeed);

    console.log('✅ Recovered Public Key:');
    console.log(keypair.publicKey.toString());
    console.log();

    // Save to file
    const keypairArray = Array.from(keypair.secretKey);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(keypairArray));

    console.log(`✅ Keypair saved to: ${OUTPUT_PATH}`);
    console.log();
    console.log('📋 Expected address: Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH');
    console.log(`📋 Recovered address: ${keypair.publicKey.toString()}`);
    console.log();

    if (keypair.publicKey.toString() === 'Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH') {
        console.log('🎉 SUCCESS! Addresses match!');
    } else {
        console.log('⚠️  Warning: Addresses do not match. May need different derivation path.');
    }

} catch (error) {
    console.error('❌ Error:', error.message);
}
