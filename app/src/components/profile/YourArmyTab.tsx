'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import { BattleStatus } from '@/types/bonk';
import Image from 'next/image';
import Link from 'next/link';

interface ArmyToken {
  mint: string;
  name: string;
  symbol: string;
  image?: string;
  solCollected: number;
  battleStatus: BattleStatus;
  creationTimestamp: number;
}

export function YourArmyTab() {
  const { publicKey } = useWallet();
  const [armyTokens, setArmyTokens] = useState<ArmyToken[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchYourArmy = useCallback(async () => {
    if (!publicKey) {
      setArmyTokens([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const allTokens = await fetchAllBonkTokens();

      // Filter tokens created by this wallet
      const userTokens = allTokens
        .filter(token => token.creator?.toString() === publicKey.toString())
        .map(token => ({
          mint: token.mint.toString(),
          name: token.name || 'Unknown',
          symbol: token.symbol || 'UNK',
          image: token.image,
          solCollected: token.solCollected / 1e9,
          battleStatus: token.battleStatus,
          creationTimestamp: token.creationTimestamp,
        }))
        .sort((a, b) => b.creationTimestamp - a.creationTimestamp); // Most recent first

      setArmyTokens(userTokens);
    } catch (error) {
      console.error('Error fetching your army:', error);
      setArmyTokens([]);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchYourArmy();
    const interval = setInterval(fetchYourArmy, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchYourArmy]);

  if (!publicKey) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🔐</div>
        <p className="text-gray-400">Connect your wallet to view your army</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        <p className="mt-4 text-white/60">Loading your army...</p>
      </div>
    );
  }

  if (armyTokens.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-6">⚔️</div>
        <h2 className="text-2xl font-bold mb-4">No Tokens Created Yet</h2>
        <p className="text-white/60 mb-8 max-w-md mx-auto">
          Create your first token to start building your army!
        </p>
        <Link
          href="/create"
          className="inline-block px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg font-bold hover:opacity-90 transition"
        >
          Create Token
        </Link>
      </div>
    );
  }

  // Group tokens by status
  const qualified = armyTokens.filter(t => t.battleStatus === BattleStatus.Qualified);
  const inBattle = armyTokens.filter(t => t.battleStatus === BattleStatus.InBattle);
  const victoryPending = armyTokens.filter(t => t.battleStatus === BattleStatus.VictoryPending);
  const listed = armyTokens.filter(t => t.battleStatus === BattleStatus.Listed);
  const created = armyTokens.filter(t => t.battleStatus === BattleStatus.Created);

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{armyTokens.length}</div>
          <div className="text-xs text-white/60 mt-1">Total</div>
        </div>
        <div className="bg-[#0a0a0a] border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{qualified.length}</div>
          <div className="text-xs text-white/60 mt-1">Qualified</div>
        </div>
        <div className="bg-[#0a0a0a] border border-orange-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{inBattle.length}</div>
          <div className="text-xs text-white/60 mt-1">In Battle</div>
        </div>
        <div className="bg-[#0a0a0a] border border-yellow-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{victoryPending.length}</div>
          <div className="text-xs text-white/60 mt-1">Pending</div>
        </div>
        <div className="bg-[#0a0a0a] border border-blue-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{listed.length}</div>
          <div className="text-xs text-white/60 mt-1">Listed</div>
        </div>
      </div>

      {/* In Battle - Priority Section */}
      {inBattle.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-orange-500">⚔️</span>
            In Battle ({inBattle.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inBattle.map(token => (
              <TokenCard key={token.mint} token={token} priority />
            ))}
          </div>
        </div>
      )}

      {/* Victory Pending */}
      {victoryPending.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-yellow-500">⏳</span>
            Victory Pending ({victoryPending.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {victoryPending.map(token => (
              <TokenCard key={token.mint} token={token} />
            ))}
          </div>
        </div>
      )}

      {/* Qualified */}
      {qualified.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Qualified for Battle ({qualified.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {qualified.map(token => (
              <TokenCard key={token.mint} token={token} />
            ))}
          </div>
        </div>
      )}

      {/* Listed */}
      {listed.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-blue-500">🏆</span>
            Listed ({listed.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listed.map(token => (
              <TokenCard key={token.mint} token={token} />
            ))}
          </div>
        </div>
      )}

      {/* Created (not qualified yet) */}
      {created.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-white/60">📝</span>
            Building ({created.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {created.map(token => (
              <TokenCard key={token.mint} token={token} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TokenCard({ token, priority }: { token: ArmyToken; priority?: boolean }) {
  const statusColors = {
    [BattleStatus.Created]: 'text-white/60 bg-white/10',
    [BattleStatus.Qualified]: 'text-green-400 bg-green-500/20',
    [BattleStatus.InBattle]: 'text-orange-400 bg-orange-500/20',
    [BattleStatus.VictoryPending]: 'text-yellow-400 bg-yellow-500/20',
    [BattleStatus.Listed]: 'text-blue-400 bg-blue-500/20',
  };

  const statusLabels = {
    [BattleStatus.Created]: 'Building',
    [BattleStatus.Qualified]: 'Qualified',
    [BattleStatus.InBattle]: 'In Battle',
    [BattleStatus.VictoryPending]: 'Victory Pending',
    [BattleStatus.Listed]: 'Listed',
  };

  return (
    <Link
      href={`/token/${token.mint}`}
      className={`block bg-[#0a0a0a] border rounded-xl p-5 hover:scale-[1.02] transition-all ${
        priority ? 'border-orange-500/50 shadow-lg shadow-orange-500/20' : 'border-white/10'
      }`}
    >
      {/* Header */}
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

        {/* Status Badge */}
        <span className={`px-2 py-1 text-xs font-bold rounded ${statusColors[token.battleStatus]}`}>
          {statusLabels[token.battleStatus]}
        </span>
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
          <span className="text-white/60">Age</span>
          <span className="text-white/80">
            {getTokenAge(token.creationTimestamp)}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-sm font-bold text-orange-500 hover:text-orange-400 transition">
          View Details →
        </div>
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
