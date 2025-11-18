// components/shared/TokenCard.BONK.tsx
'use client';

import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import { useTokenBattleState } from '@/hooks/useTokenBattleState';
import { useCalculateMarketCapUsd } from '@/hooks/usePriceOracle';
import { BattleStatus } from '@/types/bonk';

interface TokenCardBonkProps {
  mintAddress: string;
}

export function TokenCardBonk({ mintAddress }: TokenCardBonkProps) {
  const mint = new PublicKey(mintAddress);
  const { state, loading } = useTokenBattleState(mint);
  const marketCapUsd = useCalculateMarketCapUsd(state?.solCollected ?? 0);

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse">
        <div className="h-32 bg-white/5 rounded-lg"></div>
      </div>
    );
  }

  if (!state) return null;

  // Status badge configuration
  const statusConfig = {
    [BattleStatus.Created]: { color: 'bg-green-500', label: 'NEW' },
    [BattleStatus.Qualified]: { color: 'bg-orange-500', label: 'QUALIFIED' },
    [BattleStatus.InBattle]: { color: 'bg-orange-500 animate-pulse', label: '⚔️ IN BATTLE' },
    [BattleStatus.VictoryPending]: { color: 'bg-yellow-500', label: '🏆 VICTORY' },
    [BattleStatus.Listed]: { color: 'bg-gray-500', label: 'LISTED' },
  };

  const status = statusConfig[state.battleStatus];

  return (
    <Link href={`/token/${mintAddress}`}>
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-white/20 hover:shadow-xl transition-all duration-300 cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold truncate mb-1">
              {mintAddress.substring(0, 8)}...
            </h3>
            <p className="text-xs text-gray-400">Battle Token</p>
          </div>
          <span className={`${status.color} px-3 py-1 rounded-lg text-xs font-bold text-white whitespace-nowrap ml-2`}>
            {status.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-xs text-gray-400">Market Cap</div>
            <div className="text-sm font-bold">
              ${marketCapUsd?.toFixed(0) ?? '...'}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-xs text-gray-400">Volume</div>
            <div className="text-sm font-bold">
              {(state.totalTradeVolume / 1e9).toFixed(2)} SOL
            </div>
          </div>
        </div>

        {/* Progress to Qualification (only for Created status) */}
        {state.battleStatus === BattleStatus.Created && marketCapUsd !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress to Qualification</span>
              <span>{((marketCapUsd / 5100) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((marketCapUsd / 5100) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Battle Opponent (only for InBattle status) */}
        {state.battleStatus === BattleStatus.InBattle && (
          <div className="mt-3 text-xs text-gray-400">
            <span className="font-semibold text-orange-400">Fighting:</span> {state.opponentMint.toString().substring(0, 12)}...
          </div>
        )}
      </div>
    </Link>
  );
}
