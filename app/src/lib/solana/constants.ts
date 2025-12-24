import { PublicKey } from '@solana/web3.js';

/**
 * BONK BATTLE Program ID
 *
 * This is the deployed program address for the BONK BATTLE smart contract on Solana Devnet.
 */
export const BONK_BATTLE_PROGRAM_ID = new PublicKey(
  '6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq'
);

/**
 * PDA Seeds
 *
 * These are the seed strings used to derive Program Derived Addresses (PDAs)
 * for the BONK BATTLE program.
 */
export const PDA_SEEDS = {
  BATTLE_STATE: Buffer.from('battle_state'),
  PRICE_ORACLE: Buffer.from('price_oracle'),
} as const;

/**
 * Token Program IDs
 */
export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);

export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
);

export const SYSTEM_PROGRAM_ID = new PublicKey(
  '11111111111111111111111111111111'
);

/**
 * Battle State Status Enum
 */
export enum BattleStatus {
  Created = 0,
  Qualified = 1,
  InBattle = 2,
  VictoryPending = 3,
  Listed = 4,
}

/**
 * Bonding Curve Constants
 */
export const BONDING_CURVE = {
  TOKEN_DECIMALS: 9, // 9 decimals like SOL
  TOTAL_SUPPLY: 1_000_000_000, // 1B tokens
  BONDING_CURVE_SUPPLY: 793_100_000, // 793.1M (79.31%)
  RAYDIUM_RESERVED_SUPPLY: 206_900_000, // 206.9M (20.69%)
} as const;

// =================================================================
// TIER CONFIGURATION - ALL VALUES IN SOL (price-independent!)
// =================================================================

export const USE_TEST_TIER = false; // Set to false for mainnet PRODUCTION

export const TIER_CONFIG = {
  TEST: {
    TARGET_SOL: 6,              // 6 SOL to fill curve
    VICTORY_VOLUME_SOL: 6.6,    // 6.6 SOL volume (110%)
    QUALIFICATION_SOL: 0.000000001, // Any buy qualifies (1 lamport)
    MATCHMAKING_TOLERANCE_SOL: 3,
    ESTIMATED_MC_FINAL_USD: 820, // @ $137/SOL
  },
  PRODUCTION: {
    TARGET_SOL: 37.7,           // 37.7 SOL to fill curve
    VICTORY_VOLUME_SOL: 41.5,   // 41.5 SOL volume (110%)
    QUALIFICATION_SOL: 0.000000001, // Any buy qualifies (1 lamport)
    MATCHMAKING_TOLERANCE_SOL: 18.85,
    ESTIMATED_MC_FINAL_USD: 25000, // @ $137/SOL
  }
} as const;

// Current tier (switches based on USE_TEST_TIER)
export const CURRENT_TIER = USE_TEST_TIER ? TIER_CONFIG.TEST : TIER_CONFIG.PRODUCTION;

// Convenience exports
export const TARGET_SOL = CURRENT_TIER.TARGET_SOL;
export const VICTORY_VOLUME_SOL = CURRENT_TIER.VICTORY_VOLUME_SOL;
export const QUALIFICATION_SOL = CURRENT_TIER.QUALIFICATION_SOL;

/**
 * Platform Fees (in basis points)
 */
export const FEES = {
  TRADING_FEE_BPS: 200,  // 2% on trades
  PLATFORM_FEE_BPS: 500, // 5% on winner (from contract)
} as const;

/**
 * Wallet Addresses
 */
export const TREASURY_WALLET = new PublicKey(
  '5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf'
);

export const KEEPER_AUTHORITY = new PublicKey(
  '65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea'
);

/**
 * Network Configuration
 */
export const NETWORK = 'devnet' as const;
// RPC pubblico Solana
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';

/**
 * Transaction Limits
 */
export const TRANSACTION_LIMITS = {
  MIN_SOL_AMOUNT: 0.001, // Minimum SOL per transaction
  MAX_SOL_AMOUNT: 100, // Maximum SOL per transaction (100 SOL)
} as const;

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/** Convert lamports to SOL */
export function lamportsToSol(lamports: number | bigint): number {
  return Number(lamports) / 1_000_000_000;
}

/** Convert SOL to lamports */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

/** Calculate SOL progress percentage */
export function calculateSolProgress(solCollected: number): number {
  return Math.min((solCollected / TARGET_SOL) * 100, 100);
}

/** Calculate volume progress percentage */
export function calculateVolumeProgress(volumeSol: number): number {
  return Math.min((volumeSol / VICTORY_VOLUME_SOL) * 100, 100);
}

/** Check if victory conditions are met */
export function hasVictoryConditions(solCollected: number, volumeSol: number): boolean {
  return solCollected >= TARGET_SOL && volumeSol >= VICTORY_VOLUME_SOL;
}

/** Check if qualified for battle */
export function isQualifiedForBattle(solCollected: number): boolean {
  return solCollected >= QUALIFICATION_SOL;
}

/** Format SOL for display */
export function formatSol(sol: number, decimals: number = 2): string {
  return sol.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format USD for display */
export function formatUsd(usd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(usd);
}
