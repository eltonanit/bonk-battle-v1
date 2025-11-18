import { PublicKey } from '@solana/web3.js';
import { BONK_BATTLE_PROGRAM_ID, PDA_SEEDS } from './constants';

/**
 * Derives the Battle State PDA for a given token mint
 *
 * The Battle State PDA stores all the state information for a token in the BONK BATTLE,
 * including SOL collected, tokens sold, battle status, opponent, and timestamps.
 *
 * @param mint - The public key of the token mint
 * @returns A tuple containing the PDA public key and bump seed
 *
 * @example
 * ```typescript
 * const mint = new PublicKey('...');
 * const [battleStatePDA, bump] = getBattleStatePDA(mint);
 * ```
 */
export function getBattleStatePDA(mint: PublicKey): [PublicKey, number] {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.BATTLE_STATE, mint.toBuffer()],
    BONK_BATTLE_PROGRAM_ID
  );

  return [pda, bump];
}

/**
 * Derives the Price Oracle PDA
 *
 * The Price Oracle PDA stores the current SOL/USD price used by the BONK BATTLE
 * program for market cap calculations and battle qualifications.
 *
 * @returns A tuple containing the PDA public key and bump seed
 *
 * @example
 * ```typescript
 * const [priceOraclePDA, bump] = getPriceOraclePDA();
 * ```
 */
export function getPriceOraclePDA(): [PublicKey, number] {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [PDA_SEEDS.PRICE_ORACLE],
    BONK_BATTLE_PROGRAM_ID
  );

  return [pda, bump];
}

/**
 * Derives the Associated Token Account (ATA) address for a given wallet and mint
 *
 * This is a convenience function for getting the ATA that will hold tokens for a user.
 *
 * @param wallet - The wallet public key
 * @param mint - The token mint public key
 * @param programId - The SPL Token program ID (defaults to Token Program)
 * @returns A tuple containing the ATA public key and bump seed
 *
 * @example
 * ```typescript
 * const wallet = new PublicKey('...');
 * const mint = new PublicKey('...');
 * const [ata, bump] = getAssociatedTokenAddress(wallet, mint);
 * ```
 */
export function getAssociatedTokenAddress(
  wallet: PublicKey,
  mint: PublicKey,
  programId: PublicKey = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
): [PublicKey, number] {
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
  );

  const [address, bump] = PublicKey.findProgramAddressSync(
    [wallet.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return [address, bump];
}

/**
 * Helper function to check if a PDA exists on-chain
 *
 * @param connection - Solana connection object
 * @param pda - The PDA public key to check
 * @returns True if the account exists, false otherwise
 */
export async function pdaExists(
  connection: any,
  pda: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(pda);
    return accountInfo !== null;
  } catch (error) {
    console.error('Error checking PDA existence:', error);
    return false;
  }
}
