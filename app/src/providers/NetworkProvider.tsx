'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type Network = 'mainnet' | 'devnet';

interface NetworkContextType {
  network: Network;
  setNetwork: (network: Network) => void;
  isMainnet: boolean;
  isDevnet: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetworkState] = useState<Network>('mainnet');
  const [isHydrated, setIsHydrated] = useState(false);

  // Leggi da localStorage al mount (client-side only)
  useEffect(() => {
    const savedNetwork = localStorage.getItem('bonk-network') as Network | null;
    if (savedNetwork === 'devnet' || savedNetwork === 'mainnet') {
      setNetworkState(savedNetwork);
    }
    setIsHydrated(true);
  }, []);

  // Funzione per cambiare network
  const setNetwork = (newNetwork: Network) => {
    setNetworkState(newNetwork);
    localStorage.setItem('bonk-network', newNetwork);

    // Reload per ricaricare tutti i provider con la nuova config
    window.location.reload();
  };

  // Evita hydration mismatch - mostra sempre mainnet durante SSR
  if (!isHydrated) {
    return (
      <NetworkContext.Provider
        value={{
          network: 'mainnet',
          setNetwork,
          isMainnet: true,
          isDevnet: false,
        }}
      >
        {children}
      </NetworkContext.Provider>
    );
  }

  return (
    <NetworkContext.Provider
      value={{
        network,
        setNetwork,
        isMainnet: network === 'mainnet',
        isDevnet: network === 'devnet',
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
}

// ============================================================================
// HELPER (per uso fuori da React, es. config iniziale)
// ============================================================================

export function getCurrentNetwork(): Network {
  if (typeof window === 'undefined') return 'mainnet';
  const saved = localStorage.getItem('bonk-network');
  return (saved === 'devnet' || saved === 'mainnet') ? saved : 'mainnet';
}
