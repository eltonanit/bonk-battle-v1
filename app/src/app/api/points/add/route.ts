// app/src/app/api/points/add/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Points configuration
const POINTS_CONFIG = {
    create_token: 500,
    buy_token: 700,
    sell_token: 100,
    qualify_token: 1000,
    win_battle: 10000,
    share_battle: 500,
    share_win: 2000,
    referral_joins: 5000,
    new_follower: 25,
    daily_login: 100,
    follow_user: 50,
    first_buy: 1000,
};

type PointsAction = keyof typeof POINTS_CONFIG;

interface AddPointsRequest {
    walletAddress: string;
    action: PointsAction;
    tokenMint?: string;
    tokenSymbol?: string;
    tokenImage?: string;
    customPoints?: number; // Override default points
}

export async function POST(request: NextRequest) {
    try {
        const body: AddPointsRequest = await request.json();
        const { walletAddress, action, tokenMint, tokenSymbol, tokenImage, customPoints } = body;

        if (!walletAddress || !action) {
            return NextResponse.json(
                { success: false, error: 'Missing walletAddress or action' },
                { status: 400 }
            );
        }

        // Get points for this action
        const pointsToAdd = customPoints ?? POINTS_CONFIG[action];
        if (!pointsToAdd) {
            return NextResponse.json(
                { success: false, error: 'Invalid action' },
                { status: 400 }
            );
        }

        console.log(`🎯 Adding ${pointsToAdd} points to ${walletAddress.slice(0, 8)}... for ${action}`);

        // Check if user exists in user_points
        const { data: existingUser } = await supabase
            .from('user_points')
            .select('wallet_address, total_points, tier')
            .eq('wallet_address', walletAddress)
            .single();

        let newTotalPoints: number;
        let newTier: string;

        if (existingUser) {
            // Update existing user
            newTotalPoints = (existingUser.total_points || 0) + pointsToAdd;
            newTier = calculateTier(newTotalPoints);

            const { error: updateError } = await supabase
                .from('user_points')
                .update({
                    total_points: newTotalPoints,
                    tier: newTier,
                    updated_at: new Date().toISOString()
                })
                .eq('wallet_address', walletAddress);

            if (updateError) {
                console.error('❌ Error updating points:', updateError);
                return NextResponse.json(
                    { success: false, error: updateError.message },
                    { status: 500 }
                );
            }
        } else {
            // Create new user
            newTotalPoints = pointsToAdd;
            newTier = calculateTier(newTotalPoints);

            const { error: insertError } = await supabase
                .from('user_points')
                .insert({
                    wallet_address: walletAddress,
                    total_points: newTotalPoints,
                    tier: newTier,
                    wins_count: 0,
                    welcome_bonus_claimed: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (insertError) {
                console.error('❌ Error creating user points:', insertError);
                return NextResponse.json(
                    { success: false, error: insertError.message },
                    { status: 500 }
                );
            }
        }

        // Log the points activity (optional - for history)
        try {
            await supabase.from('points_history').insert({
                wallet_address: walletAddress,
                action: action,
                points: pointsToAdd,
                token_mint: tokenMint || null,
                token_symbol: tokenSymbol || null,
                token_image: tokenImage || null,
                created_at: new Date().toISOString()
            });
        } catch {
            // Ignore if points_history table doesn't exist
            console.log('ℹ️ points_history table not available');
        }

        // ⭐ Save notification to notifications table
        const notificationMessages: Record<string, { title: string; message: string }> = {
            create_token: { title: '+500 Points', message: 'You created a new coin!' },
            buy_token: { title: '+700 Points', message: 'You bought a coin!' },
            sell_token: { title: '+100 Points', message: 'You sold a coin!' },
            qualify_token: { title: '+1,000 Points', message: 'Your token qualified for battle!' },
            win_battle: { title: '+10,000 Points', message: 'Your token won the battle!' },
            share_battle: { title: '+500 Points', message: 'You shared a battle!' },
            share_win: { title: '+2,000 Points', message: 'You shared your win!' },
            referral_joins: { title: '+5,000 Points', message: 'Your referral joined!' },
            new_follower: { title: '+25 Points', message: 'You got a new follower!' },
            daily_login: { title: '+100 Points', message: 'Daily login bonus claimed!' },
        };

        const notifData = notificationMessages[action] || { title: `+${pointsToAdd} Points`, message: 'Points earned!' };

        try {
            await supabase.from('notifications').insert({
                user_wallet: walletAddress,
                type: 'points',
                title: notifData.title,
                message: notifData.message,
                read: false,
                data: {
                    action: action,
                    points: pointsToAdd,
                    token_mint: tokenMint || null,
                    token_symbol: tokenSymbol || null,
                    token_image: tokenImage || null
                },
                created_at: new Date().toISOString()
            });
            console.log('📬 Notification saved to database');
        } catch (err) {
            console.warn('⚠️ Could not save notification:', err);
        }

        console.log(`✅ Points added: ${walletAddress.slice(0, 8)}... now has ${newTotalPoints} points (${newTier})`);

        return NextResponse.json({
            success: true,
            pointsAdded: pointsToAdd,
            totalPoints: newTotalPoints,
            tier: newTier,
            action: action
        });

    } catch (error) {
        console.error('❌ add-points error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Calculate tier based on total points
function calculateTier(points: number): string {
    if (points >= 100000) return 'legend';
    if (points >= 50000) return 'diamond';
    if (points >= 20000) return 'gold';
    if (points >= 5000) return 'silver';
    return 'bronze';
}