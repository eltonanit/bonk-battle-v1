/**
 * ========================================================================
 * BONK BATTLE - HOT TOKENS CAROUSEL (OPTIMIZED)
 * ========================================================================
 *
 * BEFORE: 15,000+ RPC calls/day
 * - fetchAllTokens() every 120s (getProgramAccounts = expensive!)
 * - connection.onLogs() WebSocket always active
 * - Re-fetch on every purchase event
 *
 * AFTER: 0 RPC calls
 * - Supabase query (free, unlimited)
 * - Supabase Realtime subscription (free)
 * - document.hidden check (no fetch when tab hidden)
 *
 * ========================================================================
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchHotTokens, FormattedToken } from '@/lib/supabase/fetch-tokens';
import Link from 'next/link';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Polling interval when tab is visible (ms)
  POLL_INTERVAL: 60_000, // 60 seconds (was 120s with RPC, can be faster now)

  // Flash animation duration (ms)
  FLASH_DURATION: 600,

  // Auto-scroll speed
  SCROLL_SPEED: 0.5,
  SCROLL_INTERVAL: 30,

  // Max tokens to display
  MAX_TOKENS: 20,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function HotTokensCarousel() {
  const [tokens, setTokens] = useState<FormattedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashingIndices, setFlashingIndices] = useState<number[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  // ============================================================================
  // FETCH TOKENS FROM SUPABASE (NO RPC!)
  // ============================================================================

  const loadTokens = useCallback(async () => {
    // Don't fetch if tab is hidden
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    try {
      const hotTokens = await fetchHotTokens(CONFIG.MAX_TOKENS);
      setTokens(hotTokens);

      if (loading) {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading hot tokens:', error);
      setLoading(false);
    }
  }, [loading]);

  // ============================================================================
  // INITIAL LOAD + POLLING
  // ============================================================================

  useEffect(() => {
    // Initial load
    loadTokens();

    // Poll every 60s (only when tab is visible)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadTokens();
      }
    }, CONFIG.POLL_INTERVAL);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        loadTokens(); // Refresh when tab becomes visible
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [loadTokens]);

  // ============================================================================
  // SUPABASE REALTIME SUBSCRIPTION (Replaces WebSocket onLogs)
  // ============================================================================

  useEffect(() => {
    // Subscribe to token updates via Supabase Realtime
    const channel = supabase
      .channel('hot-tokens-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tokens',
        },
        (payload) => {
          // Token was updated (new trade, status change, etc.)
          const updatedToken = payload.new as { mint?: string };

          // Flash effect for updated token
          setTokens((prev) => {
            const index = prev.findIndex((t) => t.mint === updatedToken.mint);
            if (index !== -1) {
              // Trigger flash
              setFlashingIndices([index]);
              setTimeout(() => setFlashingIndices([]), CONFIG.FLASH_DURATION);
            }
            return prev;
          });

          // Reload tokens to get fresh data
          loadTokens();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tokens',
        },
        () => {
          // New token created
          loadTokens();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ HotTokens: Supabase Realtime connected (0 RPC!)');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      console.log('🔌 HotTokens: Supabase Realtime disconnected');
    };
  }, [loadTokens]);

  // ============================================================================
  // AUTO-SCROLL ANIMATION
  // ============================================================================

  useEffect(() => {
    if (!scrollRef.current || isHovering) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft += CONFIG.SCROLL_SPEED;

        // Reset to start when reaching end
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        if (scrollLeft >= scrollWidth - clientWidth) {
          scrollRef.current.scrollLeft = 0;
        }
      }
    }, CONFIG.SCROLL_INTERVAL);

    return () => clearInterval(interval);
  }, [isHovering]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const formatMarketCap = (mc: number): string => {
    if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
    if (mc >= 1_000) return `$${(mc / 1_000).toFixed(2)}K`;
    return `$${mc.toFixed(2)}`;
  };

  // ============================================================================
  // RENDER: LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className="px-4 lg:px-6 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">🔥 Hot Tokens</h2>
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[260px] h-[100px] rounded-xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: EMPTY STATE
  // ============================================================================

  if (tokens.length === 0) {
    return (
      <div className="px-4 lg:px-6 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">🔥 Hot Tokens</h2>
          <p className="text-gray-400">No tokens found. Create the first one!</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: CAROUSEL
  // ============================================================================

  return (
    <div className="w-full mb-8">
      <div className="px-4 lg:px-6">
        <h2 className="text-xl font-bold mb-4">🔥 Hot Tokens</h2>
      </div>

      <style jsx>{`
        .carousel-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="w-full overflow-x-hidden">
        <div
          ref={scrollRef}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className="carousel-scroll flex gap-4 overflow-x-auto px-4 lg:px-6 pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {tokens.map((token, index) => {
            const isFlashing = flashingIndices.includes(index);

            return (
              <Link
                key={token.mint}
                href={`/token/${token.mint}`}
                className={`flex-shrink-0 w-[260px] lg:min-w-[280px] rounded-xl p-4 transition-all cursor-pointer ${
                  isFlashing
                    ? 'bg-yellow-400 border-2 border-yellow-400 scale-105 shadow-lg shadow-yellow-400/50'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
                style={{
                  transition: isFlashing ? 'all 0.6s ease' : 'all 0.2s ease',
                }}
              >
                <div className="flex gap-3">
                  {/* Token Image */}
                  <div className="flex-shrink-0">
                    {token.image ? (
                      <img
                        src={token.image}
                        alt={token.name}
                        className="w-16 h-16 rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '';
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                        💎
                      </div>
                    )}
                  </div>

                  {/* Token Info */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-bold text-base mb-1 truncate ${
                        isFlashing ? 'text-black' : 'text-white'
                      }`}
                    >
                      {token.name}
                    </div>

                    <div
                      className={`text-sm font-semibold mb-2 ${
                        isFlashing ? 'text-black' : 'text-green-400'
                      }`}
                    >
                      MC: {formatMarketCap(token.marketCapUsd)}
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className={isFlashing ? 'text-black/70' : 'text-white/60'}>
                          Progress
                        </span>
                        <span
                          className={`font-bold ${
                            isFlashing ? 'text-black' : 'text-green-400'
                          }`}
                        >
                          {token.progress.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFlashing ? 'bg-black' : 'bg-green-400'
                          }`}
                          style={{ width: `${Math.min(token.progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
