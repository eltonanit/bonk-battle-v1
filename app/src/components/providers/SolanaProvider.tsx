'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletError } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { useMemo, useCallback } from 'react';
import { useNetwork } from '@/providers/NetworkProvider';
import { getNetworkConfig } from '@/config/network';

// Import wallet styles
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const { network } = useNetwork();
  const config = getNetworkConfig(network);

  const endpoint = useMemo(() => {
    console.log(`🔗 SolanaProvider usando ${config.name}:`, config.rpcEndpoint);
    return config.rpcEndpoint;
  }, [config]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  // Handle wallet errors gracefully - don't crash the app
  const onError = useCallback((error: WalletError) => {
    console.warn('⚠️ Wallet error (non-fatal):', error.name, error.message);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect
        onError={onError}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
