// app/src/components/global/PotentialTicker.tsx
// POTENTIALS.FUN - Ticker showing tokens with their POTENTIAL
'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface TokenPotential {
  mint: string;
  symbol: string;
  potential: number;
  multiplier: number;
}

// Ticker colors matching the design
const TICKER_COLORS = {
  green: '#14f195',   // solana-green
  yellow: '#f9e406', // primary
  purple: '#9945ff', // solana-purple
};

// Calculate POTENTIAL based on % bought and multiplier
function calculatePotential(tokensSold: number, multiplier: number = 1): number {
  const totalSupply = 1e18; // 1 billion tokens with 9 decimals
  const percentBought = (tokensSold / totalSupply) * 100;

  // Prevent division by zero and cap at 99.9%
  const safePct = Math.min(percentBought, 99.9);
  const base = 100 / (100 - safePct);

  return Math.pow(base, 2) * multiplier;
}

export function PotentialTicker() {
  const [tokens, setTokens] = useState<TokenPotential[]>([]);
  const [loading, setLoading] = useState(true);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchTokensWithPotential() {
      try {
        // Fetch active tokens
        const { data, error } = await supabase
          .from('tokens')
          .select('mint, symbol, tokens_sold, multiplier')
          .eq('network', 'mainnet')
          .in('battle_status', [0, 1]) // Created or Active
          .order('tokens_sold', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error fetching tokens:', error);
          return;
        }

        if (data && data.length > 0) {
          const tokensWithPotential = data.map(t => ({
            mint: t.mint,
            symbol: t.symbol || 'UNK',
            potential: calculatePotential(
              Number(t.tokens_sold) || 0,
              t.multiplier || 1
            ),
            multiplier: t.multiplier || 1,
          }));

          // Sort by potential descending
          tokensWithPotential.sort((a, b) => b.potential - a.potential);
          setTokens(tokensWithPotential);
        }
      } catch (err) {
        console.error('Error in fetchTokensWithPotential:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTokensWithPotential();
    const interval = setInterval(fetchTokensWithPotential, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || tokens.length === 0) {
    return null;
  }

  // Double the tokens for infinite scroll effect
  const tickerItems = [...tokens, ...tokens];

  return (
    <div className="w-full overflow-hidden bg-black py-1.5 border-b border-white/10">
      <div
        ref={tickerRef}
        className="flex gap-8 animate-ticker whitespace-nowrap"
        style={{
          animation: 'ticker 30s linear infinite',
        }}
      >
        {tickerItems.map((token, idx) => {
          // Alternate colors
          const colorKeys = Object.keys(TICKER_COLORS) as (keyof typeof TICKER_COLORS)[];
          const colorKey = colorKeys[idx % colorKeys.length];
          const color = TICKER_COLORS[colorKey];

          return (
            <Link
              key={`${token.mint}-${idx}`}
              href={`/token/${token.mint}`}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span
                className="font-bold text-xs"
                style={{ color }}
              >
                ${token.symbol}
              </span>
              <span className="text-white text-xs">
                +{token.potential >= 1000
                  ? `${(token.potential / 1000).toFixed(1)}k`
                  : token.potential.toFixed(0)
                } Potential
              </span>
              {token.multiplier > 1 && (
                <span
                  className="text-[10px] font-bold px-1 rounded"
                  style={{
                    backgroundColor: color,
                    color: '#000'
                  }}
                >
                  {token.multiplier}x
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
