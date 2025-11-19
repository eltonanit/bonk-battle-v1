// ⚠️ BONK BATTLE PROGRAM ID (sostituito STONKS)
export const PROGRAM_ID = 'HTNCkRMo8A8NFxDS8ANspLC16dgb1WpCSznsfb7BDdK9';
export const NETWORK = 'devnet';
export const RPC_ENDPOINT = 'https://devnet.helius-rpc.com/?api-key=867cca8d-b431-4540-8f55-90c57e3e1c9e';
// Treasury & Admin addresses (from smart contract)
export const TREASURY = 'A84TUvSQLpMoTGqoqNbEuTHJSheVC5cTSjsv3EMwYLmn';
export const ADMIN = 'BNSr8S88xncQGmWjVLW82MnKJcasEXDvaQqYmgKSuAXB';

// Bonding curve constants (match smart contract)
export const TOKEN_DECIMALS = 6;
export const VIRTUAL_RESERVE = 30_000_000_000; // 30 SOL in lamports
export const VIRTUAL_SUPPLY = 1_073_000_191_000_000;
export const CURVE_TOKENS = 793_100_000_000_000; // Tokens available on curve
export const REAL_SUPPLY = 1_000_000_000_000_000; // Total supply

// Tier targets (in SOL)
export const TIER_TARGETS = {
  1: { sol: 1, usd: 100, duration: 3 * 60 },  // ⭐ 3 minuti, 1 SOL
  2: { sol: 2_551, usd: 500_000, duration: 7 * 24 * 60 * 60 },
  3: { sol: 25_510, usd: 5_000_000, duration: 15 * 24 * 60 * 60 },
  4: { sol: 255_102, usd: 50_000_000, duration: 30 * 24 * 60 * 60 }
};

// Fees
export const PLATFORM_FEE_BPS = 200; // 2%
export const REFUND_FEE_BPS = 200; // 2%
export const CREATION_FEE = 0.01; // SOL
