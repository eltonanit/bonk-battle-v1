// src/hooks/useTokenUpvotes.ts
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';

export function useTokenUpvotes(tokenMint: string) {
    const { publicKey } = useWallet();
    const [upvotes, setUpvotes] = useState<number>(0);
    const [downvotes, setDownvotes] = useState<number>(0);
    const [userVote, setUserVote] = useState<number | null>(null); // 1, -1, or null
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tokenMint) return;

        fetchVotes();
        subscribeToVotes();
    }, [tokenMint, publicKey]);

    async function fetchVotes() {
        try {
            // Get all votes for this token
            const { data: votes, error } = await supabase
                .from('token_upvotes')
                .select('vote_type, wallet_address')
                .eq('token_mint', tokenMint);

            if (error) throw error;

            // Count upvotes and downvotes
            const ups = votes?.filter(v => v.vote_type === 1).length || 0;
            const downs = votes?.filter(v => v.vote_type === -1).length || 0;

            setUpvotes(ups);
            setDownvotes(downs);

            // Check user's vote
            if (publicKey) {
                const userVoteData = votes?.find(v => v.wallet_address === publicKey.toString());
                setUserVote(userVoteData?.vote_type || null);
            }
        } catch (error) {
            console.error('Failed to fetch votes:', error);
        }
        setLoading(false);
    }

    function subscribeToVotes() {
        const channel = supabase
            .channel(`votes:${tokenMint}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'token_upvotes',
                    filter: `token_mint=eq.${tokenMint}`,
                },
                () => {
                    fetchVotes();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }

    async function vote(voteType: 1 | -1) {
        if (!publicKey) {
            alert('Please connect your wallet to vote');
            return;
        }

        try {
            // 1. Upsert vote
            const { error } = await supabase
                .from('token_upvotes')
                .upsert({
                    token_mint: tokenMint,
                    wallet_address: publicKey.toString(),
                    vote_type: voteType,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'token_mint,wallet_address',
                });

            if (error) throw error;

            // 2. ⭐ NUOVO: Se upvote (non downvote), invia notifica al creator
            if (voteType === 1) {
                await sendUpvoteNotification();
            }

            // Update local state
            setUserVote(voteType);
        } catch (error) {
            console.error('Failed to vote:', error);
            alert('Failed to vote. Please try again.');
        }
    }

    // ⭐ NUOVA FUNZIONE: Invia notifica al creator
    async function sendUpvoteNotification() {
        try {
            // Get token info (name + creator)
            const { data: tokenData } = await supabase
                .from('token_metadata')
                .select('name, creator')
                .eq('mint', tokenMint)
                .single();

            if (!tokenData) return;

            // Don't notify yourself
            if (tokenData.creator === publicKey?.toString()) return;

            // Create notification
            await supabase
                .from('notifications')
                .insert({
                    wallet_address: tokenData.creator,
                    token_launch_id: tokenMint,
                    type: 'upvote', // ⭐ NUOVO TYPE: singular
                    title: '👍 New upvote!',
                    message: `${publicKey!.toString().slice(0, 4)}...${publicKey!.toString().slice(-4)} upvoted your ${tokenData.name}`,
                    metadata: {
                        voter: publicKey!.toString(),
                        tokenMint: tokenMint,
                        tokenName: tokenData.name,
                    },
                });
        } catch (error) {
            console.error('Failed to send upvote notification:', error);
            // Non bloccare l'upvote se notifica fallisce
        }
    }

    async function removeVote() {
        if (!publicKey) return;

        try {
            const { error } = await supabase
                .from('token_upvotes')
                .delete()
                .eq('token_mint', tokenMint)
                .eq('wallet_address', publicKey.toString());

            if (error) throw error;

            setUserVote(null);
        } catch (error) {
            console.error('Failed to remove vote:', error);
        }
    }

    const netVotes = upvotes - downvotes;

    return {
        upvotes,
        downvotes,
        netVotes,
        userVote,
        loading,
        vote,
        removeVote,
    };
}

export function formatVotes(votes: number): string {
    if (votes >= 1_000_000) return `${(votes / 1_000_000).toFixed(1)}M`;
    if (votes >= 1_000) return `${(votes / 1_000).toFixed(1)}k`;
    return votes.toString();
}