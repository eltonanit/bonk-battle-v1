'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useTokenBattleState } from '@/hooks/useTokenBattleState';
import { usePriceOracle, useCalculateMarketCapUsd } from '@/hooks/usePriceOracle';
import { useUserTokenBalance } from '@/hooks/useUserTokenBalance';
import { useTokenViews, formatViews } from '@/hooks/useTokenViews';
import { BattleStatus } from '@/types/bonk';
import { TradingPanel } from '@/components/token/TradingPanel';

export default function TokenDetailPage() {
  const params = useParams();
  const mintAddress = params.mint as string;
  const { publicKey } = useWallet();

  // Parse mint PublicKey
  const mint = new PublicKey(mintAddress);

  // Fetch token battle state
  const { state, loading, error, refetch } = useTokenBattleState(mint);

  // Fetch SOL price oracle
  const { solPriceUsd } = usePriceOracle();

  // Fetch user balance
  const { balanceFormatted } = useUserTokenBalance(mint);

  // Calculate market cap in USD
  const marketCapUsd = useCalculateMarketCapUsd(state?.solCollected ?? 0);

  // Fetch views
  const { views, loading: viewsLoading } = useTokenViews(mintAddress);

  // ⭐ INCREMENT VIEW quando user entra nella pagina
  useEffect(() => {
    if (publicKey && mintAddress) {
      incrementView(mintAddress, publicKey.toString());
    }
  }, [publicKey, mintAddress]);

  async function incrementView(tokenMint: string, wallet: string) {
    try {
      // UPSERT: se wallet ha già visto token, aggiorna last_viewed_at
      //         se è prima volta, crea nuovo record
      const { error } = await supabase
        .from('token_views')
        .upsert({
          token_mint: tokenMint,
          wallet_address: wallet,
          last_viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'token_mint,wallet_address',
        });

      if (!error) {
        console.log('✅ View counted');
      }
    } catch (err) {
      console.error('Failed to increment view:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white">
        <DesktopHeader />
        <Header />
        <Sidebar />
        <div className="lg:ml-64 lg:mt-16 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-bounce">💎</div>
            <div className="text-xl font-bold">Loading token data...</div>
            <div className="text-sm text-gray-400 mt-2">Fetching from blockchain...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white">
        <DesktopHeader />
        <Header />
        <Sidebar />
        <div className="lg:ml-64 lg:mt-16 flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">❌</div>
            <div className="text-xl font-bold mb-2">Error Loading Token</div>
            <div className="text-red-400 text-sm mb-4">{error}</div>
            <div className="text-gray-400 text-xs">Make sure the token exists on devnet</div>
          </div>
        </div>
      </div>
    );
  }

  if (!state) return null;

  // Get status badge configuration
  const getStatusBadge = () => {
    switch (state.battleStatus) {
      case BattleStatus.Created:
        return { color: 'bg-bonk-green', label: 'NEW', action: 'QUALIFY' };
      case BattleStatus.Qualified:
        return { color: 'bg-bonk-orange', label: 'QUALIFIED', action: 'FIND MATCH' };
      case BattleStatus.InBattle:
        return { color: 'bg-bonk-orange animate-pulse', label: '⚔️ IN BATTLE!!', action: null };
      case BattleStatus.VictoryPending:
        return { color: 'bg-bonk-gold text-black', label: '🏆 VICTORY!', action: null };
      case BattleStatus.Listed:
        return { color: 'bg-bonk-border text-bonk-text', label: 'LISTED', action: null };
      default:
        return { color: 'bg-bonk-border text-bonk-text', label: 'UNKNOWN', action: null };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      <DesktopHeader />
      <Header />
      <Sidebar />

      {/* ⭐ MODIFICATO: Aggiunto pt-20 lg:pt-0 e FOMOTicker */}
      <div className="pt-20 lg:pt-0 lg:ml-64 lg:mt-16">
        {/* ⭐ FOMOTicker visibile SOLO su mobile */}
        <div className="lg:hidden">
          <FOMOTicker />
        </div>

        <div className="max-w-[1200px] pl-8 pr-5 py-8">
          {/* Token Header */}
          <div className="bg-bonk-card border-2 border-bonk-border rounded-3xl p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">{mintAddress.substring(0, 8)}...</h1>
                <p className="text-gray-400">Battle Token</p>
              </div>
              <span className={`${statusBadge.color} px-4 py-2 rounded-lg font-bold text-white text-sm`}>
                {statusBadge.label}
              </span>
            </div>

            {/* User Balance */}
            {publicKey && (
              <div className="bg-bonk-dark border border-bonk-border rounded-xl p-4 mb-4">
                <div className="text-sm text-gray-400 mb-1">Your Balance</div>
                <div className="text-2xl font-bold">{balanceFormatted?.toFixed(6) ?? 0} tokens</div>
              </div>
            )}

            {/* Battle Status Actions */}
            {state.battleStatus === BattleStatus.Listed && (
              <div className="mt-6 bg-bonk-green/20 border-2 border-bonk-green/50 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-bonk-green font-bold text-lg mb-1">
                      🎉 Token Listed!
                    </div>
                    <div className="text-gray-300 text-sm">
                      This token won its battle and is now listed on Meteora DEX!
                    </div>
                  </div>
                </div>
              </div>
            )}

            {state.battleStatus === BattleStatus.InBattle && (
              <div className="mt-6 bg-bonk-orange/20 border-2 border-bonk-orange/50 rounded-xl p-4">
                <div>
                  <div className="text-bonk-orange font-bold text-lg mb-2">
                    ⚔️ Battle in Progress!
                  </div>
                  <div className="text-gray-300 text-sm mb-2">
                    Fighting against: {state.opponentMint.toString().substring(0, 12)}...
                  </div>
                  <div className="text-gray-400 text-xs">
                    Started: {new Date(state.battleStartTimestamp * 1000).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ⭐ VIEWS BOX */}
          <div className="mb-6">
            <div className="bg-bonk-card border border-bonk-border rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">👁️</div>
                  <div>
                    <div className="text-sm text-gray-400">Total Views</div>
                    <div className="text-2xl font-bold">
                      {viewsLoading ? '...' : formatViews(views)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Unique wallet views
                </div>
              </div>
            </div>
          </div>

          {/* Token Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
              <div className="text-sm text-gray-400 mb-1">Market Cap</div>
              <div className="text-xl font-bold">${marketCapUsd?.toFixed(2) ?? '...'}</div>
            </div>
            <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
              <div className="text-sm text-gray-400 mb-1">SOL Collected</div>
              <div className="text-xl font-bold">{(state.solCollected / 1e9).toFixed(4)} SOL</div>
            </div>
            <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
              <div className="text-sm text-gray-400 mb-1">Tokens Sold</div>
              <div className="text-xl font-bold">{(state.tokensSold / 1e6).toFixed(2)}</div>
            </div>
            <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
              <div className="text-sm text-gray-400 mb-1">Volume</div>
              <div className="text-xl font-bold">{(state.totalTradeVolume / 1e9).toFixed(4)} SOL</div>
            </div>
          </div>

          {/* Progress to Qualification */}
          {state.battleStatus === BattleStatus.Created && marketCapUsd !== null && (
            <div className="bg-bonk-card border border-bonk-border rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Progress to Qualification</span>
                <span className="text-sm font-bold">${marketCapUsd.toFixed(0)} / $5,100</span>
              </div>
              <div className="w-full bg-bonk-border rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-bonk-green to-emerald-500 h-4 rounded-full transition-all"
                  style={{ width: `${Math.min((marketCapUsd / 5100) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Reach $5,100 market cap to qualify for battles!
              </div>
            </div>
          )}

          {/* SOL Price */}
          {solPriceUsd && (
            <div className="bg-bonk-card border border-bonk-border rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">SOL Price (Oracle)</span>
                <span className="text-lg font-bold">${solPriceUsd.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Trading Panel */}
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4">Trade</h3>
            <TradingPanel mint={mint} onSuccess={refetch} />
          </div>

          <div className="text-center mt-6">
            <a href={`https://solscan.io/account/${mintAddress}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm" >
              View on Solscan
            </a>
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </div >
  );
}