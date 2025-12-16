// app/src/components/battle/PointsRewardModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';

interface PointsRewardModalProps {
  tokenSymbol: string;
  tokenImage: string;
  tokenMint: string;
  points: number;
  onClose: () => void;
}

export function PointsRewardModal({
  tokenSymbol,
  tokenImage,
  tokenMint,
  points,
  onClose,
}: PointsRewardModalProps) {
  const router = useRouter();
  const { publicKey } = useWallet();

  // Animation states
  const [showContent, setShowContent] = useState(false);
  const [pointsAnimating, setPointsAnimating] = useState(false);

  // Share state
  const [hasShared, setHasShared] = useState(false);
  const [sharePointsAwarded, setSharePointsAwarded] = useState(false);
  const [isAwardingSharePoints, setIsAwardingSharePoints] = useState(false);

  // Animate on mount
  useEffect(() => {
    setTimeout(() => {
      setShowContent(true);
      setPointsAnimating(true);
      setTimeout(() => {
        setPointsAnimating(false);
      }, 2000);
    }, 100);
  }, []);

  // Handle close - go to token page
  const handleClose = useCallback(() => {
    onClose();
    router.push(`/token/${tokenMint}`);
  }, [onClose, router, tokenMint]);

  // Share on X + 2,000 points
  const handleShareOnX = useCallback(async () => {
    const tweetText = `🏆 My token $${tokenSymbol} just WON a battle on @BonkBattle! 

💰 Earned +${points.toLocaleString()} bonus points!
🌊 Now trading on Raydium!

Join the arena: https://bonkbattle.fun/token/${tokenMint}

#BonkBattle #Solana #Memecoins`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');

    setHasShared(true);

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
            token_mint: tokenMint,
            token_symbol: tokenSymbol,
          }),
        });

        if (response.ok) {
          setSharePointsAwarded(true);
        }
      } catch (error) {
        console.error('Failed to award share points:', error);
      } finally {
        setIsAwardingSharePoints(false);
      }
    }
  }, [tokenSymbol, tokenMint, points, publicKey, sharePointsAwarded]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
        onClick={handleClose}
      />

      {/* Green glow particles - fewer for smaller modal */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-float-up"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '-10px',
              backgroundColor: '#22c55e',
              boxShadow: '0 0 10px #22c55e, 0 0 20px #22c55e',
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Modal - Smaller */}
      <div className={`relative z-10 w-full max-w-sm mx-4 transition-all duration-500 ${showContent ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
        <div className="relative bg-gradient-to-br from-green-900/95 via-emerald-900/95 to-green-900/95 border-2 border-green-500 rounded-2xl overflow-hidden shadow-2xl shadow-green-500/50">

          {/* Animated green glow border */}
          <div className="absolute inset-0 rounded-2xl animate-glow-pulse" style={{
            boxShadow: '0 0 30px rgba(34, 197, 94, 0.5), inset 0 0 30px rgba(34, 197, 94, 0.1)',
          }} />

          {/* X Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header glow bar */}
          <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 animate-shimmer" />

          {/* Content - Compact */}
          <div className="p-3 text-center relative">

            {/* Title */}
            <div className="mb-2">
              <h2 className="text-2xl font-black text-green-300">BONUS WINNER</h2>
            </div>

            {/* Token Image with glow */}
            <div className="relative inline-block mb-1">
              <div className="absolute inset-0 bg-green-500/30 rounded-lg blur-xl animate-pulse" />
              <div className="relative w-28 h-28 rounded-lg overflow-hidden border-3 border-green-500 shadow-lg shadow-green-500/50 mx-auto animate-token-glow">
                <Image
                  src={tokenImage || '/default-token.png'}
                  alt={tokenSymbol}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              {/* Crown */}
              <div className="absolute -top-2 -right-2 text-2xl animate-bounce">👑</div>
            </div>

            {/* Token name */}
            <div className="text-base font-bold text-green-400 mb-2">${tokenSymbol}</div>

            {/* Points - Compact */}
            <div className={`relative py-2 transition-all duration-500 ${pointsAnimating ? 'scale-105' : 'scale-100'}`}>
              <div className="relative">
                <div className={`text-4xl font-black transition-all duration-500 ${pointsAnimating
                    ? 'text-white animate-points-glow'
                    : 'text-green-400'
                  }`} style={{
                    textShadow: pointsAnimating
                      ? '0 0 20px #22c55e, 0 0 40px #22c55e, 0 0 60px #22c55e'
                      : '0 0 10px rgba(34, 197, 94, 0.5)',
                  }}>
                  +{points.toLocaleString()}
                </div>
                <div className="text-lg font-bold text-green-300">POINTS</div>
              </div>
            </div>

            {/* Share on X Button */}
            <div className="mt-2">
              <button
                onClick={handleShareOnX}
                disabled={isAwardingSharePoints}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all relative overflow-hidden ${sharePointsAwarded
                    ? 'bg-green-600 text-white cursor-default'
                    : 'bg-black hover:bg-gray-900 text-white border-2 border-green-500/50 hover:border-green-400'
                  }`}
              >
                {isAwardingSharePoints ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Awarding...
                  </span>
                ) : sharePointsAwarded ? (
                  <span className="flex items-center justify-center gap-2">
                    ✅ +2,000 Points Earned!
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share on X
                    <span className="text-green-400 font-black">+2,000 pts</span>
                  </span>
                )}
              </button>
            </div>

            {/* View Token Button */}
            <button
              onClick={handleClose}
              className="w-full mt-2 py-2 rounded-xl font-semibold text-center bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-all text-xs border border-green-500/30"
            >
              🏆 View Winner Token
            </button>

          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 0.8; }
          100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
        }
        .animate-float-up { animation: float-up 4s ease-out forwards; }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }

        @keyframes token-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.5); }
          50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.8), 0 0 45px rgba(34, 197, 94, 0.4); }
        }
        .animate-token-glow { animation: token-glow 2s ease-in-out infinite; }

        @keyframes points-glow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-points-glow { animation: points-glow 0.5s ease-in-out infinite; }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer { 
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite; 
        }
      `}</style>
    </div>
  );
}