import { NextResponse } from 'next/server';
import { syncTokensToSupabase } from '@/lib/indexer/sync-tokens';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET(request: Request) {
    try {
        // Optional: Add secret check here if needed for security
        // const authHeader = request.headers.get('authorization');
        // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        //   return new Response('Unauthorized', { status: 401 });
        // }

        const result = await syncTokensToSupabase();

        return NextResponse.json({
            success: true,
            message: 'Sync completed successfully',
            count: result.count
        });
    } catch (error) {
        console.error('Sync API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
