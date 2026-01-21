'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

interface BattleData {
  id: string;
  tokenAMint: string;
  tokenASymbol: string;
  tokenAImage?: string;
  tokenBMint: string;
  tokenBSymbol: string;
  tokenBImage?: string;
  buyersHistory: number[];
  currentBuyers: number;
  liveForSeconds: number;
  battleStartTime: number;
}

export function FOMOTicket() {
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  // Fetch active battle with most buying activity
  const fetchBattleData = useCallback(async () => {
    try {
      // Get tokens in battle (battle_status = 2)
      const { data: battlingTokens } = await supabase
        .from('tokens')
        .select('mint, symbol, image, opponent_mint, battle_start_timestamp')
        .eq('battle_status', 2)
        .eq('network', 'mainnet')
        .not('opponent_mint', 'is', null)
        .limit(10);

      if (!battlingTokens || battlingTokens.length === 0) {
        setIsVisible(false);
        setLoading(false);
        return;
      }

      // Get unique battle pairs
      const processedPairs = new Set<string>();
      const battlePairs: { tokenA: typeof battlingTokens[0]; tokenB: typeof battlingTokens[0] | null }[] = [];

      for (const token of battlingTokens) {
        const pairKey = [token.mint, token.opponent_mint].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const opponent = battlingTokens.find(t => t.mint === token.opponent_mint);
        battlePairs.push({ tokenA: token, tokenB: opponent || null });
      }

      if (battlePairs.length === 0) {
        setIsVisible(false);
        setLoading(false);
        return;
      }

      // Get buyer counts for each battle in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      let mostActiveBattle: BattleData | null = null;
      let maxBuyers = 0;

      for (const pair of battlePairs) {
        if (!pair.tokenB) continue;

        const mints = [pair.tokenA.mint, pair.tokenB.mint];

        // Count recent buyers
        const { count } = await supabase
          .from('user_trades')
          .select('*', { count: 'exact', head: true })
          .in('token_mint', mints)
          .eq('trade_type', 'buy')
          .gte('block_time', fiveMinutesAgo);

        const buyerCount = count || 0;

        if (buyerCount > maxBuyers) {
          maxBuyers = buyerCount;

          const battleStartTime = pair.tokenA.battle_start_timestamp || Math.floor(Date.now() / 1000);
          const liveForSeconds = Math.floor(Date.now() / 1000) - battleStartTime;

          mostActiveBattle = {
            id: [pair.tokenA.mint, pair.tokenB.mint].sort().join('-'),
            tokenAMint: pair.tokenA.mint,
            tokenASymbol: pair.tokenA.symbol || 'TOKEN A',
            tokenAImage: pair.tokenA.image,
            tokenBMint: pair.tokenB.mint,
            tokenBSymbol: pair.tokenB.symbol || 'TOKEN B',
            tokenBImage: pair.tokenB.image,
            buyersHistory: battle?.buyersHistory
              ? [...battle.buyersHistory.slice(-3), buyerCount]
              : [buyerCount],
            currentBuyers: buyerCount,
            liveForSeconds,
            battleStartTime,
          };
        }
      }

      if (mostActiveBattle && mostActiveBattle.currentBuyers >= 2) {
        setBattle(mostActiveBattle);
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Error fetching FOMO ticket data:', error);
      setIsVisible(false);
    } finally {
      setLoading(false);
    }
  }, [battle?.buyersHistory]);

  // Initial fetch and refresh every 10 seconds
  useEffect(() => {
    fetchBattleData();

    const interval = setInterval(() => {
      fetchBattleData();
      setCountdown(10);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchBattleData]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 10));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format live time
  const formatLiveTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  if (loading || !isVisible || !battle) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-[#0f1a2e] to-[#1a2744] border border-cyan-500/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-cyan-400 font-bold text-sm uppercase tracking-wider">FOMO Ticket</span>
        </div>
        <div className="text-gray-400 text-xs">
          Next update in: <span className="text-cyan-400 font-mono">{countdown}s</span>
        </div>
      </div>

      {/* Core Content */}
      <div className="p-4">
        {/* LIVE BUYERS Label */}
        <div className="text-gray-400 text-xs uppercase tracking-wider mb-2">Live Buyers</div>

        {/* Battle Title */}
        <Link
          href={`/battle/${battle.id}`}
          className="flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity"
        >
          {/* Token A */}
          <div className="flex items-center gap-2">
            {battle.tokenAImage && (
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 border border-cyan-500/30">
                <Image
                  src={battle.tokenAImage}
                  alt={battle.tokenASymbol}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            )}
            <span className="font-bold text-white text-lg uppercase">{battle.tokenASymbol}</span>
          </div>

          <span className="text-gray-500 font-bold">vs</span>

          {/* Token B */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-lg uppercase">{battle.tokenBSymbol}</span>
            {battle.tokenBImage && (
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 border border-orange-500/30">
                <Image
                  src={battle.tokenBImage}
                  alt={battle.tokenBSymbol}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            )}
          </div>
        </Link>

        {/* Buyers Count */}
        <div className="bg-black/30 rounded-lg p-3 mb-3">
          <div className="text-gray-400 text-xs mb-1">Buyers in this window:</div>
          <div className="flex items-center gap-2 text-2xl font-bold text-white">
            {battle.buyersHistory.map((count, idx) => (
              <span key={idx} className="flex items-center">
                {idx > 0 && <span className="text-gray-500 mx-1">→</span>}
                <span className={idx === battle.buyersHistory.length - 1 ? 'text-cyan-400' : 'text-gray-400'}>
                  {count}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Live Time */}
        <div className="text-gray-400 text-sm">
          Live for: <span className="text-white font-semibold">{formatLiveTime(battle.liveForSeconds)}</span>
        </div>
      </div>

      {/* Context Line */}
      <div className="border-t border-cyan-500/10 px-4 py-2 bg-black/20">
        <p className="text-gray-400 text-xs">
          This shows how many people are buying right now.
        </p>
      </div>

      {/* Micro-copy */}
      <div className="px-4 py-2 bg-black/30">
        <p className="text-gray-500 text-[10px]">
          Shows live buying activity. Not profit. Not a prediction.
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="p-4 pt-0 flex gap-2">
        <Link
          href={`/battle/${battle.id}`}
          className="flex-1 bg-transparent border border-cyan-500/50 text-cyan-400 font-semibold py-2 rounded-lg text-center text-sm hover:bg-cyan-500/10 transition-colors"
        >
          View Battle
        </Link>
        <Link
          href={`/token/${battle.tokenAMint}`}
          className="flex-1 bg-cyan-500 text-black font-bold py-2 rounded-lg text-center text-sm hover:bg-cyan-400 transition-colors"
        >
          Enter Now
        </Link>
      </div>

      {/* Optional Footer */}
      <div className="px-4 pb-3">
        <p className="text-gray-600 text-[10px] text-center italic">
          Early entries happen before momentum becomes obvious.
        </p>
      </div>
    </div>
  );
}
