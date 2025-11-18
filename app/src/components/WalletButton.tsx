'use client';

import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export function WalletButton() {
  const { connected, publicKey, disconnect } = useWallet();
  const [isOpen, setIsOpen] = useState(false);

  const truncateAddress = (address: string) => {
    return address.slice(0, 4) + '...' + address.slice(-4);
  };

  // Desktop: usa il bottone standard
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    return (
      <WalletMultiButtonDynamic className="!bg-[#14D99E] !text-black !border-none !px-6 !py-2.5 !rounded-lg !font-semibold !text-[15px] hover:!scale-105 hover:!shadow-lg hover:!shadow-emerald-500/30 !transition-all !duration-200" />
    );
  }

  // Mobile: custom button con dropdown
  if (connected && publicKey) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-[#14D99E] text-black px-4 py-2 rounded-lg font-semibold text-sm"
        >
          <span>{truncateAddress(publicKey.toString())}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            {/* Backdrop per chiudere */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1b21] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50">
              <button
                onClick={() => {
                  disconnect();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-2 text-white"
              >
                <span>🚪</span>
                <span>Disconnect</span>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Mobile: non connesso
  return (
    <WalletMultiButtonDynamic className="!bg-[#14D99E] !text-black !border-none !px-4 !py-2 !rounded-lg !font-semibold !text-sm" />
  );
}