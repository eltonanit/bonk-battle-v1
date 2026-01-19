// =================================================================
// FILE: app/src/app/page.tsx
// HOMEPAGE
// =================================================================

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Tagline } from '@/components/home/Tagline';
import { LiveRankingsHome } from '@/components/home/LiveRankingsHome';
import { TokenGridBonk } from '@/components/home/TokenGrid.BONK';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bonk-dark text-white overflow-x-hidden">
      <Sidebar />
      <DesktopHeader />

      {/* Tickers SOPRA Header - SOLO mobile/tablet (< lg) */}
      {/* < 400px: solo FOMOTicker centrato | 400-640px: FOMOTicker a sinistra | 640px+: entrambi */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
        <div className="flex items-center gap-2 px-2 justify-center xs:justify-start">
          <FOMOTicker />
          <div className="hidden sm:block">
            <CreatedTicker />
          </div>
        </div>
      </div>

      <Header />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-12 max-w-full">

        <Tagline />

        {/* LIVE RANKINGS */}
        <LiveRankingsHome />

        <TokenGridBonk />
      </div>

      <MobileBottomNav />
    </div>
  );
}
