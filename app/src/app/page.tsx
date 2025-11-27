import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { Tagline } from '@/components/home/Tagline';
import { HowItWorks } from '@/components/home/HowItWorks';
import { TokenGridBonk } from '@/components/home/TokenGrid.BONK';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bonk-dark text-white overflow-x-hidden">
      <Sidebar />
      <DesktopHeader />

      {/* ⭐ FOMOTicker SOPRA Header - SOLO mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
        <FOMOTicker />
      </div>

      <Header />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-12 max-w-full">

        <Tagline />

        <HowItWorks />
        <TokenGridBonk />
      </div>

      <MobileBottomNav />
    </div>
  );
}