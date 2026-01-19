// app/src/components/points/WelcomePopup.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserPoints } from '@/hooks/useUserPoints';

interface WelcomePopupProps {
  onClose: () => void;
}

export function WelcomePopup({ onClose }: WelcomePopupProps) {
  const router = useRouter();
  const { claimWelcomeBonus } = useUserPoints();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minuti in secondi

  // Timer countdown (fake urgency)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Animate points counter
  useEffect(() => {
    if (claimed) {
      const duration = 1500; // 1.5 seconds
      const steps = 50;
      const increment = 1000 / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= 1000) {
          setAnimatedPoints(1000);
          clearInterval(timer);
        } else {
          setAnimatedPoints(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [claimed]);

  const handleClaim = async () => {
    setClaiming(true);
    const result = await claimWelcomeBonus();

    if (result.success) {
      setClaimed(true);
    } else {
      console.error('Failed to claim:', result.error);
      // Se già claimed, mostra comunque il successo
      if (result.error === 'already_claimed') {
        setClaimed(true);
      }
    }
    setClaiming(false);
  };

  const handleStartBattle = () => {
    onClose();
    router.push('/battlestart');
  };

  const handleHowItWorks = () => {
    onClose();
    router.push('/points');
  };

  // FASE 1: Claim bonus
  if (!claimed) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="relative bg-gradient-to-br from-[#1a1f2e] to-[#0f1419] border border-white/30 rounded-2xl p-5 lg:p-8 w-full max-w-xs lg:max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 lg:top-4 lg:right-4 w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold rounded-full transition-colors text-lg lg:text-xl"
          >
            ✕
          </button>

          {/* Welcome Text */}
          <h2 className="text-center text-orange-400 font-bold text-lg lg:text-2xl mb-2 lg:mb-4">
            WELCOME TO BATTLECOIN MARKET!
          </h2>

          {/* Logo */}
          <div className="w-14 h-14 lg:w-20 lg:h-20 mx-auto mb-3 lg:mb-4">
            <img
              src="/BONK-LOGO.svg"
              alt="BATTLECOIN MARKET"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Main Image - Large */}
          <div className="mb-3 lg:mb-5">
            <img
              src="/2-tag.png"
              alt="Tagline"
              className="w-full h-auto rounded-lg"
            />
          </div>

          {/* Claim 1000 Text */}
          <div className="text-center mb-3 lg:mb-5">
            <div className="text-2xl lg:text-3xl font-black text-yellow-400">
              CLAIM +1,000 POINTS
            </div>
          </div>

          {/* Claim Button - Compact, light orange */}
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="mx-auto block bg-orange-300 hover:bg-orange-200 disabled:opacity-50 text-black font-bold py-2 lg:py-3 px-6 lg:px-8 rounded-lg text-sm lg:text-base transition-all"
          >
            {claiming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin w-4 h-4 lg:w-5 lg:h-5 border-2 border-black/30 border-t-black rounded-full" />
                Claiming...
              </span>
            ) : (
              'Claim Bonus'
            )}
          </button>
        </div>
      </div>
    );
  }

  // FASE 2: Congratulazioni + Start Battle
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="relative bg-gradient-to-br from-[#1a1f2e] to-[#0f1419] border border-white/30 rounded-2xl p-5 w-full max-w-xs shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors text-lg"
        >
          X
        </button>

        {/* Header with Logo */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto mb-3">
            <img
              src="/BONK-LOGO.svg"
              alt="BATTLECOIN MARKET"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-lg font-bold text-white">
            CONGRATULATIONS!
          </h2>
          <p className="text-xs text-gray-400">Here are your welcome points</p>
        </div>

        {/* Points Counter Animation */}
        <div className="bg-black/40 border border-green-500/40 rounded-lg p-3 mb-3 text-center">
          <div className="text-3xl font-black text-green-400 mb-1">
            +{animatedPoints.toLocaleString()}
          </div>
          <div className="text-sm text-green-400/80">POINTS ADDED!</div>
        </div>

        {/* Start Battle CTA */}
        <div className="text-center mb-3">
          <p className="text-xs text-gray-300 mb-3">Start battling to earn more points!</p>
          <button
            onClick={handleStartBattle}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Battle
          </button>
        </div>

        {/* How Points Work Link */}
        <div className="text-center">
          <button
            onClick={handleHowItWorks}
            className="text-cyan-400 hover:text-cyan-300 text-xs underline transition-colors"
          >
            How do points work?
          </button>
        </div>
      </div>
    </div>
  );
}
