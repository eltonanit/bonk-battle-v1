'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import { BattleStatus } from '@/types/bonk';
import Image from 'next/image';
import Link from 'next/link';

interface QualifiedToken {
  mint: string;
  name: string;
  symbol: string;
  image?: string;
  solCollected: number;
  creator: string;
  creationTimestamp: number;
}

export function BattleMatching() {
  const { publicKey } = useWallet();
  const [qualifiedTokens, setQualifiedTokens] = useState<QualifiedToken[]>([]);
  const [myTokens, setMyTokens] = useState<QualifiedToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQualifiedTokens() {
      try {
        setLoading(true);
        const allTokens = await fetchAllBonkTokens();

        // Filter only QUALIFIED tokens (ready for battle)
        const qualified = allTokens
          .filter(token => token.battleStatus === BattleStatus.Qualified)
          .map(token => ({
            mint: token.mint.toString(),
            name: token.name || 'Unknown',
            symbol: token.symbol || 'UNK',
            image: token.image,
            solCollected: token.solCollected / 1e9,
            creator: token.creator.toString(),
            creationTimestamp: token.creationTimestamp,
          }))
          .sort((a, b) => b.solCollected - a.solCollected); // Sort by liquidity

        setQualifiedTokens(qualified);

        // If wallet connected, filter user's tokens
        if (publicKey) {
          const userTokens = qualified.filter(
            token => token.creator === publicKey.toString()
          );
          setMyTokens(userTokens);
        }
      } catch (error) {
        console.error('Error loading qualified tokens:', error);
      } finally {
        setLoading(false);
      }
    }

    loadQualifiedTokens();
    const interval = setInterval(loadQualifiedTokens, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [publicKey]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        <p className="mt-4 text-white/60">Loading battle arena...</p>
      </div>
    );
  }

  if (qualifiedTokens.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-6">⚔️</div>
        <h2 className="text-2xl font-bold mb-4">No Qualified Tokens Yet</h2>
        <p className="text-white/60 mb-8 max-w-md mx-auto">
          Tokens must reach their liquidity goal to qualify for battle.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg font-bold hover:opacity-90 transition"
        >
          View All Tokens
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* My Qualified Tokens */}
      {myTokens.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-orange-500">🔥</span>
            Your Qualified Tokens ({myTokens.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myTokens.map(token => (
              <TokenCard key={token.mint} token={token} isOwner={true} />
            ))}
          </div>
        </div>
      )}

      {/* All Qualified Tokens */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <span className="text-white/80">⚔️</span>
          Available Opponents ({qualifiedTokens.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {qualifiedTokens.map(token => (
            <TokenCard
              key={token.mint}
              token={token}
              isOwner={publicKey?.toString() === token.creator}
            />
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-12 bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span>ℹ️</span>
          How Battle Matching Works
        </h3>
        <ul className="space-y-2 text-sm text-white/70">
          <li>• Only qualified tokens (reached liquidity goal) can battle</li>
          <li>• Click on any token to view details and initiate a battle</li>
          <li>• Winner takes 50% of loser's liquidity</li>
          <li>• Battle lasts 24 hours - highest volume wins</li>
        </ul>
      </div>
    </div>
  );
}

function TokenCard({ token, isOwner }: { token: QualifiedToken; isOwner: boolean }) {
  return (
    <Link
      href={`/token/${token.mint}`}
      className="block bg-[#0a0a0a] border border-white/10 rounded-xl p-5 hover:border-orange-500/50 transition-all hover:scale-[1.02]"
    >
      {/* Header with Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Token Image */}
          <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-orange-600 to-red-600 flex-shrink-0">
            {token.image ? (
              <Image
                src={token.image}
                alt={token.symbol}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold">
                {token.symbol.slice(0, 2)}
              </div>
            )}
          </div>

          {/* Token Info */}
          <div>
            <h3 className="font-bold text-lg">{token.symbol}</h3>
            <p className="text-xs text-white/50 truncate max-w-[120px]">
              {token.name}
            </p>
          </div>
        </div>

        {/* Owner Badge */}
        {isOwner && (
          <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-bold rounded">
            YOURS
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Liquidity</span>
          <span className="font-bold text-green-400">
            {token.solCollected.toFixed(2)} SOL
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Creator</span>
          <span className="font-mono text-xs text-white/80">
            {token.creator.slice(0, 4)}...{token.creator.slice(-4)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Age</span>
          <span className="text-white/80">
            {getTokenAge(token.creationTimestamp)}
          </span>
        </div>
      </div>

      {/* CTA Button */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <button className="w-full py-2 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg font-bold text-sm hover:opacity-90 transition">
          {isOwner ? 'Start Battle' : 'Challenge'}
        </button>
      </div>
    </Link>
  );
}

function getTokenAge(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return 'New';
}
