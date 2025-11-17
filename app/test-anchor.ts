import { Connection, Keypair } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import idlJson from './src/idl/stonks_fan.json';

console.log('Testing Anchor 0.30.1 IDL loading...\n');

const connection = new Connection('https://api.devnet.solana.com');
const wallet = {
    publicKey: Keypair.generate().publicKey,
    signTransaction: async () => { throw new Error('Not implemented'); },
    signAllTransactions: async () => { throw new Error('Not implemented'); },
};

try {
    const provider = new AnchorProvider(connection, wallet as any, {});
    console.log('✅ Provider created');
    
    console.log('\nIDL accounts:', idlJson.accounts.map((a: any) => a.name));
    
    const program = new Program(idlJson as any, provider);
    console.log('✅ Program created successfully!');
    console.log('Program coder accounts:', program.coder.accounts);
} catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
}
