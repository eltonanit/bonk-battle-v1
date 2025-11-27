'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      {/* Mobile Tickers */}
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
        <div className="max-w-[900px] mx-auto px-5 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-4xl">💬</span>
              Support
            </h1>
            <p className="text-gray-400 mt-2">
              Need help? We&apos;re here for you!
            </p>
          </div>

          {/* Contact Section */}
          <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Contact Us</h2>

            <div className="space-y-4">
              {/* X (Twitter) */}
              <div className="flex items-center gap-4 p-4 bg-[#0a1f1f] rounded-lg">
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold">For any query, write to us on X</div>
                  <a
                    href="https://x.com/BonkBattle_"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    @BonkBattle_
                  </a>
                </div>
                <a
                  href="https://x.com/BonkBattle_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-black rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  Message
                </a>
              </div>

              {/* Email */}
              <div className="flex items-center gap-4 p-4 bg-[#0a1f1f] rounded-lg">
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold">Or send us an email</div>
                  <a
                    href="mailto:bonk@gmail.com"
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    bonk@gmail.com
                  </a>
                </div>
                <a
                  href="mailto:bonk@gmail.com"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors"
                >
                  Email
                </a>
              </div>
            </div>
          </div>

          {/* How BONK Battle Works */}
          <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Image
                src="/BONK-LOGO.svg"
                alt="BONK BATTLE"
                width={48}
                height={48}
              />
              <h2 className="text-xl font-bold text-white">How BONK Battle Works</h2>
            </div>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Create Your Token</h3>
                  <p className="text-gray-400 text-sm">
                    Launch your own token on BONK Battle with just a few clicks.
                    Choose a name, symbol, and image for your token.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Qualify Your Token</h3>
                  <p className="text-gray-400 text-sm">
                    Reach $5,100 market cap to qualify for battles.
                    Make your first buy (minimum $10) to qualify your token.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Enter Battle</h3>
                  <p className="text-gray-400 text-sm">
                    Once qualified, find an opponent and start a battle!
                    Each battle is a 1v1 competition between two tokens.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Win & Get Listed</h3>
                  <p className="text-gray-400 text-sm">
                    The winner takes $500 liquidity and gets listed on Meteora DEX permanently!
                    Earn 10,000 points for winning a battle.
                  </p>
                </div>
              </div>
            </div>

            {/* Key Features */}
            <div className="mt-8 pt-6 border-t border-[#1a3a3a]">
              <h3 className="text-white font-semibold mb-4">Key Features</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a1f1f] rounded-lg p-4">
                  <div className="text-2xl mb-2">⚔️</div>
                  <div className="text-white font-medium text-sm">1v1 Token Battles</div>
                  <div className="text-gray-500 text-xs">Fight for dominance</div>
                </div>
                <div className="bg-[#0a1f1f] rounded-lg p-4">
                  <div className="text-2xl mb-2">💰</div>
                  <div className="text-white font-medium text-sm">$500 Prize Pool</div>
                  <div className="text-gray-500 text-xs">Winner takes all</div>
                </div>
                <div className="bg-[#0a1f1f] rounded-lg p-4">
                  <div className="text-2xl mb-2">🎓</div>
                  <div className="text-white font-medium text-sm">DEX Listing</div>
                  <div className="text-gray-500 text-xs">Meteora permanent listing</div>
                </div>
                <div className="bg-[#0a1f1f] rounded-lg p-4">
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="text-white font-medium text-sm">Earn Points</div>
                  <div className="text-gray-500 text-xs">Rewards coming soon</div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/create"
                className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-bold py-3 rounded-lg text-center hover:opacity-90 transition-opacity"
              >
                Create Your Token
              </Link>
              <Link
                href="/"
                className="flex-1 bg-[#1a3a3a] text-white font-bold py-3 rounded-lg text-center hover:bg-[#2a4a4a] transition-colors"
              >
                View Live Battles
              </Link>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
