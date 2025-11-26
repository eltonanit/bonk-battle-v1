// app/src/components/points/WelcomePopupProvider.tsx
'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WelcomePopup } from './WelcomePopup';
import { useUserPoints } from '@/hooks/useUserPoints';

export function WelcomePopupProvider({ children }: { children: React.ReactNode }) {
  const { connected, publicKey } = useWallet();
  const { points, loading } = useUserPoints();
  const [showPopup, setShowPopup] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Solo dopo che loading è finito e wallet connesso
    if (!loading && connected && publicKey && points && !hasChecked) {
      setHasChecked(true);

      // Mostra popup solo se NON ha ancora claimed il bonus
      if (!points.welcomeBonusClaimed) {
        // Piccolo delay per UX migliore
        setTimeout(() => {
          setShowPopup(true);
        }, 500);
      }
    }
  }, [loading, connected, publicKey, points, hasChecked]);

  // Reset check quando wallet cambia
  useEffect(() => {
    setHasChecked(false);
  }, [publicKey?.toString()]);

  return (
    <>
      {children}
      {showPopup && (
        <WelcomePopup onClose={() => setShowPopup(false)} />
      )}
    </>
  );
}
