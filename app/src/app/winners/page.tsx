// app/src/app/winners/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

interface Winner {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  loser_mint: string | null;
  loser_name: string | null;
  loser_symbol: string | null;
  loser_image: string | null;
  final_mc_usd: number;
  final_volume_usd: number;
  final_sol_collected: number;
  spoils_sol: number;
  platform_fee_sol: number;
  pool_id: string | null;
  raydium_url: string | null;
  victory_timestamp: string;
  status: string;
}

export default function WinnersPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [poolData, setPoolData] = useState<Record<string, any>>({});

  // Fetch SOL price
  useEffect(() => {
    async function fetchSolPrice() {
      try {
        const res = await fetch('/api/price/sol');
        const data = await res.json();
        setSolPrice(data.price || 0);
      } catch (err) {
        console.error('Error fetching SOL price:', err);
        setSolPrice(230); // Fallback price
      }
    }
    fetchSolPrice();

    // Refresh price every 30 seconds
    const interval = setInterval(fetchSolPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real-time pool data for each winner
  useEffect(() => {
    async function fetchPoolData() {
      const newPoolData: Record<string, any> = {};

      for (const winner of winners) {
        if (winner.pool_id) {
          try {
            const res = await fetch(`/api/raydium/pool-info?poolId=${winner.pool_id}`);
            const data = await res.json();
            if (data.success) {
              newPoolData[winner.mint] = data;
            }
          } catch (err) {
            console.error(`Error fetching pool data for ${winner.symbol}:`, err);
          }
        }
      }

      setPoolData(newPoolData);
    }

    if (winners.length > 0) {
      fetchPoolData();

      // Refresh every 10 seconds for real-time updates
      const interval = setInterval(fetchPoolData, 10000);
      return () => clearInterval(interval);
    }
  }, [winners]);

  useEffect(() => {
    async function fetchWinners() {
      try {
        const { data, error } = await supabase
          .from('winners')
          .select('*')
          .order('victory_timestamp', { ascending: false });

        if (error) {
          console.error('Error fetching winners:', error);
        } else {
          setWinners(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchWinners();

    // Real-time subscription
    const channel = supabase
      .channel('winners-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'winners' },
        (payload) => {
          console.log('Winner update:', payload);
          fetchWinners();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pool_created':
        return { text: 'Trading Live', color: 'bg-green-500' };
      case 'listed':
        return { text: 'Listed', color: 'bg-blue-500' };
      case 'finalized':
        return { text: 'Finalized', color: 'bg-yellow-500' };
      default:
        return { text: 'Pending', color: 'bg-gray-500' };
    }
  };

  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      {/* Headers */}
      <DesktopHeader />
      <Sidebar />

      {/* Main Content - with proper desktop margins */}
      <main className="pt-20 lg:pt-0 lg:ml-56 lg:mt-16 px-4 lg:px-8 py-6 pb-24 lg:pb-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 mb-2">
              HALL OF CHAMPIONS
            </h1>
            <p className="text-gray-400">
              Tokens that conquered the arena and ascended to Raydium
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border border-yellow-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-yellow-400">{winners.length}</div>
              <div className="text-sm text-gray-400">Total Winners</div>
            </div>
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-green-400">
                {winners.filter(w => w.pool_id).length}
              </div>
              <div className="text-sm text-gray-400">Trading on Raydium</div>
            </div>
            <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border border-blue-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-blue-400">
                {Object.values(poolData).reduce((sum: number, p: any) => sum + (p?.solInPool || 0), 0).toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">Total Liquidity (SOL)</div>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-purple-400">
                ${Object.values(poolData).reduce((sum: number, p: any) => sum + (p?.poolValueUsd || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-sm text-gray-400">Total Value (USD)</div>
            </div>
          </div>

          {/* Winners Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-bonk-card border border-bonk-border rounded-xl p-6 animate-pulse"
                >
                  <div className="h-20 bg-bonk-dark rounded-lg mb-4"></div>
                  <div className="h-4 bg-bonk-dark rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-bonk-dark rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : winners.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-8xl mb-6">🏆</div>
              <h2 className="text-2xl font-bold text-white mb-3">No Champions Yet</h2>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                The arena awaits its first champion! When a token wins a battle,
                it will be immortalized here.
              </p>
              <Link
                href="/create"
                className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold px-8 py-3 rounded-xl hover:from-yellow-400 hover:to-orange-400 transition-all"
              >
                Create a Token
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {winners.map((winner, index) => {
                const statusBadge = getStatusBadge(winner.status);
                return (
                  <div
                    key={winner.id}
                    className="relative bg-gradient-to-br from-yellow-900/30 via-orange-900/20 to-yellow-900/30 border-2 border-yellow-500/50 rounded-xl overflow-hidden hover:border-yellow-400 transition-all group"
                  >
                    {/* Rank Badge */}
                    {index < 3 && (
                      <div className="absolute top-3 left-3 z-10">
                        <span className="text-2xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className={`${statusBadge.color} text-white text-xs font-bold px-2 py-1 rounded`}>
                        {statusBadge.text}
                      </span>
                    </div>

                    {/* Header Glow */}
                    <div className="h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400"></div>

                    {/* Content */}
                    <div className="p-5">
                      {/* Winner Info */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                          {winner.image ? (
                            <Image
                              src={winner.image}
                              alt={winner.symbol}
                              width={64}
                              height={64}
                              className="w-16 h-16 rounded-xl object-cover border-2 border-yellow-500"
                              unoptimized
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-yellow-500/20 flex items-center justify-center text-3xl border-2 border-yellow-500">
                              👑
                            </div>
                          )}
                          <div className="absolute -top-2 -right-2 text-xl">👑</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-black text-yellow-400 truncate">
                            ${winner.symbol}
                          </h3>
                          <p className="text-gray-400 text-sm truncate">{winner.name}</p>
                        </div>
                      </div>

                      {/* Defeated */}
                      {winner.loser_symbol && (
                        <div className="flex items-center gap-2 mb-4 py-2 px-3 bg-black/30 rounded-lg">
                          <span className="text-gray-500 text-sm">Defeated</span>
                          {winner.loser_image && (
                            <Image
                              src={winner.loser_image}
                              alt={winner.loser_symbol}
                              width={20}
                              height={20}
                              className="w-5 h-5 rounded-full opacity-50 grayscale"
                              unoptimized
                            />
                          )}
                          <span className="text-red-400 line-through text-sm font-semibold">
                            ${winner.loser_symbol}
                          </span>
                        </div>
                      )}

                      {/* Stats - REAL-TIME from Raydium */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="text-gray-500 text-xs mb-1">Pool Liquidity</div>
                          <div className="text-yellow-400 font-bold">
                            {poolData[winner.mint] ? (
                              <>
                                {poolData[winner.mint].solInPool.toFixed(2)} SOL
                                <div className="text-gray-400 text-xs">
                                  (${poolData[winner.mint].poolValueUsd.toFixed(0)})
                                </div>
                              </>
                            ) : winner.pool_id ? (
                              <span className="animate-pulse text-gray-500">Loading...</span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                        </div>
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="text-gray-500 text-xs mb-1">Market Cap</div>
                          <div className="text-green-400 font-bold">
                            {poolData[winner.mint] ? (
                              `$${poolData[winner.mint].marketCapUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                            ) : winner.pool_id ? (
                              <span className="animate-pulse text-gray-500">Loading...</span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Token Price - Real-time */}
                      {poolData[winner.mint] && (
                        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-2 mb-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-xs">Token Price</span>
                            <span className="text-purple-400 font-bold text-sm">
                              ${poolData[winner.mint].tokenPriceUsd.toFixed(8)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Victory Date */}
                      <div className="text-xs text-gray-500 mb-4">
                        Victory: {formatDate(winner.victory_timestamp)}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link
                          href={`/token/${winner.mint}`}
                          className="flex-1 bg-yellow-500/20 text-yellow-400 text-center py-2 rounded-lg text-sm font-semibold hover:bg-yellow-500/30 transition-all"
                        >
                          View Token
                        </Link>
                        {winner.pool_id ? (
                          <a
                            href={winner.raydium_url || `https://raydium.io/swap/?inputMint=sol&outputMint=${winner.mint}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center py-2 rounded-lg text-sm font-semibold hover:from-blue-400 hover:to-purple-400 transition-all"
                          >
                            Trade
                          </a>
                        ) : (
                          <span className="flex-1 bg-gray-700 text-gray-400 text-center py-2 rounded-lg text-sm cursor-not-allowed">
                            Pool Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </main>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
    </div>
  );
}
