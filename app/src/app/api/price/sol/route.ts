import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    return NextResponse.json({
      price: data.solana?.usd || 230,
      currency: 'USD',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      price: 230,
      currency: 'USD',
      error: 'Failed to fetch price',
    });
  }
}
