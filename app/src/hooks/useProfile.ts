'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface UserProfile {
  wallet: string;
  username: string | null;
  avatar_url: string | null;
}

interface UseProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { avatar?: File; username?: string }) => Promise<boolean>;
  isSaving: boolean;
}

export function useProfile(): UseProfileResult {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toString();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch profile
  const refreshProfile = useCallback(async () => {
    if (!wallet) {
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user/profile?wallet=${wallet}`);
      const data = await response.json();

      if (data.success && data.profile) {
        setProfile(data.profile);
      } else {
        setError(data.error || 'Failed to load profile');
      }
    } catch (err) {
      console.error('❌ Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  // Update profile (including avatar upload)
  const updateProfile = useCallback(async (data: {
    avatar?: File;
    username?: string;
  }): Promise<boolean> => {
    if (!wallet) return false;

    setIsSaving(true);
    setError(null);

    try {
      // If there's an avatar, upload it first
      let avatarUrl: string | undefined;

      if (data.avatar) {
        const formData = new FormData();
        formData.append('file', data.avatar);
        formData.append('wallet', wallet);

        const uploadResponse = await fetch('/api/user/profile/avatar', {
          method: 'POST',
          body: formData
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.success) {
          setError(uploadResult.error || 'Failed to upload avatar');
          return false;
        }

        avatarUrl = uploadResult.url;
      }

      // Update profile data
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet,
          username: data.username,
          avatar_url: avatarUrl
        })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh profile to get updated data
        await refreshProfile();
        return true;
      } else {
        setError(result.error || 'Failed to update profile');
        return false;
      }
    } catch (err) {
      console.error('❌ Error updating profile:', err);
      setError('Failed to update profile');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [wallet, refreshProfile]);

  // Auto-fetch profile when wallet connects
  useEffect(() => {
    if (wallet) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [wallet, refreshProfile]);

  return {
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile,
    isSaving
  };
}
