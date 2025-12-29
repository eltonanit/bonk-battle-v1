// ========================================================================
// BONK BATTLE - BEST TO WIN CALCULATOR
// ========================================================================
// Calcola il potenziale guadagno basato su:
// 1. Posizione sulla bonding curve (early = più token)
// 2. Loot dal perdente (50% della sua liquidità)
// 3. Listing multiplier (1.75x pump stimato)
// ========================================================================

import {
  BONDING_CURVE_TOKENS,
  VIRTUAL_TOKEN_INIT,
  TARGET_SOL,
  ACTIVE_TIER,
} from '@/config/tier-config';

// ========================================================================
// CONSTANTS
// ========================================================================

const TRADING_FEE_BPS = 200; // 2% fee
const LOOT_PERCENT = 50; // 50% of loser's liquidity
const LISTING_MULTIPLIER = 1.75; // Expected pump at Raydium listing

// ========================================================================
// TYPES
// ========================================================================

export interface TokenBattleData {
  solCollected: number; // SOL collected (in SOL, not lamports)
  tokensSold: number; // Tokens sold from bonding curve
}

export interface BestToWinResult {
  // Main values
  bestToWinSOL: number;
  bestToWinUSD: number;

  // Breakdown
  tokensReceived: number;
  mySharePercent: number;
  myLootShareSOL: number;
  tokenValueSOL: number;

  // Chance
  chancePercent: number;

  // Multiplier
  multiplier: number;

  // Investment
  investmentSOL: number;
  investmentUSD: number;
}

// ========================================================================
// HELPER: Estimate tokens sold from SOL collected
// ========================================================================

/**
 * Stima i token venduti basandosi sui SOL raccolti
 * Usa la formula inversa della bonding curve
 */
function estimateTokensSold(solCollected: number): number {
  if (solCollected <= 0) return 0;

  // Current virtual SOL
  const currentVirtualSol = ACTIVE_TIER.VIRTUAL_SOL_INIT + solCollected;

  // k = initial virtualSol * initial virtualToken
  const k = ACTIVE_TIER.VIRTUAL_SOL_INIT * VIRTUAL_TOKEN_INIT;

  // Current virtual tokens = k / currentVirtualSol
  const currentVirtualToken = k / currentVirtualSol;

  // Tokens sold = initial virtual tokens - current virtual tokens
  const tokensSold = VIRTUAL_TOKEN_INIT - currentVirtualToken;

  return Math.max(0, tokensSold);
}

// ========================================================================
// MAIN CALCULATION FUNCTION
// ========================================================================

/**
 * Calcola il "Best To Win" per un investimento
 *
 * @param investmentSOL - Quanto l'utente vuole investire (in SOL)
 * @param tokenA - Dati del token che l'utente compra
 * @param tokenB - Dati del token avversario (fonte del loot)
 * @param solPriceUSD - Prezzo attuale di SOL in USD
 * @returns Risultato completo del calcolo
 */
export function calculateBestToWin(
  investmentSOL: number,
  tokenA: TokenBattleData,
  tokenB: TokenBattleData,
  solPriceUSD: number
): BestToWinResult {
  // ═══════════════════════════════════════════════════════════════════════
  // STEP 0: Stima tokens sold se non disponibile
  // ═══════════════════════════════════════════════════════════════════════
  const tokensSoldA = tokenA.tokensSold > 0
    ? tokenA.tokensSold
    : estimateTokensSold(tokenA.solCollected);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Calcola token che riceverò dalla bonding curve
  // Formula: tokensOut = (netSol / solRemaining) * tokensRemaining * 0.98
  // ═══════════════════════════════════════════════════════════════════════
  const tokensRemaining = BONDING_CURVE_TOKENS - tokensSoldA;
  const solRemaining = TARGET_SOL - tokenA.solCollected;

  // Se la bonding curve è completa, non posso comprare
  if (tokensRemaining <= 0 || solRemaining <= 0) {
    return createEmptyResult(investmentSOL, solPriceUSD, tokenA, tokenB);
  }

  // Fee 2%
  const fee = investmentSOL * (TRADING_FEE_BPS / 10000);
  const netInvestment = investmentSOL - fee;

  // Token ricevuti (con 2% slippage buffer come nello smart contract)
  const tokensReceived = (netInvestment / solRemaining) * tokensRemaining * 0.98;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Calcola la mia percentuale del token dopo l'acquisto
  // ═══════════════════════════════════════════════════════════════════════
  const totalTokensAfterBuy = tokensSoldA + tokensReceived;
  const mySharePercent = (tokensReceived / totalTokensAfterBuy) * 100;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Calcola il loot dal perdente (50% della sua liquidità)
  // ═══════════════════════════════════════════════════════════════════════
  const totalLoot = tokenB.solCollected * (LOOT_PERCENT / 100);
  const myLootShare = totalLoot * (mySharePercent / 100);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Calcola liquidità totale del winner dopo vittoria
  // Winner riceve: sua liquidità + mio investimento + loot - 5% fee
  // ═══════════════════════════════════════════════════════════════════════
  const winnerLiquidityBeforeFee = tokenA.solCollected + netInvestment + totalLoot;

  // Per "Best To Win" mostriamo PRIMA della platform fee (più attraente)
  // La fee viene comunque applicata ma non la sottraiamo nel display

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 5: Calcola valore dei miei token (proporzionale alla liquidità)
  // ═══════════════════════════════════════════════════════════════════════
  const myTokenValue = winnerLiquidityBeforeFee * (mySharePercent / 100);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 6: Applica LISTING MULTIPLIER (1.75x)
  // ═══════════════════════════════════════════════════════════════════════
  const bestToWinSOL = myTokenValue * LISTING_MULTIPLIER;
  const bestToWinUSD = bestToWinSOL * solPriceUSD;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 7: Calcola chance di vittoria
  // ═══════════════════════════════════════════════════════════════════════
  const totalSol = tokenA.solCollected + tokenB.solCollected;
  const chancePercent = totalSol > 0
    ? (tokenA.solCollected / totalSol) * 100
    : 50;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 8: Calcola multiplier
  // ═══════════════════════════════════════════════════════════════════════
  const multiplier = investmentSOL > 0 ? bestToWinSOL / investmentSOL : 0;

  return {
    bestToWinSOL,
    bestToWinUSD,
    tokensReceived,
    mySharePercent,
    myLootShareSOL: myLootShare,
    tokenValueSOL: myTokenValue,
    chancePercent,
    multiplier,
    investmentSOL,
    investmentUSD: investmentSOL * solPriceUSD,
  };
}

// ========================================================================
// HELPER: Create empty result
// ========================================================================

function createEmptyResult(
  investmentSOL: number,
  solPriceUSD: number,
  tokenA: TokenBattleData,
  tokenB: TokenBattleData
): BestToWinResult {
  const totalSol = tokenA.solCollected + tokenB.solCollected;
  const chancePercent = totalSol > 0
    ? (tokenA.solCollected / totalSol) * 100
    : 50;

  return {
    bestToWinSOL: 0,
    bestToWinUSD: 0,
    tokensReceived: 0,
    mySharePercent: 0,
    myLootShareSOL: 0,
    tokenValueSOL: 0,
    chancePercent,
    multiplier: 0,
    investmentSOL,
    investmentUSD: investmentSOL * solPriceUSD,
  };
}

// ========================================================================
// CONVENIENCE FUNCTIONS
// ========================================================================

/**
 * Calcola la chance di vittoria per entrambi i token
 */
export function calculateChances(
  solCollectedA: number,
  solCollectedB: number
): { chanceA: number; chanceB: number } {
  const total = solCollectedA + solCollectedB;

  if (total <= 0) {
    return { chanceA: 50, chanceB: 50 };
  }

  const chanceA = (solCollectedA / total) * 100;
  const chanceB = (solCollectedB / total) * 100;

  return { chanceA, chanceB };
}

/**
 * Formatta il valore USD per display
 */
export function formatBestToWinUSD(usd: number): string {
  if (usd >= 1000) {
    return `$${(usd / 1000).toFixed(1)}K`;
  }
  return `$${Math.round(usd).toLocaleString()}`;
}

/**
 * Formatta il valore SOL per display
 */
export function formatBestToWinSOL(sol: number): string {
  if (sol >= 1000) {
    return `${(sol / 1000).toFixed(2)}K SOL`;
  }
  if (sol >= 1) {
    return `${sol.toFixed(2)} SOL`;
  }
  return `${sol.toFixed(4)} SOL`;
}

/**
 * Formatta la percentuale per display
 */
export function formatChance(chance: number): string {
  return `${Math.round(chance)}%`;
}

/**
 * Formatta il multiplier per display
 */
export function formatMultiplier(multiplier: number): string {
  return `${multiplier.toFixed(2)}x`;
}
