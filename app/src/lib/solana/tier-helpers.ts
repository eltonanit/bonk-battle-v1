// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Get tier-specific targets from token's tier value
// ⚠️ MUST MATCH: anchor/programs/bonk_battle/src/lib.rs
// ═══════════════════════════════════════════════════════════════════════════

import { BattleTier } from '@/types/bonk';

// Tier configurations (must match smart contract!)
export const TIER_TARGETS = {
  // Contract: TEST_TARGET_SOL = 6_000_000_000, TEST_QUALIFICATION_SOL = 1
  [BattleTier.Test]: {
    TARGET_SOL: 6,
    VICTORY_VOLUME_SOL: 6.6,
    QUALIFICATION_SOL: 0.000000001, // Contract: 1 lamport = any buy
  },
  // Contract: PROD_TARGET_SOL = 14_586_338_000_000_000, PROD_QUALIFICATION_SOL = 1
  [BattleTier.Production]: {
    TARGET_SOL: 14_586_338,
    VICTORY_VOLUME_SOL: 16_044_972,
    QUALIFICATION_SOL: 0.000000001, // Contract: 1 lamport = any buy
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
