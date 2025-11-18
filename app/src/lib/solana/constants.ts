import { PublicKey } from '@solana/web3.js';

/**
 * BONK BATTLE Program ID
 *
 * This is the deployed program address for the BONK BATTLE smart contract on Solana Devnet.
 */
export const BONK_BATTLE_PROGRAM_ID = new PublicKey(
  'HTNCkRMo8A8NFxDS8ANspLC16dgb1WpCSznsfb7BDdK9'
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
  TOKEN_DECIMALS: 6,
  VIRTUAL_RESERVE: 30_000_000_000, // 30 SOL in lamports
  VIRTUAL_SUPPLY: 1_073_000_191_000_000,
  CURVE_TOKENS: 793_100_000_000_000, // Tokens available on curve
  REAL_SUPPLY: 1_000_000_000_000_000, // Total supply
} as const;

/**
 * Tier Targets (in SOL and USD)
 */
export const TIER_TARGETS = {
  1: { sol: 1, usd: 100, duration: 3 * 60 }, // 3 minutes, 1 SOL
  2: { sol: 2_551, usd: 500_000, duration: 7 * 24 * 60 * 60 }, // 7 days
  3: { sol: 25_510, usd: 5_000_000, duration: 15 * 24 * 60 * 60 }, // 15 days
  4: { sol: 255_102, usd: 50_000_000, duration: 30 * 24 * 60 * 60 }, // 30 days
} as const;

/**
 * Platform Fees (in basis points)
 */
export const FEES = {
  PLATFORM_FEE_BPS: 200, // 2%
  REFUND_FEE_BPS: 200, // 2%
  CREATION_FEE: 0.01, // SOL
} as const;

/**
 * Wallet Addresses
 */
export const TREASURY_WALLET = new PublicKey(
  'A84TUvSQLpMoTGqoqNbEuTHJSheVC5cTSjsv3EMwYLmn'
);

export const ADMIN_WALLET = new PublicKey(
  'BNSr8S88xncQGmWjVLW82MnKJcasEXDvaQqYmgKSuAXB'
);

/**
 * Network Configuration
 */
export const NETWORK = 'devnet' as const;
export const RPC_ENDPOINT = 'https://devnet.helius-rpc.com/?api-key=867cca8d-b431-4540-8f55-90c57e3e1c9e';

/**
 * Transaction Limits
 */
export const TRANSACTION_LIMITS = {
  MIN_SOL_AMOUNT: 0.001, // Minimum SOL per transaction
  MAX_SOL_AMOUNT: 1000, // Maximum SOL per transaction
} as const;
