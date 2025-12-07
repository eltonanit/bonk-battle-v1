'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { createBattleToken, BattleTier, TIER_CONFIG } from '@/lib/solana/create-battle-token';
import { TransactionSuccessPopup } from '@/components/shared/TransactionSuccessPopup';

export default function CreatePage() {
    const { publicKey, signTransaction } = useWallet();
    const router = useRouter();
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [createdMint, setCreatedMint] = useState<string | null>(null);

    // NEW: Tier selection state
    const [selectedTier, setSelectedTier] = useState<BattleTier>(BattleTier.Test);

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
            // ⚠️ Tier is now compile-time in contract (USE_TEST_TIER flag)

            // Call createBattleToken function (tier is compile-time now)
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
            console.log('🏆 Tier:', result.tier === BattleTier.Test ? 'Test (compile-time)' : 'Production (compile-time)');

            // ⭐ NEW: Save creator to database
            try {
                const creatorRes = await fetch('/api/tokens/set-creator', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mint: result.mint.toString(),
                        creator: publicKey.toBase58()
                    })
                });

                if (creatorRes.ok) {
                    console.log('👤 Creator saved to database');
                } else {
                    console.warn('⚠️ Could not save creator to database');
                }
            } catch (err) {
                console.warn('⚠️ Error saving creator:', err);
            }

            // Show success popup and redirect
            setCreatedMint(result.mint.toString());
            setShowSuccess(true);

        } catch (error: unknown) {
            console.error('❌ Error creating battle token:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            alert(`Failed to create battle token: ${errorMessage}\n\nCheck console for details.`);

        } finally {
            setIsCreating(false);
        }
    };

    // Handle success popup close - redirect to token page
    const handleSuccessClose = useCallback(() => {
        setShowSuccess(false);
        if (createdMint) {
            router.push(`/token/${createdMint}`);
        }
    }, [createdMint, router]);

    // Get current tier config for display (using new string keys)
    const currentTierConfig = TIER_CONFIG[selectedTier === BattleTier.Test ? 'TEST' : 'PRODUCTION'];

    return (
        <div className="min-h-screen bg-bonk-dark">
            {/* ⭐ Tickers SOPRA Header - SOLO mobile/tablet (< lg) */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
                <div className="flex items-center gap-2 px-2 justify-center xs:justify-start">
                    <FOMOTicker />
                    <div className="hidden sm:block">
                        <CreatedTicker />
                    </div>
                </div>
            </div>

            <DesktopHeader />
            <Header />
            <Sidebar />

            {/* Success Popup */}
            <TransactionSuccessPopup
                show={showSuccess}
                message="Transaction Successful"
                subMessage="Token Created"
                onClose={handleSuccessClose}
                autoCloseMs={2500}
            />

            <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16">

                <div className="max-w-[1200px] pl-8 pr-5 py-10">
                    {/* Header Section */}
                    <div className="mb-10">
                        <h1 className="text-4xl lg:text-5xl font-extrabold mb-3 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 bg-clip-text text-transparent">
                            Start Battle Here
                        </h1>
                        <p className="text-xl text-white/80 font-semibold">
                            First: Create a Coin
                        </p>
                    </div>

                    <form onSubmit={handleCreateToken}>
                        {/* ⭐ NEW: Tier Selection Section */}
                        <section className="mb-10">
                            <h2 className="text-xl font-bold mb-2">Select Battle Tier</h2>
                            <p className="text-sm text-gray-400 mb-6">Choose the tier for your battle token</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Test Tier Button */}
                                <button
                                    type="button"
                                    onClick={() => setSelectedTier(BattleTier.Test)}
                                    className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left ${selectedTier === BattleTier.Test
                                            ? 'border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/20'
                                            : 'border-bonk-border bg-bonk-card hover:border-yellow-500/50 hover:bg-yellow-500/5'
                                        }`}
                                >
                                    {/* Selected indicator */}
                                    {selectedTier === BattleTier.Test && (
                                        <div className="absolute top-3 right-3">
                                            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-3xl">🧪</span>
                                        <div>
                                            <h3 className="text-xl font-bold text-yellow-500">Test Tier</h3>
                                            <p className="text-sm text-gray-400">Perfect for devnet testing</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Target SOL:</span>
                                            <span className="text-white font-semibold">{TIER_CONFIG.TEST.TARGET_SOL} SOL</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Victory Volume:</span>
                                            <span className="text-yellow-500 font-semibold">{TIER_CONFIG.TEST.VICTORY_VOLUME_SOL} SOL</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Qualification:</span>
                                            <span className="text-white font-semibold">{TIER_CONFIG.TEST.QUALIFICATION_SOL} SOL</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Est. Final MC:</span>
                                            <span className="text-white font-semibold">~${TIER_CONFIG.TEST.ESTIMATED_MC_FINAL_USD}</span>
                                        </div>
                                    </div>
                                </button>

                                {/* Production Tier Button */}
                                <button
                                    type="button"
                                    onClick={() => setSelectedTier(BattleTier.Production)}
                                    className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left ${selectedTier === BattleTier.Production
                                            ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                                            : 'border-bonk-border bg-bonk-card hover:border-green-500/50 hover:bg-green-500/5'
                                        }`}
                                >
                                    {/* Selected indicator */}
                                    {selectedTier === BattleTier.Production && (
                                        <div className="absolute top-3 right-3">
                                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="text-3xl">🚀</span>
                                        <div>
                                            <h3 className="text-xl font-bold text-green-500">Production Tier</h3>
                                            <p className="text-sm text-gray-400">For mainnet battles</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Target SOL:</span>
                                            <span className="text-white font-semibold">{TIER_CONFIG.PRODUCTION.TARGET_SOL} SOL</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Victory Volume:</span>
                                            <span className="text-green-500 font-semibold">{TIER_CONFIG.PRODUCTION.VICTORY_VOLUME_SOL} SOL</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Qualification:</span>
                                            <span className="text-white font-semibold">{TIER_CONFIG.PRODUCTION.QUALIFICATION_SOL} SOL</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Est. Final MC:</span>
                                            <span className="text-white font-semibold">~${TIER_CONFIG.PRODUCTION.ESTIMATED_MC_FINAL_USD.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Selected Tier Info Banner */}
                            <div className={`mt-4 p-4 rounded-lg border ${selectedTier === BattleTier.Test
                                    ? 'bg-yellow-500/10 border-yellow-500/30'
                                    : 'bg-green-500/10 border-green-500/30'
                                }`}>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{selectedTier === BattleTier.Test ? '🧪' : '🚀'}</span>
                                    <span className={`font-bold ${selectedTier === BattleTier.Test ? 'text-yellow-500' : 'text-green-500'}`}>
                                        {selectedTier === BattleTier.Test ? 'Test' : 'Production'} Tier Selected
                                    </span>
                                </div>
                                <p className="text-sm text-gray-300 mt-1">
                                    {selectedTier === BattleTier.Test
                                        ? `Lower thresholds for quick testing. Reach ${TIER_CONFIG.TEST.TARGET_SOL} SOL + ${TIER_CONFIG.TEST.VICTORY_VOLUME_SOL} SOL volume to win!`
                                        : `Full thresholds for real battles. Reach ${TIER_CONFIG.PRODUCTION.TARGET_SOL} SOL + ${TIER_CONFIG.PRODUCTION.VICTORY_VOLUME_SOL} SOL volume to win!`
                                    }
                                </p>
                            </div>
                        </section>

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
                                        className="w-full bg-bonk-card border border-bonk-border rounded-lg px-4 py-3 text-white focus:border-bonk-green focus:outline-none"
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
                                        className="w-full bg-bonk-card border border-bonk-border rounded-lg px-4 py-3 text-white focus:border-bonk-green focus:outline-none"
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
                                    className="w-full bg-bonk-card border border-bonk-border rounded-lg px-4 py-3 text-white focus:border-bonk-green focus:outline-none resize-none"
                                    rows={4}
                                    placeholder="Write a short description"
                                />
                            </div>
                        </section>

                        <section className="mt-10">
                            <h2 className="text-xl font-bold mb-2">Battle Information</h2>
                            <p className="text-sm text-gray-400 mb-6">How BONK Battle tokens work</p>

                            <div className={`rounded-xl p-6 space-y-4 border ${selectedTier === BattleTier.Test
                                    ? 'bg-yellow-500/10 border-yellow-500/30'
                                    : 'bg-green-500/10 border-green-500/30'
                                }`}>
                                <div className="flex gap-3 items-start">
                                    <div className="text-2xl">🎮</div>
                                    <div>
                                        <div className={`font-bold mb-2 ${selectedTier === BattleTier.Test ? 'text-yellow-500' : 'text-green-500'}`}>
                                            {selectedTier === BattleTier.Test ? '🧪 Test Tier' : '🚀 Production Tier'} Battle Flow
                                        </div>
                                        <div className="text-sm text-gray-300 space-y-2">
                                            <div>├─ <strong>Created:</strong> Your token starts here</div>
                                            <div>├─ <strong>Qualified:</strong> {currentTierConfig.QUALIFICATION_SOL} SOL collected to qualify</div>
                                            <div>├─ <strong>In Battle:</strong> Fight another token! Winner takes loser&apos;s liquidity</div>
                                            <div>├─ <strong>Victory:</strong> Reach {currentTierConfig.TARGET_SOL} SOL + {currentTierConfig.VICTORY_VOLUME_SOL} SOL volume</div>
                                            <div>└─ <strong>Listed:</strong> Winner gets permanent Raydium DEX listing!</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 items-start pt-4 border-t border-white/10">
                                    <div className="text-2xl">⚔️</div>
                                    <div>
                                        <div className="text-gray-300 text-sm">
                                            <p><strong>Bonding Curve:</strong> Constant product (xy=k) like Pump.fun</p>
                                            <p className="mt-1"><strong>Platform Fee:</strong> 2% on sells</p>
                                            <p className="mt-1"><strong>Target SOL:</strong> {currentTierConfig.TARGET_SOL} SOL to reach victory</p>
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
                                className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${isDragOver ? 'border-bonk-green bg-bonk-green/10' : 'border-bonk-border hover:border-bonk-green hover:bg-bonk-green/5'}`}
                            >
                                <div className="text-6xl mb-4 opacity-70">🖼️</div>
                                <div className="text-lg font-semibold mb-2">{imageFile ? imageFile.name : 'Select image to upload'}</div>
                                <div className="text-sm text-gray-400 mb-6">or drag and drop it here</div>
                                <button type="button" className="bg-bonk-orange-dark text-black px-8 py-3 rounded-lg font-semibold hover:bg-bonk-orange-dark/90 transition-colors">
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
                            className={`mt-10 w-full max-w-xs px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 disabled:cursor-not-allowed ${selectedTier === BattleTier.Test
                                    ? 'bg-yellow-500 text-black hover:bg-yellow-400 disabled:bg-bonk-border'
                                    : 'bg-green-500 text-black hover:bg-green-400 disabled:bg-bonk-border'
                                }`}
                        >
                            {isCreating ? 'Creating Coin...' : `Create ${selectedTier === BattleTier.Test ? '🧪 Test' : '🚀 Production'} Coin`}
                        </button>
                    </form>
                </div>
            </div>
            <MobileBottomNav />
        </div>
    );
}