'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { useFollowers } from '@/hooks/useFollowers';

interface ProfileHeaderProps {
  createdCoinsCount: number;
}

export function ProfileHeader({ createdCoinsCount }: ProfileHeaderProps) {
  const { publicKey } = useWallet();
  const { followersCount, followingCount } = useFollowers();

  if (!publicKey) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">*</div>
        <div className="text-xl font-bold mb-2">Connect Your Wallet</div>
        <div className="text-gray-400">Connect your wallet to view your profile</div>
      </div>
    );
  }

  // Solo prime 5 lettere/numeri
  const addressShort = publicKey.toBase58().slice(0, 5);

  const copyAddress = () => {
    navigator.clipboard.writeText(publicKey.toBase58());
    alert('Address copied!');
  };

  return (
    <div className="mb-8">
      {/* Layout stile Instagram */}
      <div className="flex items-start gap-6 mb-4">
        {/* Profile Image */}
        <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0">
          <Image
            src="/profilo.png"
            alt="Profile"
            fill
            className="object-cover"
          />
        </div>

        {/* Info a destra */}
        <div className="flex-1">
          {/* Address in alto con copy button */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl font-semibold">{addressShort}</span>
            <button
              onClick={copyAddress}
              className="text-gray-400 hover:text-white transition-colors"
              title="Copy full address"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          {/* Stats row: coins - following - followers */}
          <div className="flex items-center gap-8 text-sm">
            <div className="text-center">
              <div className="font-bold text-white text-lg">{createdCoinsCount}</div>
              <div className="text-gray-400 text-xs">coins</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-white text-lg">{followingCount}</div>
              <div className="text-gray-400 text-xs">following</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-white text-lg">{followersCount}</div>
              <div className="text-gray-400 text-xs">followers</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
