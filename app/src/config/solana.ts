// ========================================================================
// BONK BATTLE - SOLANA CONFIGURATION
// ========================================================================

// ✅ VERIFICATO: Program ID dal smart contract (MAINNET)
export const PROGRAM_ID = 'F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD';
export const NETWORK = 'mainnet-beta';

// ✅ FIX CRITICO: Usa variabile env corretta + Helius MAINNET come fallback
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=54911811-93e0-430b-a296-c18efa362e01';

// ✅ FIX CRITICO: Treasury address dal smart contract (riga 21)
export const TREASURY = '5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf';

// ✅ VERIFICATO: Keeper authority dal smart contract (riga 22)
export const ADMIN = 'Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH';

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

/**
 * Generate Solscan URL (mainnet doesn't need cluster param, devnet does)
 */
export function getSolscanUrl(type: 'tx' | 'token' | 'account', address: string): string {
  const base = `https://solscan.io/${type}/${address}`;
  return NETWORK === 'mainnet-beta' ? base : `${base}?cluster=${NETWORK}`;
}