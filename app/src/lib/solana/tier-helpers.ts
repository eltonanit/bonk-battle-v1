// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Get tier-specific targets from token's tier value
// ═══════════════════════════════════════════════════════════════════════════

import { BattleTier } from '@/types/bonk';

// Tier configurations (must match smart contract!)
export const TIER_TARGETS = {
  [BattleTier.Test]: {
    TARGET_SOL: 6,
    VICTORY_VOLUME_SOL: 6.6,
    QUALIFICATION_SOL: 0.12,
  },
  [BattleTier.Production]: {
    TARGET_SOL: 37.7,
    VICTORY_VOLUME_SOL: 41.5,
    QUALIFICATION_SOL: 0.75,
  },
} as const;

/**
 * Get the correct targets for a token based on its tier
 * @param tier - The token's BattleTier (0 = Test, 1 = Production)
 * @returns Object with TARGET_SOL and VICTORY_VOLUME_SOL
 */
export function getTierTargets(tier: BattleTier | number | undefined) {
  // Default to Test tier if undefined
  const tierValue = tier ?? BattleTier.Test;

  // Get targets for the tier, fallback to Test if invalid
  const targets = TIER_TARGETS[tierValue as BattleTier] ?? TIER_TARGETS[BattleTier.Test];

  return {
    targetSol: targets.TARGET_SOL,
    victoryVolumeSol: targets.VICTORY_VOLUME_SOL,
    qualificationSol: targets.QUALIFICATION_SOL,
  };
}

/**
 * Get tier display name
 */
export function getTierName(tier: BattleTier | number | undefined): string {
  const tierValue = tier ?? BattleTier.Test;
  return tierValue === BattleTier.Production ? 'Production' : 'Test';
}

/**
 * Get tier icon
 */
export function getTierIcon(tier: BattleTier | number | undefined): string {
  const tierValue = tier ?? BattleTier.Test;
  return tierValue === BattleTier.Production ? '🚀' : '🧪';
}
