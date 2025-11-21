'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

interface ProfileHeaderProps {
  createdCoinsCount: number;
}

export function ProfileHeader({ createdCoinsCount }: ProfileHeaderProps) {
  const { publicKey } = useWallet();

  if (!publicKey) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🔌</div>
        <div className="text-xl font-bold mb-2">Connect Your Wallet</div>
        <div className="text-gray-400">Connect your wallet to view your profile</div>
      </div>
    );
  }

  const addressShort = `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`;

  const copyAddress = () => {
    navigator.clipboard.writeText(publicKey.toBase58());
    alert('Address copied!');
  };

  return (
    <div className="flex items-center justify-between mb-8 flex-wrap gap-6">
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-3 border-green-500/30">
          <Image
            src="/profilo.png"
            alt="Profile"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <div className="text-3xl font-bold mb-2">{addressShort}</div>
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-4">
            <span>{publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}</span>
            <button
              onClick={copyAddress}
              className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              📋 Copy
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-8">
        {/* Created Coins */}
        <div>
          <div className="text-3xl font-bold">{createdCoinsCount}</div>
          <div className="text-sm text-gray-400 font-medium">Created coins</div>
        </div>
      </div>
    </div>
  );
}