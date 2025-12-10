'use client';

import { useState } from 'react';
import { X, Twitter } from 'lucide-react';

interface PointsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  points: number;
  tokenSymbol: string;
  tokenMint: string;
}

export function PointsPopup({ isOpen, onClose, points, tokenSymbol, tokenMint }: PointsPopupProps) {
  const [shared, setShared] = useState(false);

  if (!isOpen) return null;

  const handleShare = () => {
    const tweetText = `🏆 My token $${tokenSymbol} just won a battle on @BonkBattle and is now listed on Raydium! 🚀\n\nJoin the arena: https://bonk-battle.vercel.app/token/${tokenMint}`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');

    setShared(true);

    // TODO: Award +2000 points via API
    // fetch('/api/points/share', { method: 'POST', body: JSON.stringify({ tokenMint }) });
  };

  const handleClose = () => {
    setShared(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Popup */}
      <div className="relative z-10 w-[90%] max-w-sm animate-points-pop">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 rounded-2xl blur-lg opacity-75 animate-pulse" />

        <div className="relative bg-gradient-to-br from-bonk-dark via-bonk-card to-bonk-dark border-2 border-green-500 rounded-2xl overflow-hidden">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>

          {/* Top banner */}
          <div className="h-2 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400" />

          {/* Content */}
          <div className="p-8 text-center">
            {/* Coin animation */}
            <div className="text-6xl mb-4 animate-coin-spin">🪙</div>

            {/* Points */}
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-2 animate-pulse">
              +{points.toLocaleString()}
            </div>

            <p className="text-xl font-bold text-white mb-1">STONKS!</p>
            <p className="text-gray-400 mb-6">Battle victory reward</p>

            {/* Share button */}
            {!shared ? (
              <button
                onClick={handleShare}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg rounded-xl hover:from-blue-400 hover:to-blue-500 transition-all transform hover:scale-105 flex items-center justify-center gap-2 mb-3"
              >
                <Twitter size={20} />
                Share on X
                <span className="bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                  +2,000 pts
                </span>
              </button>
            ) : (
              <div className="w-full py-4 bg-green-500/20 text-green-400 font-bold text-lg rounded-xl flex items-center justify-center gap-2 mb-3">
                ✓ Shared! +2,000 bonus points
              </div>
            )}

            {/* Skip */}
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes points-pop {
          0% {
            transform: scale(0) rotate(-10deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes coin-spin {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(360deg);
          }
        }

        .animate-points-pop {
          animation: points-pop 0.4s ease-out forwards;
        }

        .animate-coin-spin {
          animation: coin-spin 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
