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
import { createBattleToken, TIER_CONFIG } from '@/lib/solana/create-battle-token';
import { TransactionSuccessPopup } from '@/components/shared/TransactionSuccessPopup';
import { PointsNotification } from '@/components/shared/PointsNotification';
import { addPointsForCreateToken, POINTS_VALUES } from '@/lib/points';

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

    // Points notification state
    const [showPointsNotification, setShowPointsNotification] = useState(false);
    const [createdTokenImage, setCreatedTokenImage] = useState<string>('');

    // Fixed tier config (Production - no selector needed)
    const currentTierConfig = TIER_CONFIG.PRODUCTION;

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

            // ⭐ SYNC TOKEN IMMEDIATELY after creation
            // This ensures DB has correct data before redirect
            try {
                console.log('🔄 Syncing token to database...');
                const syncRes = await fetch(`/api/sync-token/${result.mint.toString()}`);
                const syncData = await syncRes.json();
                if (syncData.success) {
                    console.log('✅ Token synced successfully!');
                } else {
                    console.warn('⚠️ Token sync failed:', syncData.error);
                }
            } catch (syncErr) {
                console.warn('⚠️ Token sync error:', syncErr);
            }

            // Save creator to database
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

            // Add points for creating token
            try {
                const pointsResult = await addPointsForCreateToken(
                    publicKey.toBase58(),
                    result.mint.toString(),
                    symbol,
                    imageUrl
                );

                if (pointsResult.success) {
                    console.log(`🎯 Added ${pointsResult.pointsAdded} points for creating token`);
                    setCreatedTokenImage(imageUrl);
                    setShowPointsNotification(true);
                }
            } catch (err) {
                console.warn('⚠️ Error adding points:', err);
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

            {/* Points Notification */}
            <PointsNotification
                show={showPointsNotification}
                points={POINTS_VALUES.create_token}
                message="You created a new coin"
                tokenImage={createdTokenImage}
                onClose={() => setShowPointsNotification(false)}
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
                        {/* Token Details Section */}
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

                        {/* Battle Information Section */}
                        <section className="mt-10">
                            <h2 className="text-xl font-bold mb-2">Battle Information</h2>
                            <p className="text-sm text-gray-400 mb-6">How BONK Battle tokens work</p>

                            <div className="rounded-xl p-6 space-y-4 border bg-green-500/10 border-green-500/30">
                                <div className="flex gap-3 items-start">
                                    <div className="text-2xl">🎮</div>
                                    <div>
                                        <div className="font-bold mb-2 text-green-500">
                                            🚀 Battle Flow
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
                                            <p className="mt-1"><strong>Platform Fee:</strong> 2% on trades</p>
                                            <p className="mt-1"><strong>Target SOL:</strong> {currentTierConfig.TARGET_SOL} SOL to reach victory</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Image Upload Section */}
                        <section className="mt-10">
                            <h2 className="text-xl font-bold mb-6">Add image</h2>

                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('fileInput')?.click()}
                                className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all ${isDragOver ? 'border-bonk-green bg-bonk-green/10' : 'border-bonk-border hover:border-bonk-green hover:bg-bonk-green/5'}`}
                            >
                                {imageFile && imageFile.type.startsWith('image/') ? (
                                    // Show image preview
                                    <div className="flex flex-col items-center">
                                        <img
                                            src={URL.createObjectURL(imageFile)}
                                            alt="Preview"
                                            className="w-32 h-32 object-cover rounded-xl mb-4 border-2 border-bonk-border"
                                        />
                                        <div className="text-lg font-semibold mb-2 text-green-400">{imageFile.name}</div>
                                        <div className="text-sm text-gray-400 mb-4">Click to change image</div>
                                    </div>
                                ) : (
                                    // Default upload UI
                                    <>
                                        <div className="text-6xl mb-4 opacity-70">🖼️</div>
                                        <div className="text-lg font-semibold mb-2">{imageFile ? imageFile.name : 'Select image to upload'}</div>
                                        <div className="text-sm text-gray-400 mb-6">or drag and drop it here</div>
                                    </>
                                )}
                                <button type="button" className="bg-bonk-orange-dark text-black px-8 py-3 rounded-lg font-semibold hover:bg-bonk-orange-dark/90 transition-colors">
                                    {imageFile ? 'Change file' : 'Select file'}
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isCreating || !publicKey}
                            className="mt-10 w-full max-w-xs px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 disabled:cursor-not-allowed bg-green-500 text-black hover:bg-green-400 disabled:bg-bonk-border"
                        >
                            {isCreating ? 'Creating Coin...' : 'Create 🚀 Coin'}
                        </button>
                    </form>
                </div>
            </div>
            <MobileBottomNav />
        </div>
    );
}