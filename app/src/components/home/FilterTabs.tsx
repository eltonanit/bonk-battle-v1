'use client';

import { useState } from 'react';
import type { TokenFilter } from '@/types';

interface FilterTabsProps {
  onFilterChange?: (filter: TokenFilter) => void;
}

export function FilterTabs({ onFilterChange }: FilterTabsProps) {
  const [activeFilter, setActiveFilter] = useState<TokenFilter>('on-fire');

  const handleFilterChange = (filter: TokenFilter) => {
    setActiveFilter(filter);
    onFilterChange?.(filter);
  };

  const getButtonClass = (filter: TokenFilter) => {
    const base = "flex items-center gap-1.5 px-5 py-2.5 lg:py-2.5 rounded-full text-[13px] lg:text-[15px] font-semibold transition-all";
    const active = "bg-white/15 text-white";
    const inactive = "bg-white/5 text-white/60 hover:bg-white/10";
    return base + " " + (activeFilter === filter ? active : inactive);
  };

  return (
    <div className="flex gap-3 flex-wrap">
      <button onClick={() => handleFilterChange('on-fire')} className={getButtonClass('on-fire')}>
        🔥 On Fire
      </button>
      <button onClick={() => handleFilterChange('about-to-win')} className={getButtonClass('about-to-win')}>
        🏆 About to Win
      </button>
      <button onClick={() => handleFilterChange('new')} className={getButtonClass('new')}>
        🆕 New
      </button>
    </div>
  );
}