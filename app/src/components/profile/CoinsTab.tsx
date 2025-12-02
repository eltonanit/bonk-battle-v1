'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback } from 'react';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import { ParsedTokenBattleState, BattleStatus } from '@/types/bonk';
import Link from 'next/link';
import Image from 'next/image';

export function CoinsTab() {
  const { publicKey } = useWallet();
  const [coins, setCoins] = useState<ParsedTokenBattleState[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCreatedCoins = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      console.log('🎨 Fetching created BONK tokens for:', publicKey.toBase58());

      // Fetch all BONK tokens
      const allTokens = await fetchAllBonkTokens();

      console.log(`📊 Found ${allTokens.length} total BONK tokens`);

      // Filter only tokens created by this user
      const userCreatedTokens = allTokens.filter(
        token => token.creator?.toString() === publicKey.toBase58()
      );

      console.log(`🎨 Found ${userCreatedTokens.length} tokens created by ${publicKey.toBase58()}`);

      // Sort by creation timestamp (newest first)
      userCreatedTokens.sort((a, b) => b.creationTimestamp - a.creationTimestamp);

      setCoins(userCreatedTokens);
      console.log(`✅ Loaded ${userCreatedTokens.length} user-created BONK tokens`);

    } catch (error) {
      console.error('❌ Error fetching created coins:', error);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    fetchCreatedCoins();
  }, [publicKey, fetchCreatedCoins]);

  function getStatusName(status: BattleStatus): string {
    switch (status) {
      case BattleStatus.Created: return 'Created';
      case BattleStatus.Qualified: return 'Qualified';
      case BattleStatus.InBattle: return 'In Battle';
      case BattleStatus.VictoryPending: return 'Victory Pending';
      case BattleStatus.Listed: return 'Listed';
      default: return 'Unknown';
    }
  }

  function getStatusColor(status: BattleStatus): string {
    switch (status) {
      case BattleStatus.Created: return 'text-green-400';
      case BattleStatus.Qualified: return 'text-yellow-400';
      case BattleStatus.InBattle: return 'text-orange-400';
      case BattleStatus.VictoryPending: return 'text-purple-400';
      case BattleStatus.Listed: return 'text-blue-400';
      default: return 'text-gray-400';
    }
  }

  function getStatusEmoji(status: BattleStatus): string {
    switch (status) {
      case BattleStatus.Created: return '🆕';
      case BattleStatus.Qualified: return '✅';
      case BattleStatus.InBattle: return '⚔️';
      case BattleStatus.VictoryPending: return '🏆';
      case BattleStatus.Listed: return '🎓';
      default: return '❓';
    }
  }

  if (!publicKey) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Connect your wallet to view your created tokens</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/5 rounded-2xl p-6 animate-pulse">
            <div className="h-20 bg-white/5 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header with buttons - always visible when logged in */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-lg font-bold text-white">
          Your Tokens ({coins.length})
        </div>
        <Link
          href="/create"
          className="px-4 py-2 bg-emerald-400 hover:bg-emerald-500 text-black rounded-lg font-bold transition-all text-sm"
        >
          + Create New
        </Link>
      </div>

      {/* Empty state */}
      {coins.length === 0 ? (
        <div className="text-center py-12 bg-[#1a1f2e] border border-[#2a3544] rounded-xl">
          <div className="text-6xl mb-4">🚀</div>
          <div className="text-xl font-bold mb-2">No coins created yet</div>
          <div className="text-gray-400 mb-6">Create your first token and become a creator</div>
          <Link
            href="/create"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            Create Your First Coin
          </Link>
        </div>
      ) : (

      <div className="space-y-3">
        {coins.map((coin) => {
          const status = coin.battleStatus;
          const isNew = status === BattleStatus.Created;
          const isQualified = status === BattleStatus.Qualified;
          const isInBattle = status === BattleStatus.InBattle;

          return (
            <div
              key={coin.mint.toString()}
              className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-3 flex items-center justify-between gap-2"
            >
              {/* Left: Token image + symbol */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-yellow-500 flex-shrink-0">
                  {coin.image ? (
                    <Image
                      src={coin.image}
                      alt={coin.symbol || 'Token'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                      {coin.symbol?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                <div className="font-semibold text-white text-sm truncate">${coin.symbol || 'UNK'}</div>
              </div>

              {/* Center: Status badge */}
              <div className="flex-shrink-0 w-16 text-left">
                {isInBattle && (
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs font-semibold">
                    In Battle
                  </span>
                )}
                {isQualified && (
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">
                    Qualified
                  </span>
                )}
                {isNew && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                    New
                  </span>
                )}
                {!isInBattle && !isQualified && !isNew && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(status)} bg-white/10`}>
                    {getStatusName(status)}
                  </span>
                )}
              </div>

              {/* Right: Action button based on status */}
              <div className="flex-shrink-0">
                {isNew && (
                  <Link
                    href={`/token/${coin.mint.toString()}`}
                    className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-500 text-black font-semibold rounded-lg text-xs transition-colors"
                  >
                    Qualify
                  </Link>
                )}
                {isQualified && (
                  <Link
                    href={`/battlestart?token=${coin.mint.toString()}`}
                    className="px-3 py-1.5 bg-orange-400 hover:bg-orange-500 text-black font-semibold rounded-lg text-xs transition-colors"
                  >
                    Find Opponent
                  </Link>
                )}
                {isInBattle && (
                  <Link
                    href={`/battle/${coin.currentBattle?.toString() || coin.mint.toString()}`}
                    className="px-3 py-1.5 bg-orange-300 hover:bg-orange-400 text-black font-semibold rounded-lg text-xs transition-colors"
                  >
                    View Match
                  </Link>
                )}
                {!isNew && !isQualified && !isInBattle && (
                  <Link
                    href={`/token/${coin.mint.toString()}`}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg text-xs transition-colors"
                  >
                    View
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
