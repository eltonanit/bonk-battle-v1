// ========================================================================
// BONK BATTLE - MARKET CAP & USD UTILITIES
// ========================================================================
// Calculates market cap based on bonding curve formula from smart contract
// ========================================================================

import { ACTIVE_TIER, TARGET_SOL } from '@/config/tier-config';

// ========================================================================
// BONDING CURVE CONSTANTS (from smart contract)
// ========================================================================

// Multiplier from contract: ~14.68x for Production, ~2.93x for Test
const MULTIPLIER = ACTIVE_TIER.MULTIPLIER;

// Base MC in SOL (TARGET_SOL / MULTIPLIER)
const BASE_MC_SOL = TARGET_SOL / MULTIPLIER;

// ========================================================================
// MARKET CAP CALCULATION
// ========================================================================

/**
 * Calculate Market Cap in USD based on bonding curve
 *
 * Formula from smart contract:
 * - At 0 SOL collected: MC = TARGET_SOL / MULTIPLIER * SOL_PRICE
 * - At TARGET_SOL collected: MC = TARGET_SOL * SOL_PRICE
 * - Linear progression between
 *
 * @param solCollected - SOL collected (in SOL, not lamports)
 * @param solPriceUsd - Current SOL price in USD
 * @returns Market cap in USD
 */
export function calculateMarketCapUsd(
  solCollected: number,
  solPriceUsd: number
): number {
  if (solCollected <= 0) {
    // Initial MC when nothing collected
    return BASE_MC_SOL * solPriceUsd;
  }

  // Progress through bonding curve (0 to 1)
  const progress = Math.min(solCollected / TARGET_SOL, 1);

  // MC range from base to target
  const mcRange = TARGET_SOL - BASE_MC_SOL;

  // Current MC in SOL terms
  const currentMcSol = BASE_MC_SOL + (mcRange * progress);

  // Convert to USD
  return currentMcSol * solPriceUsd;
}

/**
 * Calculate Market Cap in SOL terms (without USD conversion)
 * Useful for displaying "virtual" market cap
 *
 * @param solCollected - SOL collected (in SOL, not lamports)
 * @returns Market cap in SOL
 */
export function calculateMarketCapSol(solCollected: number): number {
  if (solCollected <= 0) {
    return BASE_MC_SOL;
  }

  const progress = Math.min(solCollected / TARGET_SOL, 1);
  const mcRange = TARGET_SOL - BASE_MC_SOL;

  return BASE_MC_SOL + (mcRange * progress);
}

/**
 * Convert SOL amount to USD
 *
 * @param solAmount - Amount in SOL
 * @param solPriceUsd - Current SOL price in USD
 * @returns USD value
 */
export function solToUsd(solAmount: number, solPriceUsd: number): number {
  return solAmount * solPriceUsd;
}

/**
 * Convert lamports to USD
 *
 * @param lamports - Amount in lamports
 * @param solPriceUsd - Current SOL price in USD
 * @returns USD value
 */
export function lamportsToUsd(lamports: number, solPriceUsd: number): number {
  const sol = lamports / 1e9;
  return sol * solPriceUsd;
}

// ========================================================================
// USD FORMATTING
// ========================================================================

/**
 * Format USD value for display
 *
 * @param usd - USD amount
 * @param options - Formatting options
 * @returns Formatted string (e.g., "$1.2K", "$25.5K", "$1.5M")
 */
export function formatUsd(
  usd: number,
  options: {
    showCents?: boolean;
    compact?: boolean;
  } = {}
): string {
  const { showCents = false, compact = true } = options;

  if (compact) {
    if (usd >= 1_000_000) {
      return `$${(usd / 1_000_000).toFixed(2)}M`;
    }
    if (usd >= 1_000) {
      return `$${(usd / 1_000).toFixed(1)}K`;
    }
  }

  if (showCents) {
    return `$${usd.toFixed(2)}`;
  }

  return `$${Math.round(usd).toLocaleString()}`;
}

/**
 * Format USD value with full precision for tooltips
 */
export function formatUsdFull(usd: number): string {
  return `$${usd.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// ========================================================================
// TIER-SPECIFIC VALUES
// ========================================================================

/**
 * Get initial market cap in USD for current tier
 */
export function getInitialMarketCapUsd(solPriceUsd: number): number {
  return BASE_MC_SOL * solPriceUsd;
}

/**
 * Get target (final) market cap in USD for current tier
 */
export function getTargetMarketCapUsd(solPriceUsd: number): number {
  return TARGET_SOL * solPriceUsd;
}

/**
 * Get market cap range info for display
 */
export function getMarketCapRangeInfo(solPriceUsd: number) {
  const initialMc = getInitialMarketCapUsd(solPriceUsd);
  const targetMc = getTargetMarketCapUsd(solPriceUsd);

  return {
    initialMcUsd: initialMc,
    targetMcUsd: targetMc,
    multiplier: MULTIPLIER,
    baseMcSol: BASE_MC_SOL,
    targetSol: TARGET_SOL,
  };
}

// ========================================================================
// DEBUG HELPER
// ========================================================================

export function debugMarketCap(solCollected: number, solPriceUsd: number) {
  const mcSol = calculateMarketCapSol(solCollected);
  const mcUsd = calculateMarketCapUsd(solCollected, solPriceUsd);
  const progress = (solCollected / TARGET_SOL) * 100;

  console.log(`📊 Market Cap Debug:`);
  console.log(`   SOL Collected: ${solCollected.toFixed(4)} SOL`);
  console.log(`   Progress: ${progress.toFixed(2)}%`);
  console.log(`   MC (SOL): ${mcSol.toFixed(4)} SOL`);
  console.log(`   MC (USD): ${formatUsd(mcUsd)} (${formatUsdFull(mcUsd)})`);
  console.log(`   SOL Price: $${solPriceUsd}`);

  return { mcSol, mcUsd, progress };
}
