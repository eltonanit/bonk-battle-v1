// app/src/components/armies/ArmyPreviewModal.tsx
'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useJoinArmy, Army } from '@/hooks/useArmies';
import Image from 'next/image';

interface ArmyPreviewModalProps {
  army: Army | null;
  isOpen: boolean;
  onClose: () => void;
  onJoinSuccess?: () => void;
}

// Genera ticker automatico
const getTicker = (name: string) => {
  return name.replace(/\s/g, '').substring(0, 5).toUpperCase();
};

export function ArmyPreviewModal({ army, isOpen, onClose, onJoinSuccess }: ArmyPreviewModalProps) {
  const { publicKey } = useWallet();
  const joinArmy = useJoinArmy();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !army) return null;

  const ticker = army.ticker || getTicker(army.name);
  const inviteLink = `bonkbattle.lol/join/${army.invite_code || ticker.toLowerCase()}`;

  const formatMemberCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(2)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(2)}K`;
    return count.toString();
  };

  const handleJoin = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      await joinArmy.mutateAsync({
        armyId: army.id,
        wallet_address: publicKey.toString(),
      });

      onJoinSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to join army');
    } finally {
      setIsJoining(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`https://${inviteLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm">

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute -top-12 left-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Card */}
          <div
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ backgroundColor: '#1a1a1b' }}
          >
            <div className="p-5 flex flex-col items-center">

              {/* Army Image */}
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-4xl mb-3 shadow-xl">
                {army.image_url ? (
                  <Image
                    src={army.image_url}
                    alt={army.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{army.icon || '⚔️'}</span>
                )}
              </div>

              {/* Ticker + Level Badge */}
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 bg-green-500 rounded-lg">
                  <span className="font-black text-black text-xs tracking-wider">{ticker}</span>
                </div>
                {army.level !== undefined && army.level > 0 && (
                  <span className="text-white font-bold text-sm">Lv.{army.level}</span>
                )}
              </div>

              {/* Army Name */}
              <h2 className="text-xl font-bold text-white text-center mb-1">
                {army.name}
              </h2>

              {/* Description */}
              {army.description && (
                <p className="text-gray-400 text-xs text-center mb-3 px-2 line-clamp-2">
                  {army.description}
                </p>
              )}

              {/* Stats + Level in one row */}
              <div className="flex items-center gap-4 text-gray-400 mb-3">
                <div className="flex items-center gap-1.5">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-white font-bold text-base">{formatMemberCount(army.member_count)}</span>
                  <span className="text-sm">trenchers</span>
                </div>
                {(army.total_wins !== undefined && army.total_wins > 0) && (
                  <div className="flex items-center gap-1">
                    <span>🏆</span>
                    <span className="text-white font-bold">{army.total_wins}</span>
                  </div>
                )}
              </div>

              {/* Invite Link */}
              <button
                onClick={copyInviteLink}
                className={`w-full py-2 rounded-lg border transition-colors mb-3 ${copied ? 'bg-green-500/20 border-green-500/50' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  {copied ? (
                    <>
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs text-green-500 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-gray-400">🔗</span>
                      <span className="text-xs text-gray-400">{inviteLink}</span>
                    </>
                  )}
                </div>
              </button>

              {/* Error Message */}
              {error && (
                <div className="w-full mb-3 p-2 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-xs text-center">
                  {error}
                </div>
              )}

              {/* Wallet Warning */}
              {!publicKey && (
                <div className="w-full mb-3 p-2 bg-yellow-900/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-xs text-center">
                  Connect wallet to join
                </div>
              )}

              {/* JOIN Button */}
              <button
                onClick={handleJoin}
                disabled={isJoining || !publicKey}
                className="w-full py-3 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-black text-base uppercase tracking-wider rounded-xl transition-all disabled:cursor-not-allowed"
              >
                {isJoining ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    JOINING...
                  </span>
                ) : (
                  'JOIN ARMY'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
