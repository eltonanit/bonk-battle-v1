'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { useTokenBattleState, calculateMarketCapFromReserves, calculatePricePerToken } from '@/hooks/useTokenBattleState';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { BattleStatus, TIER_CONFIG, BattleTier } from '@/types/bonk';
import { TradingPanel } from '@/components/token/TradingPanel';
import { TokenHero } from '@/components/token/TokenHero';
import { PriceChart } from '@/components/token/PriceChart';
import { BondingCurveCard } from '@/components/token/BondingCurveCard';
import { QualificationPopup } from '@/components/token/QualificationPopup';

/**
 * Validates if a string is a valid Solana public key
 */
function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export default function TokenDetailPage() {
  const params = useParams();
  const mintAddress = params.mint as string;
  const { publicKey } = useWallet();

  // ⭐ Stato per tracciare se popup è stato chiuso
  const [qualificationPopupDismissed, setQualificationPopupDismissed] = useState(false);

  // ⭐ Validate mint address before parsing
  const isValidMint = isValidPublicKey(mintAddress);

  // Parse mint PublicKey (only if valid)
  const mint = isValidMint ? new PublicKey(mintAddress) : null;

  // ⭐ ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Fetch token battle state (pass null if invalid mint)
  const { state, loading, error, refetch } = useTokenBattleState(mint);

  // Fetch SOL price oracle
  const { solPriceUsd } = usePriceOracle();

  // ⭐ V2: Calculate market cap from virtual reserves
  const marketCapUsd = state && solPriceUsd
    ? calculateMarketCapFromReserves(
      state.virtualSolReserves,
      state.virtualTokenReserves,
      solPriceUsd
    )
    : null;

  // ⭐ V2: Calculate price per token
  const pricePerToken = state && solPriceUsd
    ? calculatePricePerToken(
      state.virtualSolReserves,
      state.virtualTokenReserves,
      solPriceUsd
    )
    : null;

  // ⭐ V2: Get tier config
  const tierConfig = state ? TIER_CONFIG[state.tier ?? BattleTier.Test] : TIER_CONFIG[BattleTier.Test];

  // ⭐ INCREMENT VIEW quando user entra nella pagina
  useEffect(() => {
    if (publicKey && mintAddress && isValidMint) {
      incrementView(mintAddress, publicKey.toString());
    }
  }, [publicKey, mintAddress, isValidMint]);

  async function incrementView(tokenMint: string, wallet: string) {
    try {
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

  // ⭐ DEBUG: Log state data to see what we're getting
  useEffect(() => {
    if (state) {
      console.log('🔍 Token State V2 Debug:', {
        name: state.name,
        symbol: state.symbol,
        uri: state.uri,
        image: state.image,
        tier: state.tier,
        virtualSolReserves: state.virtualSolReserves,
        virtualTokenReserves: state.virtualTokenReserves,
        realSolReserves: state.realSolReserves,
        realTokenReserves: state.realTokenReserves,
        battleStatus: state.battleStatus,
      });
    }
  }, [state]);

  // ⭐ CONDITIONAL RETURNS AFTER ALL HOOKS

  // Show error for invalid mint address
  if (!isValidMint || !mint) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl font-bold mb-2">Invalid Token Address</div>
          <div className="text-gray-400 text-sm mb-4">
            The token address &quot;{mintAddress}&quot; is not a valid Solana address.
          </div>
          <a href="/" className="text-cyan-400 hover:text-cyan-300">
            ← Back to Home
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">💎</div>
          <div className="text-xl font-bold">Loading token data...</div>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen bg-bonk-dark text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl font-bold mb-2">Error Loading Token</div>
          <div className="text-red-400 text-sm mb-4">
            {error ? error.message : 'Token state not found'}
          </div>
        </div>
      </div>
    );
  }

  // ⭐ V2: Calculate SOL raised from real reserves
  const solRaised = state.realSolReserves / 1e9;

  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      {/* ⭐ Qualification Popup - mostra solo se non qualificato E non dismissed */}
      {state.battleStatus === BattleStatus.Created && !qualificationPopupDismissed && (
        <QualificationPopup
          mint={mint}
          onQualified={() => {
            refetch();
            setQualificationPopupDismissed(true);
          }}
          onClose={() => {
            setQualificationPopupDismissed(true);
          }}
        />
      )}

      {/* ⭐ Tickers SOPRA Header - SOLO mobile/tablet (< lg) */}
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
        <div className="max-w-[1600px] mx-auto p-4 lg:p-6">

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN (Main Content) - 8 cols */}
            <div className="lg:col-span-8 space-y-6">
              {/* Token Header */}
              <TokenHero
                token={{
                  name: state.name || mintAddress.slice(0, 8) + '...',
                  symbol: state.symbol || 'UNK',
                  metadataUri: state.uri || '',
                  createdAt: state.creationTimestamp,
                  tier: state.tier ?? BattleTier.Test,
                  mint: mintAddress,
                  battleStatus: state.battleStatus,
                  marketCapUsd: marketCapUsd ?? undefined
                }}
                preloadedMetadata={{
                  name: state.name || mintAddress.slice(0, 8) + '...',
                  symbol: state.symbol || 'UNK',
                  uri: state.uri || '',
                  image: state.image
                }}
              />

              {/* Chart Section - V2: use realSolReserves instead of solCollected */}
              <PriceChart token={{
                solRaised: solRaised,
                virtualSolInit: state.virtualSolReserves / 1e9,
                constantK: (BigInt(state.virtualSolReserves) * BigInt(state.virtualTokenReserves)).toString(),
                createdAt: state.creationTimestamp,
                name: state.name || mintAddress.slice(0, 8),
                symbol: state.symbol || 'BONK'
              }} />

              {/* Tabs Section (Placeholder) */}
              <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
                <div className="flex gap-6 border-b border-gray-800 pb-4 mb-4">
                  <button className="font-bold text-white border-b-2 border-bonk-green pb-4 -mb-4.5">Thread</button>
                  <button className="font-bold text-gray-400 hover:text-white transition-colors">Trades</button>
                  <button className="font-bold text-gray-400 hover:text-white transition-colors">Holders</button>
                  <button className="font-bold text-gray-400 hover:text-white transition-colors">Entrants</button>
                </div>
                <div className="text-center py-12 text-gray-500">
                  No comments yet. Be the first to start the conversation!
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (Sidebar) - 4 cols */}
            <div className="lg:col-span-4 space-y-6">
              {/* Trading Panel */}
              <TradingPanel mint={mint} onSuccess={refetch} />

              {/* User Position (Placeholder) */}
              <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">$0.00</span>
                    <span className="text-gray-500">0 {state.symbol}</span>
                  </div>
                  <div className="text-gray-500">-</div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Position</span>
                  <span className="text-gray-600">⇄</span>
                  <span className="text-gray-400">Trades</span>
                </div>
                <div className="w-full bg-gray-800 h-1 mt-4 rounded-full overflow-hidden">
                  <div className="bg-gray-600 h-full w-1/2"></div>
                </div>
                <div className="text-xs text-gray-500 mt-2">Profit indicator</div>
              </div>

              {/* Bonding Curve Progress - V2: pass tier and volume */}
              <BondingCurveCard
                marketCapUsd={marketCapUsd}
                battleStatus={state.battleStatus}
                tier={state.tier ?? BattleTier.Test}
                totalVolumeUsd={solPriceUsd ? (state.totalTradeVolume / 1e9) * solPriceUsd : 0}
              />

              {/* Holder Distribution (Placeholder) */}
              <div className="bg-bonk-card border border-bonk-border rounded-xl p-4">
                <h3 className="font-bold mb-4">Holder Distribution</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">1. Bonding Curve</span>
                    <span>80.00%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">2. Creator</span>
                    <span>5.00%</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}