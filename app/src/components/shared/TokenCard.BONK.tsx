// components/shared/TokenCard.BONK.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { ParsedTokenBattleState } from '@/types/bonk';
import { BattleStatus } from '@/types/bonk';
import { useEffect, useState } from 'react';

interface TokenCardBonkProps {
  tokenState: ParsedTokenBattleState;
}

function TimeAgo({ timestamp }: { timestamp: number }) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = now - timestamp;

      if (diff < 60) {
        setTimeAgo(`${diff}s ago`);
      } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        setTimeAgo(`${minutes}m ago`);
      } else if (diff < 86400) {
        const hours = Math.floor(diff / 3600);
        setTimeAgo(`${hours}h ago`);
      } else {
        const days = Math.floor(diff / 86400);
        setTimeAgo(`${days}d ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return <span>{timeAgo}</span>;
}

// Costanti dalla bonding curve (come nel contratto)
const TOTAL_SUPPLY = 1_000_000_000; // 1B token (senza decimali per display)
const SOL_PRICE_USD = 230; // Fallback price, idealmente da oracle

export function TokenCardBonk({ tokenState }: TokenCardBonkProps) {
  // ⭐ NO MORE RPC CALLS! Use data passed from parent
  const state = tokenState;
  const mintAddress = state.mint.toString();

  // ⭐ CORRECT MC CALCULATION using bonding curve formula
  // MC = (virtualSolReserves × TOTAL_SUPPLY) / virtualTokenReserves × SOL_PRICE
  const calculateMarketCapUsd = (): number => {
    const virtualSol = state.virtualSolReserves ?? 0;
    const virtualToken = state.virtualTokenReserves ?? 0;

    if (virtualToken === 0) return 0;

    // MC in SOL = (virtualSol / 1e9) × (TOTAL_SUPPLY × 1e9) / virtualToken
    // Semplificato: MC in SOL = virtualSol × TOTAL_SUPPLY / virtualToken
    const mcInSol = (virtualSol * TOTAL_SUPPLY) / virtualToken;
    const mcInUsd = (mcInSol / 1e9) * SOL_PRICE_USD;

    return mcInUsd;
  };

  const marketCapUsd = calculateMarketCapUsd();

  // ⭐ Use metadata from token state (already loaded from blockchain)
  const metadata = state.name ? {
    name: state.name,
    symbol: state.symbol || 'TKN',
    uri: state.uri || '',
    image: state.image
  } : null;

  // Status badge configuration
  const statusConfig = {
    [BattleStatus.Created]: { color: 'bg-bonk-green', label: 'NEW' },
    [BattleStatus.Qualified]: { color: 'bg-bonk-orange-light text-black', label: 'QUALIFIED' },
    [BattleStatus.InBattle]: { color: 'bg-bonk-orange-light text-black animate-pulse', label: '⚔️ IN BATTLE' },
    [BattleStatus.VictoryPending]: { color: 'bg-bonk-gold text-black', label: '🏆 VICTORY' },
    [BattleStatus.Listed]: { color: 'bg-bonk-border text-bonk-text', label: 'LISTED' },
  };

  const status = statusConfig[state.battleStatus];

  return (
    <Link href={`/token/${mintAddress}`}>
      <div className="bg-bonk-card backdrop-blur-md border border-bonk-border rounded-xl p-5 hover:bg-bonk-card/80 hover:border-bonk-orange hover:shadow-xl transition-all duration-300 cursor-pointer">
        {/* Token Image & Status */}
        <div className="flex items-start gap-4 mb-4">
          {/* Token Image or BONK Logo */}
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 p-0.5 flex-shrink-0 overflow-hidden">
            {metadata?.image ? (
              <img
                src={metadata.image}
                alt={metadata.symbol}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-full bg-bonk-dark flex items-center justify-center">
                <Image
                  src="/BONK-LOGO.svg"
                  alt="BONK"
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain opacity-50"
                />
              </div>
            )}
          </div>

          {/* Token Info */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold truncate text-white">
                {metadata ? metadata.name : `${mintAddress.substring(0, 8)}...`}
              </h3>
              <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                <TimeAgo timestamp={state.creationTimestamp} />
              </span>
            </div>

            <p className="text-sm text-bonk-orange-light font-bold">
              ${metadata ? metadata.symbol : '...'}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <span className={`${status.color} px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-bonk-dark/50 rounded-lg p-2">
            <div className="text-xs text-gray-400">Market Cap</div>
            <div className="text-sm font-bold text-white">
              ${marketCapUsd?.toFixed(0) ?? '...'}
            </div>
          </div>
          <div className="bg-bonk-dark/50 rounded-lg p-2">
            <div className="text-xs text-gray-400">Volume</div>
            <div className="text-sm font-bold text-white">
              {(state.totalTradeVolume / 1e9).toFixed(2)} SOL
            </div>
          </div>
        </div>

        {/* MC Info - Always visible */}
        <div className="mt-3 pt-3 border-t border-bonk-border">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500">Initial MC</span>
            <span className="text-gray-400">~$375</span>
          </div>
          {state.battleStatus === BattleStatus.Created && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progress to Qualification ($10)</span>
                <span>{Math.min((marketCapUsd / 10) * 100, 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((marketCapUsd / 10) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
          {state.battleStatus === BattleStatus.InBattle && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progress to Victory ($1,200)</span>
                <span>{Math.min((marketCapUsd / 1200) * 100, 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((marketCapUsd / 1200) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Battle Opponent (only for InBattle status) */}
        {state.battleStatus === BattleStatus.InBattle && (
          <div className="mt-3 text-xs text-gray-400">
            <span className="font-semibold text-orange-400">Fighting:</span> {state.opponentMint.toString().substring(0, 12)}...
          </div>
        )}
      </div>
    </Link>
  );
}
