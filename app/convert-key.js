const bs58 = require('bs58');

// INCOLLA QUI LA TUA CHIAVE BASE58 (tra le virgolette)
const base58Key = "3dE7EueZZJtRiiysLQc7Hh2sTWNzGQXjYYJsWMb8x4DPm3LX3o7PfZVTFuc46wX4cmwTmzu1akMRATPMh9GZ8Mo5";

try {
    // Converti da base58 a array
    const secretKey = bs58.decode(base58Key);
    const array = Array.from(secretKey);

    console.log('\n✅ ARRAY CONVERTITO (copia questo):');
    console.log('\n[' + array.join(',') + ']');
    console.log('\n');
} catch (error) {
    console.error('❌ Errore:', error.message);
}