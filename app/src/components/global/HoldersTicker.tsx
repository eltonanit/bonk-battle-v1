// components/global/HoldersTicker.tsx
'use client';

import { useEffect, useState } from 'react';
import { fetchAllTokens } from '@/lib/solana/fetch-all-tokens';
import { fetchTokenHolders } from '@/lib/solana/fetch-token-holders';
import Link from 'next/link';
import Image from 'next/image';

interface HolderEvent {
    mint: string;
    tokenName: string;
    tokenSymbol: string;
    tokenImage?: string;
    holders: number;
    tier: number;
}

const HOLDER_COLORS = [
    '#10b981', // Verde
    '#3b82f6', // Blu
    '#8b5cf6', // Viola
];

export function HoldersTicker() {
    const [holderEvents, setHolderEvents] = useState<HolderEvent[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [shake, setShake] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load tokens and fetch holders count
    useEffect(() => {
        async function loadTokensWithHolders() {
            try {
                const allTokens = await fetchAllTokens();

                if (allTokens.length === 0) {
                    setLoading(false);
                    return;
                }

                // Fetch holders per ogni token (top 15)
                const topTokens = allTokens.slice(0, 15);
                const events: HolderEvent[] = [];

                for (const token of topTokens) {
                    const holders = await fetchTokenHolders(token.mint.toString());

                    // Solo se ha almeno 1 holder
                    if (holders > 0) {
                        events.push({
                            mint: token.mint.toString(),
                            tokenName: token.name,
                            tokenSymbol: token.symbol,
                            tokenImage: token.imageUrl,
                            holders,
                            tier: token.tier,
                        });
                    }
                }

                // Sort per holders (desc)
                events.sort((a, b) => b.holders - a.holders);

                setHolderEvents(events);
            } catch (error) {
                console.error('Error loading holders ticker:', error);
            } finally {
                setLoading(false);
            }
        }

        loadTokensWithHolders();
    }, []);

    // Auto-rotate ticker
    useEffect(() => {
        if (holderEvents.length === 0) return;

        const interval = setInterval(() => {
            setShake(true);
            setCurrentIndex((prev) => (prev + 1) % holderEvents.length);
            setTimeout(() => setShake(false), 600);
        }, 5000);

        return () => clearInterval(interval);
    }, [holderEvents.length]);

    if (loading) {
        return (
            <div className="w-full px-4 lg:px-6 py-3">
                <div
                    className="px-5 py-3 font-bold text-sm text-black animate-pulse truncate"
                    style={{ backgroundColor: '#10b981', borderRadius: 0 }}
                >
                    Loading holders...
                </div>
            </div>
        );
    }

    if (holderEvents.length === 0) {
        return null;
    }

    const event = holderEvents[currentIndex];
    const color = HOLDER_COLORS[currentIndex % HOLDER_COLORS.length];

    return (
        <div className="mb-4 lg:mb-0">
            <div className="px-4 lg:px-6 py-2">
                <Link
                    href={'/token/' + event.mint}
                    className={`flex items-center gap-1.5 px-2 py-1 text-sm text-black hover:opacity-90 transition-opacity cursor-pointer ${shake ? 'fomo-shake' : ''
                        }`}
                    style={{
                        backgroundColor: color,
                        borderRadius: 0,
                    }}
                >
                    {/* Token Image */}
                    {event.tokenImage && (
                        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-white/20 border-2 border-black/10">
                            <Image
                                src={event.tokenImage}
                                alt={event.tokenSymbol}
                                width={28}
                                height={28}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    {/* Text */}
                    <span className="whitespace-nowrap font-bold">
                        <span className="hidden lg:inline">
                            👥 {event.tokenSymbol} has {event.holders} holders
                        </span>
                        <span className="lg:hidden">
                            👥 {event.tokenSymbol}: {event.holders} holders
                        </span>
                    </span>

                    {/* Arrow */}
                    <span className="hidden lg:inline font-bold">→ JOIN NOW!</span>
                </Link>
            </div>

            <style jsx>{`
        .fomo-shake {
          animation: shake 0.6s;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
        </div>
    );
}