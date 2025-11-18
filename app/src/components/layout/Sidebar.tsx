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
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:w-60 bg-[#090909] border-r border-white/10 z-50">
      {/* Logo - FIX */}
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-[55px] h-[55px] rounded-lg flex items-center justify-center overflow-hidden">
            <Image
              src="/L1.png"
              alt="STONKS.FAN"
              width={55}
              height={55}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-2xl font-extrabold">
            <span className="text-white">STONKS</span>
            <span className="text-[#00ff88]">.fan</span>
          </span>
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
                ? 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] bg-white/10 text-white relative'
                : 'flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] text-white/60 hover:text-white hover:bg-white/5 relative'
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
        <div className="border-t border-white/10 my-2" />

        {/* How it works? */}
        <Link
          href="/how-it-works"
          className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-[15px] text-blue-400 hover:text-blue-300 hover:bg-white/5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 flex-shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>How it works?</span>
        </Link>

        {/* Launch a Coin Button - VERDE */}
        <Link
          href="/create"
          className="flex items-center justify-center gap-2 mx-2 px-4 py-3 bg-[#14D99E] rounded-xl text-black font-bold text-[15px] hover:bg-[#12c08d] active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>Launch a Coin</span>
        </Link>

        {/* Social Icons Row */}
        <div className="flex items-center justify-center gap-4 px-4 py-3">
          {/* X (Twitter) */}
          <a
            href="https://x.com/stonksfan"
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
            href="https://reddit.com/r/stonksfan"
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
            href="https://t.me/stonksfan"
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