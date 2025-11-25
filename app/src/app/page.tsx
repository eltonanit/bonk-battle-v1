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
      <Header />

      <div className="pt-32 lg:pt-0 lg:ml-56 lg:mt-16 max-w-full">

        {/* ⭐ FOMOTicker + HoldersTicker visibili SOLO su mobile */}
        <div className="lg:hidden">
          <FOMOTicker />
          
        </div>

        <Tagline />

        <HowItWorks />
        <TokenGridBonk />
      </div>

      <MobileBottomNav />
    </div>
  );
}