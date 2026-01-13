/**
 * ========================================================================
 * BONK BATTLE - HOLDERS TICKER (OPTIMIZED)
 * ========================================================================
 *
 * BEFORE: fetchAllTokens() + fetchTokenHolders() for each = RPC nightmare
 * AFTER: Supabase queries = 0 RPC calls
 *
 * ========================================================================
 */

'use client';

import { useEffect, useState } from 'react';
import { fetchHotTokens } from '@/lib/supabase/fetch-tokens';
import { fetchBatchHolders } from '@/lib/supabase/fetch-holders';
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

  // Load tokens and fetch holders count (SUPABASE - NO RPC!)
  useEffect(() => {
    async function loadTokensWithHolders() {
      try {
        // Fetch top 15 tokens from Supabase
        const tokens = await fetchHotTokens(15);

        if (tokens.length === 0) {
          setLoading(false);
          return;
        }

        // Get all mints
        const mints = tokens.map((t) => t.mint);

        // Batch fetch holders (single Supabase query!)
        const holdersMap = await fetchBatchHolders(mints);

        // Build events
        const events: HolderEvent[] = [];

        for (const token of tokens) {
          const holders = holdersMap.get(token.mint) || 0;

          // Solo se ha almeno 1 holder
          if (holders > 0) {
            events.push({
              mint: token.mint,
              tokenName: token.name,
              tokenSymbol: token.symbol,
              tokenImage: token.image,
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
          className={`flex items-center gap-1.5 px-2 py-1 text-sm text-black hover:opacity-90 transition-opacity cursor-pointer ${
            shake ? 'fomo-shake' : ''
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
                unoptimized
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
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }
      `}</style>
    </div>
  );
}
