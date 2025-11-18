// src/hooks/useTokenViews.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useTokenViews(tokenMint: string) {
    const [views, setViews] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const fetchViews = useCallback(async () => {
        try {
            const { count, error } = await supabase
                .from('token_views')
                .select('*', { count: 'exact', head: true })
                .eq('token_mint', tokenMint);

            if (!error && count !== null) {
                setViews(count);
            }
        } catch (err) {
            console.error('Failed to fetch views:', err);
        }
        setLoading(false);
    }, [tokenMint]);

    useEffect(() => {
        if (!tokenMint) {
            setLoading(false);
            return;
        }

        fetchViews();

        // Real-time subscription (quando altri vedono il token)
        const channel = supabase
            .channel(`views:${tokenMint}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'token_views',
                    filter: `token_mint=eq.${tokenMint}`,
                },
                () => {
                    fetchViews(); // Refetch quando nuova view
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tokenMint, fetchViews]);

    return { views, loading };
}

// Format views YouTube-style
export function formatViews(views: number): string {
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}k`;
    return views.toString();
} 