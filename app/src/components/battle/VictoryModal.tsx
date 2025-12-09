// app/src/components/battle/VictoryModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
}: VictoryModalProps) {
  const router = useRouter();

  // Animation states
  const [showPoints, setShowPoints] = useState(false);
  const [pointsAnimating, setPointsAnimating] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
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

  // Show points animation when pool is created
  useEffect(() => {
    if (poolId && !showPoints) {
      // Delay to let user see the pool creation success
      setTimeout(() => {
        setShowPoints(true);
        setPointsAnimating(true);

        // Start countdown after points animation
        setTimeout(() => {
          setPointsAnimating(false);
          setCountdown(5);
        }, 2000);
      }, 500);
    }
  }, [poolId, showPoints]);

  // Countdown and redirect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      router.push(`/token/${winnerMint}`);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router, winnerMint]);

  // Manual redirect
  const handleGoToWinner = useCallback(() => {
    router.push(`/token/${winnerMint}`);
  }, [router, winnerMint]);

  const isFinalized = !!poolId;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

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
      <div className="relative z-10 w-full max-w-lg mx-4 animate-bounce-in">
        <div className="bg-gradient-to-br from-yellow-900/95 via-orange-900/95 to-yellow-900/95 border-2 border-yellow-500 rounded-2xl overflow-hidden shadow-2xl shadow-yellow-500/40">

          {/* Animated Header */}
          <div className="h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-shimmer" />

          {/* Trophy Section */}
          <div className="text-center pt-8 pb-4 relative">
            {/* Glow effect */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="text-8xl animate-trophy-bounce mb-4 relative z-10">🏆</div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-text-shimmer">
              VICTORY!
            </h1>
            <p className="text-yellow-200 mt-2 text-lg">{winnerSymbol} conquered the arena!</p>
          </div>

          {/* Battle Result */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-center gap-8">
              {/* Winner */}
              <div className="text-center transform hover:scale-105 transition-transform">
                <div className="relative">
                  <div className="w-24 h-24 rounded-xl overflow-hidden border-4 border-yellow-500 shadow-lg shadow-yellow-500/50 animate-winner-glow">
                    <Image
                      src={winnerImage || '/default-token.png'}
                      alt={winnerSymbol}
                      width={96}
                      height={96}
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
                  <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-600 grayscale">
                    <Image
                      src={loserImage || '/default-token.png'}
                      alt={loserSymbol}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="mt-3 font-bold text-gray-500 text-xl line-through">${loserSymbol}</div>
                  <div className="text-sm text-red-500 font-bold">💀 DEFEATED</div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl bg-gray-800 flex items-center justify-center text-5xl opacity-50">💀</div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="px-6 pb-4">
            <div className="bg-black/40 rounded-xl p-4 grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-gray-400 text-xs mb-1 uppercase tracking-wide">SOL Collected</div>
                <div className="text-2xl font-black text-green-400">{solCollected.toFixed(2)} SOL</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Volume</div>
                <div className="text-2xl font-black text-blue-400">{volumeSol.toFixed(2)} SOL</div>
              </div>
            </div>
          </div>

          {/* Points Award - Animated */}
          <div className="px-6 pb-4">
            <div className={`bg-gradient-to-r from-purple-900/60 to-pink-900/60 border-2 border-purple-500/50 rounded-xl p-4 text-center relative overflow-hidden transition-all duration-500 ${showPoints ? 'scale-100 opacity-100' : 'scale-95 opacity-70'
              }`}>
              {/* Sparkle effect */}
              {pointsAnimating && (
                <div className="absolute inset-0 animate-sparkle-bg" />
              )}

              <div className="text-purple-300 text-sm mb-1 font-semibold">🎮 Battle Win Bonus</div>
              <div className={`text-3xl font-black transition-all duration-500 ${pointsAnimating
                  ? 'text-yellow-400 scale-125 animate-points-pop'
                  : 'text-purple-200'
                }`}>
                +10,000 STONKS
              </div>
              {pointsAnimating && (
                <div className="text-sm text-green-400 mt-1 animate-fade-in">Added to your account!</div>
              )}
            </div>
          </div>

          {/* Status & Actions */}
          <div className="px-6 pb-6 space-y-3">

            {/* Processing State */}
            {isProcessing && !isFinalized && (
              <div className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-600 to-orange-600 text-black text-center">
                <span className="flex items-center justify-center gap-3">
                  <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
                  Creating Raydium Pool...
                </span>
              </div>
            )}

            {/* Success State with Countdown */}
            {isFinalized && (
              <>
                {/* Pool Created Success */}
                <div className="w-full py-3 rounded-xl font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-center">
                  <span className="flex items-center justify-center gap-2">
                    ✅ Pool Created Successfully!
                  </span>
                </div>

                {/* Raydium Trade Button */}
                {raydiumUrl && (
                  <a
                    href={raydiumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white text-center transition-all transform hover:scale-[1.02]"
                  >
                    🌊 Trade on Raydium
                  </a>
                )}

                {/* Countdown & Go to Winner */}
                <button
                  onClick={handleGoToWinner}
                  className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black text-center transition-all transform hover:scale-[1.02]"
                >
                  {countdown !== null ? (
                    <span className="flex items-center justify-center gap-2">
                      🏆 Go to Champion Page
                      <span className="bg-black/20 px-3 py-1 rounded-full text-sm">
                        {countdown}s
                      </span>
                    </span>
                  ) : (
                    '🏆 Go to Champion Page'
                  )}
                </button>
              </>
            )}

            {/* Navigation Links */}
            <div className="flex gap-3 pt-2">
              <Link
                href="/battles"
                className="flex-1 py-3 rounded-xl font-semibold text-center bg-white/10 hover:bg-white/20 text-white transition-all text-sm"
              >
                ⚔️ More Battles
              </Link>
              <Link
                href="/winners"
                className="flex-1 py-3 rounded-xl font-semibold text-center bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-all text-sm"
              >
                🏆 Hall of Champions
              </Link>
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

        @keyframes trophy-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-15px) scale(1.1); }
          50% { transform: translateY(-5px) scale(1.05); }
          75% { transform: translateY(-10px) scale(1.08); }
        }
        .animate-trophy-bounce { animation: trophy-bounce 2s ease-in-out infinite; }

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

        @keyframes points-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .animate-points-pop { animation: points-pop 0.5s ease-out; }

        @keyframes sparkle-bg {
          0% { background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%); }
          50% { background: radial-gradient(circle at 80% 50%, rgba(255,255,255,0.3) 0%, transparent 50%); }
          100% { background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%); }
        }
        .animate-sparkle-bg { animation: sparkle-bg 1s ease-in-out infinite; }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}