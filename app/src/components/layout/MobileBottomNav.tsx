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
                ? 'text-sky-400 bg-sky-500/20'
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

          {/* BATTLES */}
          <Link
            href="/battlestart"
            className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all ${isActive('/battlestart')
                ? 'text-red-400 bg-red-500/20'
                : 'text-red-400'
              }`}
          >
            <span className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                <path d="M13 19l6-6" />
                <path d="M16 16l4 4" />
                <path d="M19 21l2-2" />
                <path d="M14.5 6.5L21 3v3L9.5 17.5" />
                <path d="M5 14l4-4" />
                <path d="M7 17l-4 4" />
                <path d="M3 19l2 2" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold">Battles</span>
          </Link>

          {/* CREATE COIN */}
          <Link
            href="/create"
            className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all ${isActive('/create')
                ? 'text-emerald-400 bg-emerald-500/20'
                : 'text-emerald-400'
              }`}
          >
            <span className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold">Create</span>
          </Link>

          {/* NOW - Orange/Fire */}
          <Link
            href="/now"
            className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all ${isActive('/now')
                ? 'text-orange-400 bg-orange-500/20'
                : 'text-orange-400'
              }`}
          >
            <span className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold">Now</span>
          </Link>

          {/* PROFILE - Shows balance */}
          <Link
            href="/profile"
            className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all ${isActive('/profile')
                ? 'text-sky-400 bg-sky-500/20'
                : 'text-white/60'
              }`}
          >
            <span className={`text-[15px] font-bold ${connected && balanceUsd ? 'text-green-400' : 'text-white/40'}`}>
              ${connected && balanceUsd ? balanceUsd : '0'}
            </span>
            <span className="text-[11px] font-semibold">Profile</span>
          </Link>

        </div>
      </nav>

      {/* Spacer per contenuto */}
      <div className="lg:hidden h-[calc(140px+env(safe-area-inset-bottom))]" />
    </>
  );
}