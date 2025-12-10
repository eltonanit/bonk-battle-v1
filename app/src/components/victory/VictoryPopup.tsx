'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

interface VictoryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onViewToken: () => void;
  tokenData: {
    mint: string;
    symbol: string;
    name: string;
    image: string | null;
    poolId: string;
    loserSymbol?: string;
  };
}

export function VictoryPopup({ isOpen, onClose, onViewToken, tokenData }: VictoryPopupProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

  useEffect(() => {
    if (isOpen) {
      // Generate confetti
      const colors = ['#FFD700', '#FF6B00', '#00FF88', '#FF00FF', '#00BFFF', '#FF4444'];
      const newConfetti = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
      setConfetti(newConfetti);

      // Play sound (optional)
      try {
        const audio = new Audio('/sounds/victory.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {}); // Ignore if no sound file
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
  };

  const handleViewToken = () => {
    onViewToken();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((c) => (
          <div
            key={c.id}
            className="absolute w-3 h-3 animate-confetti"
            style={{
              left: `${c.left}%`,
              top: '-20px',
              backgroundColor: c.color,
              animationDelay: `${c.delay}s`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      {/* Popup */}
      <div className="relative z-10 w-[90%] max-w-md animate-victory-bounce">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-2xl blur-lg opacity-75 animate-pulse" />

        <div className="relative bg-gradient-to-br from-bonk-dark via-bonk-card to-bonk-dark border-2 border-yellow-500 rounded-2xl overflow-hidden">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          {/* Top banner */}
          <div className="h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400" />

          {/* Content */}
          <div className="p-8 text-center">
            {/* Trophy animation */}
            <div className="text-7xl mb-4 animate-bounce">🏆</div>

            {/* Title */}
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 mb-2">
              VICTORY!
            </h2>

            <p className="text-gray-400 mb-6">
              {tokenData.loserSymbol
                ? `${tokenData.symbol} defeated ${tokenData.loserSymbol}!`
                : `${tokenData.symbol} conquered the arena!`
              }
            </p>

            {/* Token card */}
            <div className="bg-black/50 rounded-xl p-4 mb-6 border border-yellow-500/30">
              <div className="flex items-center justify-center gap-4">
                {tokenData.image ? (
                  <Image
                    src={tokenData.image}
                    alt={tokenData.symbol}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-yellow-500"
                    unoptimized
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-yellow-500/20 flex items-center justify-center text-4xl border-2 border-yellow-500">
                    👑
                  </div>
                )}
                <div className="text-left">
                  <div className="text-2xl font-black text-yellow-400">${tokenData.symbol}</div>
                  <div className="text-gray-400">{tokenData.name}</div>
                  <div className="text-green-400 text-sm mt-1">🎉 Listed on Raydium!</div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleViewToken}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black text-lg rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-all transform hover:scale-105 shadow-lg shadow-yellow-500/30"
            >
              👑 VIEW WINNER
            </button>

            {/* Subtle hint */}
            <p className="text-gray-500 text-xs mt-4">
              Trade now on Raydium DEX
            </p>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes victory-bounce {
          0% {
            transform: scale(0.5) translateY(50px);
            opacity: 0;
          }
          50% {
            transform: scale(1.05) translateY(-10px);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .animate-confetti {
          animation: confetti-fall 3s ease-out forwards;
        }

        .animate-victory-bounce {
          animation: victory-bounce 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
