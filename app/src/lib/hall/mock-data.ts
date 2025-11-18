export interface HallToken {
  id: number;
  name: string;
  emoji: string;
  target: number;
  targetFormatted: string;
  mcap: number;
  holders: number;
  lastPurchase: number;
  gradient: string;
}

export const HALL_TOKENS: HallToken[] = [
  {
    id: 1,
    name: 'GAMESTOP COIN',
    emoji: '👑',
    target: 5_000_000_000_000, // $5 Trillion
    targetFormatted: '$5 Trillion',
    mcap: 1_000_000_000, // $1B start
    holders: 12847,
    lastPurchase: 0,
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
  },
  {
    id: 2,
    name: 'DEEP FUCKING VALUE',
    emoji: '💎',
    target: 500_000_000_000, // $500 Billion
    targetFormatted: '$500 Billion',
    mcap: 920_000_000,
    holders: 11234,
    lastPurchase: 0,
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
  },
  {
    id: 3,
    name: 'ROARING KITTY',
    emoji: '🦁',
    target: 50_000_000_000, // $50 Billion
    targetFormatted: '$50 Billion',
    mcap: 850_000_000,
    holders: 9876,
    lastPurchase: 0,
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
  },
  {
    id: 4,
    name: 'WALLSTREETBETS',
    emoji: '💰',
    target: 5_000_000_000, // $5 Billion
    targetFormatted: '$5 Billion',
    mcap: 800_000_000,
    holders: 8543,
    lastPurchase: 0,
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
  }
];

export function formatMcap(mcap: number): string {
  if (mcap >= 1_000_000_000_000) return `$${(mcap / 1_000_000_000_000).toFixed(2)}T`;
  if (mcap >= 1_000_000_000) return `$${(mcap / 1_000_000_000).toFixed(2)}B`;
  if (mcap >= 1_000_000) return `$${(mcap / 1_000_000).toFixed(2)}M`;
  return `$${mcap.toLocaleString()}`;
}

export function getPercentage(mcap: number, target: number): string {
  return ((mcap / target) * 100).toFixed(2);
}
