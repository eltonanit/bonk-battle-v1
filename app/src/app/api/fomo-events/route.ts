import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import type { FomoEvent } from '@/types';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const recentTxs = await prisma.transaction.findMany({
      where: {
        type: {
          in: ['buy', 'create'],
        },
      },
      include: {
        launch: {
          select: {
            name: true,
            symbol: true,
            tier: true,
            targetMarketcap: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 20,
    });

    const events: FomoEvent[] = recentTxs.map((tx) => {
      const wallet = tx.buyerAddress;
      const truncated = wallet.slice(0, 4) + Math.floor(Math.random() * 10000);
      
      const colorMap: Record<number, string> = {
        1: 'bg-[#3b82f6]',
        2: 'bg-[#fb923c]',
        3: 'bg-[#10b981]',
        4: 'bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]',
      };
      
      const targetUsd = tx.launch.tier === 1 ? '.0k' :
                       tx.launch.tier === 2 ? '' :
                       tx.launch.tier === 3 ? '.0M' : '';
      
      const emojis = ['🎯', '🐸', '🐕', '🌙', '🚀', '🦊', '😎', '🦍', '🐂', '💎'];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

      return {
        type: tx.type === 'create' ? 'create' : 'buy',
        user: truncated,
        token: tx.launch.symbol,
        amount: tx.type === 'buy' ? Number(tx.solAmount) / 1e9 : undefined,
        targetUsd,
        emoji: randomEmoji,
        color: colorMap[tx.launch.tier] || 'bg-[#3b82f6]',
        timestamp: tx.timestamp.getTime(),
      };
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching fomo events:', error);
    return NextResponse.json([], { status: 500 });
  }
}
