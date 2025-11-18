'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { createBattleToken } from '@/lib/solana/create-battle-token';

export default function CreatePage() {
    const { publicKey, signTransaction } = useWallet();
    const router = useRouter();
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

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

        if (!name || !symbol) {
            alert('Please fill in all required fields');
            return;
        }

        setIsCreating(true);

        try {
            // Upload image if provided
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

            // Build metadata URI
            const metadata = {
                name,
                symbol,
                description,
                image: imageUrl,
            };
            const uri = JSON.stringify(metadata);

            console.log('🎮 Creating BONK Battle Token...');
            console.log('📝 Name:', name);
            console.log('📝 Symbol:', symbol);
            console.log('📝 URI:', uri);

            // Call createBattleToken function
            const result = await createBattleToken(
                publicKey,
                name,
                symbol,
                uri,
                signTransaction
            );

            console.log('✅ Battle Token created successfully!');
            console.log('🎯 Signature:', result.signature);
            console.log('🪙 Mint:', result.mint.toString());
            console.log('⚔️ Battle State:', result.battleState.toString());

            // Show success message
            if (confirm(
                `✅ Battle Token created successfully!\n\n` +
                `Name: ${name}\n` +
                `Symbol: ${symbol}\n` +
                `Mint: ${result.mint.toString()}\n\n` +
                `Click OK to view your token`
            )) {
                router.push(`/token/${result.mint.toString()}`);
            }

        } catch (error: unknown) {
            console.error('❌ Error creating battle token:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            alert(`Failed to create battle token: ${errorMessage}\n\nCheck console for details.`);

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
                    <h1 className="text-3xl font-bold mb-10">Create Battle Token</h1>

                    <form onSubmit={handleCreateToken}>
                        <section>
                            <h2 className="text-xl font-bold mb-2">Token details</h2>
                            <p className="text-sm text-gray-400 mb-6">Choose carefully, these cannot be changed once the token is created</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Token name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => {
                                            const filtered = e.target.value
                                                .replace(/[^a-zA-Z0-9\s]/g, '');
                                            setName(filtered);
                                        }}
                                        className="w-full bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg px-4 py-3 text-white focus:border-[#10b981] focus:outline-none"
                                        placeholder="Name your token"
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
                                        placeholder="e.g. BONK"
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
                            <h2 className="text-xl font-bold mb-2">Battle Information</h2>
                            <p className="text-sm text-gray-400 mb-6">How BONK Battle tokens work</p>

                            <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl p-6 space-y-4">
                                <div className="flex gap-3 items-start">
                                    <div className="text-2xl">🎮</div>
                                    <div>
                                        <div className="text-[#10b981] font-bold mb-2">No Tiers - Just Battle!</div>
                                        <div className="text-sm text-gray-300 space-y-2">
                                            <div>├─ <strong>Created:</strong> Your token starts here</div>
                                            <div>├─ <strong>Qualified:</strong> Reach $5,100 MC to qualify for battles</div>
                                            <div>├─ <strong>In Battle:</strong> Fight another token! Winner takes $500 liquidity</div>
                                            <div>├─ <strong>Victory:</strong> Winner is listed on Meteora DEX</div>
                                            <div>└─ <strong>Listed:</strong> Permanent listing achieved!</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 items-start pt-4 border-t border-[#10b981]/20">
                                    <div className="text-2xl">⚔️</div>
                                    <div>
                                        <div className="text-gray-300 text-sm">
                                            <p><strong>Bonding Curve:</strong> Fair launch with virtual reserves (30 SOL)</p>
                                            <p className="mt-1"><strong>Platform Fee:</strong> 2% on sells, used for battle rewards</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                            {isCreating ? 'Creating Battle Token...' : 'Create Battle Token'}
                        </button>
                    </form>
                </div>
            </div>
            <MobileBottomNav />
        </div>
    );
}