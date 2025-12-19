// ========================================================================
// BONK BATTLE - TIER CONFIGURATION
// ========================================================================
// This file must match the smart contract values EXACTLY!
// Smart contract location: contracts/programs/contracts/src/lib.rs
// ========================================================================

/**
 * ⚠️ IMPORTANTE: Cambia questa variabile per switchare tra TEST e PRODUCTION
 * Deve corrispondere al valore USE_TEST_TIER nello smart contract!
 */
export const USE_TEST_TIER = false; // ⭐ CAMBIA QUI: true = TEST, false = PRODUCTION

// ========================================================================
// TIER DEFINITIONS (from smart contract lines 40-70)
// ========================================================================

export const TIER_CONFIG = {
  TEST: {
    name: 'Test Tier',
    description: 'Perfect for devnet testing',
    icon: '🧪',

    // Victory conditions (in SOL)
    TARGET_SOL: 6,              // 6 SOL = graduation threshold
    VICTORY_VOLUME_SOL: 6.6,    // 110% of TARGET_SOL
    QUALIFICATION_SOL: 0.12,    // ~$16 @ $137/SOL

    // In lamports (for smart contract comparison)
    TARGET_SOL_LAMPORTS: 6_000_000_000,
    VICTORY_VOLUME_LAMPORTS: 6_600_000_000,
    QUALIFICATION_LAMPORTS: 120_000_000,

    // Matchmaking tolerance (50% of target)
    MATCHMAKING_TOLERANCE_SOL: 3,

    // Estimated values (@ $137/SOL)
    EST_INITIAL_MC_USD: 280,
    EST_FINAL_MC_USD: 820,
    MULTIPLIER: 2.93,
  },

  PRODUCTION: {
    name: 'Production Tier',
    description: 'For mainnet battles',
    icon: '🚀',

    // Victory conditions (in SOL)
    TARGET_SOL: 37.7,           // 37.7 SOL = graduation threshold
    VICTORY_VOLUME_SOL: 41.5,   // 110% of TARGET_SOL
    QUALIFICATION_SOL: 0.75,    // ~$103 @ $137/SOL

    // In lamports (for smart contract comparison)
    TARGET_SOL_LAMPORTS: 37_700_000_000,
    VICTORY_VOLUME_LAMPORTS: 41_500_000_000,
    QUALIFICATION_LAMPORTS: 750_000_000,

    // Matchmaking tolerance (50% of target)
    MATCHMAKING_TOLERANCE_SOL: 18.85,

    // Estimated values (@ $137/SOL)
    EST_INITIAL_MC_USD: 1700,
    EST_FINAL_MC_USD: 25000,
    MULTIPLIER: 14.68,
  },
} as const;

// ========================================================================
// ACTIVE TIER (based on USE_TEST_TIER flag)
// ========================================================================

/**
 * Returns the currently active tier configuration
 * Use this throughout the app instead of hardcoded values!
 */
export function getActiveTier() {
  return USE_TEST_TIER ? TIER_CONFIG.TEST : TIER_CONFIG.PRODUCTION;
}

/**
 * Shortcut to get active tier config
 */
export const ACTIVE_TIER = getActiveTier();

// ========================================================================
// CONVENIENCE EXPORTS (for easy importing)
// ========================================================================

// These are the values you should use in components:
export const TARGET_SOL = ACTIVE_TIER.TARGET_SOL;
export const VICTORY_VOLUME_SOL = ACTIVE_TIER.VICTORY_VOLUME_SOL;
export const QUALIFICATION_SOL = ACTIVE_TIER.QUALIFICATION_SOL;
export const MATCHMAKING_TOLERANCE_SOL = ACTIVE_TIER.MATCHMAKING_TOLERANCE_SOL;

// Lamport versions (for on-chain comparisons)
export const TARGET_SOL_LAMPORTS = ACTIVE_TIER.TARGET_SOL_LAMPORTS;
export const VICTORY_VOLUME_LAMPORTS = ACTIVE_TIER.VICTORY_VOLUME_LAMPORTS;
export const QUALIFICATION_LAMPORTS = ACTIVE_TIER.QUALIFICATION_LAMPORTS;

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Calculate progress percentage towards graduation
 */
export function calculateSolProgress(solCollectedLamports: number): number {
  const solCollected = solCollectedLamports / 1e9;
  return Math.min((solCollected / TARGET_SOL) * 100, 100);
}

/**
 * Calculate volume progress percentage
 */
export function calculateVolumeProgress(volumeLamports: number): number {
  const volumeSol = volumeLamports / 1e9;
  return Math.min((volumeSol / VICTORY_VOLUME_SOL) * 100, 100);
}

/**
 * Check if token has met graduation conditions
 */
export function hasMetGraduationConditions(
  solCollectedLamports: number,
  volumeLamports: number
): boolean {
  const solProgress = calculateSolProgress(solCollectedLamports);
  const volProgress = calculateVolumeProgress(volumeLamports);

  // 99.5% threshold (matches smart contract tolerance)
  return solProgress >= 99.5 && volProgress >= 99.5;
}

/**
 * Check if token is qualified for battle
 */
export function isQualifiedForBattle(solCollectedLamports: number): boolean {
  return solCollectedLamports >= QUALIFICATION_LAMPORTS;
}

/**
 * Get remaining SOL needed for graduation
 */
export function getSolRemaining(solCollectedLamports: number): number {
  const solCollected = solCollectedLamports / 1e9;
  return Math.max(0, TARGET_SOL - solCollected);
}

/**
 * Get tier display info for UI
 */
export function getTierDisplayInfo() {
  return {
    isTestTier: USE_TEST_TIER,
    tierName: ACTIVE_TIER.name,
    tierIcon: ACTIVE_TIER.icon,
    targetSol: TARGET_SOL,
    victoryVolumeSol: VICTORY_VOLUME_SOL,
    qualificationSol: QUALIFICATION_SOL,
    estFinalMcUsd: ACTIVE_TIER.EST_FINAL_MC_USD,
    multiplier: ACTIVE_TIER.MULTIPLIER,
  };
}

// ========================================================================
// DEBUG: Log active tier on import (remove in production)
// ========================================================================
if (typeof window !== 'undefined') {
  console.log(`🎮 BONK BATTLE - Active Tier: ${ACTIVE_TIER.name}`);
  console.log(`   Target SOL: ${TARGET_SOL}`);
  console.log(`   Victory Volume: ${VICTORY_VOLUME_SOL} SOL`);
  console.log(`   Qualification: ${QUALIFICATION_SOL} SOL`);
}
