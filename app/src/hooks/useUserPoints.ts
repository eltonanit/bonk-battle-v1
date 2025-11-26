// app/src/hooks/useUserPoints.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';

interface UserPoints {
  totalPoints: number;
  tier: string;
  winsCount: number;
  welcomeBonusClaimed: boolean;
  rank: number | null;
  referralCode: string | null;
}

interface UseUserPointsResult {
  points: UserPoints | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  claimWelcomeBonus: () => Promise<{ success: boolean; points?: number; error?: string }>;
}

// Tier emoji mapping
export const TIER_EMOJI: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎',
  legend: '👑'
};

// Tier thresholds
export const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 5000,
  gold: 25000,
  diamond: 100000,
  legend: 500000
};

export function useUserPoints(): UseUserPointsResult {
  const { publicKey, connected } = useWallet();
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const wallet = publicKey?.toString();

  // Fetch user points from Supabase
  const fetchPoints = useCallback(async () => {
    if (!wallet) {
      setPoints(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch user points - usa maybeSingle() invece di single()
      const { data: userData, error: userError } = await supabase
        .from('user_points')
        .select('*')
        .eq('wallet_address', wallet)
        .maybeSingle(); // ⭐ FIX: maybeSingle() non dà errore se non trova righe

      if (userError) {
        console.error('❌ Error fetching user_points:', userError);
        throw userError;
      }

      // Fetch rank from leaderboard view
      let rank: number | null = null;
      if (userData) {
        const { data: rankData } = await supabase
          .from('points_leaderboard')
          .select('rank')
          .eq('wallet_address', wallet)
          .maybeSingle();

        rank = rankData?.rank || null;
      }

      if (userData) {
        setPoints({
          totalPoints: userData.total_points || 0,
          tier: userData.tier || 'bronze',
          winsCount: userData.wins_count || 0,
          welcomeBonusClaimed: userData.welcome_bonus_claimed || false,
          rank,
          referralCode: userData.referral_code || null
        });
      } else {
        // New user - no points yet, popup should show
        setPoints({
          totalPoints: 0,
          tier: 'bronze',
          winsCount: 0,
          welcomeBonusClaimed: false,
          rank: null,
          referralCode: null
        });
      }
    } catch (err) {
      console.error('❌ Error fetching user points:', err);
      setError(err as Error);
      // Set default state even on error so popup can show
      setPoints({
        totalPoints: 0,
        tier: 'bronze',
        winsCount: 0,
        welcomeBonusClaimed: false,
        rank: null,
        referralCode: null
      });
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  // Claim welcome bonus
  const claimWelcomeBonus = useCallback(async (): Promise<{ success: boolean; points?: number; error?: string }> => {
    if (!wallet) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const response = await fetch('/api/points/claim-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet })
      });

      const data = await response.json();

      if (data.success) {
        // Refetch points after claiming
        await fetchPoints();
        return { success: true, points: data.points };
      } else {
        return { success: false, error: data.error };
      }
    } catch (err) {
      console.error('❌ Error claiming welcome bonus:', err);
      return { success: false, error: 'Failed to claim bonus' };
    }
  }, [wallet, fetchPoints]);

  // Fetch on mount and when wallet changes
  useEffect(() => {
    if (wallet) {
      fetchPoints();
    } else {
      setPoints(null);
      setLoading(false);
    }
  }, [wallet, fetchPoints]);

  return {
    points,
    loading,
    error,
    refetch: fetchPoints,
    claimWelcomeBonus
  };
}