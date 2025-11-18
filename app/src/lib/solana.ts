import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta';
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);

export const connection = new Connection(SOLANA_RPC_URL, {
  commitment: 'confirmed',
});

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || 'STONKSxVH8RuaFsBUq9WoPvDXvCzYvbXBWYfF2E9x'
);
