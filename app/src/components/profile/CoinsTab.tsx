'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, RPC_ENDPOINT } from '@/config/solana';
import { deserializeTokenLaunch } from '@/lib/solana/deserialize';
import Link from 'next/link';
import Image from 'next/image';

// Type-safe token interface
interface TokenLaunch {
  mint: string;
  name: string;
  symbol: string;
  metadataUri: string;
  tier: number;
  status: number;
  solRaised: number;
  targetSol: number;
  totalBuyers: number;
  createdAt: number;
}

export function CoinsTab() {
  const { publicKey } = useWallet();
  const [coins, setCoins] = useState<TokenLaunch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCreatedCoins = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎨 FETCHING CREATED TOKENS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 Creator:', publicKey.toBase58());
      console.log('📍 Program ID:', PROGRAM_ID);

      // ⭐ FIX: Remove dataSize filter to find BOTH v1 (443) and v2 (439)
      const accounts = await connection.getProgramAccounts(
        new PublicKey(PROGRAM_ID),
        {
          filters: [
            {
              memcmp: {
                offset: 8, // ✅ creator field is at offset 8-40
                bytes: publicKey.toBase58()
              }
            }
          ]
        }
      );

      console.log(`📊 FOUND: ${accounts.length} TokenLaunch accounts`);

      if (accounts.length === 0) {
        console.log('⚠️ No tokens created by this wallet');
        setCoins([]);
        return;
      }

      // Filter and deserialize
      const parsedCoins = accounts
        .map(({ account, pubkey }) => {
          // ⭐ Validate account size
          const size = account.data.length;
          if (size !== 439 && size !== 443) {
            console.warn(`⚠️ Unexpected account size: ${size} bytes (expected 439 or 443)`);
            return null;
          }

          // ⭐ Validate it's a TokenLaunch (not BuyerRecord)
          if (size < 200) {
            console.warn(`⚠️ Account too small to be TokenLaunch: ${size} bytes`);
            return null;
          }

          try {
            const token = deserializeTokenLaunch(account.data, pubkey);
            if (!token) {
              console.error('❌ Failed to deserialize:', pubkey.toString());
              return null;
            }

            console.log(`✅ Loaded: ${token.name} (${token.symbol})`);
            console.log(`   Progress: ${((token.solRaised / token.targetSol) * 100).toFixed(1)}%`);
            console.log(`   Status: ${getStatusName(token.status)}`);

            return token;
          } catch (error) {
            console.error('❌ Error deserializing token:', pubkey.toString(), error);
            return null;
          }
        })
        .filter((token): token is NonNullable<typeof token> => token !== null); // ⭐ Type guard!

      // ⭐ Sort by creation date (newest first) - with null safety
      parsedCoins.sort((a, b) => {
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        return timeB - timeA; // Newest first
      });

      setCoins(parsedCoins);
      console.log(`\n✅ LOADED: ${parsedCoins.length} valid tokens (sorted by date)\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
      console.error('❌ Error fetching created coins:', error);
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

  function getStatusName(status: number): string {
    const names = ['Active', 'ReadyToGraduate', 'GraduationInProgress', 'Graduated', 'Failed', 'Paused'];
    return names[status] || 'Unknown';
  }

  function getStatusColor(status: number): string {
    switch (status) {
      case 0: return 'text-green-400'; // Active
      case 1: return 'text-yellow-400'; // ReadyToGraduate
      case 2: return 'text-blue-400'; // GraduationInProgress
      case 3: return 'text-purple-400'; // Graduated
      case 4: return 'text-red-400'; // Failed
      case 5: return 'text-gray-400'; // Paused
      default: return 'text-gray-400';
    }
  }

  function getStatusEmoji(status: number): string {
    switch (status) {
      case 0: return '🟢'; // Active
      case 1: return '🎯'; // ReadyToGraduate
      case 2: return '⏳'; // GraduationInProgress
      case 3: return '🎓'; // Graduated
      case 4: return '❌'; // Failed
      case 5: return '⏸️'; // Paused
      default: return '❓';
    }
  }

  if (!publicKey) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Connect your wallet to view your created tokens</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white/5 rounded-2xl p-6 animate-pulse">
            <div className="h-20 bg-white/5 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (coins.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🚀</div>
        <div className="text-xl font-bold mb-2">No coins created yet</div>
        <div className="text-gray-400 mb-6">Create your first token and become a creator</div>
        <Link
          href="/create"
          className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          Create Your First Coin
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-lg font-bold text-gray-400">
          Your Tokens ({coins.length})
        </div>
        <Link
          href="/create"
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition-all text-sm"
        >
          + Create New
        </Link>
      </div>

      <div className="space-y-4">
        {coins.map((coin) => {
          const progress = (coin.solRaised / coin.targetSol) * 100;
          const status = coin.status;

          // Parse metadata for image
          let image = '';
          try {
            const metadata = JSON.parse(coin.metadataUri);
            image = metadata.image || '';
          } catch {
            // Ignore parse errors
          }

          return (
            <Link
              key={coin.mint}
              href={`/token/${coin.mint}`}
              className="block bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Token Image */}
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex-shrink-0">
                    {image ? (
                      <Image
                        src={image}
                        alt={coin.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {coin.symbol.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Token Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold">{coin.name}</h3>
                      <span className="text-sm text-gray-400">${coin.symbol}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-400">Tier {coin.tier}</span>
                      <span className={`font-semibold ${getStatusColor(status)}`}>
                        {getStatusEmoji(status)} {getStatusName(status)}
                      </span>
                    </div>

                    <div className="mt-2">
                      <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold">
                        TARGET: ${(coin.targetSol * 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress & Stats */}
                <div className="text-right">
                  <div className="text-2xl font-bold mb-1">
                    {progress.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400 mb-2">
                    {coin.solRaised.toFixed(2)} / {coin.targetSol} SOL
                  </div>
                  <div className="text-xs text-gray-500">
                    {coin.totalBuyers} buyer{coin.totalBuyers !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 