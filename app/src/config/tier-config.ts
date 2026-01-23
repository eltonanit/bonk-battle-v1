// ========================================================================
// BONK BATTLE - TIER CONFIGURATION
// ========================================================================
// ⚠️ THIS FILE MUST MATCH THE SMART CONTRACT VALUES EXACTLY!
// Smart contract location: anchor/programs/bonk_battle/src/lib.rs
//
// Formula: Constant Product (xy = k) - Same as Pump.fun
// MC = (virtualSol / virtualToken) × totalSupply × solPrice
// ========================================================================

/**
 * Get current network from localStorage (client-side only)
 * Used to determine which tier to use
 */
function getCurrentNetwork(): 'mainnet' | 'devnet' {
  if (typeof window === 'undefined') return 'mainnet'; // SSR fallback
  return (localStorage.getItem('bonk-network') as 'mainnet' | 'devnet') || 'mainnet';
}

/**
 * ⭐ DYNAMIC: USE_TEST_TIER is now based on selected network
 * - devnet = TEST tier (small values for testing)
 * - mainnet = PRODUCTION tier (real values)
 */
export const USE_TEST_TIER = typeof window !== 'undefined' && getCurrentNetwork() === 'devnet';

// ========================================================================
// BONDING CURVE CONSTANTS (from smart contract V4 - xy=k with 1B multiplier)
// ========================================================================
// Contract: const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000_000; // 1B * 10^9
// Contract: const BONDING_CURVE_SUPPLY: u64 = 999_968_377_000_000_000; // 99.997%
// Contract: const RAYDIUM_RESERVED_SUPPLY: u64 = 31_623_000_000_000; // 0.003% (31,623 * 10^9)
export const TOTAL_SUPPLY = 1_000_000_000;           // 1B tokens (without decimals for display)
export const BONDING_CURVE_TOKENS = 999_968_377;     // 99.997% for bonding curve
export const RAYDIUM_RESERVE_TOKENS = 31_623;        // 0.003% for Raydium (V4)
export const VIRTUAL_TOKEN_INIT = 1_000_000_000;     // Initial virtual tokens = TOTAL_SUPPLY (V4)
export const VIRTUAL_TOKEN_FINAL = 31_623;           // Final virtual tokens = RAYDIUM_RESERVE (V4)
export const MULTIPLIER = 1_000_000_000;             // 1 BILLION multiplier (V4!)

// ========================================================================
// TIER DEFINITIONS (from smart contract lib.rs)
// ========================================================================

export const TIER_CONFIG = {
  // ============ TEST TIER (V4 xy=k) ============
  // Contract: const TEST_TARGET_SOL: u64 = 103_276_434; // ~0.103 SOL
  // Contract: const TEST_VICTORY_VOLUME_SOL: u64 = 113_604_077; // ~0.114 SOL (110%)
  // Contract: const TEST_QUALIFICATION_SOL: u64 = 1; // 1 lamport
  TEST: {
    name: 'Test Tier (Devnet)',
    description: 'Perfect for devnet testing - ~0.1 SOL target',
    icon: '🧪',

    // Bonding Curve Values (SOL) - V4 xy=k with 1B multiplier
    VIRTUAL_SOL_INIT: 0.0365,     // Initial virtual SOL (V4)
    VIRTUAL_SOL_FINAL: 0.1395,    // 0.0365 + 0.103 = Final virtual SOL

    // Victory conditions (in SOL) - V4 CONTRACT VALUES
    TARGET_SOL: 0.103,            // Contract: TEST_TARGET_SOL = 103_276_434 (~0.103 SOL)
    VICTORY_VOLUME_SOL: 0.114,    // Contract: TEST_VICTORY_VOLUME_SOL = 113_604_077 (~0.114 SOL)
    QUALIFICATION_SOL: 0.000000001, // Contract: 1 lamport = any buy qualifies

    // In lamports (for smart contract comparison)
    TARGET_SOL_LAMPORTS: 103_276_434,
    VICTORY_VOLUME_LAMPORTS: 113_604_077,
    QUALIFICATION_LAMPORTS: 1,    // Contract: 1 lamport
    VIRTUAL_SOL_INIT_LAMPORTS: 36_500_000,

    // Matchmaking tolerance - FROM CONTRACT
    MATCHMAKING_TOLERANCE_SOL: 0.05, // 50% tolerance for test

    // Market Cap in SOL terms (V4 with 1B multiplier)
    MC_INIT_SOL: 34,              // Initial MC in SOL
    MC_FINAL_SOL: 499,            // Final MC in SOL (14.68x)

    MULTIPLIER: 14.68,
  },

  // ============ PRODUCTION TIER ($10B Market Cap) ============
  // Contract: const PROD_TARGET_SOL: u64 = 14_586_338_000_000_000; // 14,586,338 SOL (~$2.07B)
  // Contract: const PROD_VICTORY_VOLUME_SOL: u64 = 16_044_972_000_000_000; // 16,044,972 SOL
  // Contract: const PROD_QUALIFICATION_SOL: u64 = 1; // 1 lamport
  PRODUCTION: {
    name: 'Battlecoin Market ($10B)',
    description: 'For mainnet battles - $10B Market Cap target',
    icon: '🚀',

    // Bonding Curve Values (SOL) - calculated for 14.68x multiplier
    // V = TARGET / 2.831 to achieve sqrt(14.68) ratio
    VIRTUAL_SOL_INIT: 5_152_186,      // 14,586,338 / 2.831 = Initial virtual SOL
    VIRTUAL_SOL_FINAL: 19_738_524,    // 5,152,186 + 14,586,338 = Final virtual SOL

    // Victory conditions (in SOL) - FROM CONTRACT
    TARGET_SOL: 14_586_338,           // Contract: PROD_TARGET_SOL = 14_586_338_000_000_000
    VICTORY_VOLUME_SOL: 16_044_972,   // Contract: PROD_VICTORY_VOLUME_SOL = 16_044_972_000_000_000
    QUALIFICATION_SOL: 0.000000001,   // Contract: 1 lamport = any buy qualifies

    // In lamports (for smart contract comparison)
    TARGET_SOL_LAMPORTS: 14_586_338_000_000_000,
    VICTORY_VOLUME_LAMPORTS: 16_044_972_000_000_000,
    QUALIFICATION_LAMPORTS: 1,        // Contract: 1 lamport
    VIRTUAL_SOL_INIT_LAMPORTS: 5_152_186_000_000_000,

    // Matchmaking tolerance - FROM CONTRACT (note: comment says "50% of 37.7" but value is 18.85 SOL)
    // Contract: MATCHMAKING_TOLERANCE_SOL = 18_850_000_000 (18.85 SOL)
    // ⚠️ This seems outdated in contract - should be ~7.3M SOL for 50% of new target
    MATCHMAKING_TOLERANCE_SOL: 18.85,

    // Market Cap in SOL terms (from bonding curve formula)
    // MC_SOL = (virtualSol / virtualToken) × totalSupply
    MC_INIT_SOL: 4_801_661,           // (5,152,186 / 1,073,000,000) × 1,000,000,000
    MC_FINAL_SOL: 70_488_384,         // MC_INIT * 14.68

    MULTIPLIER: 14.68,
  },
} as const;

// ========================================================================
// ACTIVE TIER (based on network - dynamic at runtime)
// ========================================================================

/**
 * Get the active tier based on current network selection
 * This function checks localStorage every time to ensure correct tier after network switch
 */
export function getActiveTier() {
  const isDevnet = typeof window !== 'undefined' && getCurrentNetwork() === 'devnet';
  return isDevnet ? TIER_CONFIG.TEST : TIER_CONFIG.PRODUCTION;
}

// For backward compatibility - but prefer using getActiveTier() for runtime accuracy
export const ACTIVE_TIER = getActiveTier();

// ========================================================================
// CONVENIENCE EXPORTS (Dynamic getters)
// ========================================================================

// These getters ensure correct values even after network switch
export const TARGET_SOL = (() => getActiveTier().TARGET_SOL)();
export const VICTORY_VOLUME_SOL = (() => getActiveTier().VICTORY_VOLUME_SOL)();
export const QUALIFICATION_SOL = (() => getActiveTier().QUALIFICATION_SOL)();
export const MATCHMAKING_TOLERANCE_SOL = (() => getActiveTier().MATCHMAKING_TOLERANCE_SOL)();
export const VIRTUAL_SOL_INIT = (() => getActiveTier().VIRTUAL_SOL_INIT)();
export const VIRTUAL_SOL_FINAL = (() => getActiveTier().VIRTUAL_SOL_FINAL)();
export const MC_INIT_SOL = (() => getActiveTier().MC_INIT_SOL)();
export const MC_FINAL_SOL = (() => getActiveTier().MC_FINAL_SOL)();

// Lamport versions
export const TARGET_SOL_LAMPORTS = (() => getActiveTier().TARGET_SOL_LAMPORTS)();
export const VICTORY_VOLUME_LAMPORTS = (() => getActiveTier().VICTORY_VOLUME_LAMPORTS)();
export const QUALIFICATION_LAMPORTS = (() => getActiveTier().QUALIFICATION_LAMPORTS)();

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
  const tier = getActiveTier();

  // Current virtual SOL = initial + collected
  const currentVirtualSol = tier.VIRTUAL_SOL_INIT + solCollected;

  // Calculate k constant (xy = k)
  const k = tier.VIRTUAL_SOL_INIT * VIRTUAL_TOKEN_INIT;

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
  const tier = getActiveTier();
  return tier.MC_INIT_SOL * solPriceUsd;
}

/**
 * Get final market cap in USD (when bonding curve is full)
 */
export function getFinalMarketCapUsd(solPriceUsd: number): number {
  const tier = getActiveTier();
  return tier.MC_FINAL_SOL * solPriceUsd;
}

// ========================================================================
// HELPER FUNCTIONS (All use getActiveTier() for dynamic network support)
// ========================================================================

export function calculateSolProgress(solCollectedLamports: number): number {
  const tier = getActiveTier();
  const solCollected = solCollectedLamports / 1e9;
  return Math.min((solCollected / tier.TARGET_SOL) * 100, 100);
}

export function calculateVolumeProgress(volumeLamports: number): number {
  const tier = getActiveTier();
  const volumeSol = volumeLamports / 1e9;
  return Math.min((volumeSol / tier.VICTORY_VOLUME_SOL) * 100, 100);
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
  const tier = getActiveTier();
  return solCollectedLamports >= tier.QUALIFICATION_LAMPORTS;
}

export function getSolRemaining(solCollectedLamports: number): number {
  const tier = getActiveTier();
  const solCollected = solCollectedLamports / 1e9;
  return Math.max(0, tier.TARGET_SOL - solCollected);
}

export function getTierDisplayInfo() {
  const tier = getActiveTier();
  const isDevnet = typeof window !== 'undefined' && getCurrentNetwork() === 'devnet';
  return {
    isTestTier: isDevnet,
    tierName: tier.name,
    tierIcon: tier.icon,
    targetSol: tier.TARGET_SOL,
    victoryVolumeSol: tier.VICTORY_VOLUME_SOL,
    qualificationSol: tier.QUALIFICATION_SOL,
    mcInitSol: tier.MC_INIT_SOL,
    mcFinalSol: tier.MC_FINAL_SOL,
    multiplier: tier.MULTIPLIER,
  };
}

// ========================================================================
// DEBUG (logs active tier on page load)
// ========================================================================
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure localStorage is ready
  setTimeout(() => {
    const tier = getActiveTier();
    const network = getCurrentNetwork();
    console.log(`🎮 BONK BATTLE - Network: ${network} | Active Tier: ${tier.name}`);
    console.log(`   Target SOL: ${tier.TARGET_SOL}`);
    console.log(`   Victory Volume: ${tier.VICTORY_VOLUME_SOL} SOL`);
    console.log(`   MC Init: ${tier.MC_INIT_SOL} SOL`);
    console.log(`   MC Final: ${tier.MC_FINAL_SOL} SOL`);
    console.log(`   Multiplier: ${tier.MULTIPLIER}x`);
  }, 100);
}