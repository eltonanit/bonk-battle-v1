// app/src/app/api/notifications/mark-read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { wallet, notificationId } = body;

        if (!wallet) {
            return NextResponse.json({ error: 'Wallet required' }, { status: 400 });
        }

        // Mark single notification as read
        if (notificationId) {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId)
                .eq('user_wallet', wallet);

            if (error) {
                console.error('Failed to mark notification as read:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, marked: 1 });
        }

        // Mark ALL unread notifications as read for this wallet
        const { data, error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_wallet', wallet)
            .eq('read', false)
            .select('id');

        if (error) {
            console.error('Failed to mark all notifications as read:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(`Marked ${data?.length || 0} notifications as read for wallet ${wallet}`);

        return NextResponse.json({
            success: true,
            marked: data?.length || 0
        });

    } catch (error) {
        console.error('Error in mark-read API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
