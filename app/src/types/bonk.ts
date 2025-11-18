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
}

/**
 * Token Battle State
 *
 * Main account that tracks all state for a token participating in BONK BATTLE.
 * This is stored in a PDA derived from ['battle_state', mint].
 */
export interface TokenBattleState {
  /** The mint address of the token */
  mint: PublicKey;
  /** Total SOL collected from buys (in lamports) */
  solCollected: BN;
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
 * Event: Gladiator Forged
 *
 * Emitted when a new token is created in the BONK BATTLE arena.
 */
export interface GladiatorForged {
  mint: PublicKey;
  creator: PublicKey;
  initialMarketCapUsd: BN;
  initialMarketCapLamports: BN;
  solPriceAtCreation: BN;
  timestamp: BN;
}

/**
 * Event: Token Purchased
 *
 * Emitted when someone buys tokens from the bonding curve.
 */
export interface TokenPurchased {
  mint: PublicKey;
  buyer: PublicKey;
  solAmount: BN;
  tokensReceived: BN;
  newMarketCapUsd: BN;
  solPrice: BN;
}

/**
 * Event: Token Sold
 *
 * Emitted when someone sells tokens back to the bonding curve.
 */
export interface TokenSold {
  mint: PublicKey;
  seller: PublicKey;
  tokenAmount: BN;
  solReceived: BN;
  newMarketCapUsd: BN;
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
 * Event: Battle Started
 *
 * Emitted when two tokens enter into battle.
 */
export interface BattleStarted {
  tokenA: PublicKey;
  tokenB: PublicKey;
  mcAUsd: BN;
  mcBUsd: BN;
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
 * Arguments for create_battle_token instruction
 */
export interface CreateBattleTokenArgs {
  name: string;
  symbol: string;
  uri: string;
}

/**
 * Arguments for buy_token instruction
 */
export interface BuyTokenArgs {
  solAmount: BN;
}

/**
 * Arguments for sell_token instruction
 */
export interface SellTokenArgs {
  tokenAmount: BN;
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
// Error Codes
// ============================================================================

/**
 * Custom error codes from the BONK BATTLE program
 */
export enum BonkBattleError {
  InvalidTokenName = 6000,
  InvalidTokenSymbol = 6001,
  InvalidTokenUri = 6002,
  AmountTooSmall = 6003,
  AmountTooLarge = 6004,
  TradingInactive = 6005,
  InsufficientOutput = 6006,
  ExceedsSupply = 6007,
  InsufficientLiquidity = 6008,
  InsufficientBalance = 6009,
  NotQualified = 6010,
  SelfBattle = 6011,
  UnfairMatch = 6012,
  NotInBattle = 6013,
  NoVictoryAchieved = 6014,
  InvalidBattleState = 6015,
  NotOpponents = 6016,
  InvalidTreasury = 6017,
  Unauthorized = 6018,
  MathOverflow = 6019,
  InvalidCurveState = 6020,
  PriceUpdateTooSoon = 6021,
  WouldExceedGraduation = 6022,
  NotReadyForListing = 6023,
  NoLiquidityToWithdraw = 6024,
}

/**
 * Map error codes to human-readable messages
 */
export const ERROR_MESSAGES: Record<BonkBattleError, string> = {
  [BonkBattleError.InvalidTokenName]: 'Invalid token name: must be 1-50 characters',
  [BonkBattleError.InvalidTokenSymbol]: 'Invalid token symbol: must be 1-10 characters',
  [BonkBattleError.InvalidTokenUri]: 'Invalid token URI: must be <= 200 characters',
  [BonkBattleError.AmountTooSmall]: 'Amount too small: minimum transaction required',
  [BonkBattleError.AmountTooLarge]: 'Amount too large: maximum transaction exceeded',
  [BonkBattleError.TradingInactive]: 'Trading is inactive for this token',
  [BonkBattleError.InsufficientOutput]: 'Insufficient output from bonding curve',
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
  [BonkBattleError.PriceUpdateTooSoon]: 'Price update too soon, must wait 24 hours',
  [BonkBattleError.WouldExceedGraduation]: 'Would exceed graduation threshold',
  [BonkBattleError.NotReadyForListing]: 'Token not ready for listing',
  [BonkBattleError.NoLiquidityToWithdraw]: 'No liquidity to withdraw for listing',
};

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Parsed account data for TokenBattleState
 */
export interface ParsedTokenBattleState extends Omit<TokenBattleState, 'solCollected' | 'tokensSold' | 'totalTradeVolume' | 'creationTimestamp' | 'lastTradeTimestamp' | 'battleStartTimestamp' | 'victoryTimestamp' | 'listingTimestamp'> {
  solCollected: number;
  tokensSold: number;
  totalTradeVolume: number;
  creationTimestamp: number;
  lastTradeTimestamp: number;
  battleStartTimestamp: number;
  victoryTimestamp: number;
  listingTimestamp: number;
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
