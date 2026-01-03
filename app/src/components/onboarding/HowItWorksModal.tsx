// app/src/components/onboarding/HowItWorksModal.tsx
'use client';

interface HowItWorksModalProps {
  onAccept: () => void;
}

export function HowItWorksModal({ onAccept }: HowItWorksModalProps) {
  return (
    <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4">
      <div className="relative bg-[#0f1318] border-2 border-dashed border-white/40 rounded-2xl p-4 w-full max-w-sm animate-in fade-in zoom-in duration-300">

        {/* Header */}
        <h2 className="text-center text-white font-bold text-xl mb-2">
          How it works
        </h2>

        {/* Main Description */}
        <p className="text-white text-center text-sm leading-relaxed mb-2">
          <span className="text-orange-600 font-semibold">BONK BATTLE</span> is where communities turn into{' '}
          <span className="text-orange-600 font-semibold">armies</span>.
        </p>

        {/* Key Points */}
        <div className="space-y-0.5 mb-2 text-sm text-white">
          <p>Armies launch tokens.</p>
          <p>Tokens fight <span className="text-orange-600 font-bold">1v1</span>.</p>
          <p className="text-green-500">Winner takes 50% of loser's liquidity + DEX listing.</p>
        </div>

        {/* How to Profit Section */}
        <div className="mb-3">
          <p className="text-orange-600 font-bold text-sm mb-1">How to profit:</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-white font-bold min-w-[55px]">Step 1:</span>
              <span className="text-white"><span className="font-semibold">FOLLOW</span> — Pick armies with winning records</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white font-bold min-w-[55px]">Step 2:</span>
              <span className="text-white"><span className="font-semibold">ALERT</span> — Get notified when they launch</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white font-bold min-w-[55px]">Step 3:</span>
              <span className="text-white"><span className="font-semibold">WIN</span> — Buy the token, your army wins, you profit</span>
            </div>
          </div>
        </div>

        {/* Terms Text */}
        <p className="text-gray-500 text-xs text-center mb-2">
          By accepting I declare I am 18+
        </p>

        {/* CTA Button */}
        <button
          onClick={onAccept}
          className="w-full py-2.5 rounded-xl font-bold text-base transition-all bg-orange-600 hover:bg-orange-500 text-white cursor-pointer active:scale-[0.98]"
        >
          I'm ready to battle
        </button>
      </div>
    </div>
  );
}
