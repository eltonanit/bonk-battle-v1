'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  wallet: string;
  username: string | null;
  avatar_url: string | null;
  followers_count: number;
  is_following: boolean;
}

interface ActivityItem {
  id: string;
  wallet: string;
  action_type: string;
  token_mint: string | null;
  token_symbol: string | null;
  token_image: string | null;
  opponent_mint: string | null;
  opponent_symbol: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface UseFollowersResult {
  suggestedUsers: UserProfile[];
  loadingSuggested: boolean;
  currentPage: number;
  totalPages: number;
  loadPage: (page: number) => Promise<void>;
  feed: ActivityItem[];
  loadingFeed: boolean;
  refreshFeed: () => Promise<void>;
  followUser: (targetWallet: string) => Promise<boolean>;
  unfollowUser: (targetWallet: string) => Promise<boolean>;
  followersCount: number;
  followingCount: number;
  refreshCounts: () => Promise<void>;
  feedUnreadCount: number;
  markFeedAsRead: () => void;
}

const USERS_PER_PAGE = 10;

export function useFollowers(): UseFollowersResult {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toString();

  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [feedUnreadCount, setFeedUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string | null>(null);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Load suggested users (paginated)
  const loadPage = useCallback(async (page: number) => {
    if (!wallet) return;

    setLoadingSuggested(true);
    try {
      const offset = (page - 1) * USERS_PER_PAGE;

      const { data: users, error } = await supabase.rpc('get_suggested_users', {
        p_wallet: wallet,
        p_limit: USERS_PER_PAGE,
        p_offset: offset
      });

      if (error) {
        console.error('❌ Error loading suggested users:', error);
        return;
      }

      const { data: countData } = await supabase.rpc('get_users_count', {
        p_wallet: wallet
      });

      const totalCount = countData || 0;
      setTotalPages(Math.max(1, Math.ceil(totalCount / USERS_PER_PAGE)));
      setSuggestedUsers(users || []);
      setCurrentPage(page);

    } catch (err) {
      console.error('❌ Error in loadPage:', err);
    } finally {
      setLoadingSuggested(false);
    }
  }, [wallet]);

  // Load feed from following - includes ALL historical activities
  const refreshFeed = useCallback(async () => {
    if (!wallet) return;

    setLoadingFeed(true);
    try {
      // Try the new RPC that returns ALL historical activities
      let feedData: ActivityItem[] = [];

      const { data, error } = await supabase.rpc('get_following_feed_all', {
        p_wallet: wallet,
        p_limit: 50
      });

      if (error) {
        // Fallback to old RPC if new one doesn't exist yet
        console.log('Trying fallback feed RPC...');
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_following_feed', {
          p_wallet: wallet,
          p_limit: 50
        });

        if (fallbackError) {
          console.error('❌ Error loading feed:', fallbackError);
          return;
        }
        feedData = fallbackData || [];
      } else {
        feedData = data || [];
      }

      setFeed(feedData);

      // Calculate unread count based on last read timestamp
      const storedTimestamp = localStorage.getItem(`feed_last_read_${wallet}`);
      setLastReadTimestamp(storedTimestamp);

      if (storedTimestamp && feedData.length > 0) {
        const unreadItems = feedData.filter(item =>
          new Date(item.created_at) > new Date(storedTimestamp)
        );
        setFeedUnreadCount(unreadItems.length);
      } else if (!storedTimestamp && feedData.length > 0) {
        // First time - all items are "new"
        setFeedUnreadCount(feedData.length);
      }
    } catch (err) {
      console.error('❌ Error in refreshFeed:', err);
    } finally {
      setLoadingFeed(false);
    }
  }, [wallet]);

  // Refresh follower/following counts
  const refreshCounts = useCallback(async () => {
    if (!wallet) return;

    try {
      const { data, error } = await supabase.rpc('get_follow_counts', {
        p_wallet: wallet
      });

      if (!error && data && data.length > 0) {
        setFollowersCount(Number(data[0].followers_count) || 0);
        setFollowingCount(Number(data[0].following_count) || 0);
      }
    } catch (err) {
      console.error('❌ Error getting counts:', err);
    }
  }, [wallet]);

  // Follow user
  const followUser = useCallback(async (targetWallet: string): Promise<boolean> => {
    if (!wallet) return false;

    try {
      const response = await fetch('/api/user/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerWallet: wallet,
          followingWallet: targetWallet,
          action: 'follow'
        })
      });

      const data = await response.json();

      if (data.success) {
        // Remove user from suggested list (they are now followed)
        setSuggestedUsers(prev => prev.filter(u => u.wallet !== targetWallet));
        setFollowingCount(prev => prev + 1);
        return true;
      }
      return false;
    } catch (err) {
      console.error('❌ Error following user:', err);
      return false;
    }
  }, [wallet]);

  // Unfollow user
  const unfollowUser = useCallback(async (targetWallet: string): Promise<boolean> => {
    if (!wallet) return false;

    try {
      const response = await fetch('/api/user/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerWallet: wallet,
          followingWallet: targetWallet,
          action: 'unfollow'
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuggestedUsers(prev =>
          prev.map(u =>
            u.wallet === targetWallet
              ? { ...u, is_following: false, followers_count: Math.max(0, u.followers_count - 1) }
              : u
          )
        );
        setFollowingCount(prev => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (err) {
      console.error('❌ Error unfollowing user:', err);
      return false;
    }
  }, [wallet]);

  // Mark feed as read - stores current timestamp
  const markFeedAsRead = useCallback(() => {
    if (!wallet) return;
    const now = new Date().toISOString();
    localStorage.setItem(`feed_last_read_${wallet}`, now);
    setLastReadTimestamp(now);
    setFeedUnreadCount(0);
  }, [wallet]);

  // Initial load
  useEffect(() => {
    if (wallet) {
      loadPage(1);
      refreshFeed();
      refreshCounts();
    }
  }, [wallet, loadPage, refreshFeed, refreshCounts]);

  return {
    suggestedUsers,
    loadingSuggested,
    currentPage,
    totalPages,
    loadPage,
    feed,
    loadingFeed,
    refreshFeed,
    followUser,
    unfollowUser,
    followersCount,
    followingCount,
    refreshCounts,
    feedUnreadCount,
    markFeedAsRead
  };
}

// Helper: Format wallet address
export function formatWallet(wallet: string): string {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

// Helper: Format time ago
export function formatTimeAgo(timestamp: string | null | undefined): string {
  if (!timestamp) return 'just now';

  try {
    const now = new Date();

    // Try multiple formats
    let then: Date;

    // If it's already a valid ISO string with timezone
    if (timestamp.includes('T') || timestamp.includes('Z')) {
      then = new Date(timestamp.endsWith('Z') ? timestamp : timestamp + 'Z');
    } else if (timestamp.includes('-') && timestamp.length >= 10) {
      // Format like "2025-01-15" or "2025-01-15 14:30:00"
      then = new Date(timestamp.replace(' ', 'T') + 'Z');
    } else {
      // Try as-is
      then = new Date(timestamp);
    }

    // Check if date is valid
    if (isNaN(then.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'just now';
    }

    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    // Handle future dates (clock sync issues)
    if (seconds < 0) return 'just now';

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    // More than a week - show actual date
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: now.getFullYear() !== then.getFullYear() ? 'numeric' : undefined
    };
    return then.toLocaleDateString('en-US', options);
  } catch (err) {
    console.warn('Error parsing timestamp:', timestamp, err);
    return 'just now';
  }
}
