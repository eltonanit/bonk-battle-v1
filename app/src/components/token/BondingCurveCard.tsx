'use client';

import { BattleStatus } from '@/types/bonk';

interface BondingCurveCardProps {
  marketCapUsd: number | null;
  battleStatus: BattleStatus;
}

export function BondingCurveCard({ marketCapUsd, battleStatus }: BondingCurveCardProps) {
  const progress = marketCapUsd ? Math.min((marketCapUsd / 5100) * 100, 100) : 0;
  const isGraduated = battleStatus !== BattleStatus.Created;

  return (
    <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold">Bonding Curve Progress</span>
        <span className="font-bold text-bonk-green">{isGraduated ? '100%' : `${progress.toFixed(1)}%`}</span>
      </div>
      
      <div className="w-full bg-bonk-dark rounded-full h-3 mb-3">
        <div
          className="bg-bonk-yellow h-3 rounded-full transition-all duration-500"
          style={{ width: `${isGraduated ? 100 : progress}%` }}
        />
      </div>

      <div className="text-xs text-gray-400">
        {isGraduated 
          ? 'Coin has graduated!' 
          : 'Reach $5,100 market cap to qualify for battles!'}
      </div>
    </div>
  );
}
