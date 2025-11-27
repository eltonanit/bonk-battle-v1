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

  // Load feed from following
  const refreshFeed = useCallback(async () => {
    if (!wallet) return;

    setLoadingFeed(true);
    try {
      const { data, error } = await supabase.rpc('get_following_feed', {
        p_wallet: wallet,
        p_limit: 50
      });

      if (error) {
        console.error('❌ Error loading feed:', error);
        return;
      }

      setFeed(data || []);
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
        setSuggestedUsers(prev =>
          prev.map(u =>
            u.wallet === targetWallet
              ? { ...u, is_following: true, followers_count: u.followers_count + 1 }
              : u
          )
        );
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
    refreshCounts
  };
}

// Helper: Format wallet address
export function formatWallet(wallet: string): string {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

// Helper: Format time ago
export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp.endsWith('Z') ? timestamp : timestamp + 'Z');
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}
