'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useNetwork } from '@/providers/NetworkProvider';
import { isDevnetConfigured } from '@/config/network';

export default function NetPage() {
  const { network, setNetwork } = useNetwork();
  const [selectedNetwork, setSelectedNetwork] = useState<'devnet' | 'mainnet'>(network);

  const devnetReady = isDevnetConfigured();

  const handleConfirm = () => {
    // Se già sulla stessa rete, non fare nulla
    if (selectedNetwork === network) {
      return;
    }

    // Se seleziona Devnet ma non è configurato
    if (selectedNetwork === 'devnet' && !devnetReady) {
      alert('⚠️ Devnet is not configured yet.\n\nThe smart contract needs to be deployed on Devnet first.');
      return;
    }

    // Conferma cambio rete
    const confirmed = confirm(
      `Switch to ${selectedNetwork.toUpperCase()}?\n\n` +
      `This will reload the page and disconnect your wallet.\n` +
      `Make sure you have no pending transactions.`
    );

    if (confirmed) {
      setNetwork(selectedNetwork);
      // Il reload avviene automaticamente nel NetworkProvider
    }
  };

  return (
    <div className="min-h-screen bg-bonk-dark text-white overflow-x-hidden">
      <Sidebar />
      <DesktopHeader />
      <Header />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Card Container */}
          <div className="bg-bonk-card border-2 border-bonk-orange-brand rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-white mb-3">
                Network Selection
              </h1>
              <p className="text-bonk-text text-lg">
                Choose the Solana network for your session
              </p>
            </div>

            {/* Current Network Indicator */}
            <div className="text-center mb-6">
              <span className="text-white/50 text-sm">Currently on: </span>
              <span className={`font-bold ${network === 'mainnet' ? 'text-green-400' : 'text-purple-400'}`}>
                {network.toUpperCase()}
              </span>
            </div>

            {/* Toggle Switch Container */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative bg-bonk-dark rounded-full p-2 inline-flex items-center">
                {/* Background Slider */}
                <div
                  className={`absolute top-2 bottom-2 w-1/2 bg-gradient-to-r transition-all duration-300 ease-in-out rounded-full ${
                    selectedNetwork === 'devnet'
                      ? 'left-2 from-purple-500 to-purple-600'
                      : 'left-1/2 from-green-500 to-green-600'
                  }`}
                />

                {/* Devnet Button */}
                <button
                  onClick={() => setSelectedNetwork('devnet')}
                  className={`relative z-10 px-8 py-4 rounded-full font-bold text-lg transition-colors duration-300 ${
                    selectedNetwork === 'devnet'
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  Devnet
                </button>

                {/* Mainnet Button */}
                <button
                  onClick={() => setSelectedNetwork('mainnet')}
                  className={`relative z-10 px-8 py-4 rounded-full font-bold text-lg transition-colors duration-300 ${
                    selectedNetwork === 'mainnet'
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  Mainnet
                </button>
              </div>
            </div>

            {/* Network Info */}
            <div className="text-center space-y-4">
              {selectedNetwork === 'devnet' ? (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                    <h3 className="text-xl font-bold text-purple-400">Devnet Network</h3>
                  </div>
                  <p className="text-white/70 text-sm">
                    Test network for development and testing purposes.
                    <br />
                    Use test SOL and tokens without real value.
                  </p>
                  {!devnetReady && (
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-400 text-xs">
                        ⚠️ Devnet not configured yet - Smart contract deployment pending
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <h3 className="text-xl font-bold text-green-400">Mainnet Network</h3>
                  </div>
                  <p className="text-white/70 text-sm">
                    Production network with real SOL and tokens.
                    <br />
                    All transactions have real financial value.
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Button */}
            <div className="mt-8 flex justify-center">
              <button
                className={`px-8 py-3 rounded-lg font-bold text-lg transition-all duration-300 ${
                  selectedNetwork === network
                    ? 'bg-gray-500 cursor-not-allowed text-white/50'
                    : selectedNetwork === 'devnet'
                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
                onClick={handleConfirm}
                disabled={selectedNetwork === network}
              >
                {selectedNetwork === network ? 'Already Selected' : 'Confirm Selection'}
              </button>
            </div>

            {/* Info */}
            <div className="mt-8 text-center">
              <p className="text-xs text-white/40">
                🔄 Changing network will reload the page and disconnect your wallet
              </p>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
