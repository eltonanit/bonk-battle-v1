'use client';

/**
 * BONK BATTLE - BalancesTab con P/L Reale
 * 
 * - Bought: da user_trades (prezzo di acquisto reale)
 * - Now: da bonding curve on-chain (valore attuale)
 * - P/L: Verde ↑ se profitto, Rosso ↓ se perdita
 */

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { fetchAllBonkTokens } from '@/lib/solana/fetch-all-bonk-tokens';
import { BattleStatus } from '@/types/bonk';
import { RPC_ENDPOINT } from '@/config/solana';
import { supabase } from '@/lib/supabase';
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
  boughtValueUsd: number;     // Costo di acquisto (da user_trades)
  currentValueUsd: number;    // Valore attuale (da bonding curve)
}

interface UserTradeAggregate {
  token_mint: string;
  total_tokens_bought: number;
  total_usd_spent: number;
  total_tokens_sold: number;
  total_usd_received: number;
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

  // ==========================================================================
  // FETCH USER TRADES FROM DATABASE
  // ==========================================================================

  const fetchUserTrades = useCallback(async (wallet: string): Promise<Map<string, UserTradeAggregate>> => {
    const tradesMap = new Map<string, UserTradeAggregate>();

    try {
      // Prima prova la view aggregata
      const { data: viewData, error: viewError } = await supabase
        .from('user_positions')
        .select('*')
        .eq('wallet_address', wallet);

      if (!viewError && viewData && viewData.length > 0) {
        console.log(`📊 Found ${viewData.length} positions from user_positions view`);

        for (const row of viewData) {
          tradesMap.set(row.token_mint, {
            token_mint: row.token_mint,
            total_tokens_bought: Number(row.total_tokens_bought) || 0,
            total_usd_spent: Number(row.total_usd_spent) || 0,
            total_tokens_sold: Number(row.total_tokens_sold) || 0,
            total_usd_received: Number(row.total_usd_received) || 0,
          });
        }
        return tradesMap;
      }

      // Fallback: aggregazione manuale dalla tabella user_trades
      console.log('📊 View not available, aggregating from user_trades...');

      const { data: trades, error: tradesError } = await supabase
        .from('user_trades')
        .select('*')
        .eq('wallet_address', wallet);

      if (tradesError || !trades || trades.length === 0) {
        console.log('⚠️ No trade history found for wallet');
        return tradesMap;
      }

      // Aggrega manualmente
      for (const trade of trades) {
        const existing = tradesMap.get(trade.token_mint) || {
          token_mint: trade.token_mint,
          total_tokens_bought: 0,
          total_usd_spent: 0,
          total_tokens_sold: 0,
          total_usd_received: 0,
        };

        if (trade.trade_type === 'buy') {
          existing.total_tokens_bought += Number(trade.token_amount);
          existing.total_usd_spent += Number(trade.trade_value_usd);
        } else {
          existing.total_tokens_sold += Number(trade.token_amount);
          existing.total_usd_received += Number(trade.trade_value_usd);
        }

        tradesMap.set(trade.token_mint, existing);
      }

      console.log(`📊 Aggregated ${tradesMap.size} positions from trades`);
      return tradesMap;

    } catch (err) {
      console.error('Error fetching user trades:', err);
      return tradesMap;
    }
  }, []);

  // ==========================================================================
  // MAIN FETCH POSITIONS
  // ==========================================================================

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
      console.log('🔍 FETCHING BONK BATTLE POSITIONS (with P/L)');
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

      // 4. Fetch trade history from Supabase (for P/L calculation)
      const userTrades = await fetchUserTrades(publicKey.toString());
      console.log(`📈 Found trade history for ${userTrades.size} tokens`);

      // 5. Match BONK tokens with user balances and calculate P/L
      const bonkPositions: BonkPosition[] = [];

      for (const token of allBonkTokens) {
        const mintStr = token.mint.toString();
        const userBalance = userBalances.get(mintStr);

        if (!userBalance || userBalance === 0n) {
          continue; // User doesn't own this token
        }

        // Calculate CURRENT value from bonding curve
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

        const currentValueUsd = userSolShare * currentSolPrice;
        console.log(`   Current value: $${currentValueUsd.toFixed(2)}`);

        // Get BOUGHT value from trade history
        const tradeHistory = userTrades.get(mintStr);
        let boughtValueUsd = currentValueUsd; // Default: same as current (no P/L)

        if (tradeHistory && tradeHistory.total_tokens_bought > 0) {
          // Calcola il costo dei token che possiede ancora
          // Se ha comprato 1000 e venduto 200, possiede 800
          // Costo dei 800 = (800/1000) * total_usd_spent
          const netTokens = tradeHistory.total_tokens_bought - tradeHistory.total_tokens_sold;

          if (netTokens > 0) {
            const retainedRatio = netTokens / tradeHistory.total_tokens_bought;
            boughtValueUsd = tradeHistory.total_usd_spent * retainedRatio;
            console.log(`   📊 Trade history found!`);
            console.log(`   Bought: $${boughtValueUsd.toFixed(2)} (from ${tradeHistory.total_usd_spent.toFixed(2)} total spent)`);
          }
        } else {
          console.log(`   ⚠️ No trade history - using current value as bought`);
        }

        // Calculate P/L
        const pnl = currentValueUsd - boughtValueUsd;
        const pnlPercent = boughtValueUsd > 0 ? (pnl / boughtValueUsd) * 100 : 0;
        console.log(`   P/L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent.toFixed(1)}%)`);

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
  }, [publicKey, fetchUserTrades]);

  useEffect(() => {
    fetchPositions();
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
      <div className="grid grid-cols-3 px-3 py-2 text-xs text-gray-500 uppercase tracking-wide">
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
            className="block bg-[#1a1f2e] border border-[#2a3544] rounded-xl p-3 hover:border-orange-500/50 transition-all"
          >
            <div className="grid grid-cols-3 items-center">
              {/* Column 1: Token Image + Symbol */}
              <div className="flex items-center gap-2">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-yellow-500 flex-shrink-0">
                  {position.tokenImage ? (
                    <Image
                      src={position.tokenImage}
                      alt={position.tokenSymbol}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                      {position.tokenSymbol.slice(0, 2)}
                    </div>
                  )}
                </div>
                <span className="font-semibold text-white text-sm">${position.tokenSymbol}</span>
              </div>

              {/* Column 2: Bought At */}
              <div className="text-center">
                <span className="text-white text-sm font-medium">
                  ${position.boughtValueUsd.toFixed(2)}
                </span>
              </div>

              {/* Column 3: Current Value + Arrow */}
              <div className="flex items-center justify-end gap-1">
                {isProfit ? (
                  <svg
                    className="w-4 h-4 text-green-400 flex-shrink-0"
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
                    className="w-4 h-4 text-red-400 flex-shrink-0"
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
                  <div className={`text-sm font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                    ${position.currentValueUsd.toFixed(2)}
                  </div>
                  {Math.abs(pnlPercent) > 0.1 && (
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
    </div>
  );
}