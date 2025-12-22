// app/src/providers/NotificationsProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    data: Record<string, unknown> | null;
    token_launch_id?: string | null;
}

interface NotificationsContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
    const { publicKey } = useWallet();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Ref to prevent multiple markAllAsRead calls
    const markAllCalledRef = useRef(false);

    const fetchNotifications = useCallback(async () => {
        if (!publicKey) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        setLoading(true);

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_wallet', publicKey.toString())
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Failed to fetch notifications:', error);
            setLoading(false);
            return;
        }

        if (data) {
            const mapped = data.map((n: any) => ({
                ...n,
                token_launch_id: n.data?.token_mint || n.data?.token_launch_id || null
            }));
            setNotifications(mapped);
            setUnreadCount(mapped.filter((n: Notification) => !n.read).length);
        }

        setLoading(false);
    }, [publicKey]);

    useEffect(() => {
        if (!publicKey) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        // Reset the markAll flag when wallet changes
        markAllCalledRef.current = false;

        fetchNotifications();

        // Real-time subscription
        const channel = supabase
            .channel(`notifications-${publicKey.toString()}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_wallet=eq.${publicKey.toString()}`,
                },
                (payload) => {
                    const newNotif = payload.new as any;
                    const mapped: Notification = {
                        ...newNotif,
                        token_launch_id: newNotif.data?.token_mint || newNotif.data?.token_launch_id || null
                    };
                    setNotifications((prev) => [mapped, ...prev]);
                    setUnreadCount((prev) => prev + 1);

                    // Reset flag so markAll can be called again
                    markAllCalledRef.current = false;

                    playNotificationSound();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [publicKey, fetchNotifications]);

    const markAsRead = useCallback(async (id: string) => {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
    }, []);

    const markAllAsRead = useCallback(async () => {
        if (!publicKey) return;

        // Prevent multiple calls
        if (markAllCalledRef.current) {
            console.log('markAllAsRead already called, skipping...');
            return;
        }

        markAllCalledRef.current = true;
        console.log('Marking all notifications as read...');

        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_wallet', publicKey.toString())
            .eq('read', false);

        if (error) {
            console.error('Failed to mark all as read:', error);
            markAllCalledRef.current = false;
            return;
        }

        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        console.log('All notifications marked as read');
    }, [publicKey]);

    return (
        <NotificationsContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                markAsRead,
                markAllAsRead,
                refresh: fetchNotifications,
            }}
        >
            {children}
        </NotificationsContext.Provider>
    );
}

// Hook to use notifications context
export function useNotifications() {
    const context = useContext(NotificationsContext);

    // If used outside provider, return empty state (for SSR safety)
    if (!context) {
        return {
            notifications: [],
            unreadCount: 0,
            loading: false,
            markAsRead: async () => {},
            markAllAsRead: async () => {},
            refresh: async () => {},
        };
    }

    return context;
}

function playNotificationSound() {
    try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch {}
}
