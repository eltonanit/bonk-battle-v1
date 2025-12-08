'use client';

import { useState } from 'react';
import Image from 'next/image';

export function HowItWorks() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="px-5 lg:px-6 mt-6 mb-6 lg:flex lg:justify-center">
      <div className="w-full lg:w-[480px]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 lg:px-4 lg:py-2 rounded-xl font-bold text-xs lg:text-sm uppercase tracking-wider transition-all ${
            isOpen ? 'bg-[#FF8A5B] text-black' : 'bg-transparent text-[#FF8A5B]'
          }`}
          style={{ border: '2px solid #FF8A5B' }}
        >
          <span>HOW IT WORKS</span>
          <span className={`text-base lg:text-base transition-transform ${isOpen ? 'rotate-180' : ''}`}>▲</span>
        </button>

        <div
          className={`overflow-hidden transition-all duration-400 ${
            isOpen ? 'max-h-[800px] mt-3 lg:mt-3' : 'max-h-0'
          }`}
        >
          <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl p-4 lg:p-5">
            {/* Header with BONK logo */}
            <div className="flex items-center gap-3 mb-5">
              <Image
                src="/BONK-LOGO.svg"
                alt="BONK BATTLE"
                width={40}
                height={40}
              />
              <h2 className="text-lg font-bold text-white">How BONK Battle Works</h2>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Create Your Token</h3>
                  <p className="text-gray-400 text-xs">
                    Launch your own token on BONK Battle. Choose a name, symbol, and image for your token.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Qualify Your Token for Battles</h3>
                  <p className="text-gray-400 text-xs">
                    Make your first buy (minimum $10) to qualify your token.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Enter Battle</h3>
                  <p className="text-gray-400 text-xs">
                    Once qualified, find an opponent and start a battle! Each battle is a 1v1 competition between two tokens.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Win & Get Listed</h3>
                  <p className="text-gray-400 text-xs">
                    Token winners gets listed on DEX & 50% of liquidity of token loosers + Earn 10,000 points for winning a battle.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
