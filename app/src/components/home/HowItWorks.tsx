'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';

export function HowItWorks() {
  const [isOpen, setIsOpen] = useState(false);
  const { connected } = useWallet();

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
          <div
            className="rounded-xl p-3 lg:p-4"
            style={{
              background: 'rgba(20, 20, 30, 0.95)',
              border: '2px solid #FF8A5B'
            }}
          >
          {/* RULES ARE SIMPLE Header */}
          <div
            className="text-sm lg:text-base font-extrabold text-center mb-3 lg:mb-3 py-1.5 lg:py-2 rounded-lg uppercase tracking-wide"
            style={{
              background: '#FFD700',
              color: '#000'
            }}
          >
            RULES ARE SIMPLE
          </div>

          {/* Content Box */}
          <div
            className="rounded-lg p-3 lg:p-4 space-y-2 lg:space-y-2"
            style={{
              background: 'rgba(30, 35, 50, 0.8)',
              border: '1px solid rgba(255, 138, 91, 0.3)'
            }}
          >
            {/* First Rule */}
            <div className="text-center text-xs lg:text-sm text-gray-300">
              First token to reach
              <br />
              <span className="font-bold text-[#FFD700]">60K Market Cap</span> and <span className="font-bold text-[#FFD700]">70K Volume</span>
              <br />
              <span className="text-white">wins the battle!</span>
            </div>

            {/* Score System */}
            <div className="text-center text-xs lg:text-sm text-gray-300">
              <span className="font-bold text-[#FF8A5B]">Score:</span> <span className="font-bold text-[#FFD700]">0</span> → <span className="font-bold text-[#FFD700]">1</span> if you reach Vol or MC target.
              <br />
              <span className="text-gray-300">If you reach both before the opponent you win!</span>
              <br />
              <span className="font-bold text-[#FFD700]">Token wins at 2 score!</span>
            </div>

            {/* Winner Gets */}
            <div className="text-center text-xs lg:text-sm">
              <span className="text-base lg:text-base">🏆</span> <span className="font-bold text-[#FF8A5B]">Winner gets:</span> <span className="text-gray-300">Instant listing on DEX + 50% of loser's liquidity pool!</span>
            </div>

            {/* BONK BATTLE NOW */}
            <div className="text-center">
              <span className="text-sm lg:text-base font-extrabold text-[#FF8A5B]">⚡ BONK BATTLE NOW !!!</span>
            </div>
          </div>

          {/* Log in / Start Battle Button */}
          <div className="flex justify-center mt-3 lg:mt-3">
            <Link href="/create">
              <button
                className="rounded-xl font-bold uppercase tracking-wide transition-all hover:opacity-90 active:scale-95 py-2 lg:py-2 px-4 lg:px-4 text-xs lg:text-xs"
                style={{
                  background: '#FF8A5B',
                  color: '#000'
                }}
              >
                {connected ? 'Start a New Battle' : 'Log in to Start Battle'}
              </button>
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
