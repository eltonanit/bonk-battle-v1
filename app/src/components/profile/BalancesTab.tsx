// app/src/components/profile/BalancesTab.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// BONK BATTLE - Fixed BalancesTab with proper P&L calculation
// ═══════════════════════════════════════════════════════════════════════════════

'use client';

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

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_SOL_PRICE = 240;
const SOL_DECIMALS = 1_000_000_000; // 10^9 lamports per SOL
const TOKEN_DECIMALS = 1_000_000_000; // 10^9
const BONK_BATTLE_PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');

// ⭐ CRITICAL: Maximum realistic values to detect garbage data
const MAX_REALISTIC_SOL_RESERVES = 1_000_000 * SOL_DECIMALS; // 1M SOL max
const MAX_REALISTIC_VALUE_USD = 10_000_000; // $10M max per position

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface BonkPosition {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  tokenImage: string;
  battleStatus: BattleStatus;
  userTokenBalance: bigint;
  boughtValueUsd: number;
  currentValueUsd: number;
  currentValueSol: number;
  isValidData: boolean;
}

interface UserTradeAggregate {
  token_mint: string;
  total_tokens_bought: number;
  total_usd_spent: number;
  total_tokens_sold: number;
  total_usd_received: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function BalancesTab() {
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState<BonkPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [solPrice, setSolPrice] = useState(DEFAULT_SOL_PRICE);

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH USER TRADES FROM DATABASE
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchUserTrades = useCallback(async (wallet: string): Promise<Map<string, UserTradeAggregate>> => {
    const tradesMap = new Map<string, UserTradeAggregate>();

    try {
      // Try the aggregated view first
      const { data: viewData, error: viewError } = await supabase
        .from('user_positions')
        .select('*')
        .eq('wallet_address', wallet);

      if (!viewError && viewData && viewData.length > 0) {
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

      // Fallback: aggregate from user_trades table
      const { data: trades, error: tradesError } = await supabase
        .from('user_trades')
        .select('*')
        .eq('wallet_address', wallet);

      if (tradesError || !trades || trades.length === 0) {
        return tradesMap;
      }

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

      return tradesMap;
    } catch (err) {
      console.error('Error fetching user trades:', err);
      return tradesMap;
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN FETCH POSITIONS
  // ═══════════════════════════════════════════════════════════════════════════

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

      // 2. Fetch ALL BONK tokens
      const allBonkTokens = await fetchAllBonkTokens();

      // ⭐ Filter only valid tokens (exist in Supabase with real data)
      const validBonkTokens = allBonkTokens.filter(token =>
        token.virtualSolReserves > 0 &&
        token.virtualSolReserves < MAX_REALISTIC_SOL_RESERVES
      );

      console.log(`📊 Found ${validBonkTokens.length} valid tokens (filtered from ${allBonkTokens.length})`);

      // 3. Get user's token accounts
      const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      // Parse user balances into a map
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

      // 4. Fetch trade history from Supabase
      const userTrades = await fetchUserTrades(publicKey.toString());
      console.log(`📈 Found trade history for ${userTrades.size} tokens`);

      // 5. Match BONK tokens with user balances and calculate P/L
      const bonkPositions: BonkPosition[] = [];

      for (const token of validBonkTokens) {
        const mintStr = token.mint.toString();
        const userBalance = userBalances.get(mintStr);

        if (!userBalance || userBalance === 0n) {
          continue;
        }

        // ⭐ VALIDATION: Check if data is valid
        const virtualSol = token.virtualSolReserves ?? 0;
        const virtualToken = token.virtualTokenReserves ?? 0;
        const realSol = token.realSolReserves ?? token.solCollected ?? 0;

        // ⭐ CRITICAL FIX: Detect garbage data
        const isValidData =
          virtualSol < MAX_REALISTIC_SOL_RESERVES &&
          realSol < MAX_REALISTIC_SOL_RESERVES &&
          virtualSol >= 0 &&
          virtualToken >= 0;

        console.log(`\n🎮 Token: ${token.symbol || mintStr.slice(0, 8)}`);
        console.log(`   Valid data: ${isValidData}`);
        console.log(`   Virtual SOL: ${(virtualSol / SOL_DECIMALS).toFixed(4)} SOL`);
        console.log(`   User balance: ${(Number(userBalance) / TOKEN_DECIMALS).toFixed(2)} tokens`);

        // ⭐ Calculate CURRENT value using bonding curve SELL formula
        let currentValueSol = 0;
        let currentValueUsd = 0;

        if (isValidData && virtualToken > 0) {
          const tokensToSell = Number(userBalance);

          // Bonding curve sell formula
          const solOutLamports = (virtualSol * tokensToSell) / (virtualToken + tokensToSell);

          // Convert lamports to SOL
          currentValueSol = solOutLamports / SOL_DECIMALS;

          // Cap at real SOL reserves
          const maxSol = realSol / SOL_DECIMALS;
          currentValueSol = Math.min(currentValueSol, maxSol);

          // Convert to USD
          currentValueUsd = currentValueSol * currentSolPrice;

          // ⭐ FINAL VALIDATION: Cap at max realistic value
          if (currentValueUsd > MAX_REALISTIC_VALUE_USD) {
            console.warn(`   ⚠️ Value $${currentValueUsd.toFixed(2)} exceeds max, setting to 0`);
            currentValueUsd = 0;
            currentValueSol = 0;
          }
        }

        console.log(`   Current value: $${currentValueUsd.toFixed(2)}`);

        // Get BOUGHT value from trade history
        const tradeHistory = userTrades.get(mintStr);
        let boughtValueUsd = currentValueUsd;

        if (tradeHistory && tradeHistory.total_tokens_bought > 0) {
          const netTokens = tradeHistory.total_tokens_bought - tradeHistory.total_tokens_sold;
          if (netTokens > 0) {
            const retainedRatio = netTokens / tradeHistory.total_tokens_bought;
            boughtValueUsd = tradeHistory.total_usd_spent * retainedRatio;
          }
        }

        bonkPositions.push({
          mint: mintStr,
          tokenName: token.name || mintStr.slice(0, 8),
          tokenSymbol: token.symbol || mintStr.slice(0, 4).toUpperCase(),
          tokenImage: token.image || '',
          battleStatus: token.battleStatus,
          userTokenBalance: userBalance,
          boughtValueUsd,
          currentValueUsd,
          currentValueSol,
          isValidData,
        });
      }

      console.log(`\n✅ Found ${bonkPositions.length} user positions`);

      // Sort: valid data first, then by value
      bonkPositions.sort((a, b) => {
        if (a.isValidData && !b.isValidData) return -1;
        if (!a.isValidData && b.isValidData) return 1;
        return b.currentValueUsd - a.currentValueUsd;
      });

      setPositions(bonkPositions);

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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const formatUsd = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatTokenBalance = (balance: bigint): string => {
    const tokens = Number(balance) / TOKEN_DECIMALS;
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(2)}K`;
    return tokens.toFixed(2);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

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

  // Calculate totals (only from valid data)
  const validPositions = positions.filter(p => p.isValidData);
  const totalValue = validPositions.reduce((sum, p) => sum + p.currentValueUsd, 0);
  const totalBought = validPositions.reduce((sum, p) => sum + p.boughtValueUsd, 0);
  const totalPnl = totalValue - totalBought;
  const totalPnlPercent = totalBought > 0 ? (totalPnl / totalBought) * 100 : 0;
  const isTotalProfit = totalPnl >= 0;

  return (
    <div className="space-y-3">
      {/* Portfolio Summary - Phantom Style */}
      {validPositions.length > 0 && (
        <div className="py-6 text-center">
          {/* Large Balance Number */}
          <p className="text-4xl font-bold text-white mb-2">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {/* P/L Below */}
          <p className={`text-sm font-medium ${isTotalProfit ? 'text-green-400' : 'text-red-400'}`}>
            {isTotalProfit ? '+' : ''}{formatUsd(totalPnl)} {isTotalProfit ? '+' : ''}{totalPnlPercent.toFixed(2)}%
          </p>
        </div>
      )}

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
              {/* Column 1: Token */}
              <div className="flex items-center gap-2">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-yellow-500 flex-shrink-0">
                  {position.tokenImage ? (
                    <Image
                      src={position.tokenImage}
                      alt={position.tokenSymbol}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-black">
                      {position.tokenSymbol.slice(0, 2)}
                    </div>
                  )}
                </div>
                <div>
                  <span className="font-semibold text-white text-sm">${position.tokenSymbol}</span>
                  <p className="text-xs text-gray-500">
                    {formatTokenBalance(position.userTokenBalance)} tokens
                  </p>
                </div>
              </div>

              {/* Column 2: Bought */}
              <div className="text-center">
                {position.isValidData ? (
                  <span className="text-white text-sm font-medium">
                    {formatUsd(position.boughtValueUsd)}
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">--</span>
                )}
              </div>

              {/* Column 3: Current Value */}
              <div className="flex items-center justify-end gap-1">
                {position.isValidData ? (
                  <>
                    {isProfit ? (
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                    <div className="text-right">
                      <div className={`text-sm font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                        {formatUsd(position.currentValueUsd)}
                      </div>
                      {Math.abs(pnlPercent) > 0.1 && (
                        <div className={`text-xs ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                          {isProfit ? '+' : ''}{pnlPercent.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-yellow-500 text-sm">⚠️ Syncing...</span>
                )}
              </div>
            </div>

            {/* SOL equivalent */}
            {position.isValidData && position.currentValueSol > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700/50 text-xs text-gray-500 text-right">
                ≈ {position.currentValueSol.toFixed(4)} SOL if sold
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}