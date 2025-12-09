// app/src/components/battle/BattleStartedModal.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface BattleStartedModalProps {
  tokenAMint: string;
  tokenASymbol: string;
  tokenAImage: string;
  tokenBMint: string;
  tokenBSymbol: string;
  tokenBImage: string;
  onClose: () => void;
  autoCloseDelay?: number; // ms, default 10000 (10s)
}

export function BattleStartedModal({
  tokenAMint,
  tokenASymbol,
  tokenAImage,
  tokenBMint,
  tokenBSymbol,
  tokenBImage,
  onClose,
  autoCloseDelay = 10000,
}: BattleStartedModalProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(Math.floor(autoCloseDelay / 1000));
  const [showClash, setShowClash] = useState(false);

  // Clash animation on mount
  useEffect(() => {
    const clashTimer = setTimeout(() => setShowClash(true), 300);
    return () => clearTimeout(clashTimer);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      onClose();
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onClose]);

  // Navigate to battle page
  const handleViewMatch = () => {
    router.push(`/battle/${tokenAMint}-${tokenBMint}`);
    onClose();
  };

  // Get fallback image
  const getImage = (image: string, symbol: string) => {
    if (image && image.length > 0) return image;
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop with pulse effect */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md animate-pulse-slow"
        onClick={onClose}
      />

      {/* Explosion/radial effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-radial from-orange-500/30 via-red-500/10 to-transparent animate-explosion" />
      </div>

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Battle Started Banner */}
        <div className="text-center mb-6">
          <div className="inline-block bg-gradient-to-r from-red-600 via-orange-500 to-red-600 px-8 py-3 rounded-lg transform -rotate-2 animate-shake">
            <h1 className="text-3xl font-black text-white tracking-wider uppercase">
              BATTLE STARTED!
            </h1>
          </div>
        </div>

        {/* VS Display */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {/* Token A */}
          <div className={`transform transition-all duration-500 ${showClash ? 'translate-x-0' : '-translate-x-20 opacity-0'}`}>
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-blue-500/50 rounded-2xl blur-xl animate-pulse" />

              <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-4 border-blue-500 shadow-2xl shadow-blue-500/50">
                <Image
                  src={getImage(tokenAImage, tokenASymbol)}
                  alt={tokenASymbol}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>

              {/* Symbol */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 px-3 py-1 rounded-full">
                <span className="text-white font-bold text-sm">${tokenASymbol}</span>
              </div>
            </div>
          </div>

          {/* VS */}
          <div className={`transform transition-all duration-700 delay-300 ${showClash ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
            <div className="relative">
              {/* Fire effect behind VS */}
              <div className="absolute inset-0 text-6xl animate-fire-flicker">🔥</div>

              <div className="relative bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-orange-500/50 animate-vs-pulse">
                <span className="text-2xl font-black text-white">VS</span>
              </div>
            </div>
          </div>

          {/* Token B */}
          <div className={`transform transition-all duration-500 ${showClash ? 'translate-x-0' : 'translate-x-20 opacity-0'}`}>
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-pink-500/50 rounded-2xl blur-xl animate-pulse" />

              <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-4 border-pink-500 shadow-2xl shadow-pink-500/50">
                <Image
                  src={getImage(tokenBImage, tokenBSymbol)}
                  alt={tokenBSymbol}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>

              {/* Symbol */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-pink-600 px-3 py-1 rounded-full">
                <span className="text-white font-bold text-sm">${tokenBSymbol}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Text */}
        <div className="text-center mb-6">
          <p className="text-gray-300 text-lg">
            The arena awaits! First to reach{' '}
            <span className="text-yellow-400 font-bold">6 SOL + 6.6 SOL volume</span>{' '}
            wins!
          </p>
        </div>

        {/* View Match Button */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleViewMatch}
            className="w-full py-4 rounded-xl font-bold text-xl bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 hover:from-orange-400 hover:via-red-400 hover:to-orange-400 text-white transition-all transform hover:scale-[1.02] shadow-lg shadow-orange-500/30 animate-button-glow"
          >
            View Match
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
          >
            Close ({countdown}s)
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: rotate(-2deg); }
          25% { transform: rotate(-3deg) scale(1.02); }
          50% { transform: rotate(-1deg); }
          75% { transform: rotate(-2.5deg) scale(1.01); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out infinite;
        }

        @keyframes explosion {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-explosion {
          animation: explosion 1.5s ease-out forwards;
        }

        @keyframes vs-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .animate-vs-pulse {
          animation: vs-pulse 1s ease-in-out infinite;
        }

        @keyframes fire-flicker {
          0%, 100% { opacity: 0.3; transform: scale(1) translateY(0); }
          50% { opacity: 0.6; transform: scale(1.2) translateY(-5px); }
        }
        .animate-fire-flicker {
          animation: fire-flicker 0.3s ease-in-out infinite;
        }

        @keyframes button-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.3); }
          50% { box-shadow: 0 0 40px rgba(249, 115, 22, 0.6); }
        }
        .animate-button-glow {
          animation: button-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.95; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  );
}
