'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useNotifications } from '@/providers/NotificationsProvider';
import { useVictory } from '@/components/victory/VictoryProvider';
import Image from 'next/image';
import { FEATURES } from '@/config/features';

export function Sidebar() {
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { unreadCount } = useNotifications();
  const { unreadCount: victoryUnreadCount } = useVictory();
  const [balanceUsd, setBalanceUsd] = useState<string | null>(null);

  // Combine notification counts
  const totalUnreadCount = unreadCount + victoryUnreadCount;

  // Fetch balance
  useEffect(() => {
    if (!connected || !publicKey) {
      setBalanceUsd(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const balance = await connection.getBalance(publicKey);
        const solBalance = balance / LAMPORTS_PER_SOL;
        const priceRes = await fetch('/api/price/sol');
        const priceData = await priceRes.json();
        const solPrice = priceData.price || 0;
        const usdValue = solBalance * solPrice;
        setBalanceUsd(usdValue.toFixed(2));
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalanceUsd(null);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [connected, publicKey, connection]);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  // Nav items with feature flags for Season 1 hiding
  const allNavItems = useMemo(() => [
    {
      href: '/',
      label: 'Home',
      hidden: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      href: '/armies',
      label: 'Armies',
      isGreen: true,
      hidden: !FEATURES.SHOW_ARMIES, // HIDDEN in Season 1
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    },
    {
      href: '/create',
      label: 'Create Coin',
      hidden: !FEATURES.SHOW_CREATE_COIN, // HIDDEN in Season 1 (moved to Admin)
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 0 1 0 4H8" />
          <path d="M12 18V6" />
        </svg>
      )
    },
    {
      href: '/profile',
      label: 'Profile',
      showBalance: true,
      hidden: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      href: '/battlestart',
      label: 'Battles',
      hidden: !FEATURES.SHOW_BATTLES, // HIDDEN in Season 1
      icon: (
        <img
          src="/icons8-battaglia-100.png"
          alt="Battles"
          className="w-6 h-6 brightness-0 invert"
        />
      )
    },
    {
      href: '/notifications',
      label: 'Notifications',
      hidden: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      badge: totalUnreadCount
    },
    {
      href: '/leaderboard',
      label: 'Leaderboard',
      hidden: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      )
    },
    {
      href: '/holders',
      label: 'Holders',
      hidden: !FEATURES.SHOW_POTENTIAL,
      isPurple: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    {
      href: '/support',
      label: 'Support',
      hidden: false,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    },
    {
      href: '/burned',
      label: 'Burned',
      hidden: !FEATURES.SHOW_BURNED, // HIDDEN in Season 1
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      )
    },
  ], [totalUnreadCount]);

  // Filter out hidden items
  const navItems = allNavItems.filter(item => !item.hidden);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-56 bg-bonk-dark border-r border-bonk-border z-50">
      {/* Logo - FIX */}
      {/* Logo */}
      <div className="p-6 border-b border-bonk-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-[55px] h-[55px] rounded-lg flex items-center justify-center overflow-hidden">
            <Image
              src="/BONK-LOGO.svg"
              alt="Bonk Battle"
              width={55}
              height={55}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-extrabold text-white">Bonk</span>
            <span className="text-xl font-extrabold text-white">Battle</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {/* Nav Items */}
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive(item.href)
                ? item.isGreen
                  ? 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] bg-green-500/20 text-green-400 relative'
                  : item.isPurple
                    ? 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] bg-purple-500/20 text-purple-400 relative'
                    : item.href === '/leaderboard'
                      ? 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] bg-orange-500/20 text-orange-400 relative'
                      : item.href === '/burned'
                        ? 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] bg-red-500/20 text-red-400 relative'
                        : 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] bg-orange-500/20 text-orange-400 relative'
                : item.isGreen
                  ? 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] text-green-400 hover:text-green-300 hover:bg-green-500/10 relative'
                  : item.isPurple
                    ? 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 relative'
                    : item.href === '/leaderboard'
                      ? 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 relative'
                      : item.href === '/burned'
                        ? 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] text-red-500 hover:text-red-400 hover:bg-red-500/10 relative'
                        : 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] text-white hover:text-white hover:bg-bonk-card/50 relative'
            }
          >
            <span className="flex-shrink-0">
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>

            {/* Balance per Profile */}
            {item.showBalance && connected && balanceUsd && (
              <span className="text-green-400 font-bold text-sm">
                ${balanceUsd}
              </span>
            )}

            {/* Badge per notifiche */}
            {item.badge && item.badge > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </Link>
        ))}

        {/* Divider */}
        <div className="border-t border-bonk-border my-2" />

        {/* How it works? - Solo testo azzurro */}
        <Link
          href="/how-it-works"
          className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] text-bonk-blue-dark hover:text-bonk-blue-dark hover:bg-bonk-card/50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 flex-shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>How it works?</span>
        </Link>

        {/* Join ARMY Button - HIDDEN in Season 1 */}
        {FEATURES.SHOW_JOIN_ARMY && (
          <Link
            href="/armies"
            className="flex items-center justify-center gap-2 mx-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-black font-bold text-[15px] hover:from-yellow-400 hover:to-orange-400 active:scale-95 transition-all"
          >
            {/* Shield Icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Join ARMY</span>
          </Link>
        )}

        {/* Social Icons Row */}
        <div className="flex items-center justify-center gap-4 px-4 py-3">
          {/* X (Twitter) */}
          <a
            href="https://x.com/bonk_battle?s=20"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-60 hover:opacity-100 transition-opacity"
            aria-label="X (Twitter)"
          >
            <Image
              src="https://img.icons8.com/ios-filled/50/ffffff/twitterx--v2.png"
              alt="X"
              width={24}
              height={24}
              className="w-6 h-6"
            />
          </a>

          {/* Reddit */}
          <a
            href="https://reddit.com/r/bonkbattle"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Reddit"
          >
            <Image
              src="https://img.icons8.com/color/48/reddit.png"
              alt="Reddit"
              width={24}
              height={24}
              className="w-6 h-6"
            />
          </a>

          {/* Telegram */}
          <a
            href="https://t.me/bonkbattle"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Telegram"
          >
            <Image
              src="https://img.icons8.com/ios/50/ffffff/telegram-app.png"
              alt="Telegram"
              width={24}
              height={24}
              className="w-6 h-6"
            />
          </a>
        </div>
      </nav>
    </aside>
  );
}