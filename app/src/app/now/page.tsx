// =================================================================
// FILE: app/src/app/now/page.tsx
// NOW PAGE - "Where can I get in before everyone else?"
// Anti-FOMO: least bought tokens, less hype, lower price
// =================================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

interface OpportunityToken {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  marketCapUsd: number;
  priceUsd: number;
  solCollected: number;
  tradeCount: number;
  holders: number;
  createdAgo: string;
  opportunityScore: number; // Higher = better opportunity
}

export default function NowPage() {
  const [tokens, setTokens] = useState<OpportunityToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'opportunity' | 'lowMC' | 'newest'>('opportunity');

  useEffect(() => {
    async function fetchOpportunities() {
      try {
        const res = await fetch('/api/now');
        if (res.ok) {
          const data = await res.json();
          setTokens(data.tokens || []);
        }
      } catch (err) {
        console.error('Error fetching opportunities:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOpportunities();
    const interval = setInterval(fetchOpportunities, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Sort tokens based on selected criteria
  const sortedTokens = [...tokens].sort((a, b) => {
    if (sortBy === 'opportunity') return b.opportunityScore - a.opportunityScore;
    if (sortBy === 'lowMC') return a.marketCapUsd - b.marketCapUsd;
    return 0; // newest - already sorted by API
  });

  const formatMC = (mc: number): string => {
    if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
    if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K`;
    return `$${mc.toFixed(0)}`;
  };

  const formatPrice = (price: number): string => {
    if (price === 0) return '$0.00';
    if (price < 0.000001) return `$${price.toExponential(2)}`;
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-bonk-dark text-white overflow-x-hidden">
      <Sidebar />
      <Header />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-12 max-w-full">
        <div className="px-5 lg:px-6 py-6">

          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-1.5 mb-4">
              <span className="text-orange-400 text-sm font-semibold">⚡ ANTI-FOMO</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3">
              NOW
            </h1>
            <p className="text-xl text-gray-400 max-w-xl mx-auto">
              Where can I get in <span className="text-orange-400 font-bold">before everyone else</span>?
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto">
            <div className="bg-[#0a1628] border border-[#1e3a5a] rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🎯</div>
              <div className="text-sm font-semibold text-white">Least Bought</div>
              <div className="text-xs text-gray-500">Low trading activity</div>
            </div>
            <div className="bg-[#0a1628] border border-[#1e3a5a] rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">💎</div>
              <div className="text-sm font-semibold text-white">Low MC</div>
              <div className="text-xs text-gray-500">Early entry point</div>
            </div>
            <div className="bg-[#0a1628] border border-[#1e3a5a] rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">⏰</div>
              <div className="text-sm font-semibold text-white">Timing = Skill</div>
              <div className="text-xs text-gray-500">Be early, not late</div>
            </div>
          </div>

          {/* Sort Tabs */}
          <div className="flex justify-center mb-6">
            <div className="flex bg-[#0a1628] border border-[#1e3a5a] rounded-xl p-1">
              <button
                onClick={() => setSortBy('opportunity')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  sortBy === 'opportunity'
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Best Opportunity
              </button>
              <button
                onClick={() => setSortBy('lowMC')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  sortBy === 'lowMC'
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Lowest MC
              </button>
              <button
                onClick={() => setSortBy('newest')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  sortBy === 'newest'
                    ? 'bg-white text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Newest
              </button>
            </div>
          </div>

          {/* Token List */}
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Scanning for opportunities...</p>
              </div>
            ) : sortedTokens.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-gray-400">No opportunities found yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedTokens.map((token, index) => (
                  <Link
                    key={token.mint}
                    href={`/token/${token.mint}`}
                    className="block bg-[#0a1628] border border-[#1e3a5a] rounded-xl p-4 hover:border-orange-500/50 hover:bg-[#0a1628]/80 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="w-8 text-center">
                        <span className={`text-lg font-bold ${
                          index === 0 ? 'text-orange-400' :
                          index === 1 ? 'text-orange-300' :
                          index === 2 ? 'text-orange-200' :
                          'text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                      </div>

                      {/* Token Image */}
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1e3a5a] flex-shrink-0">
                        {token.image ? (
                          <Image
                            src={token.image}
                            alt={token.symbol}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-500">
                            {token.symbol.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Token Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-orange-400 transition-colors truncate">
                            {token.name}
                          </span>
                          <span className="text-xs text-gray-500">{token.symbol}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span>{token.createdAgo}</span>
                          <span>•</span>
                          <span>{token.tradeCount} trades</span>
                          <span>•</span>
                          <span>{token.holders} holders</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right">
                        <div className="text-white font-bold">{formatMC(token.marketCapUsd)}</div>
                        <div className="text-xs text-gray-500">{formatPrice(token.priceUsd)}</div>
                      </div>

                      {/* Opportunity Score */}
                      <div className="w-20 text-right">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                          token.opportunityScore >= 80 ? 'bg-green-500/20 text-green-400' :
                          token.opportunityScore >= 60 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          <span>⚡</span>
                          <span>{token.opportunityScore}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>Rankings change in real-time with every purchase</p>
            <p className="text-orange-400 font-semibold mt-1">Timing is everything ⚡</p>
          </div>

        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
