import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

/**
 * Battle Status Enum
 *
 * Represents the current state of a token in the BONK BATTLE system.
 */
export enum BattleStatus {
  /** Token has been created but not yet qualified for battle */
  Created = 0,
  /** Token has reached qualification threshold and can enter battle */
  Qualified = 1,
  /** Token is currently in an active battle */
  InBattle = 2,
  /** Token has won a battle and victory is pending finalization */
  VictoryPending = 3,
  /** Token has been listed on the exchange */
  Listed = 4,
  /** Token pool has been created on Raydium */
  PoolCreated = 5,  // V2: NEW!
}

/**
 * Battle Tier Enum (V2)
 * 
 * Determines victory thresholds for the token
 */
export enum BattleTier {
  /** Test tier - lower thresholds for devnet testing */
  Test = 0,
  /** Production tier - full thresholds for mainnet */
  Production = 1,
}

// ⭐ TIER_CONFIG is now in constants.ts - import from there!

/**
 * Token Battle State V2
 *
 * Main account that tracks all state for a token participating in BONK BATTLE.
 * This is stored in a PDA derived from ['battle_state', mint].
 */
export interface TokenBattleState {
  /** The mint address of the token */
  mint: PublicKey;
  /** Battle tier (0 = Test, 1 = Production) - V2 */
  tier: BattleTier;
  /** Virtual SOL reserves for bonding curve (V2) */
  virtualSolReserves: BN;
  /** Virtual token reserves for bonding curve (V2) */
  virtualTokenReserves: BN;
  /** Real SOL reserves (actual SOL in pool) (V2) */
  realSolReserves: BN;
  /** Real token reserves (actual tokens in pool) (V2) */
  realTokenReserves: BN;
  /** Total number of tokens sold */
  tokensSold: BN;
  /** Cumulative trade volume in SOL (in lamports) */
  totalTradeVolume: BN;
  /** Whether trading is currently active */
  isActive: boolean;
  /** Current battle status */
  battleStatus: BattleStatus;
  /** The mint address of the opponent (if in battle) */
  opponentMint: PublicKey;
  /** Unix timestamp when token was created */
  creationTimestamp: BN;
  /** Unix timestamp of last trade */
  lastTradeTimestamp: BN;
  /** Unix timestamp when battle started */
  battleStartTimestamp: BN;
  /** Unix timestamp when victory was achieved */
  victoryTimestamp: BN;
  /** Unix timestamp when token was listed */
  listingTimestamp: BN;
  /** PDA bump seed */
  bump: number;
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token metadata URI */
  uri: string;
}

/**
 * Price Oracle Account
 *
 * Stores the current SOL/USD price used for market cap calculations.
 * This is stored in a PDA derived from ['price_oracle'].
 */
export interface PriceOracle {
  /** Current SOL price in USD (with 6 decimals, e.g., 196_000000 = $196) */
  solPriceUsd: BN;
  /** Unix timestamp of last price update */
  lastUpdateTimestamp: BN;
  /** Unix timestamp when next update is allowed */
  nextUpdateTimestamp: BN;
  /** Authority that can update the price */
  keeperAuthority: PublicKey;
  /** Number of times price has been updated */
  updateCount: BN;
}

// ============================================================================
// Events
// ============================================================================

/**
 * Event: Gladiator Forged (V2)
 *
 * Emitted when a new token is created in the BONK BATTLE arena.
 */
export interface GladiatorForged {
  mint: PublicKey;
  creator: PublicKey;
  tier: BattleTier;
  initialMarketCapUsd: BN;
  virtualSolInit: BN;
  constantK: BN;  // u128
  targetSol: BN;
  timestamp: BN;
}

/**
 * Event: Token Purchased (V2)
 *
 * Emitted when someone buys tokens from the bonding curve.
 */
export interface TokenPurchased {
  mint: PublicKey;
  buyer: PublicKey;
  solAmount: BN;
  tokensReceived: BN;
  newMarketCapUsd: BN;
  virtualSolReserves: BN;
  virtualTokenReserves: BN;
  solPrice: BN;
}

/**
 * Event: Token Sold (V2)
 *
 * Emitted when someone sells tokens back to the bonding curve.
 */
export interface TokenSold {
  mint: PublicKey;
  seller: PublicKey;
  tokenAmount: BN;
  solReceived: BN;
  newMarketCapUsd: BN;
  virtualSolReserves: BN;
  virtualTokenReserves: BN;
  solPrice: BN;
}

/**
 * Event: Gladiator Qualified
 *
 * Emitted when a token reaches the qualification threshold for battle.
 */
export interface GladiatorQualified {
  mint: PublicKey;
  marketCapUsd: BN;
  solCollected: BN;
  timestamp: BN;
}

/**
 * Event: Battle Started (V2)
 *
 * Emitted when two tokens enter into battle.
 */
export interface BattleStarted {
  tokenA: PublicKey;
  tokenB: PublicKey;
  mcAUsd: BN;
  mcBUsd: BN;
  tier: BattleTier;
  timestamp: BN;
}

/**
 * Event: Victory Achieved
 *
 * Emitted when a token reaches the victory threshold during battle.
 */
export interface VictoryAchieved {
  winnerMint: PublicKey;
  finalMcUsd: BN;
  finalVolumeUsd: BN;
  solCollected: BN;
  victoryTimestamp: BN;
}

/**
 * Event: Duel Finalized
 *
 * Emitted when a battle is finalized and the winner claims the spoils.
 */
export interface DuelFinalized {
  winnerMint: PublicKey;
  loserMint: PublicKey;
  spoilsTransferred: BN;
  platformFeeCollected: BN;
  totalWinnerLiquidity: BN;
  loserCanRetry: boolean;
  timestamp: BN;
}

/**
 * Event: Listing Withdrawal
 *
 * Emitted when liquidity is withdrawn for exchange listing.
 */
export interface ListingWithdrawal {
  mint: PublicKey;
  solWithdrawn: BN;
  tokensWithdrawn: BN;
  keeper: PublicKey;
  timestamp: BN;
}

/**
 * Event: Price Updated
 *
 * Emitted when the SOL/USD price oracle is updated.
 */
export interface PriceUpdated {
  previousPrice: BN;
  newPrice: BN;
  timestamp: BN;
  updateNumber: BN;
}

// ============================================================================
// Instruction Arguments
// ============================================================================

/**
 * Arguments for create_battle_token instruction (V2)
 */
export interface CreateBattleTokenArgs {
  name: string;
  symbol: string;
  uri: string;
  tier: number;  // V2: NEW!
}

/**
 * Arguments for buy_token instruction (V2)
 */
export interface BuyTokenArgs {
  solAmount: BN;
  minTokensOut: BN;  // V2: NEW! Slippage protection
}

/**
 * Arguments for sell_token instruction (V2)
 */
export interface SellTokenArgs {
  tokenAmount: BN;
  minSolOut: BN;  // V2: NEW! Slippage protection
}

/**
 * Arguments for initialize_price_oracle instruction
 */
export interface InitializePriceOracleArgs {
  initialSolPrice: BN;
}

/**
 * Arguments for update_sol_price instruction
 */
export interface UpdateSolPriceArgs {
  newSolPrice: BN;
}

// ============================================================================
// Error Codes (V2)
// ============================================================================

/**
 * Custom error codes from the BONK BATTLE program V2
 */
export enum BonkBattleError {
  InvalidTokenName = 6000,
  InvalidTokenSymbol = 6001,
  InvalidTokenUri = 6002,
  InvalidTier = 6003,        // V2: NEW
  TierMismatch = 6004,       // V2: NEW
  AmountTooSmall = 6005,
  AmountTooLarge = 6006,
  TradingInactive = 6007,
  InsufficientOutput = 6008,
  SlippageExceeded = 6009,   // V2: NEW
  ExceedsSupply = 6010,
  InsufficientLiquidity = 6011,
  InsufficientBalance = 6012,
  NotQualified = 6013,
  SelfBattle = 6014,
  UnfairMatch = 6015,
  NotInBattle = 6016,
  NoVictoryAchieved = 6017,
  InvalidBattleState = 6018,
  NotOpponents = 6019,
  InvalidTreasury = 6020,
  Unauthorized = 6021,
  MathOverflow = 6022,
  InvalidCurveState = 6023,
  WouldExceedGraduation = 6024,
  NotReadyForListing = 6025,
  NoLiquidityToWithdraw = 6026,
}

/**
 * Map error codes to human-readable messages
 */
export const ERROR_MESSAGES: Record<BonkBattleError, string> = {
  [BonkBattleError.InvalidTokenName]: 'Invalid token name: must be 1-50 characters',
  [BonkBattleError.InvalidTokenSymbol]: 'Invalid token symbol: must be 1-10 characters',
  [BonkBattleError.InvalidTokenUri]: 'Invalid token URI: must be <= 200 characters',
  [BonkBattleError.InvalidTier]: 'Invalid tier: must be 0 (Test) or 1 (Production)',
  [BonkBattleError.TierMismatch]: 'Tier mismatch: both tokens must be same tier',
  [BonkBattleError.AmountTooSmall]: 'Amount too small: minimum transaction required',
  [BonkBattleError.AmountTooLarge]: 'Amount too large: maximum transaction exceeded',
  [BonkBattleError.TradingInactive]: 'Trading is inactive for this token',
  [BonkBattleError.InsufficientOutput]: 'Insufficient output from bonding curve',
  [BonkBattleError.SlippageExceeded]: 'Slippage exceeded: output less than minimum',
  [BonkBattleError.ExceedsSupply]: 'Exceeds available token supply',
  [BonkBattleError.InsufficientLiquidity]: 'Insufficient liquidity in pool',
  [BonkBattleError.InsufficientBalance]: 'Insufficient token balance',
  [BonkBattleError.NotQualified]: 'Token not qualified for battle',
  [BonkBattleError.SelfBattle]: 'Cannot battle against self',
  [BonkBattleError.UnfairMatch]: 'Unfair match: market cap difference too large',
  [BonkBattleError.NotInBattle]: 'Token not currently in battle',
  [BonkBattleError.NoVictoryAchieved]: 'No victory achieved yet',
  [BonkBattleError.InvalidBattleState]: 'Invalid battle state for this operation',
  [BonkBattleError.NotOpponents]: 'Tokens are not opponents',
  [BonkBattleError.InvalidTreasury]: 'Invalid treasury wallet address',
  [BonkBattleError.Unauthorized]: 'Unauthorized: invalid keeper authority',
  [BonkBattleError.MathOverflow]: 'Mathematical overflow in calculation',
  [BonkBattleError.InvalidCurveState]: 'Invalid bonding curve state',
  [BonkBattleError.WouldExceedGraduation]: 'Would exceed graduation threshold',
  [BonkBattleError.NotReadyForListing]: 'Token not ready for listing',
  [BonkBattleError.NoLiquidityToWithdraw]: 'No liquidity to withdraw for listing',
};

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Parsed account data for TokenBattleState V2
 */
export interface ParsedTokenBattleState {
  mint: PublicKey;
  tier: BattleTier;  // V2: NEW
  virtualSolReserves: number;  // V2: NEW
  virtualTokenReserves: number;  // V2: NEW
  realSolReserves: number;  // V2: NEW
  realTokenReserves: number;  // V2: NEW
  tokensSold: number;
  totalTradeVolume: number;
  isActive: boolean;
  battleStatus: BattleStatus;
  opponentMint: PublicKey;
  creationTimestamp: number;
  lastTradeTimestamp: number;
  battleStartTimestamp: number;
  victoryTimestamp: number;
  listingTimestamp: number;
  bump: number;
  // Metadata
  name: string;
  symbol: string;
  uri: string;
  image?: string;  // Parsed from uri JSON
  // Computed fields
  marketCapUsd?: number;
  pricePerToken?: number;
  // ⭐ SOL-based computed fields (V3 - price independent)
  solCollectedSol?: number;   // realSolReserves in SOL
  totalVolumeSol?: number;    // totalTradeVolume in SOL
  solProgress?: number;       // % progress toward TARGET_SOL (0-100)
  volumeProgress?: number;    // % progress toward VICTORY_VOLUME_SOL (0-100)
  // ⭐ Backwards compatibility (V1 fields)
  creator?: PublicKey;  // V1 compat: not stored in V2, derived from first tx
  solCollected?: number;  // V1 compat: now use realSolReserves
}

/**
 * Parsed account data for PriceOracle
 */
export interface ParsedPriceOracle extends Omit<PriceOracle, 'solPriceUsd' | 'lastUpdateTimestamp' | 'nextUpdateTimestamp' | 'updateCount'> {
  solPriceUsd: number;
  lastUpdateTimestamp: number;
  nextUpdateTimestamp: number;
  updateCount: number;
}

/**
 * Battle status display helpers
 */
export const BATTLE_STATUS_LABELS: Record<BattleStatus, string> = {
  [BattleStatus.Created]: 'New',
  [BattleStatus.Qualified]: 'Qualified',
  [BattleStatus.InBattle]: 'In Battle',
  [BattleStatus.VictoryPending]: 'Victory!',
  [BattleStatus.Listed]: 'Listed',
  [BattleStatus.PoolCreated]: 'Pool Created',
};

export const BATTLE_STATUS_COLORS: Record<BattleStatus, string> = {
  [BattleStatus.Created]: 'text-gray-400',
  [BattleStatus.Qualified]: 'text-yellow-500',
  [BattleStatus.InBattle]: 'text-red-500',
  [BattleStatus.VictoryPending]: 'text-green-500',
  [BattleStatus.Listed]: 'text-cyan-500',
  [BattleStatus.PoolCreated]: 'text-purple-500',
};

export const BATTLE_STATUS_BG_COLORS: Record<BattleStatus, string> = {
  [BattleStatus.Created]: 'bg-gray-500/20',
  [BattleStatus.Qualified]: 'bg-yellow-500/20',
  [BattleStatus.InBattle]: 'bg-red-500/20',
  [BattleStatus.VictoryPending]: 'bg-green-500/20',
  [BattleStatus.Listed]: 'bg-cyan-500/20',
  [BattleStatus.PoolCreated]: 'bg-purple-500/20',
};