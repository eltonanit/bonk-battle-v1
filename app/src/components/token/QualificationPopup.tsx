// app/src/components/token/QualificationPopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { buyToken } from '@/lib/solana/buy-token';
import { usePriceOracle } from '@/hooks/usePriceOracle';

interface QualificationPopupProps {
    mint: PublicKey;
    onQualified: () => void;
    onClose?: () => void;
}

export function QualificationPopup({ mint, onQualified, onClose }: QualificationPopupProps) {
    const { publicKey, signTransaction } = useWallet();
    const { connection } = useConnection();
    const { solPriceUsd } = usePriceOracle();

    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [solBalance, setSolBalance] = useState<number | null>(null);

    // Calculate minimum SOL needed for $10 USD
    const minUSD = 10;
    const minSOL = solPriceUsd ? minUSD / solPriceUsd : 0.079;
    const minSOLFormatted = minSOL.toFixed(3);

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

        // Validation
        if (isNaN(solAmount) || solAmount <= 0) {
            setError('Please enter a valid SOL amount');
            return;
        }

        if (solAmount < minSOL) {
            setError(`Minimum buy is ${minSOLFormatted} SOL ($${minUSD})`);
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

            // Success message
            const usdValue = solPriceUsd ? (solAmount * solPriceUsd).toFixed(2) : '?';
            alert(
                `🎉 Token Qualified!\n\n` +
                `Your first buy: ${solAmount} SOL (~$${usdValue})\n` +
                `Your token is now eligible for battles!\n\n` +
                `Signature: ${result.signature.substring(0, 20)}...`
            );

            // Trigger callback to refresh token state
            onQualified();

            // Popup will auto-close when parent component re-renders
            // and sees battleStatus is no longer "Created"

        } catch (err) {
            console.error('❌ Qualification buy error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAmount = (value: number) => {
        setAmount(value.toString());
        setError(null);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-gradient-to-br from-bonk-card via-bonk-dark to-bonk-card border-2 border-bonk-green rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-bonk-green/20 animate-slideUp">

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-5xl mb-3 animate-bounce">🎮</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Start Battle Now!</h2>
                    <div className="text-gray-400 text-sm space-y-1">
                        <p className="font-semibold text-bonk-green">First: Qualify your token</p>
                        <p>How? Make your first buy</p>
                    </div>
                </div>

                {/* Minimum Buy Info */}
                <div className="bg-bonk-dark/50 border border-bonk-border rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Minimum buy:</span>
                        <div className="text-right">
                            <div className="text-white font-bold">{minSOLFormatted} SOL</div>
                            <div className="text-bonk-green text-xs">(${minUSD})</div>
                        </div>
                    </div>
                </div>

                {/* Balance Display */}
                {publicKey && solBalance !== null && (
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-sm text-gray-400">Your balance:</span>
                        <span className="text-sm font-bold text-white">
                            {solBalance.toFixed(4)} SOL
                        </span>
                    </div>
                )}

                {/* Amount Input */}
                <div className="relative mb-4">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value);
                            setError(null);
                        }}
                        placeholder="0.00"
                        className="w-full bg-bonk-dark border border-bonk-border rounded-lg px-4 py-3 text-white text-right text-lg focus:outline-none focus:border-bonk-green transition-colors"
                        step="0.01"
                        disabled={loading}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-gray-400 text-sm font-semibold">SOL</span>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <button
                        onClick={() => setAmount('')}
                        className="py-2 bg-bonk-dark hover:bg-bonk-border rounded-lg text-xs text-gray-400 transition-all"
                        disabled={loading}
                    >
                        Reset
                    </button>
                    {[0.1, 0.5, 1].map((val) => (
                        <button
                            key={val}
                            onClick={() => handleQuickAmount(val)}
                            className={`py-2 rounded-lg text-xs font-bold transition-all ${parseFloat(amount) === val
                                    ? 'bg-bonk-green text-black'
                                    : 'bg-bonk-dark hover:bg-bonk-border text-white'
                                }`}
                            disabled={loading}
                        >
                            {val} SOL
                        </button>
                    ))}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    </div>
                )}

                {/* Info Message */}
                <div className="mb-4 p-3 bg-bonk-green/10 border border-bonk-green/30 rounded-lg">
                    <p className="text-bonk-green text-xs text-center">
                        💡 After buying, your token will be eligible for battles!
                    </p>
                </div>

                {/* Buy Button */}
                <button
                    onClick={handleBuy}
                    disabled={loading || !publicKey || !amount}
                    className="w-full py-4 rounded-lg font-bold text-lg transition-all disabled:bg-bonk-border disabled:cursor-not-allowed bg-bonk-green hover:bg-bonk-green/90 text-black shadow-lg shadow-bonk-green/50 disabled:shadow-none"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Processing...
                        </span>
                    ) : (
                        'BUY & QUALIFY'
                    )}
                </button>

                {/* Wallet Connection Warning */}
                {!publicKey && (
                    <div className="mt-4 text-center text-sm text-yellow-500">
                        ⚠️ Please connect your wallet to qualify
                    </div>
                )}

                {/* Close hint */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="mt-4 w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                        disabled={loading}
                    >
                        Skip for now
                    </button>
                )}
            </div>
        </div>
    );
}