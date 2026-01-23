import { PublicKey } from '@solana/web3.js';

// Get current network from localStorage (client-side only)
function getCurrentNetwork(): 'mainnet' | 'devnet' {
  if (typeof window === 'undefined') return 'mainnet'; // SSR fallback
  return (localStorage.getItem('bonk-network') as 'mainnet' | 'devnet') || 'mainnet';
}

/**
 * BONK BATTLE Program ID
 * V4 xy=k bonding curve - Same program ID for mainnet and devnet
 */
export const BONK_BATTLE_PROGRAM_ID = new PublicKey(
  'F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD'
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
  BONDING_CURVE_SUPPLY: 999_968_377, // 999.97M (99.997%) - V4
  RAYDIUM_RESERVED_SUPPLY: 31_623, // 31,623 (0.003%) - V4
} as const;

// =================================================================
// TIER CONFIGURATION - V4 xy=k BONDING CURVE (1B Multiplier)
// ⚠️ MUST MATCH: anchor/programs/bonk_battle/src/lib.rs
// =================================================================

// Dynamic: Use TEST tier on devnet, PROD on mainnet
export const USE_TEST_TIER = typeof window !== 'undefined' && getCurrentNetwork() === 'devnet';

export const TIER_CONFIG = {
  // V4 TEST TIER - For devnet testing (~€13 target)
  // Contract: TEST_TARGET_SOL = 103_276_434 (~0.103 SOL)
  // Contract: TEST_VICTORY_VOLUME_SOL = 113_604_077 (~0.114 SOL)
  // Contract: TEST_QUALIFICATION_SOL = 1 (1 lamport)
  TEST: {
    TARGET_SOL: 0.103,                // Contract: 103_276_434 lamports
    VICTORY_VOLUME_SOL: 0.114,        // Contract: 113_604_077 lamports (110%)
    QUALIFICATION_SOL: 0.000000001,   // Contract: 1 lamport
    MATCHMAKING_TOLERANCE_SOL: 0.05,  // 50% tolerance for test
    ESTIMATED_MC_FINAL_USD: 10_000_000_000, // $10B (1B multiplier)
  },
  // V4 PROD TIER - For mainnet (~€1B target)
  // Contract: PROD_TARGET_SOL = 8_000_759_000_000_000 (~8M SOL)
  // Contract: PROD_VICTORY_VOLUME_SOL = 8_800_835_000_000_000 (~8.8M SOL)
  // Contract: PROD_QUALIFICATION_SOL = 100_000_000 (0.1 SOL)
  PRODUCTION: {
    TARGET_SOL: 8_000_759,            // Contract: ~8M SOL (~€1B)
    VICTORY_VOLUME_SOL: 8_800_835,    // Contract: ~8.8M SOL (110%)
    QUALIFICATION_SOL: 0.1,           // Contract: 100_000_000 lamports
    MATCHMAKING_TOLERANCE_SOL: 1000,  // 1000 SOL tolerance
    ESTIMATED_MC_FINAL_USD: 10_000_000_000_000, // $10T (1B multiplier from $10)
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
 * Network Configuration - Dynamic based on localStorage
 */
const NETWORK_RPC = {
  mainnet: 'https://mainnet.helius-rpc.com/?api-key=8c51da3b-f506-42bb-9000-1cf7724b3846',
  devnet: 'https://devnet.helius-rpc.com/?api-key=8c51da3b-f506-42bb-9000-1cf7724b3846',
};

export const NETWORK = typeof window !== 'undefined' && getCurrentNetwork() === 'devnet' ? 'devnet' : 'mainnet-beta';
export const RPC_ENDPOINT = typeof window !== 'undefined'
  ? NETWORK_RPC[getCurrentNetwork()]
  : NETWORK_RPC.mainnet;

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

/**
 * Generate Solscan URL (mainnet doesn't need cluster param, devnet does)
 */
export function getSolscanUrl(type: 'tx' | 'token' | 'account', address: string): string {
  const base = `https://solscan.io/${type}/${address}`;
  const network = getCurrentNetwork();
  return network === 'mainnet' ? base : `${base}?cluster=devnet`;
}
