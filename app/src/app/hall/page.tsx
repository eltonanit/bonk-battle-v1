'use client';

import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { BattleMatching } from '@/components/battle/BattleMatching';

export default function HallPage() {
  return (
    <div className="min-h-screen bg-bonk-dark text-white">
      <DesktopHeader />
      <Header />
      <Sidebar />
      <div className="pt-32 lg:pt-0 lg:ml-56 lg:mt-16">
        <div className="lg:hidden">
          <FOMOTicker />
        </div>
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10">
          {/* Battle Matching Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 bg-clip-text text-transparent">
              ⚔️ BATTLE ARENA
            </h1>
            <p className="text-lg lg:text-xl font-semibold text-white/70 mb-2">
              Find Your Opponent • Winner Takes All
            </p>
            <p className="text-sm text-white/50 max-w-2xl mx-auto">
              Match with qualified tokens ready for battle. Winner takes 50% of loser's liquidity.
            </p>
          </div>

          {/* Battle Matching Component */}
          <BattleMatching />
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
