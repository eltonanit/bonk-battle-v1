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
import { RPC_ENDPOINT } from '@/config/solana';

// Import wallet styles
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => {
    console.log('🔗 SolanaProvider usando RPC endpoint:', RPC_ENDPOINT);
    return RPC_ENDPOINT;
  }, []);

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
    // Log but don't crash - autoConnect failures are common and recoverable
    console.warn('⚠️ Wallet error (non-fatal):', error.name, error.message);

    // If it's an autoConnect failure, the user can manually connect later
    // No need to show an alert or disrupt the user experience
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