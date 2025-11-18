'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { web3 } from '@coral-xyz/anchor';
import BN from 'bn.js';
import { PROGRAM_ID, RPC_ENDPOINT } from '@/config/solana';

const TIER_INFO = {
    1: { sol: 55, usd: 5_500, duration: '3 Days', target: '$5,500' },
    2: { sol: 500, usd: 50_000, duration: '7 Days', target: '$50,000' },
    3: { sol: 2_500, usd: 250_000, duration: '15 Days', target: '$250,000' },
    4: { sol: 10_000, usd: 1_000_000, duration: '30 Days', target: '$1,000,000' }
};

export default function CreatePage() {
    const { publicKey, signTransaction } = useWallet();
    const router = useRouter();
    const [selectedTier, setSelectedTier] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleTierSelect = (tier: number) => {
        setSelectedTier(tier);
    };

    const handleFileSelect = (file: File | null) => {
        if (file) {
            const maxSize = file.type.startsWith('video/') ? 30 * 1024 * 1024 : 15 * 1024 * 1024;
            if (file.size > maxSize) {
                alert(`File too large. Max ${file.type.startsWith('video/') ? '30MB for videos' : '15MB for images'}`);
                return;
            }
            setImageFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleCreateToken = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!publicKey || !signTransaction) {
            alert('Please connect your wallet');
            return;
        }

        if (!selectedTier) {
            alert('Please select a target tier');
            return;
        }

        if (!name || !symbol) {
            alert('Please fill in all required fields');
            return;
        }

        setIsCreating(true);

        let mint: PublicKey | null = null;

        try {
            let imageUrl = '';
            if (imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                if (!uploadRes.ok) throw new Error('Image upload failed');
                const uploadData = await uploadRes.json();
                imageUrl = uploadData.url;
            }

            const metadata = {
                name,
                symbol,
                description,
                image: imageUrl,
            };
            const metadataStr = JSON.stringify(metadata);

            const connection = new Connection(RPC_ENDPOINT, 'confirmed');
            const programId = new PublicKey(PROGRAM_ID);
            const treasury = new PublicKey('A84TUvSQLpMoTGqoqNbEuTHJSheVC5cTSjsv3EMwYLmn');

            const mintSeed = new BN(Date.now());

            [mint] = PublicKey.findProgramAddressSync(
                [Buffer.from('mint'), publicKey.toBuffer(), mintSeed.toArrayLike(Buffer, 'le', 8)],
                programId
            );

            const [tokenLaunch] = PublicKey.findProgramAddressSync(
                [Buffer.from('launch'), mint.toBuffer()],
                programId
            );

            const discriminator = Buffer.from('5434cce4188cea4b', 'hex');

            function encodeBorshString(str: string): Buffer {
                const bytes = Buffer.from(str, 'utf8');
                const len = Buffer.alloc(4);
                len.writeUInt32LE(bytes.length, 0);
                return Buffer.concat([len, bytes]);
            }

            const data = Buffer.concat([
                discriminator,
                mintSeed.toArrayLike(Buffer, 'le', 8),
                Buffer.from([selectedTier]),
                encodeBorshString(name),
                encodeBorshString(symbol.toUpperCase()),
                encodeBorshString(metadataStr)
            ]);

            const keys = [
                { pubkey: publicKey, isSigner: true, isWritable: true },
                { pubkey: tokenLaunch, isSigner: false, isWritable: true },
                { pubkey: mint, isSigner: false, isWritable: true },
                { pubkey: treasury, isSigner: false, isWritable: true },
                { pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false }
            ];

            const instruction = new web3.TransactionInstruction({
                keys,
                programId,
                data
            });

            const transaction = new web3.Transaction().add(instruction);
            const { blockhash } = await connection.getLatestBlockhash('finalized');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            console.log('📤 Signing transaction...');
            const signed = await signTransaction(transaction);

            console.log('📤 Sending transaction...');

            try {
                const signature = await connection.sendRawTransaction(signed.serialize(), {
                    skipPreflight: false,
                    preflightCommitment: 'confirmed'
                });

                console.log('⏳ Waiting for confirmation...');
                await connection.confirmTransaction(signature, 'confirmed');

                console.log('✅ Token created! Signature:', signature);

                const tokenUrl = `/token/${mint.toString()}`;

                if (confirm(
                    `✅ Token created successfully!\n\n` +
                    `Name: ${name}\n` +
                    `Symbol: ${symbol}\n` +
                    `Mint: ${mint.toString()}\n\n` +
                    `Click OK to view your token`
                )) {
                    router.push(tokenUrl);
                }

            } catch (txError: unknown) {
                const txErrorMessage = txError instanceof Error ? txError.message : '';

                if (txErrorMessage.includes('already been processed') && mint) {
                    console.log('⚠️ Transaction already processed - verifying token creation...');

                    await new Promise(resolve => setTimeout(resolve, 2000));

                    const [tokenLaunchPDA] = PublicKey.findProgramAddressSync(
                        [Buffer.from('launch'), mint.toBuffer()],
                        programId
                    );

                    const launchAccount = await connection.getAccountInfo(tokenLaunchPDA);

                    if (launchAccount) {
                        console.log('✅ Token was created successfully! Redirecting...');

                        const tokenUrl = `/token/${mint.toString()}`;

                        if (confirm(
                            `✅ Token created successfully!\n\n` +
                            `Name: ${name}\n` +
                            `Symbol: ${symbol}\n` +
                            `Mint: ${mint.toString()}\n\n` +
                            `Click OK to view your token`
                        )) {
                            router.push(tokenUrl);
                        }

                        setIsCreating(false);
                        return;
                    }

                    console.log('⚠️ Token not found on-chain - creation may have failed');
                }

                throw txError;
            }

        } catch (error: unknown) {
            console.error('❌ Error creating token:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            alert(`Failed to create token: ${errorMessage}\n\nCheck console for details.`);

        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a]">
            <DesktopHeader />
            <Header />
            <Sidebar />

            {/* ⭐ MODIFICATO: Aggiunto pt-20 mobile e FOMOTicker */}
            <div className="pt-20 lg:pt-0 lg:ml-60 lg:mt-16">
                {/* ⭐ FOMOTicker visibile SOLO su mobile, sotto l'header */}
                <div className="lg:hidden">
                    <FOMOTicker />
                </div>

                <div className="max-w-[1200px] pl-8 pr-5 py-10">
                    <h1 className="text-3xl font-bold mb-10">Create new coin</h1>

                    <form onSubmit={handleCreateToken}>
                        <section>
                            <h2 className="text-xl font-bold mb-2">Coin details</h2>
                            <p className="text-sm text-gray-400 mb-6">Choose carefully, these cannot be changed once the coin is created</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Coin name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => {
                                            const filtered = e.target.value
                                                .replace(/[^a-zA-Z0-9\s]/g, '');
                                            setName(filtered);
                                        }}
                                        className="w-full bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-4 py-3 text-white focus:border-[#10b981] focus:outline-none"
                                        placeholder="Name your coin"
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Only letters, numbers and spaces allowed</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Ticker</label>
                                    <input
                                        type="text"
                                        value={symbol}
                                        onChange={(e) => {
                                            const filtered = e.target.value
                                                .toUpperCase()
                                                .replace(/[^A-Z0-9]/g, '');
                                            setSymbol(filtered);
                                        }}
                                        className="w-full bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-4 py-3 text-white focus:border-[#10b981] focus:outline-none"
                                        placeholder="e.g. DOGE"
                                        maxLength={10}
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Only letters and numbers allowed</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">Description <span className="font-normal text-gray-400">(Optional)</span></label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-4 py-3 text-white focus:border-[#10b981] focus:outline-none resize-none"
                                    rows={4}
                                    placeholder="Write a short description"
                                />
                            </div>
                        </section>

                        <section className="mt-10">
                            <h2 className="text-xl font-bold mb-2">Select your target tier</h2>
                            <p className="text-sm text-gray-400 mb-6">Choose your target market cap and timeframe</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                                {[1, 2, 3, 4].map((tier) => {
                                    const colors = {
                                        1: 'bg-[#3b82f6] hover:bg-[#2563eb]',
                                        2: 'bg-[#fb923c] hover:bg-[#f97316]',
                                        3: 'bg-[#10b981] hover:bg-[#059669]',
                                        4: 'bg-[#fbbf24] hover:bg-[#f59e0b]'
                                    };
                                    return (
                                        <div
                                            key={tier}
                                            onClick={() => handleTierSelect(tier)}
                                            className={`relative cursor-pointer rounded-2xl p-6 text-center transition-all ${colors[tier as keyof typeof colors]} ${selectedTier === tier ? 'ring-4 ring-white/50' : ''}`}
                                        >
                                            {selectedTier === tier && (
                                                <div className="absolute top-3 right-3 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-lg">
                                                    ✓
                                                </div>
                                            )}
                                            <div className="text-lg font-bold text-black mb-3">TIER {tier}</div>
                                            <div className="text-2xl font-extrabold text-black mb-1 uppercase">TARGET: {TIER_INFO[tier as keyof typeof TIER_INFO].target}</div>
                                            <div className="text-lg font-semibold text-black mb-4">Countdown {TIER_INFO[tier as keyof typeof TIER_INFO].duration}</div>
                                            <div className="text-sm text-black text-left leading-relaxed">
                                                When the market cap reaches {TIER_INFO[tier as keyof typeof TIER_INFO].target} your token will get Listed on Meteora
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedTier && (
                                <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl p-4 flex gap-3 items-start">
                                    <div className="text-2xl">ℹ️</div>
                                    <div>
                                        <div className="text-[#10b981] font-bold mb-2">TIER {selectedTier} Selected</div>
                                        <div className="text-sm text-gray-300 space-y-1">
                                            <div>├─ Target: {TIER_INFO[selectedTier as keyof typeof TIER_INFO].target} market cap</div>
                                            <div>├─ Time: Countdown {TIER_INFO[selectedTier as keyof typeof TIER_INFO].duration}</div>
                                            <div>├─ If target reached → Listed on Meteora</div>
                                            <div>└─ If target missed → 98% refund guaranteed</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        <section className="mt-10">
                            <h2 className="text-xl font-bold mb-6">Add image</h2>

                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('fileInput')?.click()}
                                className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${isDragOver ? 'border-[#10b981] bg-[#10b981]/10' : 'border-gray-600 hover:border-[#10b981] hover:bg-[#10b981]/5'}`}
                            >
                                <div className="text-6xl mb-4 opacity-70">🖼️</div>
                                <div className="text-lg font-semibold mb-2">{imageFile ? imageFile.name : 'Select image to upload'}</div>
                                <div className="text-sm text-gray-400 mb-6">or drag and drop it here</div>
                                <button type="button" className="bg-[#10b981] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#059669] transition-colors">
                                    Select file
                                </button>
                                <input
                                    id="fileInput"
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                <div className="flex gap-4">
                                    <div className="text-2xl opacity-70">📄</div>
                                    <div>
                                        <h3 className="font-semibold mb-3">File size and type</h3>
                                        <ul className="text-sm text-gray-400 space-y-1">
                                            <li>• Image - max 15mb</li>
                                            <li>• Video - max 30mb</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="text-2xl opacity-70">🖼️</div>
                                    <div>
                                        <h3 className="font-semibold mb-3">Resolution</h3>
                                        <ul className="text-sm text-gray-400 space-y-1">
                                            <li>• Image - min. 1000x1000px</li>
                                            <li>• Video - 16:9 or 9:16</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <button
                            type="submit"
                            disabled={isCreating || !publicKey}
                            className="mt-10 w-full max-w-xs bg-[#10b981] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#059669] disabled:bg-gray-600 disabled:cursor-not-allowed transition-all hover:scale-105"
                        >
                            {isCreating ? 'Creating...' : 'Create coin'}
                        </button>
                    </form>
                </div>
            </div>
            <MobileBottomNav />
        </div>
    );
}