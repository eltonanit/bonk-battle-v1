export interface TokenLaunch {
  id: string;
  mintAddress: string;
  creatorAddress: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  tier: number;
  targetMarketcap: bigint;
  deadline: Date;
  status: string;
  solRaised: bigint;
  totalBuyers: number;
  createdAt: Date;
}

// ==========================================
// TIER CONFIGURATION
// ==========================================

export type TierConfig = {
  tier: 1 | 2 | 3 | 4;
  targetSol: number;
  targetUsd: number;
  duration: number;
  color: string;
  label: string;
};

export const TIER_CONFIGS: Record<number, TierConfig> = {
  1: {
    tier: 1,
    targetSol: 55,
    targetUsd: 5_500,
    duration: 3 * 24 * 60 * 60,
    color: '#3b82f6',
    label: 'TARGET: $50,000',
  },
  2: {
    tier: 2,
    targetSol: 500,
    targetUsd: 50_000,
    duration: 7 * 24 * 60 * 60,
    color: '#fb923c',
    label: 'TARGET: $500,000',
  },
  3: {
    tier: 3,
    targetSol: 2_500,
    targetUsd: 250_000,
    duration: 15 * 24 * 60 * 60,
    color: '#10b981',
    label: 'TARGET: $5,000,000',
  },
  4: {
    tier: 4,
    targetSol: 10_000,
    targetUsd: 1_000_000,
    duration: 30 * 24 * 60 * 60,
    color: '#fbbf24',
    label: 'TARGET: $50,000,000',
  },
};

// ==========================================
// FOMO TICKER EVENTS
// ==========================================

export interface FomoEvent {
  type: 'buy' | 'create';
  user: string;
  token: string;
  amount?: number;
  targetUsd: string;
  emoji: string;
  color: string;
  timestamp: number;
}

// ==========================================
// HOT TOKENS (CAROUSEL)
// ==========================================

export interface HotToken {
  mint: string;
  symbol: string;
  name: string;
  emoji: string;
  price: number;
  change24h: number;
  gradient: string;
}

// ==========================================
// FILTERS
// ==========================================

export type TokenFilter = 'on-fire' | 'about-to-win' | 'new';

// ==========================================
// EXTENDED TOKEN LAUNCH (for UI)
// ==========================================

export interface TokenLaunchExtended extends TokenLaunch {
  progress: number;
  marketCapUsd: number;
  timeRemaining: number;
  emoji?: string;
}
