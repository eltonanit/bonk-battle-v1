'use client';

import { BattleStatus, BattleTier, BATTLE_STATUS_LABELS, BATTLE_STATUS_COLORS, BATTLE_STATUS_BG_COLORS } from '@/types/bonk';
import { TIER_CONFIG, formatSol, calculateSolProgress, calculateVolumeProgress } from '@/lib/solana/constants';

interface BondingCurveCardProps {
  solCollected: number;  // SOL collected (in SOL, not lamports)
  totalVolumeSol: number;  // Total volume in SOL
  battleStatus: BattleStatus;
  tier?: BattleTier;
}

export function BondingCurveCard({
  solCollected,
  totalVolumeSol,
  battleStatus,
  tier = BattleTier.Test,
}: BondingCurveCardProps) {
  // Get tier config for victory thresholds
  const tierConfig = TIER_CONFIG[tier === BattleTier.Test ? 'TEST' : 'PRODUCTION'];
  const targetSol = tierConfig.TARGET_SOL;
  const victoryVolumeSol = tierConfig.VICTORY_VOLUME_SOL;

  // Calculate progress percentages using helpers
  const solProgress = calculateSolProgress(solCollected);
  const volumeProgress = calculateVolumeProgress(totalVolumeSol);

  // Check if graduated (past Created status)
  const isVictoryPending = battleStatus === BattleStatus.VictoryPending;
  const isListed = battleStatus === BattleStatus.Listed || battleStatus === BattleStatus.PoolCreated;

  // Status badge
  const statusLabel = BATTLE_STATUS_LABELS[battleStatus];
  const statusColor = BATTLE_STATUS_COLORS[battleStatus];
  const statusBgColor = BATTLE_STATUS_BG_COLORS[battleStatus];

  return (
    <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
      {/* Header with Status Badge */}
      <div className="flex justify-between items-center mb-4">
        <span className="font-bold">Battle Progress</span>
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColor} ${statusBgColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Tier Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs px-2 py-0.5 rounded ${tier === BattleTier.Test ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
          {tier === BattleTier.Test ? '🧪 Test Tier' : '🚀 Production'}
        </span>
        <span className="text-xs text-gray-500">
          Victory: {formatSol(targetSol)} SOL + {formatSol(victoryVolumeSol)} SOL Vol
        </span>
      </div>

      {/* SOL Collected Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-400">SOL Collected</span>
          <span className="text-sm font-bold">
            {formatSol(solCollected, 3)} / {formatSol(targetSol)} SOL
          </span>
        </div>
        <div className="w-full bg-bonk-dark rounded-full h-2.5 mb-1">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${isVictoryPending || isListed ? 'bg-green-500' : 'bg-bonk-yellow'
              }`}
            style={{ width: `${isVictoryPending || isListed ? 100 : solProgress}%` }}
          />
        </div>
        <div className="text-right text-xs text-gray-500">
          {solProgress.toFixed(1)}%
        </div>
      </div>

      {/* Volume Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-400">Trade Volume</span>
          <span className="text-sm font-bold">
            {formatSol(totalVolumeSol, 3)} / {formatSol(victoryVolumeSol)} SOL
          </span>
        </div>
        <div className="w-full bg-bonk-dark rounded-full h-2.5 mb-1">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${isVictoryPending || isListed ? 'bg-green-500' : 'bg-cyan-500'
              }`}
            style={{ width: `${isVictoryPending || isListed ? 100 : volumeProgress}%` }}
          />
        </div>
        <div className="text-right text-xs text-gray-500">
          {volumeProgress.toFixed(1)}%
        </div>
      </div>

      {/* Status Message */}
      <div className={`text-xs p-2 rounded ${statusBgColor}`}>
        {battleStatus === BattleStatus.Created && (
          <span className="text-gray-300">
            🎯 Reach {formatSol(tierConfig.QUALIFICATION_SOL)} SOL to qualify for battles!
          </span>
        )}
        {battleStatus === BattleStatus.Qualified && (
          <span className="text-yellow-300">
            ⚔️ Token is qualified! Ready to enter a battle.
          </span>
        )}
        {battleStatus === BattleStatus.InBattle && (
          <span className="text-red-300">
            🔥 In battle! Reach {solProgress < 100 ? `${formatSol(targetSol)} SOL` : `${formatSol(victoryVolumeSol)} SOL volume`} to win!
          </span>
        )}
        {battleStatus === BattleStatus.VictoryPending && (
          <span className="text-green-300">
            🏆 Victory achieved! Waiting for finalization...
          </span>
        )}
        {battleStatus === BattleStatus.Listed && (
          <span className="text-cyan-300">
            ✅ Token has been listed! Pool creation pending.
          </span>
        )}
        {battleStatus === BattleStatus.PoolCreated && (
          <span className="text-purple-300">
            🎉 Pool created on Raydium! Token is now tradeable on DEX.
          </span>
        )}
      </div>
    </div>
  );
}
