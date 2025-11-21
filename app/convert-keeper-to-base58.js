// Convert keeper keypair array to base58 private key
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

// The keeper keypair array from the file
const keypairArray = [130,165,3,122,197,183,92,165,234,163,181,126,134,172,12,44,228,82,194,35,253,87,212,65,236,52,77,188,116,177,103,91,234,241,81,54,11,176,177,171,126,73,55,194,99,212,186,249,95,202,65,70,12,93,198,61,214,34,16,17,106,234,237,130];

console.log('🔐 Converting Keeper Keypair to Base58...\n');

try {
    // Create keypair from array
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairArray));

    console.log('✅ Public Key:');
    console.log(keypair.publicKey.toString());
    console.log();

    console.log('📋 Expected address:');
    console.log('Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH');
    console.log();

    if (keypair.publicKey.toString() === 'Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH') {
        console.log('🎉 SUCCESS! This is the correct keeper wallet!');
        console.log();

        // Convert to base58
        const privateKeyBase58 = bs58.encode(keypair.secretKey);

        console.log('✅ Private Key (base58) - USE THIS TO IMPORT IN PHANTOM:');
        console.log('━'.repeat(80));
        console.log(privateKeyBase58);
        console.log('━'.repeat(80));
        console.log();
        console.log('⚠️  KEEP THIS KEY SECRET - DO NOT SHARE IT!');
    } else {
        console.log('❌ ERROR: Public key does not match!');
        console.log(`   Got: ${keypair.publicKey.toString()}`);
    }

} catch (error) {
    console.error('❌ Error:', error.message);
}
