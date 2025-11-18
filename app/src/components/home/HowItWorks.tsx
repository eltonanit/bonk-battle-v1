'use client';

import { useState } from 'react';

export function HowItWorks() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="px-5 lg:px-6  mt-8 mb-8">      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl font-bold text-base uppercase tracking-wider transition-all ${
          isOpen ? 'bg-green-500 text-black' : 'bg-transparent text-green-500'
        }`}
        style={{ border: '2px solid #10b981' }}
      >
        <span>HOW IT WORKS</span>
        <span className={`text-xl transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      
      <div
        className={`overflow-hidden transition-all duration-400 ${
          isOpen ? 'max-h-[800px] mt-5' : 'max-h-0'
        }`}
      >
        <div className="rounded-2xl p-8" style={{ 
          background: 'rgba(0, 0, 0, 0.4)', 
          border: '1px solid rgba(16, 185, 129, 0.3)' 
        }}>
          <div className="text-2xl font-extrabold text-center mb-6 text-green-500 uppercase tracking-wide">
            RULES ARE SIMPLE
          </div>
          
          <div className="space-y-4">
            <div className="rounded-xl p-5" style={{ 
              background: 'rgba(0, 0, 0, 0.5)', 
              border: '1px solid rgba(16, 185, 129, 0.2)' 
            }}>
              <div className="text-3xl font-extrabold text-green-500 mb-2">1</div>
              <div className="text-lg font-bold text-green-500 mb-2">ONLY BUY - FAIR LAUNCH</div>
              <div className="text-[15px] font-medium text-white/90 leading-relaxed">
                During launch period, you can ONLY BUY. No sell button. Price only goes UP to prevent dumps and ensure a fair launch.
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ 
              background: 'rgba(0, 0, 0, 0.5)', 
              border: '1px solid rgba(16, 185, 129, 0.2)' 
            }}>
              <div className="text-3xl font-extrabold text-green-500 mb-2">2</div>
              <div className="text-lg font-bold text-green-500 mb-2">SELL AFTER DEX LISTING</div>
              <div className="text-[15px] font-medium text-white/90 leading-relaxed">
                Once the token hits the target, it gets listed on DEX. After the fair launch ends and the token is listed, you can sell normally like any other token.
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ 
              background: 'rgba(0, 0, 0, 0.5)', 
              border: '1px solid rgba(16, 185, 129, 0.2)' 
            }}>
              <div className="text-3xl font-extrabold text-green-500 mb-2">3</div>
              <div className="text-lg font-bold text-green-500 mb-2">FULLY REFUND</div>
              <div className="text-[15px] font-medium text-white/90 leading-relaxed">
                If target is not reached, get a fully refund of your SOL back.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





