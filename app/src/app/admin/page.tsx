'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';

export default function AdminPage() {
    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');

    const handleInitOracle = async () => {
        if (!publicKey || !signTransaction) {
            alert('Connect wallet first!');
            return;
        }

        setLoading(true);
        setResult('Fetching SOL price...');

        try {
            // 1. Fetch SOL price
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await res.json();
            const solPrice = data.solana.usd;
            const priceMicro = Math.floor(solPrice * 1_000_000);

            setResult(`SOL Price: $${solPrice}\nBuilding transaction...`);

            console.log('🔑 Connected wallet:', publicKey.toString());

            // 2. Build transaction
            const programId = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');
            const [priceOraclePDA] = PublicKey.findProgramAddressSync(
                [Buffer.from('price_oracle')],
                programId
            );

            console.log('📍 Price Oracle PDA:', priceOraclePDA.toString());

            // Discriminator from IDL: initialize_price_oracle
            const discriminator = Buffer.from([61, 200, 206, 137, 205, 74, 242, 172]);

            // Convert u64 to little-endian bytes
            const priceBuffer = Buffer.alloc(8);
            const priceBigInt = BigInt(priceMicro);
            for (let i = 0; i < 8; i++) {
                priceBuffer[i] = Number((priceBigInt >> BigInt(i * 8)) & BigInt(0xff));
            }

            const instructionData = Buffer.concat([discriminator, priceBuffer]);

            console.log('📦 Instruction data:', instructionData.toString('hex'));

            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: priceOraclePDA, isSigner: false, isWritable: true },
                    { pubkey: publicKey, isSigner: true, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                programId,
                data: instructionData,
            });

            const transaction = new Transaction().add(instruction);
            transaction.feePayer = publicKey;
            transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

            setResult(`SOL Price: $${solPrice}\nSigning transaction...`);

            // 3. Sign and send
            const signed = await signTransaction(transaction);

            setResult(`SOL Price: $${solPrice}\nSending transaction...`);

            const signature = await connection.sendRawTransaction(signed.serialize());

            setResult(`SOL Price: $${solPrice}\nConfirming...`);

            await connection.confirmTransaction(signature);

            setResult(`✅ SUCCESS!\n\nSOL Price: $${solPrice}\nTransaction: ${signature}\n\nSolscan: https://solscan.io/tx/${signature}?cluster=devnet`);

        } catch (error: any) {
            console.error(error);
            setResult(`❌ ERROR:\n${error.message}\n\nLogs:\n${error.logs?.join('\n') || 'No logs'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">🔧 Admin - Initialize Price Oracle</h1>
                    <WalletMultiButton />
                </div>

                <div className="bg-gray-800 rounded-lg p-6 mb-4">
                    {publicKey ? (
                        <>
                            <p className="text-sm text-gray-400 mb-4">
                                Connected: {publicKey.toString()}
                            </p>
                            <button
                                onClick={handleInitOracle}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-bold w-full"
                            >
                                {loading ? 'Processing...' : 'Initialize Price Oracle'}
                            </button>
                        </>
                    ) : (
                        <p className="text-yellow-500 text-center">
                            ⚠️ Please connect your wallet using the button above
                        </p>
                    )}
                </div>

                {result && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <pre className="whitespace-pre-wrap text-sm font-mono">{result}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}