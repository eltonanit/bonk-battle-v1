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

      // Filter by creator (we don't have creator field in TokenBattleState, so we need to check mint ownership or use another approach)
      // For now, we'll show all tokens as a temporary solution
      // TODO: Add creator field to TokenBattleState or track in Supabase

      console.log(`📊 Found ${allTokens.length} total BONK tokens`);

      // Sort by creation timestamp (newest first)
      allTokens.sort((a, b) => b.creationTimestamp - a.creationTimestamp);

      setCoins(allTokens);
      console.log(`✅ Loaded ${allTokens.length} BONK tokens`);

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

  if (coins.length === 0) {
    return (
      <div className="text-center py-12">
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
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-lg font-bold text-gray-400">
          Your Tokens ({coins.length})
        </div>
        <Link
          href="/create"
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition-all text-sm"
        >
          + Create New
        </Link>
      </div>

      <div className="space-y-4">
        {coins.map((coin) => {
          const solRaised = coin.solCollected / 1e9;
          const targetSol = 85; // BONK BATTLE target
          const progress = (solRaised / targetSol) * 100;

          return (
            <Link
              key={coin.mint.toString()}
              href={`/token/${coin.mint.toString()}`}
              className="block bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Token Image */}
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex-shrink-0">
                    {coin.image ? (
                      <Image
                        src={coin.image}
                        alt={coin.name || 'Token'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {coin.symbol?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>

                  {/* Token Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold">{coin.name || coin.mint.toString().slice(0, 8)}</h3>
                      <span className="text-sm text-gray-400">${coin.symbol || 'UNK'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <span className={`font-semibold ${getStatusColor(coin.battleStatus)}`}>
                        {getStatusEmoji(coin.battleStatus)} {getStatusName(coin.battleStatus)}
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold">
                        TARGET: ${(targetSol * 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress & Stats */}
                <div className="text-right">
                  <div className="text-2xl font-bold mb-1">
                    {progress.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400 mb-2">
                    {solRaised.toFixed(2)} / {targetSol} SOL
                  </div>
                  <div className="text-xs text-gray-500">
                    Volume: {(coin.totalTradeVolume / 1e9).toFixed(2)} SOL
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
