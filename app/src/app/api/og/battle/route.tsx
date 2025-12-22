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

    // Logo URL - using the deployed app URL
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
          {/* Top Section - Battle Images */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '340px',
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              {/* Token A Image */}
              <img
                src={tokenAImage}
                width={200}
                height={200}
                style={{
                  objectFit: 'cover',
                  borderRadius: '20px',
                  border: '4px solid rgba(255,255,255,0.5)',
                }}
              />
              {/* Market Cap A */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '28px',
                    fontWeight: 900,
                    color: 'white',
                  }}
                >
                  ${symbolA}
                </span>
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.9)',
                  }}
                >
                  Market Cap: {marketCapA}
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              {/* Token B Image */}
              <img
                src={tokenBImage}
                width={200}
                height={200}
                style={{
                  objectFit: 'cover',
                  borderRadius: '20px',
                  border: '4px solid rgba(255,255,255,0.5)',
                }}
              />
              {/* Market Cap B */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: '28px',
                    fontWeight: 900,
                    color: 'white',
                  }}
                >
                  ${symbolB}
                </span>
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.9)',
                  }}
                >
                  Market Cap: {marketCapB}
                </span>
              </div>
            </div>

            {/* VS Badge - Centered */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100px',
                height: '100px',
                background: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '6px solid #000',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <span
                style={{
                  fontSize: '42px',
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
              height: '290px',
              background: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              gap: '20px',
            }}
          >
            {/* WHICH COIN WILL WIN? */}
            <div
              style={{
                fontSize: '64px',
                fontWeight: 900,
                color: '#000',
                textAlign: 'center',
                display: 'flex',
                letterSpacing: '-2px',
              }}
            >
              WHICH COIN WILL WIN?
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: '#666',
                textAlign: 'center',
                display: 'flex',
              }}
            >
              - Winners get 50% liquidity of loser and get listed on DEX -
            </div>

            {/* Logo Section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '20px',
              }}
            >
              <img
                src={logoUrl}
                width={50}
                height={50}
                style={{
                  objectFit: 'contain',
                }}
              />
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#9ca3af',
                  letterSpacing: '2px',
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