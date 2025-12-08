// app/src/lib/points.ts
// Helper functions for points system

export type PointsAction =
  | 'create_token'
  | 'buy_token'
  | 'sell_token'
  | 'qualify_token'
  | 'win_battle'
  | 'share_battle'
  | 'share_win'
  | 'referral_joins'
  | 'new_follower'
  | 'daily_login'
  | 'follow_user'
  | 'first_buy';

export const POINTS_VALUES = {
  create_token: 500,
  buy_token: 700,
  sell_token: 100,
  qualify_token: 1000,
  win_battle: 10000,
  share_battle: 500,
  share_win: 2000,
  referral_joins: 5000,
  new_follower: 25,
  daily_login: 100,
  follow_user: 50,
  first_buy: 1000,
};

export const POINTS_MESSAGES = {
  create_token: 'You created a new coin',
  buy_token: 'You bought a coin',
  sell_token: 'You sold a coin',
  qualify_token: 'Your token qualified for battle',
  win_battle: 'Your token won the battle!',
  share_battle: 'You shared a battle',
  share_win: 'You shared your win',
  referral_joins: 'Your referral joined',
  new_follower: 'You got a new follower',
  daily_login: 'Daily login bonus',
  follow_user: 'You followed a user',
  first_buy: 'First buy bonus!',
};

interface AddPointsParams {
  walletAddress: string;
  action: PointsAction;
  tokenMint?: string;
  tokenSymbol?: string;
  tokenImage?: string;
}

interface AddPointsResult {
  success: boolean;
  pointsAdded: number;
  totalPoints: number;
  tier: string;
  message: string;
  error?: string;
}

/**
 * Add points for a user action
 * Returns the result including points added and total
 */
export async function addPoints(params: AddPointsParams): Promise<AddPointsResult> {
  try {
    const response = await fetch('/api/points/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('❌ Failed to add points:', data.error);
      return {
        success: false,
        pointsAdded: 0,
        totalPoints: 0,
        tier: 'bronze',
        message: POINTS_MESSAGES[params.action],
        error: data.error
      };
    }

    console.log(`✅ Added ${data.pointsAdded} points for ${params.action}`);

    return {
      success: true,
      pointsAdded: data.pointsAdded,
      totalPoints: data.totalPoints,
      tier: data.tier,
      message: POINTS_MESSAGES[params.action]
    };
  } catch (error) {
    console.error('❌ Error adding points:', error);
    return {
      success: false,
      pointsAdded: 0,
      totalPoints: 0,
      tier: 'bronze',
      message: POINTS_MESSAGES[params.action],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Add points for creating a token
 */
export async function addPointsForCreateToken(
  walletAddress: string,
  tokenMint: string,
  tokenSymbol?: string,
  tokenImage?: string
): Promise<AddPointsResult> {
  return addPoints({
    walletAddress,
    action: 'create_token',
    tokenMint,
    tokenSymbol,
    tokenImage
  });
}

/**
 * Add points for buying a token
 */
export async function addPointsForBuyToken(
  walletAddress: string,
  tokenMint: string,
  tokenSymbol?: string,
  tokenImage?: string
): Promise<AddPointsResult> {
  return addPoints({
    walletAddress,
    action: 'buy_token',
    tokenMint,
    tokenSymbol,
    tokenImage
  });
}

/**
 * Add points for selling a token
 */
export async function addPointsForSellToken(
  walletAddress: string,
  tokenMint: string,
  tokenSymbol?: string,
  tokenImage?: string
): Promise<AddPointsResult> {
  return addPoints({
    walletAddress,
    action: 'sell_token',
    tokenMint,
    tokenSymbol,
    tokenImage
  });
}

/**
 * Add points for token qualification
 */
export async function addPointsForQualifyToken(
  walletAddress: string,
  tokenMint: string,
  tokenSymbol?: string,
  tokenImage?: string
): Promise<AddPointsResult> {
  return addPoints({
    walletAddress,
    action: 'qualify_token',
    tokenMint,
    tokenSymbol,
    tokenImage
  });
}

/**
 * Add points for winning a battle
 */
export async function addPointsForWinBattle(
  walletAddress: string,
  tokenMint: string,
  tokenSymbol?: string,
  tokenImage?: string
): Promise<AddPointsResult> {
  return addPoints({
    walletAddress,
    action: 'win_battle',
    tokenMint,
    tokenSymbol,
    tokenImage
  });
}

/**
 * Add points for following a user
 */
export async function addPointsForFollowUser(
  walletAddress: string
): Promise<AddPointsResult> {
  return addPoints({
    walletAddress,
    action: 'follow_user'
  });
}

/**
 * Add points for getting a new follower
 */
export async function addPointsForNewFollower(
  walletAddress: string
): Promise<AddPointsResult> {
  return addPoints({
    walletAddress,
    action: 'new_follower'
  });
}
