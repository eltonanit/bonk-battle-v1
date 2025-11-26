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
    data: Record<string, unknown> | null; // ⭐ FIX: era "metadata", nel DB è "data"
    token_launch_id?: string | null; // ⭐ FIX: opzionale, preso da data
}

export function useNotifications() {
    const { publicKey } = useWallet();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

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
            console.error('❌ Failed to fetch notifications:', error);
            setLoading(false);
            return;
        }

        if (data) {
            // ⭐ Map data to include token_launch_id from data field if present
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
            .eq('user_wallet', publicKey.toString())
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
            // Ignore audio play errors
        });
    } catch {
        // Ignore audio initialization errors
    }
}