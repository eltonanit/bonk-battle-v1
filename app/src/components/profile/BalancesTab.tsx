'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import { BattleStatus } from '@/types/bonk';
import { RPC_ENDPOINT } from '@/config/solana';
import Image from 'next/image';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

interface BonkPosition {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  tokenImage: string;
  battleStatus: BattleStatus;
  solCollected: number;       // Total SOL in pool (lamports)
  userTokenBalance: bigint;   // User's token balance (raw)
  tokensSold: bigint;         // Total tokens sold (raw)
  boughtValueUsd: number;     // User's share in USD
  currentValueUsd: number;    // Current value in USD
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SOL_PRICE = 240;
const BONK_BATTLE_PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');

// ============================================================================
// COMPONENT
// ============================================================================

export function BalancesTab() {
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState<BonkPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [solPrice, setSolPrice] = useState(DEFAULT_SOL_PRICE);

  const fetchPositions = useCallback(async () => {
    if (!publicKey) {
      setPositions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 FETCHING BONK BATTLE POSITIONS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // 1. Get SOL price from oracle
      let currentSolPrice = DEFAULT_SOL_PRICE;
      try {
        const [priceOraclePDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('price_oracle')],
          BONK_BATTLE_PROGRAM_ID
        );
        const oracleInfo = await connection.getAccountInfo(priceOraclePDA);
        if (oracleInfo && oracleInfo.data.length >= 16) {
          let price = 0n;
          for (let i = 0; i < 8; i++) {
            price |= BigInt(oracleInfo.data[8 + i]) << BigInt(i * 8);
          }
          const parsed = Number(price) / 1_000_000;
          if (parsed > 0 && parsed < 10000) {
            currentSolPrice = parsed;
          }
        }
      } catch (e) {
        console.warn('Could not fetch SOL price, using default');
      }
      setSolPrice(currentSolPrice);
      console.log('💰 SOL Price:', currentSolPrice);

      // 2. Fetch ALL BONK tokens using the working function
      const allBonkTokens = await fetchAllBonkTokens();
      console.log(`📊 Found ${allBonkTokens.length} BONK tokens total`);

      // 3. Get user's token accounts
      const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      // Parse user balances into a map: mint -> balance
      const userBalances = new Map<string, bigint>();

      for (const { account } of tokenAccounts.value) {
        const data = account.data;
        const mint = new PublicKey(data.slice(0, 32)).toBase58();

        let balance = 0n;
        for (let i = 0; i < 8; i++) {
          balance |= BigInt(data[64 + i]) << BigInt(i * 8);
        }

        if (balance > 0n) {
          userBalances.set(mint, balance);
        }
      }

      console.log(`👛 User has ${userBalances.size} tokens with balance`);

      // 4. Match BONK tokens with user balances
      const bonkPositions: BonkPosition[] = [];

      for (const token of allBonkTokens) {
        const mintStr = token.mint.toString();
        const userBalance = userBalances.get(mintStr);

        if (!userBalance || userBalance === 0n) {
          continue; // User doesn't own this token
        }

        // Calculate user's share of the pool
        const solCollectedLamports = token.solCollected;
        const solCollectedSOL = solCollectedLamports / 1e9;
        const tokensSold = BigInt(token.tokensSold);

        console.log(`\n🎮 Token: ${token.symbol || mintStr.slice(0, 8)}`);
        console.log(`   SOL collected: ${solCollectedSOL.toFixed(4)} SOL`);
        console.log(`   Tokens sold: ${tokensSold.toString()}`);
        console.log(`   User balance: ${userBalance.toString()}`);

        // User's share = (userBalance / tokensSold) * solCollected
        let userSolShare = 0;
        if (tokensSold > 0n) {
          userSolShare = (Number(userBalance) / Number(tokensSold)) * solCollectedSOL;
        }

        const boughtValueUsd = userSolShare * currentSolPrice;
        const currentValueUsd = boughtValueUsd; // Same for now

        console.log(`   User SOL share: ${userSolShare.toFixed(4)} SOL`);
        console.log(`   Value: $${boughtValueUsd.toFixed(2)}`);

        bonkPositions.push({
          mint: mintStr,
          tokenName: token.name || mintStr.slice(0, 8),
          tokenSymbol: token.symbol || mintStr.slice(0, 4).toUpperCase(),
          tokenImage: token.image || '',
          battleStatus: token.battleStatus,
          solCollected: solCollectedLamports,
          userTokenBalance: userBalance,
          tokensSold,
          boughtValueUsd,
          currentValueUsd,
        });
      }

      console.log(`\n✅ Found ${bonkPositions.length} user positions`);

      // Sort by value (highest first)
      bonkPositions.sort((a, b) => b.currentValueUsd - a.currentValueUsd);

      setPositions(bonkPositions);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
      console.error('❌ Error:', error);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 60000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!publicKey) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Connect your wallet to view your positions</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/5 rounded-xl p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-full" />
                <div className="h-5 bg-white/10 rounded w-16" />
              </div>
              <div className="h-5 bg-white/10 rounded w-20" />
              <div className="h-5 bg-white/10 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🏟️</div>
        <p className="text-gray-400 mb-4">No BONK BATTLE positions yet</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg font-bold hover:opacity-90 transition"
        >
          🔥 Enter the Arena
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header Row */}
      <div className="grid grid-cols-3 px-4 py-2 text-xs text-gray-500 uppercase tracking-wide">
        <div>Token</div>
        <div className="text-center">Bought</div>
        <div className="text-right">Now</div>
      </div>

      {/* Positions */}
      {positions.map((position) => {
        const pnl = position.currentValueUsd - position.boughtValueUsd;
        const isProfit = pnl >= 0;
        const pnlPercent = position.boughtValueUsd > 0
          ? ((pnl / position.boughtValueUsd) * 100)
          : 0;

        return (
          <Link
            key={position.mint}
            href={`/token/${position.mint}`}
            className="block bg-[#0a0a0a] border border-white/10 rounded-xl p-4 hover:border-orange-500/50 transition-all"
          >
            <div className="grid grid-cols-3 items-center">
              {/* Column 1: Token Image + Symbol */}
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-orange-600 to-red-600 flex-shrink-0">
                  {position.tokenImage ? (
                    <Image
                      src={position.tokenImage}
                      alt={position.tokenSymbol}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                      {position.tokenSymbol.slice(0, 2)}
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-bold text-lg block">{position.tokenSymbol}</span>
                  {position.tokenName && position.tokenName !== position.tokenSymbol && (
                    <span className="text-xs text-gray-500 block truncate max-w-[100px]">
                      {position.tokenName}
                    </span>
                  )}
                </div>
              </div>

              {/* Column 2: Bought At */}
              <div className="text-center">
                <span className="text-white font-medium">
                  ${position.boughtValueUsd.toFixed(2)}
                </span>
              </div>

              {/* Column 3: Current Value + Arrow */}
              <div className="flex items-center justify-end gap-2">
                {isProfit ? (
                  <svg
                    className="w-5 h-5 text-green-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-red-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                )}
                <div className="text-right">
                  <div className={`font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                    ${position.currentValueUsd.toFixed(2)}
                  </div>
                  {pnlPercent !== 0 && (
                    <div className={`text-xs ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                      {isProfit ? '+' : ''}{pnlPercent.toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {/* Refresh */}
      <button
        onClick={() => fetchPositions()}
        disabled={loading}
        className="w-full py-3 text-gray-500 hover:text-gray-300 transition text-sm"
      >
        🔄 Refresh
      </button>
    </div>
  );
}