// src/app/api/og/battle/route.tsx
// Dynamic OG Image generation for battle shares on X (Twitter)

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

    if (!tokenAMint || !tokenBMint) {
      return new Response('Missing tokenA or tokenB parameter (or id=tokenA-tokenB)', { status: 400 });
    }

    // Get optional parameters
    const symbolA = searchParams.get('symbolA') || 'FIGHTER A';
    const symbolB = searchParams.get('symbolB') || 'FIGHTER B';
    const progressAParam = searchParams.get('progressA');
    const progressBParam = searchParams.get('progressB');
    const imageA = searchParams.get('imageA');
    const imageB = searchParams.get('imageB');

    const progressA = progressAParam ? parseFloat(progressAParam) : 50;
    const progressB = progressBParam ? parseFloat(progressBParam) : 50;

    // Fallback images
    const tokenAImage = imageA || `https://api.dicebear.com/7.x/shapes/svg?seed=${tokenAMint}&backgroundColor=4f46e5`;
    const tokenBImage = imageB || `https://api.dicebear.com/7.x/shapes/svg?seed=${tokenBMint}&backgroundColor=ec4899`;

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
                color: '#a855f7',
                letterSpacing: '3px',
              }}
            >
              BONK BATTLE
            </span>
            <span style={{ fontSize: '40px' }}>⚔️</span>
          </div>

          {/* Main Question */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '40px',
              textAlign: 'center',
              display: 'flex',
            }}
          >
            🏆 Who will win the battle?
          </div>

          {/* Battle Arena */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '60px',
              width: '100%',
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
                  width: '160px',
                  height: '160px',
                  borderRadius: '24px',
                  border: '4px solid #4DB5FF',
                  background: '#1a1b26',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={tokenAImage}
                  width={156}
                  height={156}
                  style={{ objectFit: 'cover', borderRadius: '20px' }}
                />
              </div>
              <span
                style={{
                  marginTop: '16px',
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#4DB5FF',
                }}
              >
                ${symbolA}
              </span>
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px 32px',
                  background: '#4DB5FF',
                  borderRadius: '16px',
                  display: 'flex',
                }}
              >
                <span style={{ fontSize: '42px', fontWeight: 900, color: '#ffffff' }}>
                  {progressA.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* VS Badge */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '28px', fontWeight: 900, color: 'white' }}>VS</span>
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
                  width: '160px',
                  height: '160px',
                  borderRadius: '24px',
                  border: '4px solid #FF5A8E',
                  background: '#1a1b26',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={tokenBImage}
                  width={156}
                  height={156}
                  style={{ objectFit: 'cover', borderRadius: '20px' }}
                />
              </div>
              <span
                style={{
                  marginTop: '16px',
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#FF5A8E',
                }}
              >
                ${symbolB}
              </span>
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px 32px',
                  background: '#FF5A8E',
                  borderRadius: '16px',
                  display: 'flex',
                }}
              >
                <span style={{ fontSize: '42px', fontWeight: 900, color: '#ffffff' }}>
                  {progressB.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '22px', color: '#c084fc', fontWeight: 600, display: 'flex' }}>
              🔥 Winner gets listed on Raydium DEX!
            </span>
            <span style={{ fontSize: '18px', color: '#6b7280', display: 'flex' }}>
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
    return new Response(`Failed to generate image: ${String(error)}`, { status: 500 });
  }
}