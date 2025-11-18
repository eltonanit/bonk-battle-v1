'use client';

import { useEffect, useState } from 'react';

interface StatsRowProps {
  token: {
    totalBuyers: number;
    timeRemaining: number;
    progress: number;
    solRaised: number;
    virtualSolInit: number;
    constantK: string;
  };
}

export function StatsRow({ token }: StatsRowProps) {
  const [timeLeft, setTimeLeft] = useState(token.timeRemaining);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  
  const SOL_PRICE_USD = 100;
  const virtualSol = token.virtualSolInit + token.solRaised;
  const marketCap = Math.floor(virtualSol * SOL_PRICE_USD);
  
  const formatMC = (mc: number) => {
    if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
    if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K`;
    return `$${mc.toFixed(0)}`;
  };
  
  let timeColor = 'text-green-400';
  const percentElapsed = ((token.timeRemaining - timeLeft) / token.timeRemaining) * 100;
  if (percentElapsed > 95) timeColor = 'text-red-400 animate-pulse';
  else if (percentElapsed > 75) timeColor = 'text-orange-400';
  else if (percentElapsed > 50) timeColor = 'text-yellow-400';
  
  return (
    <div className="grid grid-cols-3 gap-4 mb-5">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs text-gray-400 mb-1">💰 Market Cap</div>
        <div className="text-2xl font-bold">{formatMC(marketCap)}</div>
      </div>
      
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs text-gray-400 mb-1">⏰ Time Left</div>
        <div className={`text-2xl font-bold ${timeColor}`}>
          {hours}h {minutes}m {seconds}s
        </div>
      </div>
      
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-xs text-gray-400 mb-1">📊 Progress</div>
        <div className="text-2xl font-bold text-green-400">
          {token.progress.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
