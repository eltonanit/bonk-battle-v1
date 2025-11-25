'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import Image from 'next/image';

export function Sidebar() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      href: '/create',
      label: 'Create Coin',
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
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      href: '/notifications',
      label: 'Notifications',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      badge: unreadCount
    },
    {
      href: '/hall',
      label: 'The Hall',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      )
    },
    {
      href: '/support',
      label: 'Support',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    },
  ];

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
                ? 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] bg-bonk-gray-orange text-white relative'
                : 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] text-white hover:text-white hover:bg-bonk-card/50 relative'
            }
          >
            <span className="flex-shrink-0">
              {item.icon}
            </span>
            <span>{item.label}</span>

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

        {/* Start Battle Button - Arancione chiaro (no glow, swords icon) */}
        <Link
          href="/create"
          className="flex items-center justify-center gap-2 mx-2 px-4 py-3 bg-bonk-orange-dark rounded-xl text-black font-semibold text-[15px] hover:bg-bonk-orange-dark/90 active:scale-95 transition-all"
        >
          {/* Crossed Swords Icon */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
            <path d="M13 19l6-6" />
            <path d="M16 16l5 5" />
            <path d="M19 21v-2" />
            <path d="M21 19h-2" />
            <path d="M9.5 6.5L21 18V21h-3L6.5 9.5" />
            <path d="M5 11l6-6" />
            <path d="M8 8L3 3" />
            <path d="M3 5v2" />
            <path d="M5 3h2" />
          </svg>
          <span>Start Battle</span>
        </Link>

        {/* Social Icons Row */}
        <div className="flex items-center justify-center gap-4 px-4 py-3">
          {/* X (Twitter) */}
          <a
            href="https://x.com/bonkbattle"
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