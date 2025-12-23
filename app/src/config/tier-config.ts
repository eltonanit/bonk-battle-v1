// ========================================================================
// BONK BATTLE - TIER CONFIGURATION
// ========================================================================
// This file must match the smart contract values EXACTLY!
// Smart contract location: contracts/programs/contracts/src/lib.rs
// 
// Formula: Constant Product (xy = k) - Same as Pump.fun
// MC = (virtualSol / virtualToken) × totalSupply × solPrice
// ========================================================================

/**
 * ⚠️ IMPORTANTE: Cambia questa variabile per switchare tra TEST e PRODUCTION
 * Deve corrispondere al valore USE_TEST_TIER nello smart contract!
 */
export const USE_TEST_TIER = false; // ⭐ CAMBIA QUI: true = TEST, false = PRODUCTION

// ========================================================================
// BONDING CURVE CONSTANTS (same for all tiers)
// ========================================================================
export const TOTAL_SUPPLY = 1_000_000_000;           // 1B tokens
export const BONDING_CURVE_TOKENS = 793_100_000;     // 79.31% for bonding curve
export const RAYDIUM_RESERVE_TOKENS = 206_900_000;   // 20.69% for Raydium
export const VIRTUAL_TOKEN_INIT = 1_073_000_000;     // Initial virtual tokens
export const VIRTUAL_TOKEN_FINAL = 279_900_000;      // Final virtual tokens
export const MULTIPLIER = 14.68;                      // MC multiplier (always!)

// ========================================================================
// TIER DEFINITIONS (from smart contract)
// ========================================================================

export const TIER_CONFIG = {
  TEST: {
    name: 'Test Tier',
    description: 'Perfect for devnet testing',
    icon: '🧪',

    // Bonding Curve Values (SOL)
    VIRTUAL_SOL_INIT: 2.05,       // Initial virtual SOL
    VIRTUAL_SOL_FINAL: 7.86,      // Final virtual SOL (init + target)

    // Victory conditions (in SOL)
    TARGET_SOL: 5.8,              // SOL to fill bonding curve
    VICTORY_VOLUME_SOL: 6.4,      // 110% of TARGET_SOL
    QUALIFICATION_SOL: 0.12,      // ~$15 @ $126/SOL

    // In lamports (for smart contract comparison)
    TARGET_SOL_LAMPORTS: 5_800_000_000,
    VICTORY_VOLUME_LAMPORTS: 6_400_000_000,
    QUALIFICATION_LAMPORTS: 120_000_000,
    VIRTUAL_SOL_INIT_LAMPORTS: 2_050_000_000,

    // Matchmaking tolerance (50% of target)
    MATCHMAKING_TOLERANCE_SOL: 2.9,

    // Market Cap in SOL terms (from bonding curve formula)
    // MC_SOL = (virtualSol / virtualToken) × totalSupply
    MC_INIT_SOL: 1.91,            // (2.05 / 1,073,000,000) × 1,000,000,000
    MC_FINAL_SOL: 28.08,          // (7.86 / 279,900,000) × 1,000,000,000

    MULTIPLIER: 14.68,
  },

  PRODUCTION: {
    name: 'Production Tier',
    description: 'For mainnet battles',
    icon: '🚀',

    // Bonding Curve Values (SOL)
    VIRTUAL_SOL_INIT: 13.3,       // Initial virtual SOL
    VIRTUAL_SOL_FINAL: 51,        // Final virtual SOL (13.3 + 37.7)

    // Victory conditions (in SOL)
    TARGET_SOL: 37.7,             // SOL to fill bonding curve
    VICTORY_VOLUME_SOL: 41.5,     // 110% of TARGET_SOL
    QUALIFICATION_SOL: 0.75,      // ~$95 @ $126/SOL

    // In lamports (for smart contract comparison)
    TARGET_SOL_LAMPORTS: 37_700_000_000,
    VICTORY_VOLUME_LAMPORTS: 41_500_000_000,
    QUALIFICATION_LAMPORTS: 750_000_000,
    VIRTUAL_SOL_INIT_LAMPORTS: 13_300_000_000,

    // Matchmaking tolerance (50% of target)
    MATCHMAKING_TOLERANCE_SOL: 18.85,

    // Market Cap in SOL terms (from bonding curve formula)
    // MC_SOL = (virtualSol / virtualToken) × totalSupply
    MC_INIT_SOL: 12.4,            // (13.3 / 1,073,000,000) × 1,000,000,000
    MC_FINAL_SOL: 182.2,          // (51 / 279,900,000) × 1,000,000,000

    MULTIPLIER: 14.68,
  },
} as const;

// ========================================================================
// ACTIVE TIER (based on USE_TEST_TIER flag)
// ========================================================================

export function getActiveTier() {
  return USE_TEST_TIER ? TIER_CONFIG.TEST : TIER_CONFIG.PRODUCTION;
}

export const ACTIVE_TIER = getActiveTier();

// ========================================================================
// CONVENIENCE EXPORTS
// ========================================================================

export const TARGET_SOL = ACTIVE_TIER.TARGET_SOL;
export const VICTORY_VOLUME_SOL = ACTIVE_TIER.VICTORY_VOLUME_SOL;
export const QUALIFICATION_SOL = ACTIVE_TIER.QUALIFICATION_SOL;
export const MATCHMAKING_TOLERANCE_SOL = ACTIVE_TIER.MATCHMAKING_TOLERANCE_SOL;
export const VIRTUAL_SOL_INIT = ACTIVE_TIER.VIRTUAL_SOL_INIT;
export const VIRTUAL_SOL_FINAL = ACTIVE_TIER.VIRTUAL_SOL_FINAL;
export const MC_INIT_SOL = ACTIVE_TIER.MC_INIT_SOL;
export const MC_FINAL_SOL = ACTIVE_TIER.MC_FINAL_SOL;

// Lamport versions
export const TARGET_SOL_LAMPORTS = ACTIVE_TIER.TARGET_SOL_LAMPORTS;
export const VICTORY_VOLUME_LAMPORTS = ACTIVE_TIER.VICTORY_VOLUME_LAMPORTS;
export const QUALIFICATION_LAMPORTS = ACTIVE_TIER.QUALIFICATION_LAMPORTS;

// ========================================================================
// MARKET CAP CALCULATION (Constant Product Formula xy=k)
// ========================================================================

/**
 * Calculate Market Cap in SOL based on bonding curve progress
 * Formula: MC = (currentVirtualSol / currentVirtualToken) × totalSupply
 * 
 * This is the CORRECT Pump.fun formula!
 * 
 * @param solCollected - SOL collected so far (in SOL, not lamports)
 * @returns Market cap in SOL terms
 */
export function calculateMarketCapSol(solCollected: number): number {
  // Current virtual SOL = initial + collected
  const currentVirtualSol = ACTIVE_TIER.VIRTUAL_SOL_INIT + solCollected;

  // Calculate k constant (xy = k)
  const k = ACTIVE_TIER.VIRTUAL_SOL_INIT * VIRTUAL_TOKEN_INIT;

  // Current virtual tokens = k / currentVirtualSol
  const currentVirtualToken = k / currentVirtualSol;

  // MC in SOL = (virtualSol / virtualToken) × totalSupply
  const mcSol = (currentVirtualSol / currentVirtualToken) * TOTAL_SUPPLY;

  return mcSol;
}

/**
 * Calculate Market Cap in USD
 * 
 * @param solCollected - SOL collected so far
 * @param solPriceUsd - Current SOL price from oracle
 * @returns Market cap in USD
 */
export function calculateMarketCapUsd(solCollected: number, solPriceUsd: number): number {
  if (!solPriceUsd || solPriceUsd <= 0) return 0;

  const mcSol = calculateMarketCapSol(solCollected);
  return mcSol * solPriceUsd;
}

/**
 * Get initial market cap in USD (when solCollected = 0)
 */
export function getInitialMarketCapUsd(solPriceUsd: number): number {
  return ACTIVE_TIER.MC_INIT_SOL * solPriceUsd;
}

/**
 * Get final market cap in USD (when bonding curve is full)
 */
export function getFinalMarketCapUsd(solPriceUsd: number): number {
  return ACTIVE_TIER.MC_FINAL_SOL * solPriceUsd;
}

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

export function calculateSolProgress(solCollectedLamports: number): number {
  const solCollected = solCollectedLamports / 1e9;
  return Math.min((solCollected / TARGET_SOL) * 100, 100);
}

export function calculateVolumeProgress(volumeLamports: number): number {
  const volumeSol = volumeLamports / 1e9;
  return Math.min((volumeSol / VICTORY_VOLUME_SOL) * 100, 100);
}

export function hasMetGraduationConditions(
  solCollectedLamports: number,
  volumeLamports: number
): boolean {
  const solProgress = calculateSolProgress(solCollectedLamports);
  const volProgress = calculateVolumeProgress(volumeLamports);
  return solProgress >= 99.5 && volProgress >= 99.5;
}

export function isQualifiedForBattle(solCollectedLamports: number): boolean {
  return solCollectedLamports >= QUALIFICATION_LAMPORTS;
}

export function getSolRemaining(solCollectedLamports: number): number {
  const solCollected = solCollectedLamports / 1e9;
  return Math.max(0, TARGET_SOL - solCollected);
}

export function getTierDisplayInfo() {
  return {
    isTestTier: USE_TEST_TIER,
    tierName: ACTIVE_TIER.name,
    tierIcon: ACTIVE_TIER.icon,
    targetSol: TARGET_SOL,
    victoryVolumeSol: VICTORY_VOLUME_SOL,
    qualificationSol: QUALIFICATION_SOL,
    mcInitSol: ACTIVE_TIER.MC_INIT_SOL,
    mcFinalSol: ACTIVE_TIER.MC_FINAL_SOL,
    multiplier: ACTIVE_TIER.MULTIPLIER,
  };
}

// ========================================================================
// DEBUG
// ========================================================================
if (typeof window !== 'undefined') {
  console.log(`🎮 BONK BATTLE - Active Tier: ${ACTIVE_TIER.name}`);
  console.log(`   Target SOL: ${TARGET_SOL}`);
  console.log(`   Victory Volume: ${VICTORY_VOLUME_SOL} SOL`);
  console.log(`   MC Init: ${ACTIVE_TIER.MC_INIT_SOL} SOL`);
  console.log(`   MC Final: ${ACTIVE_TIER.MC_FINAL_SOL} SOL`);
  console.log(`   Multiplier: ${ACTIVE_TIER.MULTIPLIER}x`);
}