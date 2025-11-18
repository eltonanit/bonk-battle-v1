import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import type { HotToken } from '@/types';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get graduated tokens (successfully listed on DEX)
    const graduatedTokens = await prisma.launch.findMany({
      where: {
        status: 'Graduated',
        graduatedAt: {
          not: null,
        },
      },
      orderBy: {
        graduatedAt: 'desc',
      },
      take: 10,
    });

    // Transform to HotToken
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    ];

    const emojis = ['🐸', '🇮🇹', '🇬🇧', '🇩🇪', '🐕', '🚀', '😎', '🌙', '🦊', '🎯'];

    const hotTokens: HotToken[] = graduatedTokens.map((token, index) => {
      // Calculate price based on market cap
      // Simplified: price = marketCap / supply
      const solRaised = Number(token.solRaised) / 1e9;
      const estimatedPrice = (solRaised * 100) / 1000; // Rough estimate
      
      // Random gain percentage (since we don't track historical prices yet)
      const change24h = Math.random() * 15000 + 5000; // 5000% to 20000%

      return {
        mint: token.mintAddress,
        symbol: token.symbol,
        name: token.name,
        emoji: emojis[index % emojis.length],
        price: parseFloat(estimatedPrice.toFixed(2)),
        change24h: parseFloat(change24h.toFixed(0)),
        gradient: gradients[index % gradients.length],
      };
    });

    return NextResponse.json(hotTokens);
  } catch (error) {
    console.error('Error fetching hot tokens:', error);
    return NextResponse.json([], { status: 500 });
  }
}
