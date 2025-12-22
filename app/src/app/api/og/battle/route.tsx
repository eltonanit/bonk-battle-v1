// src/app/api/og/battle/route.tsx
// Dynamic OG Image generation - Gaming style layout

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    let tokenAMint = searchParams.get('tokenA');
    let tokenBMint = searchParams.get('tokenB');

    const id = searchParams.get('id');
    if (id && !tokenAMint && !tokenBMint) {
      const parts = id.split('-');
      if (parts.length === 2) {
        tokenAMint = parts[0];
        tokenBMint = parts[1];
      }
    }

    if (!tokenAMint || !tokenBMint) {
      return new Response('Missing tokenA or tokenB parameter', { status: 400 });
    }

    const symbolA = searchParams.get('symbolA') || 'TOKEN A';
    const symbolB = searchParams.get('symbolB') || 'TOKEN B';
    const imageA = searchParams.get('imageA');
    const imageB = searchParams.get('imageB');
    const marketCapA = searchParams.get('marketCapA') || '0';
    const marketCapB = searchParams.get('marketCapB') || '0';

    const tokenAImage = imageA || `https://api.dicebear.com/7.x/shapes/svg?seed=${tokenAMint}&backgroundColor=dc2626`;
    const tokenBImage = imageB || `https://api.dicebear.com/7.x/shapes/svg?seed=${tokenBMint}&backgroundColor=2563eb`;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'white',
          }}
        >
          {/* Top Section - Battle Images */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '420px',
              position: 'relative',
            }}
          >
            {/* Red Side - Token A */}
            <div
              style={{
                width: '50%',
                height: '100%',
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Token A Image */}
              <img
                src={tokenAImage}
                width={350}
                height={350}
                style={{
                  objectFit: 'cover',
                  borderRadius: '24px',
                  border: '6px solid rgba(255,255,255,0.3)',
                }}
              />

              {/* BONK BATTLE Logo Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '24px' }}>⚔️</span>
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 900,
                    color: '#fbbf24',
                    letterSpacing: '1px',
                  }}
                >
                  BONK BATTLE
                </span>
              </div>
            </div>

            {/* Blue Side - Token B */}
            <div
              style={{
                width: '50%',
                height: '100%',
                background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Token B Image */}
              <img
                src={tokenBImage}
                width={350}
                height={350}
                style={{
                  objectFit: 'cover',
                  borderRadius: '24px',
                  border: '6px solid rgba(255,255,255,0.3)',
                }}
              />

              {/* BONK BATTLE Logo Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 900,
                    color: '#fbbf24',
                    letterSpacing: '1px',
                  }}
                >
                  BONK BATTLE
                </span>
                <span style={{ fontSize: '24px' }}>⚔️</span>
              </div>
            </div>

            {/* VS Badge - Centered */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120px',
                height: '120px',
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '8px solid #000',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <span
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#000',
                }}
              >
                VS
              </span>
            </div>
          </div>

          {/* Bottom Section - White Background */}
          <div
            style={{
              width: '100%',
              height: '210px',
              background: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
              gap: '16px',
            }}
          >
            {/* BONKBATTLE Logo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '4px',
              }}
            >
              <span style={{ fontSize: '32px' }}>⚔️</span>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                BONKBATTLE
              </span>
            </div>

            {/* WHO WINS ? */}
            <div
              style={{
                fontSize: '56px',
                fontWeight: 900,
                color: '#000',
                display: 'flex',
              }}
            >
              WHO WINS ?
            </div>

            {/* Tokens and Market Cap */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '40px',
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {/* Token A */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: '#000',
                  }}
                >
                  ${symbolA}
                </span>
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#dc2626',
                  }}
                >
                  Market Cap: ${marketCapA}
                </span>
              </div>

              {/* VS */}
              <span
                style={{
                  fontSize: '40px',
                  fontWeight: 900,
                  color: '#000',
                }}
              >
                VS
              </span>

              {/* Token B */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: '#000',
                  }}
                >
                  ${symbolB}
                </span>
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#2563eb',
                  }}
                >
                  Market Cap: ${marketCapB}
                </span>
              </div>
            </div>
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