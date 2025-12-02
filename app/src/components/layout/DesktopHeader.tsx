'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { useNotifications } from '@/hooks/useNotifications';
import { useFollowers } from '@/hooks/useFollowers';
import { useProfile } from '@/hooks/useProfile';
import { JoinArmyButton } from '@/components/shared/JoinArmyButton';

export function DesktopHeader() {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { unreadCount } = useNotifications();
  const { feedUnreadCount } = useFollowers();
  const { profile } = useProfile();
  const [showDropdown, setShowDropdown] = useState(false);

  // Track se già registrato in questa sessione
  const hasRegistered = useRef<string | null>(null);

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

  // ⭐ Formatta l'address per desktop (solo prime 4)
  const formatAddress = (address: string) => {
    return address.slice(0, 4);
  };

  return (
    <header className="hidden lg:block fixed top-0 left-56 right-0 z-40 bg-bonk-dark/95 backdrop-blur-xl border-b border-bonk-border">
      <div className="flex flex-col">
        {/* Top Row - FOMO Ticker + Created Ticker + Buttons */}
        <div className="h-16 flex items-center justify-between px-6">
          {/* Both Tickers - Left side */}
          <div className="flex items-center gap-3">
            <FOMOTicker />
            <CreatedTicker />
          </div>

          {/* Buttons - Right */}
          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
            {/* Join ARMY Button - Giallo/Oro (quando loggato) */}
            {connected && (
              <>
                {/* ⭐ 3 ICON BUTTONS - Activity, Points, Notifications */}

                {/* Feed/Followers Icon */}
                <Link
                  href="/feed-followers"
                  className="relative p-2 bg-bonk-dark/95 backdrop-blur-xl rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {feedUnreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {feedUnreadCount > 9 ? '9+' : feedUnreadCount}
                    </span>
                  )}
                </Link>

                {/* Points Icon (Airdrop) */}
                <Link
                  href="/points"
                  className="relative p-2 bg-bonk-dark/95 backdrop-blur-xl rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Link>

                {/* Notifiche (Campanello) */}
                <Link
                  href="/notifications"
                  className="relative p-2 bg-bonk-dark/95 backdrop-blur-xl rounded-lg hover:bg-white/10 transition-colors"
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

                {/* Join ARMY Button - Animato con spade */}
                <JoinArmyButton size="md" />
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
                  {/* ⭐ Profile Image dinamica */}
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

                  {/* ⭐ Username o Address */}
                  <span className="text-white text-sm font-semibold">
                    {profile?.username || (publicKey && formatAddress(publicKey.toString()))}
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

      </div>
    </header>
  );
}
