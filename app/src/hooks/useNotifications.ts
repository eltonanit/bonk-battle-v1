// app/src/hooks/useNotifications.ts
import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    token_launch_id: string;
    metadata: Record<string, unknown> | null;
}

export function useNotifications() {
    const { publicKey } = useWallet();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!publicKey) return;

        setLoading(true);

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('wallet_address', publicKey.toString())
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Failed to fetch notifications:', error);
        } else if (data) {
            setNotifications(data);
            setUnreadCount(data.filter((n) => !n.read).length);
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

        fetchNotifications();

        // Real-time subscription
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `wallet_address=eq.${publicKey.toString()}`,
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications((prev) => [newNotif, ...prev]);
                    setUnreadCount((prev) => prev + 1);

                    // Play sound
                    playNotificationSound();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [publicKey, fetchNotifications]);

    async function markAsRead(id: string) {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id);

        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    async function markAllAsRead() {
        if (!publicKey) return;

        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('wallet_address', publicKey.toString())
            .eq('read', false);

        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    }

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications,
    };
}

function playNotificationSound() {
    try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
            // Ignore audio play errors (user interaction required in some browsers)
        });
    } catch {
        // Ignore audio initialization errors
    }
} 