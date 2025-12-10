'use client';

import Link from 'next/link';

interface WinnerBannerProps {
  poolId: string;
  raydiumUrl: string;
  loserSymbol?: string;
}

export function WinnerBanner({ poolId, raydiumUrl, loserSymbol }: WinnerBannerProps) {
  return (
    <div className="relative mb-6 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 animate-gradient-x" />

      {/* Sparkles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative bg-gradient-to-r from-yellow-900/50 via-orange-900/50 to-yellow-900/50 border-2 border-yellow-500/50 rounded-xl p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left side */}
          <div className="flex items-center gap-3">
            <div className="text-4xl animate-bounce">🏆</div>
            <div>
              <div className="text-xl font-black text-yellow-400">
                CHAMPION TOKEN
              </div>
              <div className="text-gray-400 text-sm">
                {loserSymbol
                  ? `Defeated $${loserSymbol} in battle!`
                  : 'Won the battle and listed on Raydium!'
                }
              </div>
            </div>
          </div>

          {/* Right side - CTAs */}
          <div className="flex gap-3">
            <a
              href={raydiumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-lg hover:from-blue-400 hover:to-purple-400 transition-all transform hover:scale-105"
            >
              🔄 Trade on Raydium
            </a>
            <Link
              href="/winners"
              className="px-6 py-2 bg-yellow-500/20 text-yellow-400 font-bold rounded-lg hover:bg-yellow-500/30 transition-all border border-yellow-500/50"
            >
              🏆 Hall of Fame
            </Link>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }

        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
