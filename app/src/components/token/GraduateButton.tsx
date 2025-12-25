'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { finalizeGraduationStep1, finalizeGraduationStep2 } from '@/lib/solana/transactions/finalize-graduation';
import { getSolscanUrl } from '@/config/solana';

interface Props {
    token: {
        mint: string;
        status: number;
        progress: number;
        solRaised: number;
        targetSol: number;
    };
    onSuccess: () => void;
}

export function GraduateButton({ token, onSuccess }: Props) {
    const { publicKey, signTransaction } = useWallet();
    const [graduating, setGraduating] = useState(false);
    const [currentStep, setCurrentStep] = useState<1 | 2 | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Only show if ReadyToGraduate (status = 1)
    if (token.status !== 1) {
        return null;
    }

    // Double check target reached
    if (token.solRaised < token.targetSol) {
        return null;
    }

    const handleGraduate = async () => {
        if (!publicKey || !signTransaction) {
            alert('Please connect your wallet');
            return;
        }

        setGraduating(true);
        setError(null);

        try {
            // STEP 1: Transfer SOL
            setCurrentStep(1);
            console.log('🚀 Starting Step 1: Transfer SOL...');
            const sig1 = await finalizeGraduationStep1(
                publicKey,
                new PublicKey(token.mint),
                signTransaction
            );
            console.log('✅ Step 1 complete:', sig1);

            // Wait a bit for state to settle
            await new Promise(resolve => setTimeout(resolve, 2000));

            // STEP 2: Mint tokens & revoke authorities
            setCurrentStep(2);
            console.log('🚀 Starting Step 2: Mint & revoke...');
            const sig2 = await finalizeGraduationStep2(
                publicKey,
                new PublicKey(token.mint),
                signTransaction
            );
            console.log('✅ Step 2 complete:', sig2);

            alert(
                `🎉 Token graduated to DEX!\n\n` +
                `Step 1 (Transfer): ${sig1}\n` +
                `Step 2 (Mint): ${sig2}\n\n` +
                `View final transaction:\n` +
                getSolscanUrl('tx', sig2)
            );

            onSuccess(); // Refresh token data

        } catch (err: unknown) {
            console.error('❌ Graduation failed:', err);

            // Type-safe error message extraction
            const errorMessage = err instanceof Error ? err.message : 'Failed to graduate token';

            setError(errorMessage);
        } finally {
            setGraduating(false);
            setCurrentStep(null);
        }
    };

    return (
        <div className="mb-6">
            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4">
                    <div className="text-sm text-red-400">{error}</div>
                </div>
            )}

            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-2xl p-6 mb-4">
                <div className="text-center mb-4">
                    <div className="text-4xl mb-2">🎉</div>
                    <div className="text-2xl font-bold text-green-400 mb-2">
                        TARGET REACHED!
                    </div>
                    <div className="text-gray-300">
                        {token.solRaised.toFixed(2)} / {token.targetSol.toFixed(2)} SOL (100%)
                    </div>
                </div>

                <div className="bg-black/30 rounded-xl p-4 mb-4">
                    <div className="text-sm text-gray-400 mb-2">📊 Graduation Distribution:</div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">To Pool (93%):</span>
                            <span className="text-white font-bold">
                                {(token.solRaised * 0.93).toFixed(2)} SOL
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Platform Fee (7%):</span>
                            <span className="text-white font-bold">
                                {(token.solRaised * 0.07).toFixed(2)} SOL
                            </span>
                        </div>
                    </div>
                </div>

                {graduating && currentStep && (
                    <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 mb-4">
                        <div className="text-center text-blue-400 font-bold">
                            {currentStep === 1 ? '⏳ Step 1/2: Transferring SOL...' : '⏳ Step 2/2: Minting tokens...'}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleGraduate}
                    disabled={graduating}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                    <div className="text-3xl mb-1">
                        {graduating ? '⏳' : '🚀'}
                    </div>
                    <div className="text-xl">
                        {graduating ? 'GRADUATING...' : 'GRADUATE TO DEX!'}
                    </div>
                    {!graduating && (
                        <div className="text-sm opacity-80 mt-2">
                            List on Meteora • Unlock Trading
                        </div>
                    )}
                </button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-gray-300">
                <div className="font-bold text-blue-400 mb-1">ℹ️ What happens next:</div>
                <ul className="space-y-1 ml-4 list-disc">
                    <li>Step 1: Transfer 7% fee + 93% to pool</li>
                    <li>Step 2: Mint 206.9M tokens + revoke authorities</li>
                    <li>Your tokens unlock automatically</li>
                    <li>Trading goes live on Meteora DEX</li>
                </ul>
            </div>
        </div>
    );
} 