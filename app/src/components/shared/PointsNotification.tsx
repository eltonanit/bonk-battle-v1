'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface PointsNotificationProps {
  show: boolean;
  points: number;
  message: string;
  tokenImage?: string;
  onClose: () => void;
  autoCloseMs?: number;
}

// Plus icon component
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      className={className}
      fill="currentColor"
    >
      <path d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z"/>
    </svg>
  );
}

export function PointsNotification({
  show,
  points,
  message,
  tokenImage,
  onClose,
  autoCloseMs = 3000
}: PointsNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsLeaving(false);

      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => {
          setIsVisible(false);
          onClose();
        }, 300); // Animation duration
      }, autoCloseMs);

      return () => clearTimeout(timer);
    }
  }, [show, autoCloseMs, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ${
        isLeaving ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="bg-emerald-500 text-black px-4 py-3 flex items-center gap-3 shadow-lg shadow-emerald-500/30 min-w-[280px]">
        {/* Plus Icon */}
        <div className="w-8 h-8 bg-black/20 flex items-center justify-center flex-shrink-0">
          <PlusIcon className="w-5 h-5 text-black" />
        </div>

        {/* Points */}
        <div className="flex-1">
          <div className="font-bold text-lg">
            +{points.toLocaleString()} pts
          </div>
          <div className="text-black/70 text-sm">
            {message}
          </div>
        </div>

        {/* Token Image (if provided) */}
        {tokenImage && (
          <div className="w-10 h-10 overflow-hidden border-2 border-black/30 flex-shrink-0">
            <Image
              src={tokenImage}
              alt="Token"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Hook per usare le notifiche punti facilmente
export function usePointsNotification() {
  const [notification, setNotification] = useState<{
    show: boolean;
    points: number;
    message: string;
    tokenImage?: string;
  }>({
    show: false,
    points: 0,
    message: '',
    tokenImage: undefined
  });

  const showPointsNotification = (points: number, message: string, tokenImage?: string) => {
    setNotification({
      show: true,
      points,
      message,
      tokenImage
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  return {
    notification,
    showPointsNotification,
    hideNotification,
    PointsNotificationComponent: () => (
      <PointsNotification
        show={notification.show}
        points={notification.points}
        message={notification.message}
        tokenImage={notification.tokenImage}
        onClose={hideNotification}
      />
    )
  };
}
