'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useNotifications } from '@/hooks/useNotifications';

export function Header() {
  const { connected, publicKey, disconnect, select, wallets, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const { unreadCount } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // ⭐ FIX: Funzione per gestire il login su mobile
  const handleLogin = async () => {
    try {
      // Se su mobile, proviamo a connetterci direttamente a Phantom
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');

      if (phantomWallet) {
        // Seleziona Phantom
        select(phantomWallet.adapter.name);

        // Su mobile, questo aprirà l'app Phantom
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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-bonk-dark/95 backdrop-blur-xl border-b border-bonk-border">
        <div className="relative">
          {/* Riga 1: Join ARMY + Start Battle + Login */}
          <div className="px-3 py-2 flex items-center justify-end gap-1.5">
            {/* Join ARMY Button - Giallo */}
            <Link href="/armies">
              <button className="bg-bonk-gold text-black px-2.5 py-1.5 rounded-lg font-bold text-xs hover:bg-bonk-gold/90 transition-colors whitespace-nowrap">
                Join ARMY
              </button>
            </Link>

            {/* Start Battle Button - Arancione */}
            <Link href="/create">
              <button className="bg-bonk-orange-dark text-black px-2.5 py-1.5 rounded-lg font-semibold text-xs hover:bg-bonk-orange-dark/90 transition-colors whitespace-nowrap">
                Start Battle
              </button>
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
                      src="/profilo.png"
                      alt="Profile"
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
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
                  alt="Bonk Battle"
                  width={60}
                  height={60}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Riga 2: 3 Notification Icons (center) + Hamburger Menu (right, orange) */}
          <div className="px-3 py-2 flex items-center justify-between">
            {/* Empty space on left for logo */}
            <div className="w-[60px]" />

            {/* 3 Notification Icons - Centered */}
            <div className="flex items-center gap-4 justify-center flex-1">
              {/* Feed/Followers Icon */}
              <Link href="/feed-followers" className="p-2 bg-bonk-dark/95 backdrop-blur-xl rounded-lg hover:bg-white/5 transition-colors">
                <svg className="w-6 h-6 text-bonk-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </Link>

              {/* Points Icon */}
              <Link href="/points" className="p-2 bg-bonk-dark/95 backdrop-blur-xl rounded-lg hover:bg-white/5 transition-colors">
                <svg className="w-6 h-6 text-bonk-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>

              {/* Notifications Icon */}
              <Link href="/notifications" className="p-2 bg-bonk-dark/95 backdrop-blur-xl rounded-lg hover:bg-white/5 transition-colors relative">
                <svg className="w-6 h-6 text-bonk-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {/* Notification Badge */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
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
                className="text-bonk-green p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Items */}
            <div className="px-4 pb-6 space-y-1">
              {/* Board */}
              <Link
                href="/"
                className="block px-4 py-3 text-bonk-green font-bold text-base hover:bg-bonk-card/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                Board
              </Link>

              {/* Start Battle */}
              <Link
                href="/create"
                className="block px-4 py-3 text-white font-medium text-base hover:bg-bonk-card/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                Start Battle
              </Link>

              {/* Ranking */}
              <Link
                href="/battlestart"
                className="block px-4 py-3 text-white font-medium text-base hover:bg-bonk-card/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                Ranking
              </Link>

              {/* Advanced */}
              <Link
                href="/profile"
                className="block px-4 py-3 text-white font-medium text-base hover:bg-bonk-card/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                Advanced
              </Link>

              {/* Notifications */}
              <Link
                href="/notifications"
                className="block px-4 py-3 text-white font-medium text-base hover:bg-bonk-card/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                Notifications
              </Link>

              {/* Support */}
              <Link
                href="/support"
                className="block px-4 py-3 text-white font-medium text-base hover:bg-bonk-card/50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                Support
              </Link>

              {/* Divider */}
              <div className="border-t border-bonk-border my-4" />

              {/* Social Links */}
              <a
                href="https://x.com/bonkbattle"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 text-bonk-text font-medium text-sm hover:bg-bonk-card/50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Follow Twitter</span>
              </a>

              <a
                href="https://t.me/bonkbattle"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 text-bonk-text font-medium text-sm hover:bg-bonk-card/50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                <span>Join Telegram</span>
              </a>

              <a
                href="https://discord.gg/bonkbattle"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 text-bonk-text font-medium text-sm hover:bg-bonk-card/50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Discord</span>
              </a>

              {/* Divider */}
              <div className="border-t border-bonk-border my-4" />

              {/* Connect Wallet Button (se non connesso) nel menu mobile */}
              {!connected && (
                <button
                  onClick={() => {
                    handleLogin();
                    setShowMobileMenu(false);
                  }}
                  className="w-full bg-bonk-green text-white px-4 py-3 rounded-lg font-bold text-sm hover:bg-bonk-green/90 transition-colors"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}