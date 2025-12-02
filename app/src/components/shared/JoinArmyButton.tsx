'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface JoinArmyButtonProps {
  size?: 'sm' | 'md';
}

export function JoinArmyButton({ size = 'md' }: JoinArmyButtonProps) {
  const [showSwords, setShowSwords] = useState(false);

  useEffect(() => {
    // Alterna tra testo e spade ogni 3 secondi
    const interval = setInterval(() => {
      setShowSwords(prev => !prev);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const sizeClasses = size === 'sm'
    ? 'px-3 py-2 text-xs min-w-[90px] h-[34px]'
    : 'px-5 py-2 text-sm min-w-[110px] h-[38px]';

  return (
    <Link href="/armies">
      <button
        className={`
          bg-bonk-gold text-black ${sizeClasses} rounded-lg font-bold
          hover:bg-bonk-gold/90 transition-all whitespace-nowrap
          border border-yellow-300/60
          shadow-[0_0_10px_rgba(250,204,21,0.4)]
          hover:shadow-[0_0_15px_rgba(250,204,21,0.6)]
          relative overflow-hidden
        `}
      >
        {/* Testo "Join ARMY" */}
        <span
          className={`
            inline-flex items-center justify-center transition-all duration-500
            ${showSwords ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}
          `}
        >
          Join ARMY
        </span>

        {/* Spade Incrociate ⚔️ */}
        <span
          className={`
            absolute inset-0 flex items-center justify-center transition-all duration-500
            ${showSwords ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
          `}
          style={{ fontSize: size === 'sm' ? '16px' : '20px' }}
        >
          ⚔️
        </span>
      </button>
    </Link>
  );
}
