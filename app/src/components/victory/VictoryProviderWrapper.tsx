'use client';

import { ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { VictoryProvider } from './VictoryProvider';

interface VictoryProviderWrapperProps {
  children: ReactNode;
}

export function VictoryProviderWrapper({ children }: VictoryProviderWrapperProps) {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  return (
    <VictoryProvider userWallet={walletAddress}>
      {children}
    </VictoryProvider>
  );
}
