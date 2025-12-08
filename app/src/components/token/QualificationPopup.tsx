// app/src/components/token/QualificationPopup.tsx
// ✅ V3 UPDATE: $10 is SUGGESTION only - any buy amount qualifies the token
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { buyToken } from '@/lib/solana/buy-token';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { Lightbulb, X } from 'lucide-react';
import { BattleReadyPopup } from '@/components/shared/BattleReadyPopup';
import { PointsNotification } from '@/components/shared/PointsNotification';
import { addPointsForBuyToken, POINTS_VALUES } from '@/lib/points';

interface QualificationPopupProps {
    mint: PublicKey;
    tokenSymbol?: string;
    tokenImage?: string;
    onQualified: () => void;
    onClose?: () => void;
}

export function QualificationPopup({ mint, tokenSymbol, tokenImage, onQualified, onClose }: QualificationPopupProps) {
    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();
    const { solPriceUsd } = usePriceOracle();

    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [solBalance, setSolBalance] = useState<number | null>(null);

    // ⚔️ BATTLE READY POPUP STATE
    const [showBattleReady, setShowBattleReady] = useState(false);

    // 🎯 POINTS NOTIFICATION STATE
    const [showPointsNotification, setShowPointsNotification] = useState(false);

    // ✅ V3: $10 is SUGGESTION only (displayed in UI)
    const suggestedUSD = 10;

    // ✅ V3: Technical minimum from contract (0.001 SOL)
    const MIN_SOL_TECHNICAL = 0.001;

    // Calculate suggested SOL for UI display
    let suggestedSOL = 0.079; // Default fallback
    if (solPriceUsd && solPriceUsd > 1) {
        suggestedSOL = suggestedUSD / solPriceUsd;
    }

    console.log('💰 Suggested SOL:', suggestedSOL.toFixed(3), 'for $', suggestedUSD, '(UI hint only)');

    // Fetch user's SOL balance
    useEffect(() => {
        if (!publicKey || !connection) return;

        connection.getBalance(publicKey).then((bal) => {
            setSolBalance(bal / 1e9);
        }).catch(console.error);
    }, [publicKey, connection]);

    const handleBuy = async () => {
        if (!publicKey || !signTransaction) {
            setError('Please connect your wallet first');
            return;
        }

        const solAmount = parseFloat(amount);

        // Validation - only technical requirements
        if (isNaN(solAmount) || solAmount <= 0) {
            setError('Please enter a valid SOL amount');
            return;
        }

        // ✅ V3: Only check technical minimum (0.001 SOL) - NO $10 USD check!
        if (solAmount < MIN_SOL_TECHNICAL) {
            setError(`Minimum buy is ${MIN_SOL_TECHNICAL} SOL`);
            return;
        }

        if (solBalance && solAmount > solBalance) {
            setError(`Insufficient balance. You have ${solBalance.toFixed(4)} SOL`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('🎯 Qualifying token with first buy...');
            console.log(`💰 Amount: ${solAmount} SOL (~$${(solAmount * (solPriceUsd || 0)).toFixed(2)})`);

            const result = await buyToken(
                publicKey,
                mint,
                solAmount,
                signTransaction
            );

            console.log('✅ Qualification buy successful!', result);

            // 🎯 Add points for buying token
            try {
                const pointsResult = await addPointsForBuyToken(
                    publicKey.toBase58(),
                    mint.toString(),
                    tokenSymbol,
                    tokenImage
                );

                if (pointsResult.success) {
                    console.log(`🎯 Added ${pointsResult.pointsAdded} points for buying token`);
                    setShowPointsNotification(true);
                }
            } catch (err) {
                console.warn('⚠️ Error adding points:', err);
            }

            // ⚔️ Show Battle Ready popup after points notification
            setTimeout(() => {
                console.log('⚔️ Showing Battle Ready popup!');
                setShowBattleReady(true);
            }, 1500); // Wait for points notification

            // ⚠️ DON'T call onQualified() here - it will unmount this component!
            // onQualified() will be called when BattleReadyPopup closes

        } catch (err) {
            console.error('❌ Qualification buy error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleBattleReadyClose = useCallback(() => {
        setShowBattleReady(false);
        // ⚔️ NOW call onQualified to refresh token state and close popup
        onQualified();
        // Close the qualification popup too
        if (onClose) onClose();
    }, [onClose, onQualified]);

    // If showing Battle Ready popup, render only that
    if (showBattleReady) {
        return (
            <>
                {/* Points Notification - shows on top */}
                <PointsNotification
                    show={showPointsNotification}
                    points={POINTS_VALUES.buy_token}
                    message="You bought a coin"
                    tokenImage={tokenImage}
                    onClose={() => setShowPointsNotification(false)}
                />
                <BattleReadyPopup
                    show={true}
                    onClose={handleBattleReadyClose}
                    tokenImage={tokenImage || ''}
                    tokenSymbol={tokenSymbol || 'TOKEN'}
                    tokenMint={mint.toString()}
                />
            </>
        );
    }

    return (
        <>
            {/* Points Notification */}
            <PointsNotification
                show={showPointsNotification}
                points={POINTS_VALUES.buy_token}
                message="You bought a coin"
                tokenImage={tokenImage}
                onClose={() => setShowPointsNotification(false)}
            />
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
                {/* ⭐ Responsive container: più piccolo su mobile, centrato su desktop */}
                <div className="w-full max-w-[420px] md:max-w-md">
                    {/* Main Card con bordo bianco - ridotto padding */}
                    <div className="relative rounded-2xl md:rounded-3xl p-[2px] bg-gradient-to-br from-white via-gray-200 to-white">
                        <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 rounded-2xl md:rounded-3xl p-4 md:p-6">

                            {/* Close Button - più piccolo */}
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>

                            {/* Title - testo più piccolo */}
                            <h1 className="text-2xl md:text-3xl font-bold text-orange-500 text-center mb-2">
                                Congratulations!
                            </h1>

                            {/* Subtitle - spacing ridotto */}
                            <p className="text-yellow-400 text-center font-medium text-sm mb-0.5">
                                Now Qualify Token for Battle
                            </p>
                            <p className="text-gray-400 text-center text-xs md:text-sm mb-4 md:mb-6">
                                Make your first buy ⚔️
                            </p>

                            {/* ✅ V3: "Suggested" instead of "Minimum" - and Balance Section */}
                            <div className="mb-3">
                                <div className="flex justify-between items-center mb-1.5 text-sm">
                                    <span className="text-gray-400">Suggested buy:</span>
                                    <div className="text-right">
                                        <span className="text-white font-semibold">
                                            {suggestedSOL.toFixed(3)} SOL
                                        </span>
                                        <span className="text-green-400 text-xs ml-1.5">
                                            (~${suggestedUSD})
                                        </span>
                                    </div>
                                </div>

                                {/* White Divider */}
                                <div className="h-[1px] bg-white/50 mb-1.5"></div>

                                <div className="flex justify-between items-center mb-2.5 text-sm">
                                    <span className="text-gray-400">Your balance:</span>
                                    <span className="text-white font-semibold">
                                        {solBalance !== null ? solBalance.toFixed(4) : '-.----'} SOL
                                    </span>
                                </div>

                                {/* Input Field - più compatto */}
                                <div className="bg-gray-800/50 border border-white rounded-xl p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-300 font-medium text-sm">SOL</span>
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-blue-600"></div>
                                    </div>
                                    <input
                                        type="text"
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            setError(null);
                                        }}
                                        className="bg-transparent text-white text-xl md:text-2xl font-semibold text-right outline-none w-24 md:w-32"
                                        placeholder="0.00"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* Error Message - più compatto */}
                            {error && (
                                <div className="mb-3 p-2.5 bg-red-900/20 border border-red-500/50 rounded-xl">
                                    <p className="text-red-400 text-xs text-center leading-tight">{error}</p>
                                </div>
                            )}

                            {/* ✅ V3: Updated info banner - any amount works */}
                            <div className="bg-green-900/20 border border-white/50 rounded-xl p-3 mb-4">
                                <div className="flex items-center gap-2 text-green-400 text-xs">
                                    <Lightbulb className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>Any buy qualifies your token for battle! ⚔️🔥</span>
                                </div>
                            </div>

                            {/* Buy Button - verde chiaro */}
                            <button
                                onClick={handleBuy}
                                disabled={loading || !publicKey || !amount || amount === '0.00' || amount === ''}
                                className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-black font-bold text-base md:text-lg py-3 md:py-4 rounded-xl transition-all shadow-lg"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4 md:h-5 md:w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    'BUY & QUALIFY'
                                )}
                            </button>

                            {/* Wallet Connection Warning - più piccolo */}
                            {!publicKey && (
                                <div className="mt-3 text-center text-xs text-yellow-400">
                                    ⚠️ Connect wallet to qualify
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}