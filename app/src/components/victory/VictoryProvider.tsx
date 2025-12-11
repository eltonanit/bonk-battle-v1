'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
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

declare global {
  interface Window {
    __triggerVictory?: (data: VictoryData) => void;
  }
}

export function VictoryProvider({ children, userWallet }: VictoryProviderProps) {
  const router = useRouter();

  const walletRef = useRef<string | null>(userWallet);
  const processedVictoriesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    walletRef.current = userWallet;
  }, [userWallet]);

  const [showVictoryPopup, setShowVictoryPopup] = useState(false);
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [victoryData, setVictoryData] = useState<VictoryData | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    console.log('🏆 VictoryProvider: Mounted, wallet =', userWallet);
  }, []);

  // ⭐ Stable triggerVictory function
  const triggerVictory = useRef((data: VictoryData) => {
    const currentWallet = walletRef.current;

    // Debounce: ignore if same mint was processed in last 2 seconds
    const recentKey = `${data.mint}-${currentWallet}`;
    if (processedVictoriesRef.current.has(recentKey)) {
      console.log('⚠️ Victory already processed recently, skipping');
      return;
    }

    console.log('🎉 triggerVictory called:', data.symbol);

    // Mark as processed for 2 seconds
    processedVictoriesRef.current.add(recentKey);
    setTimeout(() => {
      processedVictoriesRef.current.delete(recentKey);
    }, 2000);

    setVictoryData(data);
    setShowVictoryPopup(true);

    if (currentWallet) {
      // Award points via API only - API creates notification automatically
      (async () => {
        console.log('💰 Awarding points to:', currentWallet);

        try {
          const response = await fetch('/api/points/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: currentWallet,
              action: 'win_battle',
              tokenMint: data.mint,
              tokenSymbol: data.symbol,
              tokenImage: data.image
            })
          });

          const result = await response.json();
          console.log(result.success ? '✅ Points awarded:' : '❌ Points failed:', result);

          // ⭐ NO MORE DIRECT INSERT - API already creates notification!

        } catch (err) {
          console.error('❌ Error:', err);
        }
      })();
    }
  }).current;

  // Expose to window once
  useEffect(() => {
    window.__triggerVictory = triggerVictory;
    console.log('🧪 TEST: window.__triggerVictory ready');
    return () => { delete window.__triggerVictory; };
  }, []);

  const handleVictoryClose = useCallback(() => {
    setShowVictoryPopup(false);
    setTimeout(() => setShowPointsPopup(true), 300);
  }, []);

  const handleViewToken = useCallback(() => {
    setShowVictoryPopup(false);
    setTimeout(() => setShowPointsPopup(true), 300);
  }, []);

  const handlePointsClose = useCallback(() => {
    setShowPointsPopup(false);
    setUnreadCount(prev => prev + 1);
    if (victoryData) {
      router.push(`/token/${victoryData.mint}`);
    }
  }, [victoryData, router]);

  const addNotification = useCallback(() => setUnreadCount(prev => prev + 1), []);
  const clearNotifications = useCallback(() => setUnreadCount(0), []);

  // Subscribe to victory events
  useEffect(() => {
    if (!userWallet) return;

    console.log('🎯 Subscribing to victories for', userWallet);

    const channel = supabase
      .channel('victory-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
        filter: 'action_type=eq.victory',
      }, async (payload) => {
        const activity = payload.new as any;
        if (activity.wallet === userWallet) {
          const { data: tokenData } = await supabase
            .from('tokens')
            .select('mint, symbol, name, image, raydium_pool_id, raydium_url')
            .eq('mint', activity.token_mint)
            .single();

          if (tokenData) {
            triggerVictory({
              mint: tokenData.mint,
              symbol: tokenData.symbol,
              name: tokenData.name,
              image: tokenData.image,
              poolId: tokenData.raydium_pool_id || activity.metadata?.pool_id,
              raydiumUrl: tokenData.raydium_url,
              loserSymbol: activity.metadata?.loser_symbol,
              creatorWallet: userWallet,
            });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userWallet]);

  return (
    <VictoryContext.Provider value={{ triggerVictory, addNotification, unreadCount, clearNotifications }}>
      {children}
      {victoryData && (
        <VictoryPopup
          isOpen={showVictoryPopup}
          onClose={handleVictoryClose}
          onViewToken={handleViewToken}
          tokenData={victoryData}
        />
      )}
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