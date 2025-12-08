// app/src/components/battle/VictoryModal.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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
  onClaimVictory?: () => Promise<void>;
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
  onClaimVictory,
  onClose,
}: VictoryModalProps) {
  const [claiming, setClaiming] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; left: string; delay: string; color: string }>>([]);

  // Generate confetti on mount
  useEffect(() => {
    const pieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      color: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#00CED1'][Math.floor(Math.random() * 5)],
    }));
    setConfettiPieces(pieces);
  }, []);

  const handleClaimVictory = async () => {
    if (!onClaimVictory) return;
    setClaiming(true);
    try {
      await onClaimVictory();
    } finally {
      setClaiming(false);
    }
  };

  const isFinalized = !!poolId;
  const canClaim = !isFinalized && onClaimVictory;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Simple CSS Confetti */}
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
            }}
          />
        ))}
      </div>

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 animate-bounce-in">
        <div className="bg-gradient-to-br from-yellow-900/90 via-orange-900/90 to-yellow-900/90 border-2 border-yellow-500 rounded-2xl overflow-hidden shadow-2xl shadow-yellow-500/30">

          {/* Header Glow */}
          <div className="h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-pulse" />

          {/* Trophy */}
          <div className="text-center pt-8 pb-4">
            <div className="text-8xl animate-bounce mb-4">🏆</div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400">
              VICTORY!
            </h1>
            <p className="text-yellow-200 mt-2">{winnerSymbol} conquered the arena!</p>
          </div>

          {/* Battle Result */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-center gap-6">
              {/* Winner */}
              <div className="text-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border-4 border-yellow-500 shadow-lg shadow-yellow-500/50">
                    <Image
                      src={winnerImage || '/default-token.png'}
                      alt={winnerSymbol}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="absolute -top-3 -right-3 text-3xl">👑</div>
                </div>
                <div className="mt-2 font-bold text-yellow-400 text-lg">${winnerSymbol}</div>
                <div className="text-xs text-green-400">WINNER</div>
              </div>

              <div className="text-4xl font-black text-gray-500">⚔️</div>

              {/* Loser */}
              {loserSymbol ? (
                <div className="text-center opacity-60">
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
                  <div className="mt-2 font-bold text-gray-400 text-lg line-through">${loserSymbol}</div>
                  <div className="text-xs text-red-400">DEFEATED</div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-800 flex items-center justify-center text-4xl">💀</div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="px-6 pb-4">
            <div className="bg-black/30 rounded-xl p-4 grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-gray-400 text-xs mb-1">SOL Collected</div>
                <div className="text-xl font-bold text-green-400">{solCollected.toFixed(2)} SOL</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-xs mb-1">Volume</div>
                <div className="text-xl font-bold text-blue-400">{volumeSol.toFixed(2)} SOL</div>
              </div>
            </div>
          </div>

          {/* Points Award */}
          <div className="px-6 pb-4">
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-xl p-3 text-center">
              <div className="text-purple-400 text-sm mb-1">Battle Win Bonus</div>
              <div className="text-2xl font-black text-purple-300">+10,000 POINTS</div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 space-y-3">
            {/* Auto-processing indicator (no manual claim needed) */}
            {!isFinalized && !onClaimVictory && (
              <div className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-center">
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Creating Pool...
                </span>
              </div>
            )}

            {/* Manual claim button (if onClaimVictory provided) */}
            {canClaim && (
              <button
                onClick={handleClaimVictory}
                disabled={claiming}
                className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black transition-all disabled:opacity-50"
              >
                {claiming ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Creating Pool...
                  </span>
                ) : (
                  'Claim Victory & Create Pool'
                )}
              </button>
            )}

            {isFinalized && raydiumUrl && (
              <a
                href={raydiumUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white text-center transition-all"
              >
                Trade on Raydium
              </a>
            )}

            <div className="flex gap-3">
              <Link
                href={`/token/${winnerMint}`}
                className="flex-1 py-3 rounded-xl font-semibold text-center bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                View Token
              </Link>
              <Link
                href="/winners"
                className="flex-1 py-3 rounded-xl font-semibold text-center bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-all"
              >
                Hall of Champions
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.6s ease-out; }

        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall { animation: confetti-fall 3s ease-in forwards; }
      `}</style>
    </div>
  );
}
