// ============================================================================
// BONK BATTLE - NETWORK CONFIGURATION
// ============================================================================

export type Network = 'mainnet' | 'devnet';

// ============================================================================
// NETWORK CONFIG INTERFACE
// ============================================================================

export interface NetworkConfig {
  name: string;
  rpcEndpoint: string;
  programId: string;
  treasuryWallet: string;
  keeperWallet: string;
  explorerUrl: string;
  cluster: 'mainnet-beta' | 'devnet';
}

// ============================================================================
// CONFIGURATIONS
// ============================================================================

export const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  mainnet: {
    name: 'Mainnet',
    rpcEndpoint: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=8c51da3b-f506-42bb-9000-1cf7724b3846',
    programId: process.env.NEXT_PUBLIC_MAINNET_PROGRAM_ID || 'F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD',
    treasuryWallet: process.env.NEXT_PUBLIC_MAINNET_TREASURY || '5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf',
    keeperWallet: process.env.NEXT_PUBLIC_MAINNET_KEEPER || '65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea',
    explorerUrl: 'https://solscan.io',
    cluster: 'mainnet-beta',
  },
  devnet: {
    name: 'Devnet',
    rpcEndpoint: process.env.NEXT_PUBLIC_DEVNET_RPC_URL || 'https://devnet.helius-rpc.com/?api-key=8c51da3b-f506-42bb-9000-1cf7724b3846',
    programId: process.env.NEXT_PUBLIC_DEVNET_PROGRAM_ID || 'DEVNET_PROGRAM_ID_PLACEHOLDER',
    treasuryWallet: process.env.NEXT_PUBLIC_DEVNET_TREASURY || 'DEVNET_TREASURY_PLACEHOLDER',
    keeperWallet: process.env.NEXT_PUBLIC_DEVNET_KEEPER || 'DEVNET_KEEPER_PLACEHOLDER',
    explorerUrl: 'https://solscan.io?cluster=devnet',
    cluster: 'devnet',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get config for a specific network
 */
export function getNetworkConfig(network: Network): NetworkConfig {
  return NETWORK_CONFIGS[network];
}

/**
 * Get current network from localStorage (client-side only)
 */
export function getCurrentNetwork(): Network {
  if (typeof window === 'undefined') return 'mainnet';
  const saved = localStorage.getItem('bonk-network');
  return (saved === 'devnet' || saved === 'mainnet') ? saved : 'mainnet';
}

/**
 * Get current network config (client-side only)
 */
export function getCurrentNetworkConfig(): NetworkConfig {
  return getNetworkConfig(getCurrentNetwork());
}

/**
 * Generate Solscan URL for current network
 */
export function getSolscanUrl(network: Network, type: 'tx' | 'token' | 'account', address: string): string {
  const config = getNetworkConfig(network);
  const base = `https://solscan.io/${type}/${address}`;
  return config.cluster === 'mainnet-beta' ? base : `${base}?cluster=devnet`;
}

/**
 * Check if Devnet is fully configured
 */
export function isDevnetConfigured(): boolean {
  const config = NETWORK_CONFIGS.devnet;
  return (
    !config.programId.includes('PLACEHOLDER') &&
    !config.treasuryWallet.includes('PLACEHOLDER') &&
    !config.keeperWallet.includes('PLACEHOLDER')
  );
}
