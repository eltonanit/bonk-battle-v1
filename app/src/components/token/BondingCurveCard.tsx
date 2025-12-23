'use client';

import { BattleStatus, BattleTier, BATTLE_STATUS_LABELS, BATTLE_STATUS_COLORS, BATTLE_STATUS_BG_COLORS } from '@/types/bonk';
import { TIER_CONFIG, formatSol, calculateSolProgress, calculateVolumeProgress } from '@/lib/solana/constants';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import {
  calculateMarketCapUsd,
  getFinalMarketCapUsd,
  MC_INIT_SOL,
  MC_FINAL_SOL,
} from '@/config/tier-config';

interface BondingCurveCardProps {
  solCollected: number;  // SOL collected (in SOL, not lamports)
  totalVolumeSol: number;  // Total volume in SOL
  battleStatus: BattleStatus;
  tier?: BattleTier;
}

/**
 * Format USD value for display
 */
function formatUsd(usd: number): string {
  if (!usd || usd <= 0) return '$0';

  if (usd >= 1_000_000) {
    return `$${(usd / 1_000_000).toFixed(2)}M`;
  }
  if (usd >= 1_000) {
    return `$${(usd / 1_000).toFixed(1)}K`;
  }
  return `$${Math.round(usd).toLocaleString()}`;
}

/**
 * Format USD with full precision
 */
function formatUsdFull(usd: number): string {
  if (!usd || usd <= 0) return '$0';
  return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function BondingCurveCard({
  solCollected,
  totalVolumeSol,
  battleStatus,
  tier = BattleTier.Test,
}: BondingCurveCardProps) {
  // ⭐ Get SOL price from on-chain oracle
  const { solPriceUsd, loading: priceLoading } = usePriceOracle();
  const solPrice = solPriceUsd || 0;

  // Get tier config for victory thresholds
  const tierConfig = TIER_CONFIG[tier === BattleTier.Test ? 'TEST' : 'PRODUCTION'];
  const targetSol = tierConfig.TARGET_SOL;
  const victoryVolumeSol = tierConfig.VICTORY_VOLUME_SOL;

  // Calculate progress percentages using helpers
  const solProgress = calculateSolProgress(solCollected);
  const volumeProgress = calculateVolumeProgress(totalVolumeSol);

  // ⭐ Calculate USD values using bonding curve formula (xy=k)
  const currentMcUsd = calculateMarketCapUsd(solCollected, solPrice);
  const targetMcUsd = getFinalMarketCapUsd(solPrice);
  const remainingMcUsd = Math.max(0, targetMcUsd - currentMcUsd);

  // Volume in USD
  const volumeUsd = totalVolumeSol * solPrice;
  const targetVolumeUsd = victoryVolumeSol * solPrice;

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

      {/* Tier Badge + SOL Price */}
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs px-2 py-0.5 rounded ${tier === BattleTier.Test ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
          {tier === BattleTier.Test ? '🧪 Test Tier' : '🚀 Production'}
        </span>
        {solPrice > 0 && (
          <span className="text-xs text-gray-500">
            SOL ${solPrice.toFixed(0)}
          </span>
        )}
      </div>

      {/* ⭐ Bonding Curve Progress - Main Display */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-300">Bonding Curve Progress</span>
          <span className="text-sm font-bold text-white">
            {solProgress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-bonk-dark rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${isVictoryPending || isListed
              ? 'bg-gradient-to-r from-green-400 to-green-600'
              : 'bg-gradient-to-r from-green-400 to-cyan-500'
              }`}
            style={{ width: `${isVictoryPending || isListed ? 100 : solProgress}%` }}
          />
        </div>
        {/* ⭐ USD Display - Like pump.fun style */}
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">
            {formatSol(solCollected, 3)} SOL in curve
            {solPrice > 0 && (
              <span className="text-gray-500 ml-1">
                ({formatUsd(currentMcUsd)} MC)
              </span>
            )}
          </span>
          <span className="text-yellow-400">
            {solPrice > 0 ? formatUsd(remainingMcUsd) : `${formatSol(targetSol - solCollected)} SOL`} to graduate
          </span>
        </div>
      </div>

      {/* ⭐ Market Cap Display */}
      {solPrice > 0 && (
        <div className="bg-white/5 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-400 mb-1">Current Market Cap</div>
              <div className="text-lg font-bold text-white">{formatUsd(currentMcUsd)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-1">Target MC</div>
              <div className="text-lg font-bold text-yellow-400">{formatUsd(targetMcUsd)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Volume Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-400">Trade Volume</span>
          <span className="text-sm font-bold">
            {volumeProgress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-bonk-dark rounded-full h-2.5 mb-1">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${isVictoryPending || isListed ? 'bg-green-500' : 'bg-cyan-500'
              }`}
            style={{ width: `${isVictoryPending || isListed ? 100 : volumeProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            {formatSol(totalVolumeSol, 3)} SOL
            {solPrice > 0 && <span className="text-gray-600 ml-1">({formatUsd(volumeUsd)})</span>}
          </span>
          <span className="text-yellow-500">
            Target: {formatSol(victoryVolumeSol)} SOL
            {solPrice > 0 && <span className="text-yellow-600 ml-1">({formatUsd(targetVolumeUsd)})</span>}
          </span>
        </div>
      </div>

      {/* Victory Requirements Summary */}
      <div className="bg-white/5 rounded-lg p-3 mb-4">
        <div className="text-xs text-gray-400 mb-2">🏆 Victory Requirements</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`flex items-center gap-1 ${solProgress >= 100 ? 'text-green-400' : 'text-gray-300'}`}>
            {solProgress >= 100 ? '✅' : '⬜'} MC: {formatUsd(targetMcUsd)}
          </div>
          <div className={`flex items-center gap-1 ${volumeProgress >= 100 ? 'text-green-400' : 'text-gray-300'}`}>
            {volumeProgress >= 100 ? '✅' : '⬜'} Vol: {formatUsd(targetVolumeUsd)}
          </div>
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
            🔥 In battle! {solProgress < 100
              ? `Reach ${formatUsd(targetMcUsd)} MC`
              : `Reach ${formatUsd(targetVolumeUsd)} volume`} to win!
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