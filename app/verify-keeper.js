// serve se ho creato il file con codespace e ho la seed ph

const { Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');
const fs = require('fs');

const SEED_PHRASE = "";
const PASSPHRASE = "BIP39";  // <-- La tua passphrase
const EXPECTED = "65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea";

const seed = bip39.mnemonicToSeedSync(SEED_PHRASE, PASSPHRASE);
const keypair = Keypair.fromSeed(seed.slice(0, 32));

console.log('Indirizzo generato:', keypair.publicKey.toString());
console.log('Indirizzo atteso:  ', EXPECTED);

if (keypair.publicKey.toString() === EXPECTED) {
    console.log('\n✅ TROVATO!');
    fs.writeFileSync('./keeper.json', JSON.stringify(Array.from(keypair.secretKey)));
    console.log('Salvato in keeper.json');
} else {
    console.log('\n❌ Non corrisponde');
}