'use client';

import { useState } from 'react';
import Link from 'next/link';

export function HowItWorks() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="px-5 lg:px-6 mt-8 mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-6 py-4 rounded-xl font-bold text-base uppercase tracking-wider transition-all ${
          isOpen ? 'bg-[#FF8A5B] text-black' : 'bg-transparent text-[#FF8A5B]'
        }`}
        style={{ border: '2px solid #FF8A5B' }}
      >
        <span>HOW IT WORKS</span>
        <span className={`text-xl transition-transform ${isOpen ? 'rotate-180' : ''}`}>▲</span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-400 ${
          isOpen ? 'max-h-[800px] mt-5' : 'max-h-0'
        }`}
      >
        <div
          className="rounded-xl p-6 lg:p-8"
          style={{
            background: 'rgba(20, 20, 30, 0.95)',
            border: '2px solid #FF8A5B'
          }}
        >
          {/* RULES ARE SIMPLE Header */}
          <div
            className="text-xl lg:text-2xl font-extrabold text-center mb-6 py-3 rounded-lg uppercase tracking-wide"
            style={{
              background: '#FF8A5B',
              color: '#000'
            }}
          >
            RULES ARE SIMPLE
          </div>

          {/* Content Box */}
          <div
            className="rounded-lg p-6 space-y-4"
            style={{
              background: 'rgba(30, 35, 50, 0.8)',
              border: '1px solid rgba(255, 138, 91, 0.3)'
            }}
          >
            {/* First Rule */}
            <div className="text-center text-base lg:text-lg text-gray-300">
              First token to reach <span className="font-bold text-[#FF8A5B]">60K Market Cap</span> and <span className="font-bold text-[#FF8A5B]">70K Volume</span>
              <br />
              <span className="text-white">wins the battle!</span>
            </div>

            {/* Winner Gets */}
            <div className="text-center text-base lg:text-lg">
              <span className="text-2xl">🏆</span> <span className="font-bold text-[#FF8A5B]">Winner gets:</span> <span className="text-gray-300">Instant listing on DEX + 50% of loser's liquidity pool!</span>
            </div>

            {/* BONK BATTLE NOW */}
            <div className="text-center">
              <span className="text-xl lg:text-2xl font-extrabold text-[#FF8A5B]">⚡ BONK BATTLE NOW !!!</span>
            </div>
          </div>

          {/* Log in to Start Battle Button */}
          <Link href="/create">
            <button
              className="w-full mt-6 py-4 rounded-xl font-bold text-lg lg:text-xl uppercase tracking-wide transition-all hover:opacity-90 active:scale-95"
              style={{
                background: '#FF8A5B',
                color: '#000'
              }}
            >
              Log in to Start Battle
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
