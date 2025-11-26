'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
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
}

export default function NotificationsPage() {
    const router = useRouter();
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

    function handleNotificationClick(notification: Notification) {
        markAsRead(notification.id);

        // Navigate to token page
        if (notification.token_launch_id &&
            notification.token_launch_id !== 'TEST_TOKEN' &&
            notification.token_launch_id !== 'TEST') {
            router.push(`/token/${notification.token_launch_id}`);
        }
    }

    return (
        <div className="min-h-screen bg-bonk-dark text-white">
            {/* Desktop Header */}
            <DesktopHeader />

            {/* Mobile Header */}
            <Header />

            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            {/* ⭐ MODIFICATO: Aggiunto pt-32 mobile per header a 2 righe + FOMOTicker */}
            <div className="pt-32 lg:pt-0 lg:ml-56 lg:mt-16">
                {/* ⭐ FOMOTicker visibile SOLO su mobile */}
                <div className="lg:hidden">
                    <FOMOTicker />
                </div>

                {/* Content Container */}
                <div className="max-w-[1200px] pl-8 pr-5 py-8">

                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">Notifications</h1>
                                <p className="text-gray-400">Stay updated with your tokens</p>
                            </div>

                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    Mark all as read
                                </button>
                            )}

                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                                <p className="text-gray-400">Loading notifications...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🔔</div>
                                <h2 className="text-2xl font-semibold mb-2">No notifications yet</h2>
                                <p className="text-gray-400">{`We'll notify you when something happens!`}</p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                // Special styling for points notifications
                                const isPointsNotif = notif.type === 'points';
                                // Clean title: remove emoji prefix for points
                                const cleanTitle = isPointsNotif
                                    ? notif.title.replace(/^🎉\s*/, '')
                                    : notif.title;

                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`
                                            rounded-xl border cursor-pointer transition-all
                                            hover:border-white/30 hover:shadow-lg
                                            ${isPointsNotif
                                                ? 'bg-gradient-to-r from-orange-600/90 to-orange-500/80 border-orange-400/50'
                                                : !notif.read
                                                    ? 'bg-gradient-to-r from-emerald-950/40 to-emerald-900/20 border-emerald-500/30'
                                                    : 'bg-white/5 border-white/10'
                                            }
                                        `}
                                    >
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    {/* Title with logo for points */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {isPointsNotif && (
                                                            <div className="w-5 h-5 flex-shrink-0">
                                                                <Image
                                                                    src="/BONK-LOGO.svg"
                                                                    alt="BONK"
                                                                    width={20}
                                                                    height={20}
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            </div>
                                                        )}
                                                        <span className={`font-bold text-lg ${isPointsNotif ? 'text-white' : ''}`}>
                                                            {cleanTitle}
                                                        </span>
                                                        <span className="text-xs text-white/70">
                                                            {formatTimeAgo(notif.created_at)}
                                                        </span>
                                                        {!notif.read && !isPointsNotif && (
                                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                                        )}
                                                    </div>

                                                    {/* Message */}
                                                    <div className={`text-sm whitespace-pre-line ${isPointsNotif ? 'text-white/90' : 'text-gray-300'}`}>
                                                        {notif.message}
                                                    </div>

                                                    {/* Footer - only show for non-points notifications */}
                                                    {!isPointsNotif && (
                                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-3">
                                                            <span>{formatTimeAgo(notif.created_at)}</span>
                                                            {notif.token_launch_id && notif.token_launch_id !== 'TEST' && notif.token_launch_id !== 'TEST_TOKEN' && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-blue-400 hover:text-blue-300">
                                                                        View token →
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Status Indicator - green dot for unread non-points */}
                                                {!notif.read && !isPointsNotif && (
                                                    <div className="flex-shrink-0">
                                                        <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Nav */}
            <MobileBottomNav />
        </div>
    );
}

function formatTimeAgo(timestamp: string): string {
    const now = new Date();
    // ⭐ FIX: Forza parsing UTC aggiungendo 'Z' se mancante
    const timestampUTC = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    const then = new Date(timestampUTC);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return then.toLocaleDateString();
}