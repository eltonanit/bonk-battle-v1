'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useNotifications } from '@/providers/NotificationsProvider';
import { useVictory } from '@/components/victory/VictoryProvider';
import Image from 'next/image';

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

  // Nav items - MAIN: Home, Army, Battles, Create Coin, Profile | BELOW: Now, 1000x, Top, Activity
  const allNavItems = useMemo(() => [
    // ===== MAIN SECTION =====
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
      label: 'Army',
      hidden: false,
      isArmy: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    },
    {
      href: '/battlestart',
      label: 'Battles',
      hidden: false,
      isBattles: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
          <path d="M13 19l6-6" />
          <path d="M16 16l4 4" />
          <path d="M19 21l2-2" />
          <path d="M14.5 6.5L21 3v3L9.5 17.5" />
          <path d="M5 14l4-4" />
          <path d="M7 17l-4 4" />
          <path d="M3 19l2 2" />
        </svg>
      )
    },
    {
      href: '/create',
      label: 'Create Coin',
      hidden: false,
      isCreate: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
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
    // ===== BELOW DIVIDER =====
    {
      href: '/now',
      label: 'Now',
      hidden: false,
      belowDivider: true,
      isNow: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      )
    },
    {
      href: '/holders',
      label: '1000x',
      hidden: false,
      belowDivider: true,
      isGreen: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    {
      href: '/top',
      label: 'Top',
      hidden: false,
      belowDivider: true,
      isGold: true,
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
      href: '/activity',
      label: 'Activity',
      hidden: false,
      belowDivider: true,
      isLive: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      )
    },
  ], [totalUnreadCount]);

  // Filter out hidden items
  const navItems = allNavItems.filter(item => !item.hidden);

  // Helper function to get link classes
  const getLinkClasses = (item: typeof allNavItems[0], active: boolean) => {
    const baseClasses = 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] relative';

    // ⭐ Army with yellow/orange gradient styling
    if (item.isArmy) {
      return active
        ? `${baseClasses} bg-yellow-500/20 text-yellow-400`
        : `${baseClasses} text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10`;
    }

    // ⭐ Create Coin with green styling
    if (item.isCreate) {
      return active
        ? `${baseClasses} bg-emerald-500/20 text-emerald-400`
        : `${baseClasses} text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10`;
    }

    // ⭐ Activity with LIVE indicator (white text, light blue when active)
    if (item.isLive) {
      return active
        ? `${baseClasses} bg-sky-500/20 text-sky-400`
        : `${baseClasses} text-white hover:text-white hover:bg-sky-500/10`;
    }

    // ⭐ Battle List with red/orange styling
    if (item.isBattles) {
      return active
        ? `${baseClasses} bg-red-500/20 text-red-400`
        : `${baseClasses} text-red-400 hover:text-red-300 hover:bg-red-500/10`;
    }

    // ⭐ Now page with fire/orange styling
    if (item.isNow) {
      return active
        ? `${baseClasses} bg-orange-500/20 text-orange-400`
        : `${baseClasses} text-orange-400 hover:text-orange-300 hover:bg-orange-500/10`;
    }

    if (item.isGreen) {
      return active
        ? `${baseClasses} bg-green-500/20 text-green-400`
        : `${baseClasses} text-green-400 hover:text-green-300 hover:bg-green-500/10`;
    }

    // Top - Gold styling for victory stories
    if (item.isGold) {
      return active
        ? `${baseClasses} bg-yellow-500/20 text-yellow-400`
        : `${baseClasses} text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10`;
    }

    // Leaderboard - white text, light blue when active
    if (item.href === '/leaderboard') {
      return active
        ? `${baseClasses} bg-sky-500/20 text-sky-400`
        : `${baseClasses} text-white hover:text-white hover:bg-sky-500/10`;
    }

    if (item.href === '/burned') {
      return active
        ? `${baseClasses} bg-red-500/20 text-red-400`
        : `${baseClasses} text-red-500 hover:text-red-400 hover:bg-red-500/10`;
    }

    // Home - white text, light blue when active
    if (item.href === '/') {
      return active
        ? `${baseClasses} bg-sky-500/20 text-sky-400`
        : `${baseClasses} text-white hover:text-white hover:bg-sky-500/10`;
    }

    // Default white with sky blue when active
    return active
      ? `${baseClasses} bg-sky-500/20 text-sky-400`
      : `${baseClasses} text-white hover:text-white hover:bg-bonk-card/50`;
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-56 bg-[#0C1426] border-r border-bonk-border z-50">
      {/* Logo */}
      <div className="p-6 border-b border-bonk-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-[55px] h-[55px] rounded-lg flex items-center justify-center overflow-hidden">
            <Image
              src="/BONK-LOGO.svg"
              alt="Battlecoin Market"
              width={55}
              height={55}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-extrabold text-white">Battlecoin</span>
            <span className="text-xl font-extrabold text-white">Market</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {/* Main Nav Items (Home, Profile, 1000x, Now, Top) */}
        {navItems.filter(item => !item.belowDivider).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={getLinkClasses(item, isActive(item.href))}
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
          </Link>
        ))}

        {/* Divider */}
        <div className="border-t border-bonk-border my-4" />

        {/* Secondary Nav Items */}
        {navItems.filter(item => item.belowDivider).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={getLinkClasses(item, isActive(item.href))}
          >
            <span className="flex-shrink-0">
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>

            {/* LIVE indicator for Activity */}
            {item.isLive && (
              <span className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </span>
            )}

            {/* Badge per notifiche - reserved for future use */}
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
