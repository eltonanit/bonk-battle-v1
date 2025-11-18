'use client';

import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, RPC_ENDPOINT, TIER_TARGETS } from '@/config/solana';
import { deserializeTokenLaunch } from '@/lib/solana/deserialize';

// Complete token data interface
interface TokenData {
  pubkey: string;
  creator: string;
  mint: string;
  tier: number;
  virtualSolInit: number;
  constantK: string;
  targetSol: number;
  deadline: number;
  solRaised: number;
  status: number;
  createdAt: number;
  graduatedAt: number | null;
  meteoraPool: string | null;
  totalBuyers: number;
  totalTokensSold: number;
  name: string;
  symbol: string;
  metadataUri: string;
  bump: number;
  tokenLaunchPDA: string;
  progress: number;
  timeRemaining: number;
  tierConfig: {
    sol: number;
    usd: number;
    duration: number;
  };
  image?: string;
}

export function useTokenData(mintAddress: string) {
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchTokenData() {
      try {
        console.log('🔍 Fetching REAL on-chain data for:', mintAddress);

        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const mint = new PublicKey(mintAddress);

        const [tokenLaunchPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('launch'), mint.toBuffer()],
          new PublicKey(PROGRAM_ID)
        );

        console.log('📍 TokenLaunch PDA:', tokenLaunchPDA.toString());

        const accountInfo = await connection.getAccountInfo(tokenLaunchPDA);

        if (!accountInfo) {
          throw new Error('Token launch account not found on-chain');
        }

        console.log('✅ Account found! Data length:', accountInfo.data.length);

        // 🔧 FIX: Passa ENTRAMBI i parametri!
        const tokenLaunch = deserializeTokenLaunch(accountInfo.data, tokenLaunchPDA);

        if (!tokenLaunch) {
          throw new Error('Failed to deserialize token data');
        }

        console.log('📊 Deserialized data:', tokenLaunch);

        // ⭐ NUOVO: Usa nome/symbol dal contratto come fallback
        let metadata = {
          name: tokenLaunch.name || 'Unknown',
          symbol: tokenLaunch.symbol || 'UNK',
          image: ''
        };

        // Se metadataUri è JSON diretto, parsalo
        if (tokenLaunch.metadataUri && tokenLaunch.metadataUri.startsWith('{')) {
          try {
            const parsed = JSON.parse(tokenLaunch.metadataUri);
            metadata = {
              name: parsed.name || tokenLaunch.name,
              symbol: parsed.symbol || tokenLaunch.symbol,
              image: parsed.image || ''
            };
            console.log('✅ Parsed JSON metadata:', metadata);
          } catch {
            console.warn('Failed to parse JSON metadata, using on-chain data');
          }
        }
        // Se URI è URL, prova a fetchare
        else if (tokenLaunch.metadataUri && tokenLaunch.metadataUri.startsWith('http')) {
          try {
            const metadataRes = await fetch(tokenLaunch.metadataUri);
            if (metadataRes.ok) {
              const externalMeta = await metadataRes.json();
              metadata = {
                name: externalMeta.name || tokenLaunch.name,
                symbol: externalMeta.symbol || tokenLaunch.symbol,
                image: externalMeta.image || ''
              };
            }
          } catch {
            console.warn('Failed to fetch external metadata, using on-chain data');
          }
        }

        const tierConfig = TIER_TARGETS[tokenLaunch.tier as keyof typeof TIER_TARGETS];

        const progress = (tokenLaunch.solRaised / tokenLaunch.targetSol) * 100;

        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = Math.max(0, tokenLaunch.deadline - now);

        if (mounted) {
          setToken({
            ...tokenLaunch,
            ...metadata,
            mint: mintAddress,
            tokenLaunchPDA: tokenLaunchPDA.toString(),
            progress: Math.min(progress, 100),
            timeRemaining,
            tierConfig
          });
          setLoading(false);
        }

      } catch (err: unknown) {
        console.error('❌ Error fetching token:', err);

        // Type-safe error message extraction
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

        if (mounted) {
          setError(errorMessage);
          setLoading(false);
        }
      }
    }

    fetchTokenData();

    const interval = setInterval(fetchTokenData, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [mintAddress]);

  return { token, loading, error };
} 