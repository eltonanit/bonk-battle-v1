'use client';

import { BattleStatus, BattleTier, TIER_CONFIG, BATTLE_STATUS_LABELS, BATTLE_STATUS_COLORS, BATTLE_STATUS_BG_COLORS } from '@/types/bonk';

interface BondingCurveCardProps {
  marketCapUsd: number | null;
  battleStatus: BattleStatus;
  tier?: BattleTier;
  totalVolumeUsd?: number;  // already converted to USD
}

export function BondingCurveCard({
  marketCapUsd,
  battleStatus,
  tier = BattleTier.Test,
  totalVolumeUsd = 0,
}: BondingCurveCardProps) {
  // Get tier config for victory thresholds
  const tierConfig = TIER_CONFIG[tier];
  const victoryMcUsd = tierConfig.victoryMcUsd;
  const victoryVolumeUsd = tierConfig.victoryVolumeUsd;

  // Calculate progress percentages
  const mcProgress = marketCapUsd ? Math.min((marketCapUsd / victoryMcUsd) * 100, 100) : 0;

  // Volume is already in USD
  const volumeUsd = totalVolumeUsd;
  const volumeProgress = Math.min((volumeUsd / victoryVolumeUsd) * 100, 100);

  // Check if graduated (past Created status)
  const isGraduated = battleStatus !== BattleStatus.Created;
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
        <span className="font-bold">Bonding Curve Progress</span>
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
          Victory: ${victoryMcUsd.toLocaleString()} MC + ${victoryVolumeUsd.toLocaleString()} Vol
        </span>
      </div>

      {/* Market Cap Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-400">Market Cap</span>
          <span className="text-sm font-bold">
            ${marketCapUsd?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'} / ${victoryMcUsd.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-bonk-dark rounded-full h-2.5 mb-1">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${isVictoryPending || isListed ? 'bg-green-500' : 'bg-bonk-yellow'
              }`}
            style={{ width: `${isVictoryPending || isListed ? 100 : mcProgress}%` }}
          />
        </div>
        <div className="text-right text-xs text-gray-500">
          {mcProgress.toFixed(1)}%
        </div>
      </div>

      {/* Volume Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-400">Trade Volume</span>
          <span className="text-sm font-bold">
            ${volumeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ${victoryVolumeUsd.toLocaleString()}
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
            🎯 First $10+ buy will qualify this token for battles!
          </span>
        )}
        {battleStatus === BattleStatus.Qualified && (
          <span className="text-yellow-300">
            ⚔️ Token is qualified! Ready to enter a battle.
          </span>
        )}
        {battleStatus === BattleStatus.InBattle && (
          <span className="text-red-300">
            🔥 Token is in battle! Reach {mcProgress < 100 ? `$${victoryMcUsd.toLocaleString()} MC` : `$${victoryVolumeUsd.toLocaleString()} volume`} to win!
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