// app/src/app/api/og/battle/route.tsx
// Dynamic OG Image generation for battle shares on X (Twitter)
// Uses @vercel/og for server-side image generation

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Image dimensions for Twitter/X card
const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const tokenAMint = searchParams.get('tokenA');
    const tokenBMint = searchParams.get('tokenB');

    if (!tokenAMint || !tokenBMint) {
      return new Response('Missing tokenA or tokenB parameter', { status: 400 });
    }

    // Fetch token data from our API
    let tokenAData = { symbol: 'TOKEN A', image: null, solCollected: 0 };
    let tokenBData = { symbol: 'TOKEN B', image: null, solCollected: 0 };

    try {
      // Try to fetch from database
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
        };
      }

      if (resB.ok) {
        const dataB = await resB.json();
        tokenBData = {
          symbol: dataB.symbol || 'TOKEN B',
          image: dataB.image || null,
          solCollected: (dataB.real_sol_reserves || 0) / 1e9,
        };
      }
    } catch (err) {
      console.error('Error fetching token data for OG image:', err);
    }

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
            background: 'linear-gradient(135deg, #1a1b26 0%, #2d1065 50%, #1a1b26 100%)',
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
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
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z' fill='%23581c87' fill-opacity='0.3'/%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px',
            }}
          />

          {/* BONK BATTLE Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '48px' }}>⚔️</span>
            <span
              style={{
                fontSize: '42px',
                fontWeight: 900,
                color: '#a855f7',
                textShadow: '0 0 30px rgba(168, 85, 247, 0.8)',
                letterSpacing: '2px',
              }}
            >
              BONK BATTLE
            </span>
            <span style={{ fontSize: '48px' }}>⚔️</span>
          </div>

          {/* Battle Arena */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '40px',
              marginBottom: '30px',
            }}
          >
            {/* Token A */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '180px',
                  height: '180px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  border: '4px solid #4DB5FF',
                  boxShadow: '0 0 40px rgba(77, 181, 255, 0.6)',
                  background: '#1a1b26',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={tokenAImage}
                  alt={tokenAData.symbol}
                  width={176}
                  height={176}
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <span
                style={{
                  marginTop: '12px',
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#4DB5FF',
                  textTransform: 'uppercase',
                }}
              >
                ${tokenAData.symbol}
              </span>
              <span
                style={{
                  fontSize: '20px',
                  color: '#9ca3af',
                }}
              >
                {tokenAData.solCollected.toFixed(2)} SOL
              </span>
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
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 40px rgba(239, 68, 68, 0.6)',
                }}
              >
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 900,
                    color: 'white',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
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
              }}
            >
              <div
                style={{
                  width: '180px',
                  height: '180px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  border: '4px solid #FF5A8E',
                  boxShadow: '0 0 40px rgba(255, 90, 142, 0.6)',
                  background: '#1a1b26',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={tokenBImage}
                  alt={tokenBData.symbol}
                  width={176}
                  height={176}
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <span
                style={{
                  marginTop: '12px',
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#FF5A8E',
                  textTransform: 'uppercase',
                }}
              >
                ${tokenBData.symbol}
              </span>
              <span
                style={{
                  fontSize: '20px',
                  color: '#9ca3af',
                }}
              >
                {tokenBData.solCollected.toFixed(2)} SOL
              </span>
            </div>
          </div>

          {/* Call to Action */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: '48px',
                fontWeight: 900,
                color: '#fbbf24',
                textShadow: '0 0 20px rgba(251, 191, 36, 0.6)',
              }}
            >
              🏆 WHO WILL WIN? 🏆
            </span>
            <span
              style={{
                fontSize: '22px',
                color: '#c084fc',
                fontWeight: 600,
              }}
            >
              Winner gets listed on DEX + 50% of loser&apos;s liquidity!
            </span>
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '18px', color: '#6b7280' }}>
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
