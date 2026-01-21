'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import Image from 'next/image';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

type FilterType = 'all' | 'today' | 'week' | 'smallestEntry' | 'biggestMultiple';

interface VictoryStory {
  id: string;
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  tokenImage?: string;
  walletAddress: string;
  walletShort: string;
  username?: string;
  entryAmount: number; // USD
  exitAmount: number; // USD
  multiple: number; // e.g., 200864
  holdingTimeHours: number;
  entryTiming: 'Early' | 'Mid' | 'Late';
  storyLine: string;
  closedAt: number; // timestamp
  battleName?: string;
  side: 'A' | 'B';
}

// ============================================================================
// MOCK DATA (Replace with real API)
// ============================================================================

const MOCK_VICTORIES: VictoryStory[] = [
  {
    id: '1',
    tokenMint: 'abc123',
    tokenName: 'DOGE KILLER',
    tokenSymbol: 'DOGEK',
    tokenImage: '/placeholder-token.png',
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    walletShort: '7xKX...AsU',
    username: 'diamond_hands',
    entryAmount: 5,
    exitAmount: 1004320,
    multiple: 200864,
    holdingTimeHours: 72,
    entryTiming: 'Early',
    storyLine: 'Entered early. Held through volatility. Exited at victory.',
    closedAt: Date.now() - 86400000, // 1 day ago
    battleName: 'DOGE KILLER vs SHIB SLAYER',
    side: 'A',
  },
  {
    id: '2',
    tokenMint: 'def456',
    tokenName: 'MOON ROCKET',
    tokenSymbol: 'MOON',
    walletAddress: '3xYZtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgBsV',
    walletShort: '3xYZ...BsV',
    username: 'early_bird',
    entryAmount: 10,
    exitAmount: 523000,
    multiple: 52300,
    holdingTimeHours: 48,
    entryTiming: 'Early',
    storyLine: 'Spotted the opportunity. Went all in. Retired happy.',
    closedAt: Date.now() - 172800000, // 2 days ago
    battleName: 'MOON ROCKET vs MARS PROBE',
    side: 'A',
  },
  {
    id: '3',
    tokenMint: 'ghi789',
    tokenName: 'PEPE WARS',
    tokenSymbol: 'PEPEW',
    walletAddress: '9xABtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgCsW',
    walletShort: '9xAB...CsW',
    entryAmount: 2,
    exitAmount: 84000,
    multiple: 42000,
    holdingTimeHours: 24,
    entryTiming: 'Mid',
    storyLine: 'Joined mid-battle. Caught the momentum. Perfect exit.',
    closedAt: Date.now() - 3600000, // 1 hour ago
    battleName: 'PEPE WARS vs WOJAK ARMY',
    side: 'B',
  },
  {
    id: '4',
    tokenMint: 'jkl012',
    tokenName: 'SOLANA CHAD',
    tokenSymbol: 'CHAD',
    walletAddress: '5xCDtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgDsX',
    walletShort: '5xCD...DsX',
    username: 'sol_maxi',
    entryAmount: 50,
    exitAmount: 750000,
    multiple: 15000,
    holdingTimeHours: 96,
    entryTiming: 'Early',
    storyLine: 'Believed from day one. Diamond hands paid off.',
    closedAt: Date.now() - 259200000, // 3 days ago
    battleName: 'SOLANA CHAD vs ETH VIRGIN',
    side: 'A',
  },
  {
    id: '5',
    tokenMint: 'mno345',
    tokenName: 'BONK 2.0',
    tokenSymbol: 'BONK2',
    walletAddress: '1xEFtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgEsY',
    walletShort: '1xEF...EsY',
    entryAmount: 1,
    exitAmount: 25000,
    multiple: 25000,
    holdingTimeHours: 12,
    entryTiming: 'Early',
    storyLine: 'First buyer. First believer. First millionaire.',
    closedAt: Date.now() - 7200000, // 2 hours ago
    battleName: 'BONK 2.0 vs FLOKI 2.0',
    side: 'A',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatUSD(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(2)}`;
}

function formatMultiple(multiple: number): string {
  if (multiple >= 1000000) {
    return `${(multiple / 1000000).toFixed(1)}M`;
  }
  if (multiple >= 1000) {
    return `${(multiple / 1000).toFixed(0)}K`;
  }
  return multiple.toLocaleString();
}

function formatHoldingTime(hours: number): string {
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ============================================================================
// VICTORY CARD COMPONENT
// ============================================================================

function VictoryCard({ story }: { story: VictoryStory }) {
  return (
    <div className="bg-gradient-to-br from-[#1a2744] to-[#0f1a2e] border border-yellow-500/30 rounded-2xl p-5 hover:border-yellow-500/50 transition-all hover:scale-[1.02]">
      {/* Header: Token Info + Time */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1e3a5a] flex-shrink-0 ring-2 ring-yellow-500/50">
            {story.tokenImage ? (
              <Image
                src={story.tokenImage}
                alt={story.tokenSymbol}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-yellow-400">
                {story.tokenSymbol.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{story.tokenName}</h3>
            <p className="text-gray-400 text-sm">{story.tokenSymbol}</p>
          </div>
        </div>
        <span className="text-gray-500 text-sm">{formatTimeAgo(story.closedAt)}</span>
      </div>

      {/* Main Result: Entry → Exit */}
      <div className="bg-black/30 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Entry</span>
          <span className="text-gray-400 text-sm">Exit</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white text-xl font-bold">${story.entryAmount}</span>
          <span className="text-2xl">→</span>
          <span className="text-green-400 text-xl font-bold">{formatUSD(story.exitAmount)}</span>
        </div>
        <div className="text-center mt-3">
          <span className="text-yellow-400 text-3xl font-extrabold">
            +{formatMultiple(story.multiple)}x
          </span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-black/20 rounded-lg p-2.5">
          <span className="text-gray-500 block text-xs">Battle</span>
          <span className="text-white font-medium truncate block">{story.battleName || 'Unknown'}</span>
        </div>
        <div className="bg-black/20 rounded-lg p-2.5">
          <span className="text-gray-500 block text-xs">Side</span>
          <span className={`font-bold ${story.side === 'A' ? 'text-blue-400' : 'text-red-400'}`}>
            Token {story.side}
          </span>
        </div>
        <div className="bg-black/20 rounded-lg p-2.5">
          <span className="text-gray-500 block text-xs">Holding Time</span>
          <span className="text-white font-medium">{formatHoldingTime(story.holdingTimeHours)}</span>
        </div>
        <div className="bg-black/20 rounded-lg p-2.5">
          <span className="text-gray-500 block text-xs">Entry Timing</span>
          <span className={`font-medium ${
            story.entryTiming === 'Early' ? 'text-green-400' :
            story.entryTiming === 'Mid' ? 'text-yellow-400' :
            'text-orange-400'
          }`}>
            {story.entryTiming}
          </span>
        </div>
      </div>

      {/* Story Line */}
      <div className="border-t border-white/10 pt-3">
        <p className="text-gray-300 text-sm italic">"{story.storyLine}"</p>
      </div>

      {/* User */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-xs font-bold text-black">
            {story.username ? story.username.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="text-gray-400 text-sm">
            {story.username || story.walletShort}
          </span>
        </div>
        <Link
          href={`/token/${story.tokenMint}`}
          className="text-yellow-400 text-sm hover:text-yellow-300 transition-colors"
        >
          View Token →
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function TopWinsPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [stories, setStories] = useState<VictoryStory[]>(MOCK_VICTORIES);

  // Filter stories based on selected filter
  useEffect(() => {
    let filtered = [...MOCK_VICTORIES];

    switch (filter) {
      case 'today':
        const today = Date.now() - 86400000;
        filtered = filtered.filter(s => s.closedAt >= today);
        break;
      case 'week':
        const weekAgo = Date.now() - 604800000;
        filtered = filtered.filter(s => s.closedAt >= weekAgo);
        break;
      case 'smallestEntry':
        filtered = filtered.sort((a, b) => a.entryAmount - b.entryAmount);
        break;
      case 'biggestMultiple':
        filtered = filtered.sort((a, b) => b.multiple - a.multiple);
        break;
      default:
        filtered = filtered.sort((a, b) => b.closedAt - a.closedAt);
    }

    setStories(filtered);
  }, [filter]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'smallestEntry', label: 'Smallest Entry' },
    { key: 'biggestMultiple', label: 'Biggest Multiple' },
  ];

  return (
    <div className="min-h-screen bg-bonk-dark">
      {/* FOMO Ticker - Desktop Only */}
      <div className="hidden lg:block fixed top-0 left-56 right-0 z-40 bg-bonk-dark">
        <div className="px-5 py-2">
          <FOMOTicker />
        </div>
      </div>

      <DesktopHeader />
      <Header />
      <Sidebar />

      {/* Main Content */}
      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16">
        <div className="max-w-[1200px] mx-auto px-5 py-8">

          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">
              <span className="text-yellow-400">Top Wins</span>
            </h1>
            <p className="text-xl text-gray-400 mb-2">
              Victory Stories
            </p>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Real stories of closed positions with extreme results.
              <br />
              <span className="text-white font-semibold">It happened.</span>
            </p>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#1a2744] border border-[#1e3a5a] rounded-xl p-4 text-center">
              <span className="text-gray-400 text-sm block mb-1">Total Winners</span>
              <span className="text-white text-2xl font-bold">{stories.length}</span>
            </div>
            <div className="bg-[#1a2744] border border-[#1e3a5a] rounded-xl p-4 text-center">
              <span className="text-gray-400 text-sm block mb-1">Best Multiple</span>
              <span className="text-yellow-400 text-2xl font-bold">
                {formatMultiple(Math.max(...stories.map(s => s.multiple)))}x
              </span>
            </div>
            <div className="bg-[#1a2744] border border-[#1e3a5a] rounded-xl p-4 text-center">
              <span className="text-gray-400 text-sm block mb-1">Total Paid Out</span>
              <span className="text-green-400 text-2xl font-bold">
                {formatUSD(stories.reduce((sum, s) => sum + s.exitAmount, 0))}
              </span>
            </div>
            <div className="bg-[#1a2744] border border-[#1e3a5a] rounded-xl p-4 text-center">
              <span className="text-gray-400 text-sm block mb-1">Smallest Entry</span>
              <span className="text-white text-2xl font-bold">
                ${Math.min(...stories.map(s => s.entryAmount))}
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  filter === f.key
                    ? 'bg-yellow-500 text-black'
                    : 'bg-[#1e3a5a] text-gray-300 hover:bg-[#2a4a6a]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Victory Cards Grid */}
          {stories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map(story => (
                <VictoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <span className="text-6xl mb-4 block">🏆</span>
              <h3 className="text-xl font-bold text-white mb-2">No victories yet</h3>
              <p className="text-gray-400">Be the first to claim victory!</p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              Historical results. No guarantees.
            </p>
          </div>

        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
