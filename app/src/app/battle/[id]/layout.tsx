// src/app/battle/[id]/layout.tsx
// Server component that generates dynamic metadata for Twitter/OG cards

import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // Parse battle ID to get token mints
  const parts = id.split('-');
  if (parts.length !== 2) {
    return {
      title: 'Battle | BONK BATTLE',
      description: 'Epic token battle on Solana',
    };
  }

  const [tokenAMint, tokenBMint] = parts;

  // Fetch token data from database
  let tokenA = { symbol: 'TOKEN A', image: null as string | null, sol_collected: 0, total_volume: 0 };
  let tokenB = { symbol: 'TOKEN B', image: null as string | null, sol_collected: 0, total_volume: 0 };

  try {
    const [resA, resB] = await Promise.all([
      supabase.from('tokens').select('symbol, name, image, real_sol_reserves, total_trade_volume').eq('mint', tokenAMint).single(),
      supabase.from('tokens').select('symbol, name, image, real_sol_reserves, total_trade_volume').eq('mint', tokenBMint).single(),
    ]);

    if (resA.data) {
      tokenA = {
        symbol: resA.data.symbol || 'TOKEN A',
        image: resA.data.image,
        sol_collected: (resA.data.real_sol_reserves || 0) / 1e9,
        total_volume: (resA.data.total_trade_volume || 0) / 1e9,
      };
    }

    if (resB.data) {
      tokenB = {
        symbol: resB.data.symbol || 'TOKEN B',
        image: resB.data.image,
        sol_collected: (resB.data.real_sol_reserves || 0) / 1e9,
        total_volume: (resB.data.total_trade_volume || 0) / 1e9,
      };
    }
  } catch (err) {
    console.error('Error fetching token data for metadata:', err);
  }

  // Calculate progress percentages
  const TARGET_SOL = 37.7;
  const VICTORY_VOLUME_SOL = 41.47;

  const progressA = Math.min(100, ((tokenA.sol_collected / TARGET_SOL) * 100 + (tokenA.total_volume / VICTORY_VOLUME_SOL) * 100) / 2);
  const progressB = Math.min(100, ((tokenB.sol_collected / TARGET_SOL) * 100 + (tokenB.total_volume / VICTORY_VOLUME_SOL) * 100) / 2);

  // Build OG Image URL - hardcode Vercel URL for now
  const baseUrl = 'https://bonk-battle.vercel.app';

  // Calculate market caps in K format
  const marketCapA = ((tokenA.sol_collected * 137.47) / 1000).toFixed(1) + 'k';
  const marketCapB = ((tokenB.sol_collected * 137.47) / 1000).toFixed(1) + 'k';

  // Build OG image URL with parameters for dynamic data
  const ogParams = new URLSearchParams({
    id: id,
    symbolA: tokenA.symbol,
    symbolB: tokenB.symbol,
    marketCapA: marketCapA,
    marketCapB: marketCapB,
  });

  // Add token images if available
  if (tokenA.image) ogParams.set('imageA', tokenA.image);
  if (tokenB.image) ogParams.set('imageB', tokenB.image);

  const ogImageUrl = `${baseUrl}/api/og/battle?${ogParams.toString()}`;

  const title = `⚔️ $${tokenA.symbol} vs $${tokenB.symbol} | BONK BATTLE`;
  const description = `🏆 Who will win? Vote now! 📊 ${tokenA.symbol}: ${progressA.toFixed(1)}% vs ${tokenB.symbol}: ${progressB.toFixed(1)}% 🔥 Winner gets listed on DEX!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}/battle/${id}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${tokenA.symbol} vs ${tokenB.symbol} Battle`,
        },
      ],
      siteName: 'BONK BATTLE',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
      creator: '@BonkBattle_',
    },
  };
}

export default function BattleLayout({ children }: Props) {
  return <>{children}</>;
}