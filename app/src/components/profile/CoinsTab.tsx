'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BattleStatus } from '@/types/bonk';
import { usePriceOracle } from '@/hooks/usePriceOracle';
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
  virtual_sol_reserves: number;
  virtual_token_reserves: string; // bigint as string
  creation_timestamp: number;
  creator: string | null;
  creator_wallet: string | null;
}

// Calculate real market cap from bonding curve reserves
function calculateMarketCap(
  virtualSolReserves: number,
  virtualTokenReserves: string,
  solPriceUsd: number = 240
): number {
  const totalSupply = 1_000_000_000_000_000_000; // 1B with 9 decimals
  const vTokenReserves = Number(virtualTokenReserves);

  if (!vTokenReserves || vTokenReserves === 0) return 0;

  const pricePerToken = virtualSolReserves / vTokenReserves;
  const mcLamports = pricePerToken * totalSupply;
  const mcUsd = (mcLamports / 1e9) * solPriceUsd;

  return mcUsd;
}

// Format market cap for display
function formatMarketCap(mcUsd: number): string {
  if (mcUsd >= 1000000) {
    return `$${(mcUsd / 1000000).toFixed(1)}M`;
  } else if (mcUsd >= 1000) {
    return `$${(mcUsd / 1000).toFixed(1)}K`;
  }
  return `$${Math.round(mcUsd)}`;
}

// Status badge info
function getStatusBadge(status: number): { label: string; color: string; bgColor: string } {
  switch (status) {
    case BattleStatus.Created:
      return { label: 'NEW', color: 'text-white', bgColor: 'bg-emerald-600' };
    case BattleStatus.Qualified:
      return { label: 'QUALIFIED', color: 'text-black', bgColor: 'bg-yellow-400' };
    case BattleStatus.InBattle:
      return { label: 'IN BATTLE', color: 'text-white', bgColor: 'bg-orange-500' };
    case BattleStatus.VictoryPending:
      return { label: 'WINNER', color: 'text-white', bgColor: 'bg-purple-500' };
    case BattleStatus.Listed:
      return { label: 'LISTED', color: 'text-white', bgColor: 'bg-cyan-500' };
    default:
      return { label: 'UNKNOWN', color: 'text-white', bgColor: 'bg-gray-500' };
  }
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

  // ⭐ Get real SOL price
  const { solPriceUsd } = usePriceOracle();
  const currentSolPrice = solPriceUsd || 230;

  const fetchCreatedCoins = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      const walletAddress = publicKey.toBase58();

      // Query Supabase for tokens created by this wallet
      const { data, error } = await supabase
        .from('tokens')
        .select('mint, name, symbol, image, uri, battle_status, sol_collected, real_sol_reserves, virtual_sol_reserves, virtual_token_reserves, creation_timestamp, creator, creator_wallet')
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
          <div className="w-24 h-8 bg-white/10 animate-pulse" />
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
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold transition-colors text-sm"
        >
          + Create New
        </Link>
      </div>

      {/* Empty State */}
      {coins.length === 0 ? (
        <div className="bg-[#1a1f2e] border border-[#2a3544] p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🚀</div>
            <div className="text-xl font-bold mb-2">No coins created yet</div>
            <div className="text-gray-400 mb-6">Create your first token and become a creator</div>
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-pink-500 hover:bg-pink-600 font-bold transition-all"
            >
              Create Your First Coin
            </Link>
          </div>
        </div>
      ) : (
        /* Clash Royale Style Grid - No rounded corners */
        <div className="grid grid-cols-3 gap-1">
          {coins.map((coin) => {
            const statusBadge = getStatusBadge(coin.battle_status || 0);

            // Calculate REAL market cap from bonding curve
            const mcUsd = calculateMarketCap(
              coin.virtual_sol_reserves || 0,
              coin.virtual_token_reserves || '0',
              currentSolPrice
            );

            // Get image: direct field or parse from URI
            const imageUrl = coin.image || parseImageFromUri(coin.uri);

            return (
              <Link
                key={coin.mint}
                href={`/token/${coin.mint}`}
                className="relative bg-[#1a1f2e] overflow-hidden group border border-[#2a3544] hover:border-[#3a4554] transition-all"
              >
                {/* Top Bar - Market Cap */}
                <div className="bg-emerald-500 px-2 py-1 flex items-center justify-center">
                  <span className="text-black text-xs font-bold">
                    {formatMarketCap(mcUsd)}
                  </span>
                </div>

                {/* Token Image - Square */}
                <div className="relative aspect-square">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={coin.symbol || 'Token'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/30 to-yellow-500/30">
                      <span className="text-4xl font-bold text-white/50">
                        {coin.symbol?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
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