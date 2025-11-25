// app/src/components/armies/ArmyCard.tsx
'use client';

import { Army } from '@/hooks/useArmies';
import Link from 'next/link';
import Image from 'next/image';

interface ArmyCardProps {
  army: Army;
  isOnFire?: boolean;
}

export function ArmyCard({ army, isOnFire = false }: ArmyCardProps) {
  const newMembers = army.member_count - army.member_count_checkpoint;

  return (
    <Link href={`/armies/${army.id}`}>
      <div
        className={`
          relative overflow-hidden rounded-xl border-2
          bg-gradient-to-br from-gray-900 to-gray-800
          hover:from-gray-800 hover:to-gray-700
          transition-all duration-300 cursor-pointer
          ${isOnFire
            ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-shake'
            : 'border-gray-700 hover:border-gray-600'
          }
        `}
      >
        {/* ON FIRE Badge */}
        {isOnFire && (
          <div className="absolute top-2 right-2 z-10">
            <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500 text-black font-bold text-xs rounded-full animate-pulse">
              <span>🔥</span>
              <span>ON FIRE</span>
            </div>
          </div>
        )}

        {/* Army Content */}
        <div className="p-6">
          {/* Header: Icon + Name */}
          <div className="flex items-start gap-4 mb-4">
            {/* Army Image/Icon */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image
                src={army.image_url}
                alt={army.name}
                width={64}
                height={64}
                className="rounded-lg"
                onError={(e) => {
                  // Fallback se immagine non carica
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              {/* Fallback: solo emoji se immagine non carica */}
              <div className="absolute inset-0 flex items-center justify-center text-4xl">
                {army.icon}
              </div>
            </div>

            {/* Name + Stats */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white truncate mb-1">
                {army.name}
              </h3>

              {/* Member Count */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">👥</span>
                <span className="text-white font-semibold">
                  {army.member_count.toLocaleString()}
                </span>
                <span className="text-gray-400">members</span>
              </div>

              {/* New Members (if ON FIRE) */}
              {isOnFire && newMembers > 0 && (
                <div className="mt-1 flex items-center gap-1 text-xs">
                  <span className="text-yellow-400">⚡</span>
                  <span className="text-yellow-400 font-bold">
                    +{newMembers} new members!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Capitano */}
          <div className="mb-3 pb-3 border-b border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>👑</span>
              <span>Re-Capitano:</span>
              <span className="text-gray-300 font-mono truncate">
                {army.capitano_wallet.slice(0, 4)}...{army.capitano_wallet.slice(-4)}
              </span>
            </div>
          </div>

          {/* Social Links */}
          {(army.twitter_url || army.telegram_url) && (
            <div className="flex items-center gap-3 mb-3">
              {army.twitter_url && (
                <a
                  href={army.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              )}
              {army.telegram_url && (
                <a
                  href={army.telegram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121L7.782 13.73l-2.896-.924c-.63-.196-.64-.63.135-.931l11.316-4.365c.528-.196.99.12.82.931z" />
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Created {new Date(army.created_at).toLocaleDateString()}
            </div>

            <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition-colors">
              Join Army →
            </button>
          </div>
        </div>

        {/* ON FIRE Glow Effect */}
        {isOnFire && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-yellow-500/10 animate-pulse" />
          </div>
        )}
      </div>
    </Link>
  );
}
