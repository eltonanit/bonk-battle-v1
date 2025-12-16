// app/src/components/battle/VictoryModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';

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
  const { publicKey } = useWallet();

  // Animation states
  const [showPoints, setShowPoints] = useState(false);
  const [pointsAnimating, setPointsAnimating] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; left: string; delay: string; color: string }>>([]);

  // Share state
  const [hasShared, setHasShared] = useState(false);
  const [sharePointsAwarded, setSharePointsAwarded] = useState(false);
  const [isAwardingSharePoints, setIsAwardingSharePoints] = useState(false);

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
      setTimeout(() => {
        setShowPoints(true);
        setPointsAnimating(true);
        setTimeout(() => {
          setPointsAnimating(false);
        }, 2000);
      }, 500);
    }
  }, [poolId, showPoints]);

  const isFinalized = !!poolId;

  // Handle close - redirect to winner token page
  const handleClose = useCallback(() => {
    router.push(`/token/${winnerMint}`);
  }, [router, winnerMint]);

  // ═══════════════════════════════════════════════════════════════
  // ⭐ SHARE ON X + 2,000 POINTS
  // ═══════════════════════════════════════════════════════════════
  const handleShareOnX = useCallback(async () => {
    // Build the tweet text
    const tweetText = `🏆 My token $${winnerSymbol} just WON a battle on @BonkBattle! 

💰 ${solCollected.toFixed(2)} SOL collected
📊 ${volumeSol.toFixed(2)} SOL volume
🌊 Now trading on Raydium!

Join the arena: https://bonkbattle.fun/token/${winnerMint}

#BonkBattle #Solana #Memecoins`;

    // Open Twitter/X share dialog
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');

    // Mark as shared
    setHasShared(true);

    // Award +2,000 points if wallet connected
    if (publicKey && !sharePointsAwarded) {
      setIsAwardingSharePoints(true);

      try {
        const response = await fetch('/api/points/award', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet_address: publicKey.toString(),
            action: 'share_victory',
            points: 2000,
            token_mint: winnerMint,
            token_symbol: winnerSymbol,
          }),
        });

        if (response.ok) {
          setSharePointsAwarded(true);
          console.log('✅ +2,000 share points awarded!');
        } else {
          const data = await response.json();
          // If cooldown, still mark as shared visually
          if (data.error === 'Cooldown active') {
            console.log('⏳ Share cooldown active');
          }
        }
      } catch (error) {
        console.error('Failed to award share points:', error);
      } finally {
        setIsAwardingSharePoints(false);
      }
    }
  }, [winnerSymbol, winnerMint, solCollected, volumeSol, publicKey, sharePointsAwarded]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop - click to close and go to winner */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
        onClick={handleClose}
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
      <div className="relative z-10 w-full max-w-lg mx-4 animate-bounce-in">
        <div className="relative bg-gradient-to-br from-yellow-900/95 via-orange-900/95 to-yellow-900/95 border-2 border-yellow-500 rounded-2xl overflow-hidden shadow-2xl shadow-yellow-500/40">

          {/* X Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Animated Header */}
          <div className="h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-shimmer" />

          {/* Title Section - NO TROPHY */}
          <div className="text-center pt-8 pb-4 relative">
            {/* Glow effect */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
            </div>

            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-text-shimmer relative z-10">
              VICTORY!
            </h1>
            {/* Winner announcement */}
            <p className="text-yellow-200 mt-3 text-lg">
              Winner: <span className="font-bold text-yellow-400">${winnerSymbol}</span>
            </p>
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

          {/* Points Award - +10,000 POINTS */}
          <div className="px-6 pb-4">
            <div className={`bg-gradient-to-r from-purple-900/60 to-pink-900/60 border-2 border-purple-500/50 rounded-xl p-4 text-center relative overflow-hidden transition-all duration-500 ${showPoints ? 'scale-100 opacity-100' : 'scale-95 opacity-70'}`}>
              {/* Sparkle effect */}
              {pointsAnimating && (
                <div className="absolute inset-0 animate-sparkle-bg" />
              )}

              <div className="text-purple-300 text-sm mb-1 font-semibold">🎮 Battle Win Bonus</div>
              <div className={`text-3xl font-black transition-all duration-500 ${pointsAnimating ? 'text-yellow-400 scale-125 animate-points-pop' : 'text-purple-200'}`}>
                +10,000 POINTS
              </div>
              {pointsAnimating && (
                <div className="text-sm text-green-400 mt-1 animate-fade-in">Added to your account!</div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ⭐ SHARE ON X BUTTON - +2,000 POINTS */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="px-6 pb-4">
            <button
              onClick={handleShareOnX}
              disabled={isAwardingSharePoints}
              className={`w-full py-3 rounded-xl font-bold text-lg transition-all relative overflow-hidden ${sharePointsAwarded
                  ? 'bg-green-600 text-white cursor-default'
                  : hasShared
                    ? 'bg-gray-600 hover:bg-gray-500 text-white'
                    : 'bg-black hover:bg-gray-900 text-white border-2 border-gray-700 hover:border-gray-500'
                }`}
            >
              {isAwardingSharePoints ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Awarding Points...
                </span>
              ) : sharePointsAwarded ? (
                <span className="flex items-center justify-center gap-2">
                  ✅ Shared! +2,000 Points Earned
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {/* X (Twitter) Logo */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X
                  <span className="text-yellow-400 font-black">+2,000 pts</span>
                </span>
              )}
            </button>
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

            {/* Navigation Buttons - Updated */}
            <div className="flex gap-3 pt-2">
              {/* Left: Your Balance */}
              <Link
                href="/profile?tab=balance"
                className="flex-1 py-3 rounded-xl font-semibold text-center bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-all text-sm border border-blue-500/30"
              >
                💰 Your Balance
              </Link>

              {/* Right: View Winner Token */}
              <Link
                href={`/token/${winnerMint}`}
                className="flex-1 py-3 rounded-xl font-semibold text-center bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 transition-all text-sm border border-yellow-500/30"
              >
                🏆 View Winner
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