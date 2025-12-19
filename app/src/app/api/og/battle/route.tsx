// app/src/app/api/og/battle/route.tsx
// Dynamic OG Image generation for battle shares on X (Twitter)
// Polymarket-style with percentages and "Who will win?" question

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Image dimensions for Twitter/X card
const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Support both formats:
    // 1. ?id=tokenA-tokenB (from layout metadata)
    // 2. ?tokenA=xxx&tokenB=yyy (direct)
    let tokenAMint = searchParams.get('tokenA');
    let tokenBMint = searchParams.get('tokenB');

    // If id is provided, split it into tokenA and tokenB
    const id = searchParams.get('id');
    if (id && !tokenAMint && !tokenBMint) {
      const parts = id.split('-');
      if (parts.length === 2) {
        tokenAMint = parts[0];
        tokenBMint = parts[1];
      }
    }

    const progressAParam = searchParams.get('progressA');
    const progressBParam = searchParams.get('progressB');

    if (!tokenAMint || !tokenBMint) {
      return new Response('Missing tokenA or tokenB parameter (or id=tokenA-tokenB)', { status: 400 });
    }

    // Fetch token data from our API
    let tokenAData = { symbol: 'TOKEN A', image: null as string | null, solCollected: 0, totalVolume: 0 };
    let tokenBData = { symbol: 'TOKEN B', image: null as string | null, solCollected: 0, totalVolume: 0 };

    try {
      const [resA, resB] = await Promise.all([
        fetch(`${request.nextUrl.origin}/api/tokens/${tokenAMint}`),
        fetch(`${request.nextUrl.origin}/api/tokens/${tokenBMint}`),
      ]);

      if (resA.ok) {
        const dataA = await resA.json();
        tokenAData = {
          symbol: dataA.symbol || 'TOKEN A',
          image: dataA.image || null,
          solCollected: (dataA.real_sol_reserves || 0) / 1e9,
          totalVolume: (dataA.total_trade_volume || 0) / 1e9,
        };
      }

      if (resB.ok) {
        const dataB = await resB.json();
        tokenBData = {
          symbol: dataB.symbol || 'TOKEN B',
          image: dataB.image || null,
          solCollected: (dataB.real_sol_reserves || 0) / 1e9,
          totalVolume: (dataB.total_trade_volume || 0) / 1e9,
        };
      }
    } catch (err) {
      console.error('Error fetching token data for OG image:', err);
    }

    // Calculate progress percentages
    const TARGET_SOL = 37.7;
    const VICTORY_VOLUME_SOL = 41.47;

    const progressA = progressAParam
      ? parseFloat(progressAParam)
      : Math.min(100, ((tokenAData.solCollected / TARGET_SOL) * 100 + (tokenAData.totalVolume / VICTORY_VOLUME_SOL) * 100) / 2);

    const progressB = progressBParam
      ? parseFloat(progressBParam)
      : Math.min(100, ((tokenBData.solCollected / TARGET_SOL) * 100 + (tokenBData.totalVolume / VICTORY_VOLUME_SOL) * 100) / 2);

    // Generate fallback image URLs if not available
    const tokenAImage = tokenAData.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${tokenAData.symbol}&backgroundColor=4f46e5`;
    const tokenBImage = tokenBData.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${tokenBData.symbol}&backgroundColor=ec4899`;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative',
            padding: '40px',
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `radial-gradient(circle at 20% 80%, rgba(168, 85, 247, 0.15) 0%, transparent 50%),
                               radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)`,
            }}
          />

          {/* Header - BONK BATTLE Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '40px' }}>⚔️</span>
            <span
              style={{
                fontSize: '36px',
                fontWeight: 900,
                background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                backgroundClip: 'text',
                color: 'transparent',
                letterSpacing: '3px',
              }}
            >
              BONK BATTLE
            </span>
            <span style={{ fontSize: '40px' }}>⚔️</span>
          </div>

          {/* Main Question - Polymarket Style */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '40px',
              textAlign: 'center',
            }}
          >
            🏆 Who will win the battle?
          </div>

          {/* Battle Arena - Side by Side with Percentages */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '60px',
              width: '100%',
              maxWidth: '1000px',
            }}
          >
            {/* Token A */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
              }}
            >
              {/* Token Image */}
              <div
                style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  border: '4px solid #4DB5FF',
                  boxShadow: '0 0 40px rgba(77, 181, 255, 0.4)',
                  background: '#1a1b26',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={tokenAImage}
                  alt={tokenAData.symbol}
                  width={156}
                  height={156}
                  style={{ objectFit: 'cover', borderRadius: '20px' }}
                />
              </div>

              {/* Token Symbol */}
              <span
                style={{
                  marginTop: '16px',
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#4DB5FF',
                  textTransform: 'uppercase',
                }}
              >
                ${tokenAData.symbol}
              </span>

              {/* Percentage - Polymarket Style */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px 32px',
                  background: 'linear-gradient(135deg, #4DB5FF 0%, #2196F3 100%)',
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(77, 181, 255, 0.4)',
                }}
              >
                <span
                  style={{
                    fontSize: '42px',
                    fontWeight: 900,
                    color: '#ffffff',
                  }}
                >
                  {progressA.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* VS Badge */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
                }}
              >
                <span
                  style={{
                    fontSize: '28px',
                    fontWeight: 900,
                    color: 'white',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  VS
                </span>
              </div>
            </div>

            {/* Token B */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
              }}
            >
              {/* Token Image */}
              <div
                style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  border: '4px solid #FF5A8E',
                  boxShadow: '0 0 40px rgba(255, 90, 142, 0.4)',
                  background: '#1a1b26',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={tokenBImage}
                  alt={tokenBData.symbol}
                  width={156}
                  height={156}
                  style={{ objectFit: 'cover', borderRadius: '20px' }}
                />
              </div>

              {/* Token Symbol */}
              <span
                style={{
                  marginTop: '16px',
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#FF5A8E',
                  textTransform: 'uppercase',
                }}
              >
                ${tokenBData.symbol}
              </span>

              {/* Percentage - Polymarket Style */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px 32px',
                  background: 'linear-gradient(135deg, #FF5A8E 0%, #E91E63 100%)',
                  borderRadius: '16px',
                  boxShadow: '0 4px 20px rgba(255, 90, 142, 0.4)',
                }}
              >
                <span
                  style={{
                    fontSize: '42px',
                    fontWeight: 900,
                    color: '#ffffff',
                  }}
                >
                  {progressB.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div
            style={{
              marginTop: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: '22px',
                color: '#c084fc',
                fontWeight: 600,
              }}
            >
              🔥 Winner gets listed on Raydium DEX!
            </span>
            <span
              style={{
                fontSize: '18px',
                color: '#6b7280',
              }}
            >
              bonkbattle.com
            </span>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
      }
    );
  } catch (error) {
    console.error('OG Image generation error:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}