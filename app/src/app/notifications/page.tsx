'use client';

import { useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

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
        [key: string]: unknown;
    } | null;
}

export default function NotificationsPage() {
    const router = useRouter();
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

    // Mark all as read when leaving the page
    useEffect(() => {
        return () => {
            // Cleanup: mark all as read when component unmounts
            markAllAsRead();
        };
    }, [markAllAsRead]);

    function handleNotificationClick(notification: Notification) {
        markAsRead(notification.id);

        // Navigate based on notification type
        if (notification.type === 'new_follower' && notification.data?.follower_wallet) {
            // Could navigate to follower's profile if we had that page
            return;
        }

        // Navigate to token page
        if (notification.token_launch_id &&
            notification.token_launch_id !== 'TEST_TOKEN' &&
            notification.token_launch_id !== 'TEST') {
            router.push(`/token/${notification.token_launch_id}`);
        }
    }

    // Render notification based on type
    function renderNotification(notif: Notification, isLast: boolean) {
        // Detect follower notifications by title or type
        const isFollower = notif.type === 'new_follower' ||
                          notif.title?.toLowerCase().includes('follower') ||
                          notif.message?.includes('started following you');
        const isPoints = notif.type === 'points';

        // For follower notifications: show profile pic + first 4 chars + "started following you"
        if (isFollower) {
            // Extract wallet from message (e.g., "Fu8S...shmZ started following you")
            // or from data.follower_wallet
            let walletShort = '';
            if (notif.data?.follower_wallet) {
                walletShort = (notif.data.follower_wallet as string).slice(0, 4);
            } else if (notif.message) {
                // Extract first part before "started" or "..."
                const match = notif.message.match(/^([A-Za-z0-9]{4})/);
                if (match) {
                    walletShort = match[1];
                }
            }

            return (
                <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`py-4 cursor-pointer hover:bg-white/5 transition-colors ${!isLast ? 'border-b border-gray-700/50' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        {/* Profile Photo */}
                        <img
                            src="/profilo.png"
                            alt={walletShort}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm">
                                <span className="font-semibold">{walletShort}</span>
                                <span className="text-gray-400"> started following you</span>
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                                {formatTimeAgo(notif.created_at)}
                            </p>
                        </div>

                        {/* Unread indicator */}
                        {!notif.read && (
                            <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0" />
                        )}
                    </div>
                </div>
            );
        }

        // For points notifications
        if (isPoints) {
            const cleanTitle = notif.title.replace(/^🎉\s*/, '');

            return (
                <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`py-4 cursor-pointer hover:bg-white/5 transition-colors ${!isLast ? 'border-b border-gray-700/50' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        {/* BONK Logo */}
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <Image
                                src="/BONK-LOGO.svg"
                                alt="BONK"
                                width={24}
                                height={24}
                            />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold">{cleanTitle}</p>
                            <p className="text-gray-400 text-sm mt-0.5">{notif.message}</p>
                            <p className="text-gray-500 text-xs mt-1">
                                {formatTimeAgo(notif.created_at)}
                            </p>
                        </div>

                        {/* Unread indicator */}
                        {!notif.read && (
                            <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                        )}
                    </div>
                </div>
            );
        }

        // Default notification (token alerts, etc.)
        return (
            <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`py-4 cursor-pointer hover:bg-white/5 transition-colors ${!isLast ? 'border-b border-gray-700/50' : ''}`}
            >
                <div className="flex items-center gap-3">
                    {/* Bell Icon */}
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>

                    {/* Content */}
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

                    {/* Unread indicator */}
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
                            <div className="px-4">
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
