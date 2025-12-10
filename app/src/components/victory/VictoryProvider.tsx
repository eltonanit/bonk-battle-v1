'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { VictoryPopup } from './VictoryPopup';
import { PointsPopup } from './PointsPopup';

interface VictoryData {
  mint: string;
  symbol: string;
  name: string;
  image: string | null;
  poolId: string;
  raydiumUrl?: string;
  loserSymbol?: string;
  creatorWallet?: string;
}

interface VictoryContextType {
  triggerVictory: (data: VictoryData) => void;
  addNotification: () => void;
  unreadCount: number;
  clearNotifications: () => void;
}

const VictoryContext = createContext<VictoryContextType | null>(null);

export function useVictory() {
  const context = useContext(VictoryContext);
  if (!context) {
    throw new Error('useVictory must be used within VictoryProvider');
  }
  return context;
}

interface VictoryProviderProps {
  children: ReactNode;
  userWallet: string | null;
}

// Extend window for test mode
declare global {
  interface Window {
    __triggerVictory?: (data: VictoryData) => void;
  }
}

export function VictoryProvider({ children, userWallet }: VictoryProviderProps) {
  const router = useRouter();

  // Popup states
  const [showVictoryPopup, setShowVictoryPopup] = useState(false);
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [victoryData, setVictoryData] = useState<VictoryData | null>(null);

  // Notifications
  const [unreadCount, setUnreadCount] = useState(0);

  // ⭐ Log on mount
  useEffect(() => {
    console.log('🏆 VictoryProvider: Mounted');
    console.log('🏆 VictoryProvider: User wallet =', userWallet);
  }, [userWallet]);

  // Handle victory event
  const triggerVictory = useCallback((data: VictoryData) => {
    console.log('🎉 VictoryProvider: triggerVictory called with:', data);
    setVictoryData(data);
    setShowVictoryPopup(true);
  }, []);

  // ⭐ TEST MODE - Expose triggerVictory to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__triggerVictory = triggerVictory;
      console.log('🧪 TEST MODE: Use window.__triggerVictory({mint, symbol, name, image, poolId, loserSymbol}) to test');
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__triggerVictory;
      }
    };
  }, [triggerVictory]);

  // Close victory popup → show points popup
  const handleVictoryClose = useCallback(() => {
    console.log('🏆 VictoryProvider: Victory popup closed');
    setShowVictoryPopup(false);
    setTimeout(() => {
      setShowPointsPopup(true);
    }, 300);
  }, []);

  // View token from victory popup
  const handleViewToken = useCallback(() => {
    console.log('🏆 VictoryProvider: View token clicked');
    setShowVictoryPopup(false);
    setTimeout(() => {
      setShowPointsPopup(true);
    }, 300);
  }, []);

  // Close points popup → redirect to token page
  const handlePointsClose = useCallback(() => {
    console.log('🏆 VictoryProvider: Points popup closed');
    setShowPointsPopup(false);
    setUnreadCount(prev => prev + 1);
    if (victoryData) {
      router.push(`/token/${victoryData.mint}`);
    }
  }, [victoryData, router]);

  // Notification helpers
  const addNotification = useCallback(() => {
    setUnreadCount(prev => prev + 1);
  }, []);

  const clearNotifications = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Subscribe to activity_feed for victory events
  useEffect(() => {
    if (!userWallet) {
      console.log('🏆 VictoryProvider: No wallet connected, skipping subscription');
      return;
    }

    console.log('🎯 VictoryProvider: Subscribing to victory events for', userWallet);

    const channel = supabase
      .channel('victory-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
          filter: 'action_type=eq.victory',
        },
        async (payload) => {
          console.log('🎉 Victory event received from Supabase:', payload);

          const activity = payload.new as any;

          // Check if this victory is for the current user's token
          if (activity.wallet === userWallet) {
            console.log('🎉 This victory is for the current user!');

            // Fetch full token data
            const { data: tokenData } = await supabase
              .from('tokens')
              .select('mint, symbol, name, image, raydium_pool_id, raydium_url')
              .eq('mint', activity.token_mint)
              .single();

            if (tokenData) {
              console.log('🎉 Token data fetched:', tokenData);
              triggerVictory({
                mint: tokenData.mint,
                symbol: tokenData.symbol,
                name: tokenData.name,
                image: tokenData.image,
                poolId: tokenData.raydium_pool_id || activity.metadata?.pool_id,
                raydiumUrl: tokenData.raydium_url || activity.metadata?.raydium_url,
                loserSymbol: activity.metadata?.loser_symbol,
                creatorWallet: userWallet,
              });
            }
          } else {
            console.log('🎉 Victory is for another user:', activity.wallet);
          }
        }
      )
      .subscribe((status) => {
        console.log('🎯 VictoryProvider: Subscription status:', status);
      });

    return () => {
      console.log('🎯 VictoryProvider: Unsubscribing from victory events');
      supabase.removeChannel(channel);
    };
  }, [userWallet, triggerVictory]);

  return (
    <VictoryContext.Provider value={{ triggerVictory, addNotification, unreadCount, clearNotifications }}>
      {children}

      {/* Victory Popup */}
      {victoryData && (
        <VictoryPopup
          isOpen={showVictoryPopup}
          onClose={handleVictoryClose}
          onViewToken={handleViewToken}
          tokenData={victoryData}
        />
      )}

      {/* Points Popup */}
      {victoryData && (
        <PointsPopup
          isOpen={showPointsPopup}
          onClose={handlePointsClose}
          points={10000}
          tokenSymbol={victoryData.symbol}
          tokenMint={victoryData.mint}
        />
      )}
    </VictoryContext.Provider>
  );
}