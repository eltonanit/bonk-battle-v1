import { startListener } from '@/services/blockchain-listener';

console.log('🚀 STONKS.FAN - Blockchain Listener');
console.log('===================================');
console.log('');

startListener()
    .then(() => {
        console.log('');
        console.log('✅ Listener running...');
        console.log('Press Ctrl+C to stop');
    })
    .catch((error) => {
        console.error('❌ Failed to start listener:', error);
        process.exit(1);
    });