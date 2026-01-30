// =================================================================
// FILE: app/src/components/home/PotentialsHeader.tsx
// POTENTIALS.FUN - Simplified Header with branding
// =================================================================

'use client';

import Link from 'next/link';

interface PotentialsHeaderProps {
  onSearchClick?: () => void;
  onFilterClick?: () => void;
}

export function PotentialsHeader({ onSearchClick, onFilterClick }: PotentialsHeaderProps) {
  return (
    <div className="flex items-center bg-background-dark px-4 py-3 justify-between">
      {/* Logo and Brand */}
      <div className="flex items-center gap-3">
        {/* Yellow bolt icon */}
        <div className="bg-primary rounded-full size-8 flex items-center justify-center text-black shadow-[0_0_12px_rgba(249,228,6,0.3)]">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div>
          <h2 className="text-white text-lg font-bold leading-none tracking-tight">
            Potentials<span className="text-primary">.fun</span>
          </h2>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onSearchClick}
          className="flex size-9 items-center justify-center rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button
          onClick={onFilterClick}
          className="flex size-9 items-center justify-center rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default PotentialsHeader;
