// =================================================================
// FILE: app/src/components/home/HomeTabsSection.tsx
// HOME TABS - Last Trade / On Battle switch
// =================================================================

'use client';

import { useState } from 'react';
import { LiveRankingsHome } from './LiveRankingsHome';
import { BattleGrid } from './BattleGrid';

type TabType = 'lastTrade' | 'onBattle';

export function HomeTabsSection() {
  const [activeTab, setActiveTab] = useState<TabType>('lastTrade');

  return (
    <div className="px-5 lg:px-6">
      {/* Tab Buttons */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab('lastTrade')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'lastTrade'
              ? 'bg-white text-black'
              : 'bg-[#1e3a5a]/30 text-gray-400 hover:text-white hover:bg-[#1e3a5a]/50'
          }`}
        >
          Last Trade
        </button>
        <button
          onClick={() => setActiveTab('onBattle')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'onBattle'
              ? 'bg-white text-black'
              : 'bg-[#1e3a5a]/30 text-gray-400 hover:text-white hover:bg-[#1e3a5a]/50'
          }`}
        >
          On Battle
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'lastTrade' ? (
        <LiveRankingsHome />
      ) : (
        <BattleGrid />
      )}
    </div>
  );
}

export default HomeTabsSection;
