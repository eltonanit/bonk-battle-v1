// ========================================================================
// BUY TO WIN MODAL - Polymarket Style
// ========================================================================
// Modal che appare quando l'utente clicca "Buy Winner"
// Mostra slider per l'importo e calcola il "Best To Win" in tempo reale
// ========================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  calculateBestToWin,
  calculateChances,
  formatBestToWinUSD,
  formatChance,
  type TokenBattleData
} from '@/utils/calculateBestToWin';

// ========================================================================
// TYPES
// ========================================================================

interface BuyToWinModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: {
    mint: string;
    name: string;
    symbol: string;
    image: string | null;
    solCollected: number;
    tokensSold?: number;
  };
  opponent: {
    solCollected: number;
    tokensSold?: number;
  };
  solPriceUSD: number;
  side: 'A' | 'B'; // A = left (blue), B = right (pink)
  onBuy?: (amount: number) => void;
}

// ========================================================================
// CONSTANTS
// ========================================================================

const PRESET_AMOUNTS_USD = [10, 50, 100, 500];
const MIN_AMOUNT_USD = 1;
const MAX_AMOUNT_USD = 10000;

// Colors
const COLORS = {
  A: {
    bg: '#386BFD',
    bgHover: '#2a5ae6',
    text: 'text-white',
  },
  B: {
    bg: '#FD1F6F',
    bgHover: '#e6185f',
    text: 'text-white',
  },
};

// ========================================================================
// COMPONENT
// ========================================================================

export function BuyToWinModal({
  isOpen,
  onClose,
  token,
  opponent,
  solPriceUSD,
  side,
  onBuy,
}: BuyToWinModalProps) {
  // State
  const [amountUSD, setAmountUSD] = useState(100);

  // Convert USD to SOL
  const amountSOL = solPriceUSD > 0 ? amountUSD / solPriceUSD : 0;

  // Prepare token data for calculation
  const tokenData: TokenBattleData = {
    solCollected: token.solCollected,
    tokensSold: token.tokensSold || 0,
  };

  const opponentData: TokenBattleData = {
    solCollected: opponent.solCollected,
    tokensSold: opponent.tokensSold || 0,
  };

  // Calculate Best To Win
  const result = calculateBestToWin(amountSOL, tokenData, opponentData, solPriceUSD);

  // Calculate chances
  const { chanceA, chanceB } = calculateChances(
    side === 'A' ? token.solCollected : opponent.solCollected,
    side === 'A' ? opponent.solCollected : token.solCollected
  );
  const myChance = side === 'A' ? chanceA : chanceB;

  // Get colors based on side
  const colors = COLORS[side];

  // Handle amount change
  const handleAmountChange = useCallback((value: number) => {
    const clampedValue = Math.max(MIN_AMOUNT_USD, Math.min(MAX_AMOUNT_USD, value));
    setAmountUSD(clampedValue);
  }, []);

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleAmountChange(Number(e.target.value));
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value === '') {
      setAmountUSD(0);
    } else {
      handleAmountChange(Number(value));
    }
  };

  // Handle preset click
  const handlePresetClick = (amount: number) => {
    handleAmountChange(amountUSD + amount);
  };

  // Handle buy click
  const handleBuyClick = () => {
    if (onBuy && amountSOL > 0) {
      onBuy(amountSOL);
    }
  };

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Don't render if not open
  if (!isOpen) return null;

  // Get token image
  const tokenImage = token.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${token.symbol}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-[#1a1f2e] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#2a3544]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Token Image and Chance */}
          <div
            className="relative p-4"
            style={{
              background: `linear-gradient(135deg, ${side === 'A' ? '#1e3a8a' : '#831843'} 0%, #1a1f2e 100%)`,
            }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Token Info */}
            <div className="flex items-center gap-4">
              {/* Token Image */}
              <div
                className="w-16 h-16 rounded-xl overflow-hidden border-2"
                style={{ borderColor: colors.bg }}
              >
                <Image
                  src={tokenImage}
                  alt={token.symbol}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>

              {/* Token Name & Chance */}
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold"
                    style={{ backgroundColor: colors.bg }}
                  >
                    CHANCE {formatChance(myChance)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">
                  ${token.symbol}
                </h3>
                <p className="text-gray-400 text-sm">{token.name}</p>
              </div>
            </div>
          </div>

          {/* Amount Input Section */}
          <div className="p-4 border-b border-[#2a3544]">
            {/* Input Row */}
            <div className="flex items-center gap-3 mb-4">
              {/* USD Input */}
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                  $
                </span>
                <input
                  type="text"
                  value={amountUSD || ''}
                  onChange={handleInputChange}
                  className="w-full bg-[#232a36] border border-[#3b415a] rounded-lg py-3 pl-8 pr-4 text-white text-xl font-bold focus:outline-none focus:border-[#4a5568]"
                  placeholder="0"
                />
              </div>

              {/* Preset Buttons */}
              {PRESET_AMOUNTS_USD.slice(0, 2).map((amount) => (
                <button
                  key={amount}
                  onClick={() => handlePresetClick(amount)}
                  className="px-3 py-3 bg-[#232a36] border border-[#3b415a] rounded-lg text-gray-300 hover:bg-[#2a3544] hover:text-white transition-colors font-semibold"
                >
                  +{amount}
                </button>
              ))}
            </div>

            {/* Slider */}
            <div className="relative">
              <input
                type="range"
                min={MIN_AMOUNT_USD}
                max={MAX_AMOUNT_USD}
                value={amountUSD}
                onChange={handleSliderChange}
                className="w-full h-2 bg-[#3b415a] rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${colors.bg} 0%, ${colors.bg} ${(amountUSD / MAX_AMOUNT_USD) * 100}%, #3b415a ${(amountUSD / MAX_AMOUNT_USD) * 100}%, #3b415a 100%)`,
                }}
              />
              {/* SOL equivalent */}
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>≈ {amountSOL.toFixed(4)} SOL</span>
                <span>Max ${MAX_AMOUNT_USD.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Buy Button with Best To Win */}
          <div className="p-4">
            <button
              onClick={handleBuyClick}
              disabled={amountSOL <= 0}
              className="w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: colors.bg,
                boxShadow: `0 4px 20px ${colors.bg}40`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.bgHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.bg;
              }}
            >
              <div className="flex flex-col items-center">
                <span className="text-white">Buy ${token.symbol}</span>
                <span className="text-white/90 text-sm mt-0.5">
                  Best To Win: {formatBestToWinUSD(result.bestToWinUSD)}
                </span>
              </div>
            </button>

            {/* Multiplier Info */}
            {result.multiplier > 0 && (
              <div className="mt-3 text-center">
                <span className="text-gray-400 text-sm">
                  ⚡ {result.multiplier.toFixed(2)}x potential
                </span>
                {myChance < 30 && (
                  <span className="text-yellow-500 text-sm ml-2">
                    • High risk/reward
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom slider styles */}
      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        input[type='range']::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </>
  );
}

export default BuyToWinModal;
