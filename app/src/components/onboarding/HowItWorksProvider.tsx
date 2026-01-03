// app/src/components/onboarding/HowItWorksProvider.tsx
'use client';

import { useEffect, useState } from 'react';
import { HowItWorksModal } from './HowItWorksModal';

const STORAGE_KEY = 'bonkbattle_terms_accepted';

export function HowItWorksProvider({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if user has already accepted terms
    const hasAccepted = localStorage.getItem(STORAGE_KEY);

    if (!hasAccepted) {
      // Small delay for better UX
      setTimeout(() => {
        setShowModal(true);
      }, 300);
    }
  }, []);

  const handleAccept = () => {
    // Save acceptance to localStorage
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowModal(false);
  };

  // Don't render modal on server
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {showModal && <HowItWorksModal onAccept={handleAccept} />}
    </>
  );
}
