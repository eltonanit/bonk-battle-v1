// components/shared/TokenCard.BONK.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
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
      <div className="bg-bonk-card border border-bonk-border rounded-xl p-5 animate-pulse">
        <div className="h-32 bg-bonk-dark rounded-lg"></div>
      </div>
    );
  }

  if (!state) return null;

  // Status badge configuration
  const statusConfig = {
    [BattleStatus.Created]: { color: 'bg-bonk-green', label: 'NEW' },
    [BattleStatus.Qualified]: { color: 'bg-bonk-orange-light text-black', label: 'QUALIFIED' },
    [BattleStatus.InBattle]: { color: 'bg-bonk-orange-light text-black animate-pulse', label: '⚔️ IN BATTLE' },
    [BattleStatus.VictoryPending]: { color: 'bg-bonk-gold text-black', label: '🏆 VICTORY' },
    [BattleStatus.Listed]: { color: 'bg-bonk-border text-bonk-text', label: 'LISTED' },
  };

  const status = statusConfig[state.battleStatus];

  return (
    <Link href={`/token/${mintAddress}`}>
      <div className="bg-bonk-card backdrop-blur-md border border-bonk-border rounded-xl p-5 hover:bg-bonk-card/80 hover:border-bonk-orange hover:shadow-xl transition-all duration-300 cursor-pointer">
        {/* Token Image & Status */}
        <div className="flex items-start gap-4 mb-4">
          {/* BONK Logo */}
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 p-2 flex-shrink-0">
            <Image
              src="/BONK-LOGO.svg"
              alt="BONK"
              width={64}
              height={64}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Token Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold truncate mb-1">
              {mintAddress.substring(0, 8)}...
            </h3>
            <p className="text-xs text-gray-400">Battle Token</p>
            <span className={`${status.color} px-3 py-1 rounded-lg text-xs font-bold text-white inline-block mt-2`}>
              {status.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-bonk-dark/50 rounded-lg p-2">
            <div className="text-xs text-gray-400">Market Cap</div>
            <div className="text-sm font-bold">
              ${marketCapUsd?.toFixed(0) ?? '...'}
            </div>
          </div>
          <div className="bg-bonk-dark/50 rounded-lg p-2">
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
