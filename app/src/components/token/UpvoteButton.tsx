// src/components/token/UpvoteButton.tsx
'use client';

import { useTokenUpvotes, formatVotes } from '@/hooks/useTokenUpvotes';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';

interface UpvoteButtonProps {
    tokenMint: string;
    creatorAddress: string; // ⭐ AGGIUNTO
}

export function UpvoteButton({ tokenMint, creatorAddress }: UpvoteButtonProps) {
    const { publicKey } = useWallet();
    const { netVotes, userVote, vote, removeVote } = useTokenUpvotes(tokenMint);

    // ⭐ CHECK: Se sei il creator, non puoi votare
    const isCreator = publicKey && publicKey.toString() === creatorAddress;

    const handleUpvote = () => {
        if (isCreator) {
            alert('🚫 You cannot upvote your own token!');
            return;
        }
        if (userVote === 1) {
            removeVote();
        } else {
            vote(1);
        }
    };

    const handleDownvote = () => {
        if (isCreator) {
            alert('🚫 You cannot downvote your own token!');
            return;
        }
        if (userVote === -1) {
            removeVote();
        } else {
            vote(-1);
        }
    };

    return (
        <div className="flex flex-col items-center gap-1">
            {/* Upvote button */}
            <button
                onClick={handleUpvote}
                disabled={!!isCreator}                className={`p-2 rounded-lg transition-all ${isCreator
                        ? 'opacity-30 cursor-not-allowed'
                        : 'hover:scale-110'
                    } ${userVote === 1
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/5 text-gray-400 hover:text-green-400'
                    }`}
            >
                <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M10 3l6 8H4l6-8z" />
                </svg>
            </button>

            {/* Vote count + STONKS label */}
            <div className="flex flex-col items-center">
                <div className="text-lg font-bold text-white">
                    {formatVotes(Math.abs(netVotes))}
                </div>
                <Link
                    href="/how-it-works#upvotes"
                    className="text-xs text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-1"
                >
                    STONKS
                    <span className="text-purple-400">(?)</span>
                </Link>
                <div className="text-xs text-gray-500">VOTE</div>
            </div>

            {/* Downvote button */}
            <button
                onClick={handleDownvote}
                disabled={!!isCreator}                className={`p-2 rounded-lg transition-all ${isCreator
                        ? 'opacity-30 cursor-not-allowed'
                        : 'hover:scale-110'
                    } ${userVote === -1
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-white/5 text-gray-400 hover:text-red-400'
                    }`}
            >
                <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M10 17l-6-8h12l-6 8z" />
                </svg>
            </button>
        </div>
    );
}