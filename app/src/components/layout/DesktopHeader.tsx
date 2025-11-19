'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { useNotifications } from '@/hooks/useNotifications';

export function DesktopHeader() {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { unreadCount } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);

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

  // ⭐ Formatta l'address per desktop (più lettere)
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="hidden lg:block fixed top-0 left-64 right-0 z-40 bg-bonk-dark/95 backdrop-blur-xl border-b border-bonk-border">
      <div className="h-16 flex items-center justify-between px-6">
        {/* FOMO Ticker - Left (espanso) */}
        <div className="flex-1 overflow-hidden">
          <FOMOTicker />
        </div>

        {/* Buttons - Right */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-6">
          {/* ⭐ ICONE SOCIAL (NON COLORATE) - Prima di Create Coin */}
          
          {/* X (Twitter) */}

         <a href="https://x.com/bonkbattle"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-white/70" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>

          {/* Reddit */}

        <a  href="https://reddit.com/r/bonkbattle"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-white/70" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
          </a>

          {/* Join ARMY Button - Giallo/Oro (quando loggato) */}
          {connected && (
            <>
              {/* ⭐ 3 ICON BUTTONS - Activity, Points, Notifications */}

              {/* Activity/Followers Icon */}
              <Link
                href="/activity"
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </Link>

              {/* Points Icon (Airdrop) */}
              <Link
                href="/points"
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>

              {/* Notifiche (Campanello) */}
              <Link
                href="/notifications"
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Join ARMY Button */}
              <button className="bg-bonk-gold text-black px-5 py-2 rounded-lg font-bold text-sm hover:bg-bonk-gold/90 transition-colors whitespace-nowrap">
                Join ARMY
              </button>
            </>
          )}

          {/* Start Battle Button - Arancione chiaro */}
          <Link href="/create">
            <button className="bg-bonk-orange-dark text-black px-5 py-2 rounded-lg font-semibold text-sm hover:bg-bonk-orange-dark/90 transition-colors whitespace-nowrap">
              Start Battle
            </button>
          </Link>

          {/* Login Button (quando NON loggato) o Profile (quando loggato) */}
          {!connected ? (
            // ⭐ Log in Button - GIALLO/ORO
            <button
              onClick={() => setVisible(true)}
              className="bg-bonk-gold text-black px-5 py-2 rounded-lg font-bold text-sm hover:bg-bonk-gold/90 transition-colors whitespace-nowrap"
            >
              Log in
            </button>
          ) : (
            // ⭐ Profile Button (quando loggato) - Con immagine e address completo
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 bg-bonk-card border-2 border-bonk-orange-brand px-3 py-2 rounded-lg hover:bg-bonk-card/80 transition-colors"
              >
                {/* ⭐ Profile Image da public/profilo.png */}
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src="/profilo.png"
                    alt="Profile"
                    width={28}
                    height={28}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* ⭐ Address formattato (6...4 caratteri) */}
                <span className="text-white font-mono text-sm font-semibold">
                  {publicKey && formatAddress(publicKey.toString())}
                </span>

                {/* Arrow Down Triangle - Arancione chiaro */}
                <svg
                  className={`w-4 h-4 text-bonk-orange-light transition-transform flex-shrink-0 ${
                    showDropdown ? 'rotate-180' : ''
                  }`}
                  fill="currentColor"
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
                  <div className="absolute top-full right-0 mt-2 min-w-[180px] bg-bonk-card border border-bonk-orange-brand rounded-lg shadow-xl overflow-hidden z-50">
                    <button
                      onClick={handleCopyAddress}
                      className="w-full px-4 py-3 text-left text-white hover:bg-white/5 transition-colors flex items-center gap-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Copy Address</span>
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>Disconnect</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
