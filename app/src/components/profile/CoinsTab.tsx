'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BattleStatus } from '@/types/bonk';
import Link from 'next/link';
import Image from 'next/image';

// Token data from Supabase
interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  uri: string | null;
  battle_status: number;
  sol_collected: number;
  real_sol_reserves: number;
  creation_timestamp: number;
  creator: string | null;
  creator_wallet: string | null;
}

// Status badge info for grid overlay
function getStatusBadge(status: number): { label: string; color: string; bgColor: string } {
  switch (status) {
    case BattleStatus.Created:
      return { label: 'NEW', color: 'text-emerald-400', bgColor: 'bg-emerald-500/30' };
    case BattleStatus.Qualified:
      return { label: 'QUALIFIED', color: 'text-yellow-400', bgColor: 'bg-yellow-500/30' };
    case BattleStatus.InBattle:
      return { label: 'IN BATTLE', color: 'text-orange-400', bgColor: 'bg-orange-500/30' };
    case BattleStatus.VictoryPending:
      return { label: 'WINNER', color: 'text-purple-400', bgColor: 'bg-purple-500/30' };
    case BattleStatus.Listed:
      return { label: 'LISTED', color: 'text-cyan-400', bgColor: 'bg-cyan-500/30' };
    default:
      return { label: 'UNKNOWN', color: 'text-gray-400', bgColor: 'bg-gray-500/30' };
  }
}

// Format market cap
function formatMarketCap(solCollected: number): string {
  // Rough MC estimate: solCollected * SOL price * multiplier
  const solPrice = 150; // Approximate
  const mcUsd = solCollected * solPrice * 10;

  if (mcUsd >= 1000000) {
    return `$${(mcUsd / 1000000).toFixed(1)}M`;
  } else if (mcUsd >= 1000) {
    return `$${(mcUsd / 1000).toFixed(1)}K`;
  }
  return `$${mcUsd.toFixed(0)}`;
}

// Parse image from URI JSON if needed
function parseImageFromUri(uri: string | null): string | null {
  if (!uri) return null;
  try {
    if (uri.startsWith('{')) {
      const parsed = JSON.parse(uri);
      return parsed.image || null;
    }
  } catch {
    // Not JSON
  }
  return null;
}

export function CoinsTab() {
  const { publicKey } = useWallet();
  const [coins, setCoins] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCreatedCoins = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      const walletAddress = publicKey.toBase58();

      // Query Supabase for tokens created by this wallet
      const { data, error } = await supabase
        .from('tokens')
        .select('mint, name, symbol, image, uri, battle_status, sol_collected, real_sol_reserves, creation_timestamp, creator, creator_wallet')
        .or(`creator.eq.${walletAddress},creator_wallet.eq.${walletAddress}`)
        .order('creation_timestamp', { ascending: false });

      if (error) {
        console.error('❌ Supabase error:', error);
        setCoins([]);
        return;
      }

      setCoins(data || []);
    } catch (error) {
      console.error('❌ Error fetching created coins:', error);
      setCoins([]);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }
    fetchCreatedCoins();
  }, [publicKey, fetchCreatedCoins]);

  if (!publicKey) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Connect your wallet to view your created tokens</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold text-white">Your Tokens</div>
          <div className="w-24 h-8 bg-white/10 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square bg-[#1a1f2e] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold text-white">
          Your Tokens ({coins.length})
        </div>
        <Link
          href="/create"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg font-bold transition-colors text-sm"
        >
          + Create New
        </Link>
      </div>

      {/* Empty State */}
      {coins.length === 0 ? (
        <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🚀</div>
            <div className="text-xl font-bold mb-2">No coins created yet</div>
            <div className="text-gray-400 mb-6">Create your first token and become a creator</div>
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg font-bold hover:from-pink-600 hover:to-pink-700 transition-all"
            >
              Create Your First Coin
            </Link>
          </div>
        </div>
      ) : (
        /* Clash Royale Style Grid */
        <div className="grid grid-cols-3 gap-2">
          {coins.map((coin) => {
            const statusBadge = getStatusBadge(coin.battle_status || 0);
            // SOL collected: use real_sol_reserves or sol_collected, convert from lamports
            const solCollected = ((coin.real_sol_reserves || coin.sol_collected || 0) / 1e9);

            // Get image: direct field or parse from URI
            const imageUrl = coin.image || parseImageFromUri(coin.uri);

            return (
              <Link
                key={coin.mint}
                href={`/token/${coin.mint}`}
                className="relative bg-[#1a1f2e] rounded-xl overflow-hidden group border border-[#2a3544] hover:border-[#3a4554] transition-all"
              >
                {/* Top Bar - Market Cap with green background */}
                <div className="bg-emerald-500 px-2 py-1 flex items-center justify-center">
                  <span className="text-black text-xs font-bold">
                    {formatMarketCap(solCollected)}
                  </span>
                </div>

                {/* Token Image - Square */}
                <div className="relative aspect-square">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={coin.symbol || 'Token'}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/30 to-yellow-500/30">
                      <span className="text-4xl font-bold text-white/50">
                        {coin.symbol?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center">
                    <div className="text-white font-bold text-sm">
                      ${coin.symbol || 'UNK'}
                    </div>
                    <div className="text-gray-300 text-[10px] mt-1">
                      {solCollected.toFixed(2)} SOL
                    </div>
                  </div>
                </div>

                {/* Bottom Bar - Status */}
                <div className={`px-2 py-1.5 flex items-center justify-center ${statusBadge.bgColor}`}>
                  <span className={`text-xs font-bold ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}