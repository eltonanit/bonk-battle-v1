// src/hooks/useBatchTokenViews.ts
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface TokenViewsMap {
    [tokenMint: string]: number;
}

export function useBatchTokenViews(tokenMints: string[]) {
    const [viewsMap, setViewsMap] = useState<TokenViewsMap>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (tokenMints.length === 0) {
            setLoading(false);
            return;
        }

        async function fetchBatchViews() {
            try {
                console.log(`📊 Fetching views for ${tokenMints.length} tokens...`);

                // ✅ BATCH QUERY: Una sola query per tutti i token
                const { data, error } = await supabase
                    .from('token_views')
                    .select('token_mint')
                    .in('token_mint', tokenMints);

                if (error) {
                    console.error('Error fetching batch views:', error);
                    setLoading(false);
                    return;
                }

                // Count views per token
                const counts: TokenViewsMap = {};

                // Initialize all tokens with 0 views
                tokenMints.forEach(mint => {
                    counts[mint] = 0;
                });

                // Count actual views
                if (data) {
                    data.forEach(row => {
                        counts[row.token_mint] = (counts[row.token_mint] || 0) + 1;
                    });
                }

                console.log(`✅ Loaded views for ${Object.keys(counts).length} tokens`);
                setViewsMap(counts);
                setLoading(false);

            } catch (err) {
                console.error('Failed to fetch batch views:', err);
                setLoading(false);
            }
        }

        fetchBatchViews();

        // Refetch every 30 seconds (lighter than real-time subscriptions)
        const interval = setInterval(fetchBatchViews, 30000);

        return () => clearInterval(interval);
    }, [tokenMints.join(',')]); // Re-run when token list changes

    return { viewsMap, loading };
}

// Format views YouTube-style (same as useTokenViews)
export function formatViews(views: number): string {
    if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
    if (views >= 1_000) return `${(views / 1_000).toFixed(1)}k`;
    return views.toLocaleString('en-US'); // Add comma separator
}