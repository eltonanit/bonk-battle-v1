// app/src/components/battle/VictoryModal.tsx
// ⭐ POTENTIALS.FUN: This component is HIDDEN via feature flag
// Will be re-enabled when battles are implemented
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FEATURES } from '@/config/features';

interface VictoryModalProps {
  winnerSymbol: string;
  winnerImage: string;
  winnerMint: string;
  loserSymbol?: string;
  loserImage?: string;
  solCollected: number;
  volumeSol: number;
  poolId?: string;
  raydiumUrl?: string;
  isProcessing?: boolean;
  onClose?: () => void;
  onShowPointsModal?: () => void;
}

export function VictoryModal({
  winnerSymbol,
  winnerImage,
  winnerMint,
  loserSymbol,
  loserImage,
  solCollected,
  volumeSol,
  poolId,
  raydiumUrl,
  isProcessing = false,
  onClose,
  onShowPointsModal,
}: VictoryModalProps) {
  const router = useRouter();

  // ⭐ POTENTIALS.FUN: Hidden via feature flag
  if (!FEATURES.SHOW_VICTORY_MODAL) {
    return null;
  }

  // Animation states
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; left: string; delay: string; color: string }>>([]);

  // Generate confetti on mount
  useEffect(() => {
    const pieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      color: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#00CED1', '#FF69B4', '#9370DB'][Math.floor(Math.random() * 7)],
    }));
    setConfettiPieces(pieces);
  }, []);

  const isFinalized = !!poolId;

  // Handle any close action - always show points modal first
  const handleShowPoints = useCallback(() => {
    if (onShowPointsModal) {
      onShowPointsModal();
    } else if (onClose) {
      onClose();
    }
  }, [onShowPointsModal, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
        onClick={handleShowPoints}
      />

      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className="absolute w-3 h-3 animate-confetti-fall"
            style={{
              left: piece.left,
              top: '-20px',
              backgroundColor: piece.color,
              animationDelay: piece.delay,
              borderRadius: Math.random() > 0.5 ? '50%' : '0',
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm mx-6 animate-bounce-in">
        <div className="relative bg-gradient-to-br from-yellow-900/95 via-orange-900/95 to-yellow-900/95 border-2 border-yellow-500 rounded-2xl overflow-hidden shadow-2xl shadow-yellow-500/40">

          {/* X Close Button */}
          <button
            onClick={handleShowPoints}
            className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Animated Header */}
          <div className="h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-shimmer" />

          {/* Title Section */}
          <div className="text-center pt-5 pb-3 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-text-shimmer relative z-10">
              VICTORY!
            </h1>
            <p className="text-yellow-200 mt-3 text-lg">
              Winner: <span className="font-bold text-yellow-400">${winnerSymbol}</span>
            </p>
          </div>

          {/* Battle Result */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-center gap-8">
              {/* Winner */}
              <div className="text-center transform hover:scale-105 transition-transform">
                <div className="relative">
                  <div className="w-32 h-32 rounded-xl overflow-hidden border-4 border-yellow-500 shadow-lg shadow-yellow-500/50 animate-winner-glow">
                    <Image
                      src={winnerImage || '/default-token.png'}
                      alt={winnerSymbol}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="absolute -top-4 -right-4 text-4xl animate-crown-bounce">👑</div>
                </div>
                <div className="mt-3 font-black text-yellow-400 text-xl">${winnerSymbol}</div>
                <div className="text-sm text-green-400 font-bold">🏆 CHAMPION</div>
              </div>

              <div className="text-5xl font-black text-gray-600 animate-pulse">⚔️</div>

              {/* Loser */}
              {loserSymbol ? (
                <div className="text-center opacity-50 transform hover:scale-105 transition-transform">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-600 grayscale">
                    <Image
                      src={loserImage || '/default-token.png'}
                      alt={loserSymbol}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="mt-3 font-bold text-gray-500 text-xl line-through">${loserSymbol}</div>
                  <div className="text-sm text-red-500 font-bold">💀 DEFEATED</div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-800 flex items-center justify-center text-4xl opacity-50">💀</div>
              )}
            </div>
          </div>

          {/* Processing State */}
          {isProcessing && !isFinalized && (
            <div className="px-4 pb-3">
              <div className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-600 to-orange-600 text-black text-center">
                <span className="flex items-center justify-center gap-3">
                  <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
                  Creating Raydium Pool...
                </span>
              </div>
            </div>
          )}

          {/* TWO NAVIGATION BUTTONS */}
          <div className="px-4 pb-4">
            <div className="flex gap-3">
              {/* Left: Your Balance */}
              <button
                onClick={handleShowPoints}
                className="flex-1 py-3 rounded-xl font-semibold text-center bg-blue-600 hover:bg-blue-500 text-white transition-all text-sm"
              >
                💰 Your Balance
              </button>

              {/* Right: View Winner Token */}
              <button
                onClick={handleShowPoints}
                className="flex-1 py-3 rounded-xl font-semibold text-center bg-yellow-500 hover:bg-yellow-400 text-black transition-all text-sm"
              >
                🏆 View Winner
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% { transform: scale(0.3) rotate(-5deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(2deg); }
          70% { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55); }

        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translateY(100vh) rotate(1080deg) scale(0.5); opacity: 0; }
        }
        .animate-confetti-fall { animation: confetti-fall 4s ease-in forwards; }

        @keyframes crown-bounce {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(10deg); }
        }
        .animate-crown-bounce { animation: crown-bounce 1s ease-in-out infinite; }

        @keyframes winner-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.5); }
          50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.8), 0 0 60px rgba(234, 179, 8, 0.4); }
        }
        .animate-winner-glow { animation: winner-glow 2s ease-in-out infinite; }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer { 
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite; 
        }

        @keyframes text-shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-text-shimmer { animation: text-shimmer 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}