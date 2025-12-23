// src/app/api/og/battle/route.tsx
// Dynamic OG Image generation - Clean gaming style layout

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
    const marketCapA = searchParams.get('marketCapA') || '$0';
    const marketCapB = searchParams.get('marketCapB') || '$0';

    const tokenAImage = imageA || `https://api.dicebear.com/7.x/shapes/svg?seed=${tokenAMint}&backgroundColor=dc2626`;
    const tokenBImage = imageB || `https://api.dicebear.com/7.x/shapes/svg?seed=${tokenBMint}&backgroundColor=2563eb`;

    // Logo URL
    const logoUrl = 'https://bonk-battle.vercel.app/BONK-LOGO.svg';

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
          {/* Header - WHICH COIN WILL WIN? */}
          <div
            style={{
              width: '100%',
              padding: '25px 0',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: '52px',
                fontWeight: 900,
                color: '#000',
                letterSpacing: '-1px',
              }}
            >
              WHICH COIN WILL WIN?
            </span>
          </div>

          {/* Battle Section - Images Only */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '280px',
              position: 'relative',
            }}
          >
            {/* Red Side - Token A */}
            <div
              style={{
                width: '50%',
                height: '100%',
                background: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={tokenAImage}
                width={220}
                height={220}
                style={{
                  objectFit: 'cover',
                  borderRadius: '24px',
                  border: '5px solid rgba(255,255,255,0.4)',
                }}
              />
            </div>

            {/* Blue Side - Token B */}
            <div
              style={{
                width: '50%',
                height: '100%',
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={tokenBImage}
                width={220}
                height={220}
                style={{
                  objectFit: 'cover',
                  borderRadius: '24px',
                  border: '5px solid rgba(255,255,255,0.4)',
                }}
              />
            </div>

            {/* VS Badge - Centered */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90px',
                height: '90px',
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '5px solid #000',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              <span
                style={{
                  fontSize: '36px',
                  fontWeight: 900,
                  color: '#000',
                }}
              >
                VS
              </span>
            </div>
          </div>

          {/* Bottom Section - White with Symbols and Market Caps */}
          <div
            style={{
              width: '100%',
              flex: 1,
              background: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '15px 40px 20px 40px',
            }}
          >
            {/* Symbols and Market Caps Row */}
            <div
              style={{
                display: 'flex',
                width: '100%',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              {/* Token A Info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 900,
                    color: '#000',
                  }}
                >
                  ${symbolA}
                </span>
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#000',
                  }}
                >
                  MARKET CAP: {marketCapA}
                </span>
              </div>

              {/* Token B Info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                }}
              >
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 900,
                    color: '#000',
                  }}
                >
                  ${symbolB}
                </span>
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#000',
                  }}
                >
                  MARKET CAP: {marketCapB}
                </span>
              </div>
            </div>

            {/* Subtitle - Yellow background */}
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#000',
                textAlign: 'center',
                display: 'flex',
                background: '#fbbf24',
                padding: '10px 24px',
                borderRadius: '8px',
              }}
            >
              - Winners get 50% liquidity of loser and get listed on DEX -
            </div>

            {/* Logo Section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <img
                src={logoUrl}
                width={40}
                height={40}
                style={{
                  objectFit: 'contain',
                }}
              />
              <span
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#9ca3af',
                  letterSpacing: '1px',
                }}
              >
                BONK BATTLE
              </span>
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