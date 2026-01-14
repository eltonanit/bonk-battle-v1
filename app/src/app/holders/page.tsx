'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { supabase } from '@/lib/supabase';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { FEATURES } from '@/config/features';
import Image from 'next/image';
import Link from 'next/link';

interface HolderData {
  wallet: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenImage: string | null;
  boughtSol: number;
  currentValueSol: number;
  potentialValueUsd: number;
  multiplier: number;
}

export default function HoldersPage() {
  const [holders, setHolders] = useState<HolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBattle, setSelectedBattle] = useState<string>('all');
  const [battles, setBattles] = useState<{ mint: string; symbol: string; image: string | null }[]>([]);
  const { solPriceUsd } = usePriceOracle();

  // Target market cap for victory
  const TARGET_MC_USD = FEATURES.TARGET_MC_USD || 10_000_000_000;

  useEffect(() => {
    async function fetchHolders() {
      try {
        // Fetch all trades with token info
        const { data: trades, error: tradesError } = await supabase
          .from('user_trades')
          .select('wallet_address, token_mint, sol_amount, trade_type')
          .order('block_time', { ascending: false })
          .limit(500);

        if (tradesError) {
          console.error('Error fetching trades:', tradesError);
          setLoading(false);
          return;
        }

        if (!trades || trades.length === 0) {
          setHolders([]);
          setLoading(false);
          return;
        }

        // Get unique token mints
        const mints = [...new Set(trades.map(t => t.token_mint))];

        // Fetch token info
        const { data: tokens } = await supabase
          .from('tokens')
          .select('mint, symbol, image, market_cap')
          .in('mint', mints);

        const tokenMap = new Map<string, { symbol: string; image: string | null; marketCap: number }>();
        tokens?.forEach(t => {
          tokenMap.set(t.mint, {
            symbol: t.symbol || 'UNK',
            image: t.image,
            marketCap: t.market_cap || 0,
          });
        });

        // Set battles list for filter
        const battlesList = Array.from(tokenMap.entries()).map(([mint, info]) => ({
          mint,
          symbol: info.symbol,
          image: info.image,
        }));
        setBattles(battlesList);

        // Aggregate holdings per wallet per token (only buys count)
        const holdingsMap = new Map<string, { wallet: string; tokenMint: string; totalBoughtSol: number }>();

        trades.forEach(trade => {
          if (trade.trade_type !== 'buy') return;

          const key = `${trade.wallet_address}-${trade.token_mint}`;
          const existing = holdingsMap.get(key);
          let solAmount = Number(trade.sol_amount) || 0;

          // Convert from lamports if needed
          if (solAmount > 1000) {
            solAmount = solAmount / 1e9;
          }

          if (existing) {
            existing.totalBoughtSol += solAmount;
          } else {
            holdingsMap.set(key, {
              wallet: trade.wallet_address,
              tokenMint: trade.token_mint,
              totalBoughtSol: solAmount,
            });
          }
        });

        // Calculate potential for each holder
        const holdersData: HolderData[] = [];

        holdingsMap.forEach((holding) => {
          const tokenInfo = tokenMap.get(holding.tokenMint);
          if (!tokenInfo) return;

          const currentMcUsd = tokenInfo.marketCap * (solPriceUsd || 150);
          const boughtUsd = holding.totalBoughtSol * (solPriceUsd || 150);

          // Calculate potential at victory ($10B)
          const multiplier = currentMcUsd > 0 ? TARGET_MC_USD / currentMcUsd : 0;
          const potentialValueUsd = boughtUsd * multiplier;

          // Only include if bought > 0.01 SOL
          if (holding.totalBoughtSol >= 0.01) {
            holdersData.push({
              wallet: holding.wallet,
              tokenMint: holding.tokenMint,
              tokenSymbol: tokenInfo.symbol,
              tokenImage: tokenInfo.image,
              boughtSol: holding.totalBoughtSol,
              currentValueSol: holding.totalBoughtSol, // Simplified for now
              potentialValueUsd,
              multiplier,
            });
          }
        });

        // Sort by potential value descending
        holdersData.sort((a, b) => b.potentialValueUsd - a.potentialValueUsd);

        setHolders(holdersData);
      } catch (error) {
        console.error('Error fetching holders:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHolders();
  }, [solPriceUsd, TARGET_MC_USD]);

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  const formatUsd = (amount: number): string => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`;
    return `$${amount.toFixed(2)}`;
  };

  const filteredHolders = selectedBattle === 'all'
    ? holders
    : holders.filter(h => h.tokenMint === selectedBattle);

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
            <h1 className="text-3xl font-bold text-purple-400 flex items-center gap-3">
              <span className="text-4xl">$</span>
              See Potential
            </h1>
            <p className="text-gray-400 mt-2">
              What warriors COULD earn if their side wins and reaches {formatUsd(TARGET_MC_USD)}
            </p>
          </div>

          {/* Explanation Box */}
          <div className="mb-6 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <span>How it works</span>
            </h3>
            <div className="space-y-2 text-sm text-gray-300">
              <p>
                This page shows EVERY wallet that has bought into a battle, and what their
                <span className="text-purple-400 font-bold"> POTENTIAL GAIN </span>
                would be IF their side wins and reaches {formatUsd(TARGET_MC_USD)} market cap.
              </p>
              <p>
                <span className="text-yellow-400 font-bold">Example:</span> If you bought $50 at $2.4B market cap,
                and your side reaches $10B, your $50 becomes <span className="text-green-400 font-bold">$208,000</span>!
              </p>
              <p className="text-purple-400 font-semibold mt-3">
                These are REAL wallets with REAL potential gains. What&apos;s YOUR potential?
              </p>
            </div>
          </div>

          {/* Battle Filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedBattle('all')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                selectedBattle === 'all'
                  ? 'bg-purple-500 text-white'
                  : 'bg-[#1a1f2e] text-gray-400 hover:bg-[#252a3a]'
              }`}
            >
              ALL
            </button>
            {battles.map((battle) => (
              <button
                key={battle.mint}
                onClick={() => setSelectedBattle(battle.mint)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
                  selectedBattle === battle.mint
                    ? 'bg-purple-500 text-white'
                    : 'bg-[#1a1f2e] text-gray-400 hover:bg-[#252a3a]'
                }`}
              >
                {battle.image && (
                  <Image
                    src={battle.image}
                    alt={battle.symbol}
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded-full"
                    unoptimized
                  />
                )}
                ${battle.symbol}
              </button>
            ))}
          </div>

          {/* Holders List */}
          <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 p-4 border-b border-[#2a3544] bg-[#151a26]">
              <div className="text-gray-400 font-semibold text-sm">Wallet</div>
              <div className="text-gray-400 font-semibold text-sm">Token</div>
              <div className="text-gray-400 font-semibold text-sm text-right">Bought</div>
              <div className="text-gray-400 font-semibold text-sm text-right">Potential</div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="p-8 text-center">
                <div className="animate-spin text-4xl mb-4">$</div>
                <p className="text-gray-400">Loading potential gains...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredHolders.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">$</div>
                <p className="text-gray-400 mb-2">No holders found</p>
                <p className="text-gray-500 text-sm">
                  Be the first to buy and see your potential!
                </p>
                <Link
                  href="/"
                  className="inline-block mt-4 px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors"
                >
                  View Battles
                </Link>
              </div>
            )}

            {/* Holders Rows */}
            {!loading && filteredHolders.slice(0, 50).map((holder, index) => (
              <div
                key={`${holder.wallet}-${holder.tokenMint}-${index}`}
                className={`grid grid-cols-4 gap-4 p-4 items-center border-b border-[#2a3544] last:border-b-0 ${
                  index < 3 ? 'bg-purple-500/5' : ''
                }`}
              >
                {/* Wallet */}
                <div className="flex items-center gap-2">
                  {index < 3 && (
                    <span className="text-purple-400 font-bold text-sm">#{index + 1}</span>
                  )}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-xs">
                    {holder.wallet.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-white font-medium text-sm">
                    {formatWallet(holder.wallet)}
                  </span>
                </div>

                {/* Token */}
                <div className="flex items-center gap-2">
                  {holder.tokenImage ? (
                    <Image
                      src={holder.tokenImage}
                      alt={holder.tokenSymbol}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                      $
                    </div>
                  )}
                  <span className="text-gray-300 font-medium text-sm">
                    ${holder.tokenSymbol}
                  </span>
                </div>

                {/* Bought Amount */}
                <div className="text-right">
                  <span className="text-white font-medium text-sm">
                    {holder.boughtSol.toFixed(2)} SOL
                  </span>
                  <div className="text-gray-500 text-xs">
                    ~{formatUsd(holder.boughtSol * (solPriceUsd || 150))}
                  </div>
                </div>

                {/* Potential */}
                <div className="text-right">
                  <span className={`font-bold text-sm ${
                    holder.potentialValueUsd >= 1_000_000 ? 'text-yellow-400' :
                    holder.potentialValueUsd >= 100_000 ? 'text-green-400' :
                    'text-purple-400'
                  }`}>
                    {formatUsd(holder.potentialValueUsd)}
                  </span>
                  {holder.multiplier > 0 && (
                    <div className="text-green-400 text-xs font-semibold">
                      +{holder.multiplier.toFixed(0)}x
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Calculator Section */}
          <div className="mt-8 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>$</span> Calculate YOUR Potential
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Enter an amount to see what you could earn if your side wins!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <input
                  type="number"
                  placeholder="Enter SOL amount..."
                  className="w-full px-4 py-3 bg-[#1a1f2e] border border-[#2a3544] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  id="calc-input"
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    const resultEl = document.getElementById('calc-result');
                    if (resultEl) {
                      const currentMc = 2_400_000_000; // Example: $2.4B current
                      const multiplier = TARGET_MC_USD / currentMc;
                      const potential = amount * (solPriceUsd || 150) * multiplier;
                      resultEl.textContent = formatUsd(potential);
                    }
                  }}
                />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-gray-400 text-sm">Your potential:</div>
                <div id="calc-result" className="text-2xl font-bold text-green-400">$0</div>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 text-center">
              <div className="text-gray-400 text-sm">Total Warriors</div>
              <div className="text-2xl font-bold text-white">{filteredHolders.length}</div>
            </div>
            <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 text-center">
              <div className="text-gray-400 text-sm">Total Invested</div>
              <div className="text-2xl font-bold text-purple-400">
                {formatUsd(filteredHolders.reduce((acc, h) => acc + h.boughtSol * (solPriceUsd || 150), 0))}
              </div>
            </div>
            <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-4 text-center">
              <div className="text-gray-400 text-sm">Total Potential</div>
              <div className="text-2xl font-bold text-green-400">
                {formatUsd(filteredHolders.reduce((acc, h) => acc + h.potentialValueUsd, 0))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
