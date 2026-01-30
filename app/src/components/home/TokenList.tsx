// =================================================================
// FILE: app/src/components/home/TokenList.tsx
// POTENTIALS.FUN - Token List Component
// =================================================================

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TokenListItem } from './TokenListItem';
import { usePriceOracle } from '@/hooks/usePriceOracle';

type TabType = 'new' | 'potential' | 'graduated';

interface Token {
  mint: string;
  symbol: string;
  name: string;
  image?: string;
  tokens_sold: number;
  sol_collected: number;
  total_trade_volume: number;
  multiplier: number;
  battle_status: number;
  created_at: string;
}

interface TokenListProps {
  activeTab: TabType;
}

// Constants for bonding curve (from tier-config)
const TARGET_SOL = 0.103; // ~0.103 SOL for graduation
const TOTAL_SUPPLY = 1e18;

// Calculate POTENTIAL based on % bought and multiplier
function calculatePotential(tokensSold: number, multiplier: number = 1): number {
  const percentBought = (tokensSold / TOTAL_SUPPLY) * 100;
  const safePct = Math.min(percentBought, 99.9);
  const base = 100 / (100 - safePct);
  return Math.pow(base, 2) * multiplier;
}

// Calculate progress percentage
function calculateProgress(solCollected: number): number {
  return Math.min((solCollected / TARGET_SOL) * 100, 100);
}

export function TokenList({ activeTab }: TokenListProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const { solPriceUsd } = usePriceOracle();

  useEffect(() => {
    async function fetchTokens() {
      setLoading(true);

      try {
        let query = supabase
          .from('tokens')
          .select('*')
          .eq('network', 'mainnet');

        // Filter based on tab
        switch (activeTab) {
          case 'new':
            // New tokens: Created or Active, sorted by newest
            query = query
              .in('battle_status', [0, 1])
              .order('created_at', { ascending: false });
            break;

          case 'potential':
            // Potential: Created or Active, sorted by tokens_sold (higher = more potential)
            query = query
              .in('battle_status', [0, 1])
              .order('tokens_sold', { ascending: false });
            break;

          case 'graduated':
            // Graduated: Listed or PoolCreated
            query = query
              .in('battle_status', [4, 5])
              .order('listing_timestamp', { ascending: false });
            break;
        }

        query = query.limit(50);

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching tokens:', error);
          return;
        }

        setTokens(data || []);
      } catch (err) {
        console.error('Error in fetchTokens:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTokens();
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex flex-col pb-32">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b border-white/5 animate-pulse">
            <div className="size-20 bg-gray-800 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-800 rounded w-1/3" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
              <div className="h-1 bg-gray-800 rounded w-full mt-4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <span className="text-4xl mb-4">🪙</span>
        <p className="text-sm">No tokens found</p>
        {activeTab === 'new' && (
          <p className="text-xs mt-2">Be the first to create one!</p>
        )}
      </div>
    );
  }

  // Sort by potential if on potential tab
  let sortedTokens = [...tokens];
  if (activeTab === 'potential') {
    sortedTokens.sort((a, b) => {
      const potentialA = calculatePotential(Number(a.tokens_sold) || 0, a.multiplier || 1);
      const potentialB = calculatePotential(Number(b.tokens_sold) || 0, b.multiplier || 1);
      return potentialB - potentialA;
    });
  }

  return (
    <div className="flex flex-col pb-32">
      {sortedTokens.map(token => {
        const solCollected = Number(token.sol_collected) / 1e9 || 0;
        const volumeSol = Number(token.total_trade_volume) / 1e9 || 0;
        const price = solPriceUsd || 180;

        return (
          <TokenListItem
            key={token.mint}
            mint={token.mint}
            symbol={token.symbol || 'UNK'}
            name={token.name || token.symbol || 'Unknown Token'}
            image={token.image}
            potential={calculatePotential(Number(token.tokens_sold) || 0, token.multiplier || 1)}
            multiplier={token.multiplier || 1}
            marketCap={solCollected * price}
            volume={volumeSol * price}
            progress={calculateProgress(solCollected)}
            solPriceUsd={price}
          />
        );
      })}
    </div>
  );
}

export default TokenList;
