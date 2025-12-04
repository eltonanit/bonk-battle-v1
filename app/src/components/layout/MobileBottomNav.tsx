'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export function MobileBottomNav() {
  const pathname = usePathname();
  const { connected } = useWallet();

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

          {/* PROFILE */}
          <Link
            href="/profile"
            className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all ${isActive('/profile')
                ? 'text-orange-400 bg-orange-500/20'
                : 'text-white/60'
              }`}
          >
            <span className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold">Profile</span>
          </Link>

          {/* WINNERS */}
          <Link
            href="/winners"
            className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all ${isActive('/winners')
                ? 'text-orange-400 bg-orange-500/20'
                : 'text-white/60'
              }`}
          >
            <span className="w-6 h-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </span>
            <span className="text-[11px] font-semibold">Winners</span>
          </Link>

        </div>
      </nav>

      {/* Spacer per contenuto */}
      <div className="lg:hidden h-[calc(140px+env(safe-area-inset-bottom))]" />
    </>
  );
}