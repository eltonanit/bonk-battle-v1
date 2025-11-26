// app/src/components/shared/TransactionSuccessPopup.tsx
'use client';

import { useEffect, useState } from 'react';

interface TransactionSuccessPopupProps {
  show: boolean;
  message?: string;
  subMessage?: string;
  onClose: () => void;
  autoCloseMs?: number;
}

export function TransactionSuccessPopup({
  show,
  message = 'Transaction Successful',
  subMessage,
  onClose,
  autoCloseMs = 3000
}: TransactionSuccessPopupProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setExiting(false);

      // Auto-close after delay
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(() => {
          setVisible(false);
          onClose();
        }, 300); // Exit animation duration
      }, autoCloseMs);

      return () => clearTimeout(timer);
    }
  }, [show, autoCloseMs, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 pointer-events-none">
      <div
        className={`
          bg-gradient-to-r from-emerald-600 to-green-500
          text-white font-bold px-6 py-4 rounded-xl shadow-2xl
          flex items-center gap-3
          transform transition-all duration-300
          ${exiting ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}
        `}
      >
        {/* Checkmark Icon */}
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Message */}
        <div>
          <div className="text-lg">{message}</div>
          {subMessage && (
            <div className="text-sm text-white/80">{subMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
}
