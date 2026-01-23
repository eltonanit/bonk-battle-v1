'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface BattleReadyPopupProps {
  show: boolean;
  onClose: () => void;
  tokenImage: string;
  tokenSymbol: string;
  tokenMint: string;
}

// Plus icon SVG component
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      className={className}
      fill="currentColor"
    >
      <path d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z" />
    </svg>
  );
}

export function BattleReadyPopup({
  show,
  onClose,
  tokenImage,
  tokenSymbol,
  tokenMint
}: BattleReadyPopupProps) {
  const router = useRouter();

  if (!show) return null;

  const handleFindOpponent = () => {
    onClose();
    router.push('/battles?tab=qualified');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popup - Green border */}
      <div className="relative bg-[#1a1f2e] border-2 border-emerald-500 p-6 max-w-sm w-full mx-4 shadow-2xl shadow-emerald-500/20 animate-in zoom-in-95 duration-200">

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-white mb-2">
          Coin <span className="text-emerald-400">Ready to Battle!</span>
        </h2>

        <p className="text-gray-400 text-center text-sm mb-6">
          ${tokenSymbol} has qualified & is ready to fight
        </p>

        {/* Token Image - Bigger */}
        <div className="flex justify-center mb-6">
          <div className="w-32 h-32 overflow-hidden border-2 border-emerald-500 bg-gradient-to-br from-orange-500 to-red-600">
            {tokenImage ? (
              <Image
                src={tokenImage}
                alt={tokenSymbol}
                width={128}
                height={128}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white">
                {tokenSymbol?.slice(0, 2) || '??'}
              </div>
            )}
          </div>
        </div>

        {/* Find Opponent Button - Yellow */}
        <button
          onClick={handleFindOpponent}
          className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-lg transition-all flex items-center justify-center gap-2"
        >
          Find Opponent
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 mt-3 bg-[#2a3544] hover:bg-[#3a4554] text-gray-400 font-medium transition-all"
        >
          Later
        </button>
      </div>
    </div>
  );
}