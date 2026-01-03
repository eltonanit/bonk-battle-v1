'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [balanceUsd, setBalanceUsd] = useState<string | null>(null);

  // Fetch balance and SOL price
  useEffect(() => {
    if (!connected || !publicKey) {
      setBalanceUsd(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        // Get SOL balance
        const balance = await connection.getBalance(publicKey);
        const solBalance = balance / LAMPORTS_PER_SOL;

        // Get SOL price
        const priceRes = await fetch('/api/price/sol');
        const priceData = await priceRes.json();
        const solPrice = priceData.price || 0;

        // Calculate USD value
        const usdValue = solBalance * solPrice;
        setBalanceUsd(usdValue.toFixed(2));
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalanceUsd(null);
      }
    };

    fetchBalance();
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [connected, publicKey, connection]);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[rgba(21,22,27,0.95)] backdrop-blur-xl border-t border-white/15 pb-[env(safe-area-inset-bottom)] z-[1000] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around max-w-[600px] mx-auto px-3 py-2">

          {/* HOME */}
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all ${isActive('/') && pathname === '/'
                ? 'text-orange-400 bg-orange-500/20'
                : 'text-white/60'
              }`}
          >
            <span className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold">Home</span>
          </Link>

          {/* CREATE */}
          <Link
            href="/create"
            className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all ${isActive('/create')
                ? 'text-orange-400 bg-orange-500/20'
                : 'text-white/60'
              }`}
          >
            <span className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 0 1 0 4H8" />
                <path d="M12 18V6" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold">Create</span>
          </Link>

          {/* BATTLE - CENTRALE IN ARANCIONE */}
          <Link
            href="/battlestart"
            className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all ${isActive('/battlestart')
                ? 'text-[#FFA019] bg-[#FFA019]/10'
                : 'text-[#FFA019]'
              }`}
          >
            <span className="w-8 h-8" style={{ filter: 'brightness(0) saturate(100%) invert(57%) sepia(81%) saturate(1562%) hue-rotate(358deg) brightness(102%) contrast(101%)' }}>
              <img src="/icons8-battaglia-100.png" alt="Battle" className="w-full h-full object-contain" />
            </span>
            <span className="text-[11px] font-bold">Start</span>
          </Link>

          {/* PROFILE - Shows balance instead of icon */}
          <Link
            href="/profile"
            className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all ${isActive('/profile')
                ? 'text-orange-400 bg-orange-500/20'
                : 'text-white/60'
              }`}
          >
            <span className={`text-[15px] font-bold ${connected && balanceUsd ? 'text-green-400' : 'text-white/40'}`}>
              ${connected && balanceUsd ? balanceUsd : '0'}
            </span>
            <span className="text-[11px] font-semibold">Profile</span>
          </Link>

          {/* ARMY */}
          <Link
            href="/armies"
            className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all ${isActive('/armies')
                ? 'text-green-400 bg-green-500/20'
                : 'text-green-400'
              }`}
          >
            <span className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold">Army</span>
          </Link>

        </div>
      </nav>

      {/* Spacer per contenuto */}
      <div className="lg:hidden h-[calc(140px+env(safe-area-inset-bottom))]" />
    </>
  );
}