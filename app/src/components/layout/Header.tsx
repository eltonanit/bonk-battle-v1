'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { usePathname } from 'next/navigation';
import { useNotifications } from '@/providers/NotificationsProvider';
import { useFollowers } from '@/hooks/useFollowers';
import { useProfile } from '@/hooks/useProfile';
import { useVictory } from '@/components/victory/VictoryProvider';
import { JoinArmyButton } from '@/components/shared/JoinArmyButton';
import { PointsIcon } from '@/components/icons/PointsIcon';
import { FEATURES } from '@/config/features';
import { useNetwork } from '@/providers/NetworkProvider';

export function Header() {
  const { connected, publicKey, disconnect, select, wallets } = useWallet();
  const { setVisible } = useWalletModal();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { feedUnreadCount } = useFollowers();
  const { profile } = useProfile();
  const { unreadCount: victoryUnreadCount } = useVictory();
  const { network, isMainnet, isDevnet } = useNetwork();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Combine notification counts
  const totalUnreadCount = unreadCount + victoryUnreadCount;

  // Track se già registrato in questa sessione
  const hasRegistered = useRef<string | null>(null);

  // Check if on points page
  const isOnPointsPage = pathname === '/points';

  // Auto-registra utente quando si connette il wallet
  useEffect(() => {
    async function registerUser() {
      if (!publicKey) return;

      const wallet = publicKey.toString();

      // Evita registrazioni duplicate nella stessa sessione
      if (hasRegistered.current === wallet) return;

      try {
        const response = await fetch('/api/user/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet })
        });

        const data = await response.json();

        if (data.success) {
          hasRegistered.current = wallet;
          console.log(`✅ User registered: ${wallet.slice(0, 6)}... (new: ${data.isNew})`);
        }
      } catch (err) {
        console.error('❌ Failed to register user:', err);
      }
    }

    if (connected && publicKey) {
      registerUser();
    }
  }, [connected, publicKey]);

  // ⭐ FIX: Funzione per gestire il login su mobile con deep link Phantom
  const handleLogin = async () => {
    try {
      // Detect se siamo su mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      // Check se Phantom è disponibile (browser Phantom o estensione desktop)
      const isPhantomInstalled = (window as any).phantom?.solana?.isPhantom || (window as any).solana?.isPhantom;

      if (isMobile && !isPhantomInstalled) {
        // Su mobile senza Phantom browser → usa deep link
        const currentUrl = window.location.href;
        const encodedUrl = encodeURIComponent(currentUrl);

        // Prova prima il deep link nativo phantom://
        const phantomDeepLink = `phantom://browse/${encodedUrl}`;

        // Fallback al universal link se phantom:// non funziona
        const phantomUniversalLink = `https://phantom.app/ul/browse/${encodedUrl}`;

        console.log('📱 Mobile detected, opening Phantom deep link...');

        // Prova ad aprire con phantom://
        window.location.href = phantomDeepLink;

        // Se dopo 2 secondi siamo ancora qui, prova il universal link
        setTimeout(() => {
          if (document.hasFocus()) {
            console.log('🔄 Trying universal link fallback...');
            window.location.href = phantomUniversalLink;
          }
        }, 2000);

        return;
      }

      // Su desktop o mobile con Phantom già disponibile
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');

      if (phantomWallet) {
        select(phantomWallet.adapter.name);

        // Piccolo delay per permettere la selezione
        setTimeout(() => {
          if (!connected) {
            setVisible(true);
          }
        }, 100);
      } else {
        // Fallback: apri il modal normale
        setVisible(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      setVisible(true);
    }
  };

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      alert('Address copied!');
      setShowDropdown(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
  };

  return (
    <>
      <header className="lg:hidden fixed top-[42px] left-0 right-0 z-50 bg-bonk-dark/95 backdrop-blur-xl border-b border-bonk-border">
        <div className="relative">
          {/* Riga 1: X + Join ARMY + Start Battle + Login */}
          <div className="px-3 py-2 flex items-center justify-end gap-1.5">
            {/* X (Twitter) Icon */}
            <a
              href="https://x.com/bonk_battle?s=20"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-black rounded-lg hover:opacity-80 transition-opacity"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* Join ARMY Button - HIDDEN in Season 1 */}
            {FEATURES.SHOW_JOIN_ARMY && <JoinArmyButton size="md" />}

            {/* NET Button - Verde */}
            <Link
              href="/net"
              className="bg-green-500 hover:bg-green-600 text-white px-2.5 py-1.5 rounded-lg font-bold text-xs transition-colors whitespace-nowrap"
            >
              NET
            </Link>

            {/* Network Badge - Dynamic based on selected network */}
            {isMainnet ? (
              <div className="bg-green-400 text-black px-1.5 py-0.5 rounded text-[8px] font-bold shadow-md shadow-green-400/50 transform rotate-12">
                MAINNET
              </div>
            ) : (
              <div className="bg-purple-400 text-black px-1.5 py-0.5 rounded text-[8px] font-bold shadow-md shadow-purple-400/50 transform rotate-12">
                DEVNET
              </div>
            )}

            {/* COLOR Button - Blu */}
            <Link
              href="/color"
              className="bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1.5 rounded-lg font-bold text-xs transition-colors whitespace-nowrap"
            >
              COLOR
            </Link>

            {/* Login/Profile */}
            {!connected ? (
              <button
                onClick={handleLogin}
                className="bg-bonk-gold text-black px-2.5 py-1.5 rounded-lg font-bold text-xs hover:bg-bonk-gold/90 transition-colors whitespace-nowrap"
              >
                Log in
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-1 bg-transparent hover:bg-white/5 p-1 rounded-lg transition-colors"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={profile?.avatar_url || '/profilo.png'}
                      alt="Profile"
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <svg
                    className={`w-3 h-3 transition-transform flex-shrink-0 ${showDropdown ? 'rotate-180' : ''}`}
                    fill="#FF8A5B"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowDropdown(false)}
                    />

                    {/* Menu */}
                    <div className="absolute top-full right-0 mt-2 min-w-[150px] bg-bonk-card border border-bonk-orange-brand rounded-lg shadow-xl overflow-hidden z-50">
                      <Link
                        href="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profile</span>
                      </Link>
                      <Link
                        href="/profile?tab=balance"
                        onClick={() => setShowDropdown(false)}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Balance</span>
                      </Link>
                      <button
                        onClick={handleCopyAddress}
                        className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy Address</span>
                      </button>
                      <button
                        onClick={handleDisconnect}
                        className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Logo Grande Centrale - Posizionato tra Riga 1 e Riga 2 */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <Link href="/" className="flex items-center">
              <div className="w-[60px] h-[60px] rounded-lg flex items-center justify-center overflow-hidden bg-bonk-dark/95 backdrop-blur-xl">
                <Image
                  src="/BONK-LOGO.svg"
                  alt="Battlecoin Market"
                  width={60}
                  height={60}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Riga 2: 3 Notification Icons (center) + Hamburger Menu (right, orange) */}
          <div className="px-3 pt-2 pb-1 flex items-center justify-between">
            {/* Empty space on left for logo */}
            <div className="w-[60px]" />

            {/* 3 Notification Icons - Centered */}
            <div className="flex items-center gap-4 justify-center flex-1">
              {/* Feed/Followers Icon */}
              <Link href="/feed-followers" className="p-2 bg-bonk-dark/95 backdrop-blur-xl rounded-lg hover:bg-white/5 transition-colors relative">
                <svg className="w-6 h-6 text-bonk-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {/* Feed Badge */}
                {feedUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {feedUnreadCount > 99 ? '99+' : feedUnreadCount}
                  </span>
                )}
              </Link>

              {/* ⭐ Points Icon - NEW Plus Icon with orange background when active */}
              <Link
                href="/points"
                className={`p-2 backdrop-blur-xl rounded-lg transition-colors ${isOnPointsPage
                    ? 'bg-orange-500/20'
                    : 'bg-bonk-dark/95 hover:bg-white/5'
                  }`}
              >
                <PointsIcon className={`w-6 h-6 ${isOnPointsPage ? 'text-orange-400' : 'text-bonk-text'}`} />
              </Link>

              {/* Notifications Icon */}
              <Link href="/notifications" className="p-2 bg-bonk-dark/95 backdrop-blur-xl rounded-lg hover:bg-white/5 transition-colors relative">
                <svg className="w-6 h-6 text-bonk-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {/* Notification Badge */}
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Hamburger Menu - Right side with orange stripes */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#FF8A5B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {showMobileMenu ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay - Stile Four.meme */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/90 z-[60]"
            onClick={() => setShowMobileMenu(false)}
          />

          {/* Menu Panel */}
          <div className="lg:hidden fixed top-0 right-0 w-[280px] h-full bg-bonk-dark z-[70] overflow-y-auto">
            {/* Close Button */}
            <div className="flex justify-end p-4">
              <button
                onClick={() => setShowMobileMenu(false)}
                className="text-white p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Items */}
            <div className="px-4 pb-6 space-y-1">
              {/* How It Works - Top with blue background */}
              <Link
                href="/how-it-works"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-sm rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>How It Works</span>
              </Link>

              {/* Follow us on X */}
              <a
                href="https://x.com/bonk_battle?s=20"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-[#FFB088] font-medium text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Follow us on X</span>
              </a>
              {/* Orange divider line */}
              <div className="mx-4 border-t border-[#FFB088]/50" />

              {/* BATTLE Section */}
              <div className="text-xs text-gray-500 uppercase tracking-wider px-4 pt-2 pb-1">Battle</div>

              {/* Live Battles - Goes to Home */}
              <Link
                href="/"
                className="flex items-center gap-3 px-4 py-3 text-white font-medium text-base hover:bg-orange-500/10 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Live Battles</span>
                <span className="ml-auto px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">LIVE</span>
              </Link>

              {/* Create Token */}
              <Link
                href="/create"
                className="flex items-center gap-3 px-4 py-3 text-white font-medium text-base hover:bg-orange-500/10 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Token</span>
              </Link>

              {/* Divider */}
              <div className="border-t border-bonk-border my-3" />

              {/* COMMUNITY Section */}
              <div className="text-xs text-gray-500 uppercase tracking-wider px-4 pt-2 pb-1">Community</div>

              {/* Join ARMY - HIDDEN in Season 1 */}
              {FEATURES.SHOW_JOIN_ARMY && (
                <Link
                  href="/armies"
                  className="flex items-center gap-3 px-4 py-3 text-white font-medium text-base hover:bg-yellow-500/10 rounded-lg transition-colors"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Join ARMY</span>
                  <span className="ml-auto px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">HOT</span>
                </Link>
              )}

              {/* Leaderboard */}
              <Link
                href="/leaderboard"
                className="flex items-center gap-3 px-4 py-3 text-white font-medium text-base hover:bg-yellow-500/10 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Leaderboard</span>
              </Link>

              {/* News Feed */}
              <Link
                href="/feed-followers"
                className="flex items-center gap-3 px-4 py-3 text-white font-medium text-base hover:bg-yellow-500/10 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <span>News Feed</span>
              </Link>

              {/* Divider */}
              <div className="border-t border-bonk-border my-3" />

              {/* ACCOUNT Section */}
              <div className="text-xs text-gray-500 uppercase tracking-wider px-4 pt-2 pb-1">Account</div>

              {/* Profile */}
              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-3 text-white font-medium text-base hover:bg-white/5 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </Link>

              {/* Points - ⭐ Updated with Plus icon and orange highlight */}
              <Link
                href="/points"
                className={`flex items-center gap-3 px-4 py-3 text-white font-medium text-base rounded-lg transition-colors ${isOnPointsPage ? 'bg-orange-500/20' : 'hover:bg-white/5'
                  }`}
                onClick={() => setShowMobileMenu(false)}
              >
                <PointsIcon className={`w-5 h-5 ${isOnPointsPage ? 'text-orange-400' : 'text-green-400'}`} />
                <span className={isOnPointsPage ? 'text-orange-400' : ''}>Points</span>
              </Link>

              {/* Support */}
              <Link
                href="/support"
                className="flex items-center gap-3 px-4 py-3 text-white font-medium text-base hover:bg-white/5 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Support</span>
              </Link>

              {/* Divider */}
              <div className="border-t border-bonk-border my-3" />

              {/* SOCIAL Section */}
              <div className="text-xs text-gray-500 uppercase tracking-wider px-4 pt-2 pb-1">Social</div>

              {/* Follow us on X */}
              <a
                href="https://x.com/bonk_battle?s=20"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 text-white font-medium text-base hover:bg-white/5 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Follow us on X</span>
              </a>

              {/* Follow us on Telegram */}
              <a
                href="https://t.me/bonkbattle"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 text-white font-medium text-base hover:bg-white/5 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                <span>Follow us on Telegram</span>
              </a>

              {/* Divider */}
              <div className="border-t border-bonk-border my-3" />

              {/* Connect Wallet Button (se non connesso) nel menu mobile */}
              {!connected && (
                <button
                  onClick={() => {
                    handleLogin();
                    setShowMobileMenu(false);
                  }}
                  className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-black px-4 py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  🔗 Connect Wallet
                </button>
              )}

            </div>
          </div>
        </>
      )}
    </>
  );
}