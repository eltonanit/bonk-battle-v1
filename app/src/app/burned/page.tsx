'use client';

import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';

export default function BurnedPage() {
  // TODO: Replace with actual burned amount from API/blockchain
  const burnedAmount = 0;

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      {/* Tickers - Mobile only */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
        <div className="flex items-center gap-2 px-2 justify-center xs:justify-start">
          <FOMOTicker />
          <div className="hidden sm:block">
            <CreatedTicker />
          </div>
        </div>
      </div>

      <DesktopHeader />
      <Header />
      <Sidebar />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16">
        <div className="max-w-3xl mx-auto px-4 py-8">

          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4">
              <span className="text-red-500" style={{ textShadow: '0 0 30px rgba(239, 68, 68, 0.5)' }}>
                BURNED
              </span>
            </h1>
            <p className="text-gray-400 text-lg">
              Total BONK tokens burned to date
            </p>
          </div>

          {/* Burned Amount Card */}
          <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl p-8 mb-8">
            <div className="text-center">
              {/* Fire Icon */}
              <div className="text-6xl mb-4">
                🔥
              </div>

              {/* Amount */}
              <div
                className="text-5xl sm:text-6xl lg:text-7xl font-black text-red-500 mb-2"
                style={{ textShadow: '0 0 40px rgba(239, 68, 68, 0.4)' }}
              >
                {formatNumber(burnedAmount)}
              </div>

              <div className="text-2xl font-bold text-orange-400">
                BONK
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-[#1a1f2e] border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-red-500">🔥</span>
              What is Token Burning?
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Token burning is the process of permanently removing tokens from circulation.
              When tokens are burned, they are sent to a wallet address that no one can access,
              effectively reducing the total supply. This mechanism can help increase the value
              of remaining tokens by creating scarcity.
            </p>

            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">How BONK Battle Burns Work</h3>
              <ul className="text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  A portion of fees from battles are burned
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  Losing tokens in battles contribute to burns
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  Burns are recorded on-chain and verifiable
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
