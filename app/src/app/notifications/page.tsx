'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { supabase } from '@/lib/supabase';

// Type-safe notification interface
interface Notification {
    id: string;
    token_launch_id: string | null;
    read: boolean;
    title: string;
    message: string;
    type: string;
    created_at: string;
    data?: {
        follower_wallet?: string;
        action?: string;
        points?: number;
        token_mint?: string;
        token_symbol?: string;
        token_image?: string;
        [key: string]: unknown;
    } | null;
}

// Plus Icon Component
function PlusIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            className={className}
            fill="currentColor"
        >
            <path d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z" />
        </svg>
    );
}

// Trophy Icon Component for victory
function TrophyIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={className}
            fill="currentColor"
        >
            <path d="M5 3h14v3c0 2.21-1.79 4-4 4h-1v2h1c1.1 0 2 .9 2 2v1h-4v3c0 1.1-.9 2-2 2s-2-.9-2-2v-3H5v-1c0-1.1.9-2 2-2h1v-2H7c-2.21 0-4-1.79-4-4V3zm2 2v1c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V5H7z" />
        </svg>
    );
}

// Points action to message mapping
const POINTS_MESSAGES: Record<string, string> = {
    create_token: 'Your new coin created',
    buy_token: 'You bought a coin',
    sell_token: 'You sold a coin',
    qualify_token: 'Your token qualified for battle',
    win_battle: 'Your token won the battle!',
    share_battle: 'You shared a battle',
    share_win: 'You shared your win',
    referral_joins: 'Your referral joined',
    new_follower: 'You got a new follower',
    daily_login: 'Daily login bonus',
    follow_user: 'You followed a user',
    first_buy: 'First buy bonus',
};

export default function NotificationsPage() {
    const router = useRouter();
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

    // ⭐ NEW: Cache for token images fetched from database
    const [tokenImages, setTokenImages] = useState<Record<string, string>>({});
    const [imagesFetched, setImagesFetched] = useState(false);

    // ⭐ NEW: Fetch missing token images from database
    useEffect(() => {
        if (loading || imagesFetched || notifications.length === 0) return;

        async function fetchMissingImages() {
            // Find notifications with token_mint but no token_image
            const mintsToFetch: string[] = [];

            for (const notif of notifications) {
                const n = notif as Notification;
                if (n.type === 'points' && n.data?.token_mint && !n.data?.token_image) {
                    if (!mintsToFetch.includes(n.data.token_mint)) {
                        mintsToFetch.push(n.data.token_mint);
                    }
                }
            }

            if (mintsToFetch.length === 0) {
                setImagesFetched(true);
                return;
            }

            console.log('📸 Fetching missing images for:', mintsToFetch.length, 'tokens');

            try {
                // Fetch from tokens table - use correct column name 'image'
                const { data: tokens, error } = await supabase
                    .from('tokens')
                    .select('mint, image, uri')
                    .in('mint', mintsToFetch);

                if (error) {
                    console.error('Error fetching token images:', error.message, error.code, error.details);
                    setImagesFetched(true);
                    return;
                }

                // Build image map - try multiple sources
                const imageMap: Record<string, string> = {};
                for (const token of tokens || []) {
                    let imageUrl: string | null = null;

                    // 1. Direct 'image' field
                    if (token.image) {
                        imageUrl = token.image;
                    }
                    // 2. Parse from URI if it's JSON
                    else if (token.uri && token.uri.startsWith('{')) {
                        try {
                            const metadata = JSON.parse(token.uri);
                            imageUrl = metadata.image || metadata.IMAGE || null;
                        } catch {
                            // Not valid JSON
                        }
                    }

                    if (imageUrl && token.mint) {
                        imageMap[token.mint] = imageUrl;
                    }
                }

                console.log('✅ Fetched images for', Object.keys(imageMap).length, 'tokens');
                setTokenImages(imageMap);
            } catch (err) {
                console.error('Exception fetching token images:', err);
            }

            setImagesFetched(true);
        }

        fetchMissingImages();
    }, [notifications, loading, imagesFetched]);

    // Mark all as read when leaving the page
    useEffect(() => {
        return () => {
            markAllAsRead();
        };
    }, [markAllAsRead]);

    function handleNotificationClick(notification: Notification) {
        markAsRead(notification.id);

        if (notification.type === 'new_follower' && notification.data?.follower_wallet) {
            return;
        }

        if (notification.type === 'points' && notification.data?.token_mint) {
            router.push(`/token/${notification.data.token_mint}`);
            return;
        }

        if (notification.token_launch_id &&
            notification.token_launch_id !== 'TEST_TOKEN' &&
            notification.token_launch_id !== 'TEST') {
            router.push(`/token/${notification.token_launch_id}`);
        }
    }

    // ⭐ NEW: Get token image from notification data OR from fetched cache
    function getTokenImage(notif: Notification): string | null {
        // First check notification data
        if (notif.data?.token_image) {
            return notif.data.token_image;
        }

        // Then check fetched cache
        if (notif.data?.token_mint && tokenImages[notif.data.token_mint]) {
            return tokenImages[notif.data.token_mint];
        }

        return null;
    }

    // ⭐ Check if this is a victory notification (10,000 points)
    function isVictoryNotification(notif: Notification): boolean {
        const points = notif.data?.points || 0;
        const action = notif.data?.action || '';
        return points >= 10000 || action === 'win_battle';
    }

    // Render notification based on type
    function renderNotification(notif: Notification, isLast: boolean) {
        const isFollower = notif.type === 'new_follower' ||
            notif.title?.toLowerCase().includes('follower') ||
            notif.message?.includes('started following you');
        const isPoints = notif.type === 'points';

        // For follower notifications
        if (isFollower) {
            let walletShort = '';
            if (notif.data?.follower_wallet) {
                walletShort = (notif.data.follower_wallet as string).slice(0, 4);
            } else if (notif.message) {
                const match = notif.message.match(/^([A-Za-z0-9]{4})/);
                if (match) {
                    walletShort = match[1];
                }
            }

            return (
                <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`py-4 px-4 cursor-pointer hover:bg-white/5 transition-colors ${!isLast ? 'border-b border-gray-700/50' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <img
                            src="/profilo.png"
                            alt={walletShort}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm">
                                <span className="font-semibold">{walletShort}</span>
                                <span className="text-gray-400"> started following you</span>
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                                {formatTimeAgo(notif.created_at)}
                            </p>
                        </div>
                        {!notif.read && (
                            <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0" />
                        )}
                    </div>
                </div>
            );
        }

        // For points notifications
        if (isPoints) {
            const points = notif.data?.points || 0;
            const action = notif.data?.action || '';
            const isVictory = isVictoryNotification(notif);

            // ⭐ NEW: Use helper function to get image
            const tokenImage = getTokenImage(notif);

            const displayMessage = POINTS_MESSAGES[action] || notif.message;

            // ⭐ VICTORY STYLE: Yellow/Gold for 10,000+ points
            if (isVictory) {
                return (
                    <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`py-4 px-4 cursor-pointer hover:bg-yellow-500/10 transition-colors bg-yellow-500/5 ${!isLast ? 'border-b border-yellow-500/20' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            {/* Gold circle with trophy - same size as regular */}
                            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xl">🏆</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                {/* Yellow points text - same size as regular */}
                                <p className="text-yellow-400 text-lg font-bold">
                                    +{points.toLocaleString()} pts
                                </p>
                                <p className="text-yellow-200/70 text-sm mt-0.5">{displayMessage}</p>
                                <p className="text-yellow-500/50 text-xs mt-1">
                                    {formatTimeAgo(notif.created_at)}
                                </p>
                            </div>

                            {/* Token Image with gold border - same size as regular */}
                            {tokenImage && (
                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-yellow-500/50">
                                    <Image
                                        src={tokenImage}
                                        alt="Token"
                                        width={48}
                                        height={48}
                                        className="w-full h-full object-cover"
                                        unoptimized
                                    />
                                </div>
                            )}

                            {!notif.read && (
                                <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0 animate-pulse" />
                            )}
                        </div>
                    </div>
                );
            }

            // Regular points notification (green)
            return (
                <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`py-4 px-4 cursor-pointer hover:bg-white/5 transition-colors ${!isLast ? 'border-b border-gray-700/50' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <PlusIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-emerald-500 text-lg font-bold">
                                +{points.toLocaleString()} pts
                            </p>
                            <p className="text-gray-400 text-sm mt-0.5">{displayMessage}</p>
                            <p className="text-gray-500 text-xs mt-1">
                                {formatTimeAgo(notif.created_at)}
                            </p>
                        </div>

                        {/* ⭐ Token Image - shows from data OR from fetched cache */}
                        {tokenImage && (
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700">
                                <Image
                                    src={tokenImage}
                                    alt="Token"
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                />
                            </div>
                        )}

                        {!notif.read && (
                            <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                        )}
                    </div>
                </div>
            );
        }

        // Default notification
        return (
            <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`py-4 px-4 cursor-pointer hover:bg-white/5 transition-colors ${!isLast ? 'border-b border-gray-700/50' : ''}`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold">{notif.title}</p>
                        <p className="text-gray-400 text-sm mt-0.5">{notif.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-500 text-xs">{formatTimeAgo(notif.created_at)}</span>
                            {notif.token_launch_id && notif.token_launch_id !== 'TEST' && notif.token_launch_id !== 'TEST_TOKEN' && (
                                <span className="text-cyan-400 text-xs">View token →</span>
                            )}
                        </div>
                    </div>
                    {!notif.read && (
                        <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0" />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bonk-dark text-white">
            {/* Tickers - Mobile only */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
                <div className="flex items-center gap-2 px-2 justify-center xs:justify-start">
                    <FOMOTicker />
                    <div className="hidden sm:block">
                        <CreatedTicker />
                    </div>
                </div>
            </div>

            <DesktopHeader />
            <Header />
            <Sidebar />

            {/* Main Content */}
            <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16">
                <div className="max-w-[800px] mx-auto px-5 py-8">

                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">Notifications</h1>
                                {unreadCount > 0 && (
                                    <p className="text-gray-400 text-sm mt-1">{unreadCount} unread</p>
                                )}
                            </div>

                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="bg-[#1a1f2e] border border-[#2a3544] rounded-xl">
                        {loading ? (
                            <div className="text-center py-16">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-4"></div>
                                <p className="text-gray-400">Loading notifications...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="text-5xl mb-4">🔔</div>
                                <h2 className="text-xl font-semibold mb-2">No notifications yet</h2>
                                <p className="text-gray-400">{`We'll notify you when something happens!`}</p>
                            </div>
                        ) : (
                            <div>
                                {notifications.map((notif, index) =>
                                    renderNotification(notif as Notification, index === notifications.length - 1)
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <MobileBottomNav />
        </div>
    );
}

function formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const timestampUTC = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    const then = new Date(timestampUTC);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return then.toLocaleDateString();
}