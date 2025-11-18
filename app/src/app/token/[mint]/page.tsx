'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { useTokenData } from '@/lib/solana/hooks/useTokenData';
import { TokenHero } from '@/components/token/TokenHero';
import { ProgressSection } from '@/components/token/ProgressSection';
import { StatsRow } from '@/components/token/StatsRow';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { BuySection } from '@/components/token/BuySection';
import { PriceChart } from '@/components/token/PriceChart';
import { GraduateButton } from '@/components/token/GraduateButton';
import { useTokenViews, formatViews } from '@/hooks/useTokenViews';

export default function TokenDetailPage() {
  const params = useParams();
  const mint = params.mint as string;
  const { token, loading, error } = useTokenData(mint);
  const { publicKey } = useWallet();
  const { views, loading: viewsLoading } = useTokenViews(mint);

  const refetch = () => window.location.reload();

  // ⭐ INCREMENT VIEW quando user entra nella pagina
  useEffect(() => {
    if (publicKey && mint) {
      incrementView(mint, publicKey.toString());
    }
  }, [publicKey, mint]);

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
      <div className="min-h-screen bg-black text-white">
        <DesktopHeader />
        <Header />
        <Sidebar />
        <div className="lg:ml-60 lg:mt-16 flex items-center justify-center min-h-screen">
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
      <div className="min-h-screen bg-black text-white">
        <DesktopHeader />
        <Header />
        <Sidebar />
        <div className="lg:ml-60 lg:mt-16 flex items-center justify-center min-h-screen">
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

  if (!token) return null;

  // Check if token is failed (status=0 or 3, deadline passed, target not reached)
  const isFailed =
    (token.status === 0 || token.status === 3) &&
    token.timeRemaining <= 0 &&
    token.solRaised < token.targetSol;

  return (
    <div className="min-h-screen bg-black text-white">
      <DesktopHeader />
      <Header />
      <Sidebar />

      {/* ⭐ MODIFICATO: Aggiunto pt-20 lg:pt-0 e FOMOTicker */}
      <div className="pt-20 lg:pt-0 lg:ml-60 lg:mt-16">
        {/* ⭐ FOMOTicker visibile SOLO su mobile */}
        <div className="lg:hidden">
          <FOMOTicker />
        </div>

        <div className="max-w-[1200px] pl-8 pr-5 py-8">
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-2 border-purple-500/30 rounded-3xl p-8 mb-6">
            <TokenHero token={{ ...token, mint }} />
            {/* ⭐ GRADUATE BUTTON - Subito sotto il nome! */}
            {token.status === 1 && (
              <div className="mt-6">
                <GraduateButton token={token} onSuccess={refetch} />
              </div>
            )}

            {/* ⭐ Status-based Actions: Failed = Refund, Graduated = Success */}
            {isFailed && (
              <div className="mt-6 bg-red-500/20 border-2 border-red-500/50 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-red-400 font-bold text-lg mb-1">
                      Token Failed :(
                    </div>
                    <div className="text-gray-300 text-sm">
                      {`Didn't reach target - Refunds available!`}
                    </div>
                  </div>

                  <Link
                    href="/profile?tab=refunds"
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 whitespace-nowrap"
                  >
                    Get REFUND :D
                  </Link>
                </div>
              </div>
            )}

            {/* ⭐ NUOVO: Graduated Success Message */}
            {token.status === 2 && (
              <div className="mt-6 bg-green-500/20 border-2 border-green-500/50 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-green-400 font-bold text-lg mb-1">
                      🎉 Token Graduated!
                    </div>
                    <div className="text-gray-300 text-sm">
                      Listed on DEX - You can now sell your tokens!
                    </div>
                  </div>

                  <a href={`https://app.meteora.ag/pools/${token.meteoraPool || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 whitespace-nowrap">
                    TRADE ON METEORA 🚀
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* ⭐ VIEWS BOX */}
          <div className="mb-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
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

          <StatsRow token={token} />
          <ProgressSection token={token} />
          <div><br /></div>
          <PriceChart token={token} />

          <div className="mt-6">
            {/* Show Buy Section only if Active (status=0) */}
            {token.status === 0 && (
              <BuySection token={token} onSuccess={refetch} />
            )}
          </div>

          <div className="text-center mt-6">
            <a href={`https://solscan.io/account/${mint}?cluster=devnet`}
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