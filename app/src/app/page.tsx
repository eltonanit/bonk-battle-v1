// =================================================================
// FILE: app/src/app/page.tsx
// HOMEPAGE
// =================================================================

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { NowMomentTicker } from '@/components/global/NowMomentTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Tagline } from '@/components/home/Tagline';
import { HomeTabsSection } from '@/components/home/HomeTabsSection';
import { TokenGridBonk } from '@/components/home/TokenGrid.BONK';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bonk-dark text-white overflow-x-hidden">
      <Sidebar />
      <DesktopHeader />

      {/* Tickers SOPRA Header - SOLO mobile/tablet (< lg) */}
      {/* Row 1: FOMOTicker + NowMomentTicker | Row 2 (sm+): CreatedTicker */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
        <div className="flex flex-col gap-1 px-2">
          {/* Row 1: FOMOTicker + NowMomentTicker */}
          <div className="flex items-center gap-2 justify-center xs:justify-start">
            <FOMOTicker />
            <NowMomentTicker />
          </div>
          {/* Row 2: CreatedTicker (sm+) */}
          <div className="hidden sm:flex justify-center xs:justify-start">
            <CreatedTicker />
          </div>
        </div>
      </div>

      <Header />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-12 max-w-full">

        <Tagline />

        {/* HOME TABS: Last Trade | On Battle */}
        <HomeTabsSection />

        <TokenGridBonk />
      </div>

      <MobileBottomNav />
    </div>
  );
}
