// app/src/components/create/CreateTokenGate.tsx
// ⭐ Componente che blocca la creazione token se non sei Commander con 3+ membri

'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { useCanCreateToken, CreateTokenReason } from '@/hooks/useCanCreateToken';

interface CreateTokenGateProps {
  children: React.ReactNode;
}

export function CreateTokenGate({ children }: CreateTokenGateProps) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { canCreate, reason, message, army, loading } = useCanCreateToken();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-white/60">Checking eligibility...</p>
        </div>
      </div>
    );
  }

  // Not connected
  if (!connected || reason === 'NO_WALLET') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🔐</div>
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-8">
            Connect your wallet to create a token for your Army.
          </p>
          <button
            onClick={() => setVisible(true)}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:opacity-90 transition-all"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Not a Commander
  if (reason === 'NOT_COMMANDER') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">👑</div>
          <h2 className="text-2xl font-bold text-white mb-4">Commanders Only</h2>
          <p className="text-gray-400 mb-4">
            Only Army Commanders can create tokens.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Create your own Army and recruit at least 2 followers to unlock token creation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/armies"
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:opacity-90 transition-all"
            >
              🛡️ Join an Army
            </Link>
            <Link
              href="/armies/create"
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:opacity-90 transition-all"
            >
              👑 Create Army
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not enough members
  if (reason === 'NOT_ENOUGH_MEMBERS' && army) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* BONK Logo */}
          <div className="flex justify-center mb-6">
            <img src="/BONK-LOGO.svg" alt="BONK" className="w-24 h-24" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Only Commander with minimum 2 followers can create a coin</h2>

          {/* Army Info Card */}
          <div className="bg-[#1d2531] border border-[#2a3544] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <p className="text-white font-bold">{army.name}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Followers</span>
                <span className="text-white font-bold">{army.memberCount} / {army.minRequired}</span>
              </div>
              <div className="h-3 bg-[#3b415a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
                  style={{ width: `${(army.memberCount / (army.minRequired || 3)) * 100}%` }}
                />
              </div>
            </div>

            <p className="text-orange-400 font-semibold">
              Need {army.needed} more follower{army.needed !== 1 ? 's' : ''} to create tokens!
            </p>
          </div>

          <p className="text-gray-500 text-sm mb-6">
            Share your Army invite link to recruit followers and unlock token creation.
          </p>

          <div className="flex flex-col gap-4 justify-center">
            <button
              onClick={() => {
                const inviteUrl = `${window.location.origin}/army/invite/${army.id}`;
                navigator.clipboard.writeText(inviteUrl);
                alert('Invite link copied!');
              }}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:opacity-90 transition-all"
            >
              📋 Copy Invite Link
            </button>
          </div>

          {/* You don't have an army? */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-gray-400 text-sm mb-4">You don't have an army?</p>
            <Link
              href="/armies/create"
              className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl hover:opacity-90 transition-all"
            >
              👑 Create Your Army
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (reason === 'ERROR') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
          <p className="text-gray-400 mb-8">{message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-[#2a3544] text-white font-bold rounded-xl hover:bg-[#3b415a] transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ✅ Can create - show the form
  return (
    <>
      {/* Army Badge - show which army the token will be created for */}
      {army && (
        <div className="mb-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-green-400 font-bold">Creating token for {army.name}</p>
              <p className="text-gray-400 text-sm">{army.memberCount} followers</p>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
