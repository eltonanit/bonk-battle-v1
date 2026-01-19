// ========================================================================
// BONK BATTLE - BEST TO WIN CALCULATOR
// ========================================================================
// Calcola il potenziale guadagno basato su:
// 1. Posizione sulla bonding curve (early = più token)
// 2. Loot dal perdente (50% della sua liquidità)
// 3. Listing multiplier (1.75x pump stimato)
// ========================================================================

import {
  TOTAL_SUPPLY,
  BONDING_CURVE_TOKENS,
  VIRTUAL_TOKEN_INIT,
  TARGET_SOL,
  ACTIVE_TIER,
} from '@/config/tier-config';

// ========================================================================
// CONSTANTS
// ========================================================================

const TRADING_FEE_BPS = 200; // 2% fee
const PLATFORM_FEE_BPS = 500; // 5% platform fee on winner
const LOOT_PERCENT = 50; // 50% of loser's liquidity
const LISTING_MULTIPLIER = 1.75; // Fixed listing pump multiplier

// ========================================================================
// TYPES
// ========================================================================

export interface TokenBattleData {
  solCollected: number; // SOL collected (in SOL, not lamports)
  tokensSold: number; // Tokens sold from bonding curve
}

export interface BestToWinResult {
  // Main values - "To Win" = investment + profit
  toWinSOL: number;
  toWinUSD: number;

  // Breakdown
  tokensReceived: number;
  mySharePercent: number;
  myLootShareSOL: number;
  profitSOL: number; // Pure profit (excluding investment)

  // Chance
  chancePercent: number;

  // Multiplier - ALWAYS 1.75x
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
 * Calcola il "To Win" per un investimento
 * TO WIN = Investimento + Profitto (NON solo il profitto!)
 * MULTIPLIER = Sempre 1.75x (fisso)
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

  // Token ricevuti
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
  // ═══════════════════════════════════════════════════════════════════════
  const winnerLiquidityBeforeFee = tokenA.solCollected + netInvestment + totalLoot;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 5: Calcola valore dei miei token (proporzionale alla liquidità)
  // ═══════════════════════════════════════════════════════════════════════
  const myTokenValue = winnerLiquidityBeforeFee * (mySharePercent / 100);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 6: Applica LISTING MULTIPLIER FISSO (1.75x) e calcola profitto
  // ═══════════════════════════════════════════════════════════════════════
  const myTokenValueAfterPump = myTokenValue * LISTING_MULTIPLIER;

  // Profitto = Valore finale - Investimento iniziale
  const profitSOL = myTokenValueAfterPump - investmentSOL;

  // TO WIN = Investimento + Profitto = Valore finale dei token
  const toWinSOL = investmentSOL + Math.max(0, profitSOL);
  const toWinUSD = toWinSOL * solPriceUSD;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 7: Calcola chance di vittoria
  // ═══════════════════════════════════════════════════════════════════════
  const totalSol = tokenA.solCollected + tokenB.solCollected;
  const chancePercent = totalSol > 0
    ? (tokenA.solCollected / totalSol) * 100
    : 50;

  return {
    toWinSOL,
    toWinUSD,
    tokensReceived,
    mySharePercent,
    myLootShareSOL: myLootShare,
    profitSOL: Math.max(0, profitSOL),
    chancePercent,
    multiplier: LISTING_MULTIPLIER, // SEMPRE 1.75x
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
    toWinSOL: investmentSOL * LISTING_MULTIPLIER,
    toWinUSD: investmentSOL * LISTING_MULTIPLIER * solPriceUSD,
    tokensReceived: 0,
    mySharePercent: 0,
    myLootShareSOL: 0,
    profitSOL: investmentSOL * 0.75,
    chancePercent,
    multiplier: LISTING_MULTIPLIER,
    investmentSOL,
    investmentUSD: investmentSOL * solPriceUSD,
  };
}

// ========================================================================
// CONVENIENCE FUNCTIONS
// ========================================================================

/**
 * Calcola la chance di vittoria per entrambi i token
 * Se le chance sono uguali (50/50), mostra 51/49 per sembrare più realistico
 */
export function calculateChances(
  solCollectedA: number,
  solCollectedB: number
): { chanceA: number; chanceB: number } {
  const total = solCollectedA + solCollectedB;

  // Se non c'è liquidità, mostra 51/49 invece di 50/50
  if (total <= 0) {
    return { chanceA: 51, chanceB: 49 };
  }

  const chanceA = (solCollectedA / total) * 100;
  const chanceB = (solCollectedB / total) * 100;

  // Se le chance sono uguali (50/50), mostra 51/49
  if (Math.round(chanceA) === Math.round(chanceB)) {
    return { chanceA: 51, chanceB: 49 };
  }

  return { chanceA, chanceB };
}

/**
 * Formatta il valore USD per display
 */
export function formatToWinUSD(usd: number): string {
  if (usd >= 1000) {
    return `$${(usd / 1000).toFixed(1)}K`;
  }
  return `$${Math.round(usd).toLocaleString()}`;
}

/**
 * Formatta il valore SOL per display
 */
export function formatToWinSOL(sol: number): string {
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
 * Formatta il multiplier per display - SEMPRE 1.75x
 */
export function formatMultiplier(multiplier: number): string {
  return `${multiplier.toFixed(2)}x`;
}