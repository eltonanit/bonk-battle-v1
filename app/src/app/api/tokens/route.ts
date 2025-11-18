import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import type { TokenLaunchExtended } from '@/types';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'on-fire'; // on-fire | about-to-win | new
    const limit = parseInt(searchParams.get('limit') || '50');

    // Base query - solo tokens attivi
    const whereClause = {      status: 'Active',
      deadline: {
        gt: new Date(), // Solo token non scaduti
      },
    };

    // Filtri
    let orderBy: Record<string, string> = { createdAt: 'desc' };

    if (filter === 'on-fire') {
      // Tokens con più volume
      orderBy = { solRaised: 'desc' };
    } else if (filter === 'about-to-win') {
      // Tokens vicini al target (>80% progress)
      // Calcoleremo dopo
    } else if (filter === 'new') {
      orderBy = { createdAt: 'desc' };
    }

    const launches = await prisma.launch.findMany({
      where: whereClause,
      orderBy,
      take: limit,
    });

    // Transform to TokenLaunchExtended
    const tokens: TokenLaunchExtended[] = launches.map((launch) => {
      const now = Date.now();
      const deadline = launch.deadline.getTime();
      const timeRemaining = Math.max(0, Math.floor((deadline - now) / 1000));
      
      const solRaised = Number(launch.solRaised) / 1e9; // lamports to SOL
      const targetSol = Number(launch.targetMarketcap) / 100; // Assuming stored as cents
      const progress = Math.min(100, (solRaised / targetSol) * 100);
      
      // Estimate market cap (simplified)
      const marketCapUsd = solRaised * 100; // Assuming 1 SOL = \ (MVP fixed price)

      return {
        id: launch.id,
        mintAddress: launch.mintAddress,
        creatorAddress: launch.creatorAddress,
        name: launch.name,
        symbol: launch.symbol,
        imageUrl: launch.imageUrl,
        tier: launch.tier,
        targetMarketcap: launch.targetMarketcap,
        deadline: launch.deadline,
        status: launch.status,
        solRaised: launch.solRaised,
        totalBuyers: launch.totalBuyers,
        createdAt: launch.createdAt,
        
        // Extended fields
        progress,
        marketCapUsd,
        timeRemaining,
        emoji: launch.imageUrl ? undefined : '💎', // Fallback emoji if no image
      };
    });

    // Apply 'about-to-win' filter after calculation
    let filteredTokens = tokens;
    if (filter === 'about-to-win') {
      filteredTokens = tokens
        .filter(t => t.progress >= 80 && t.progress < 100)
        .sort((a, b) => b.progress - a.progress);
    }

    return NextResponse.json(filteredTokens);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json([], { status: 500 });
  }
}
