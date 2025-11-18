import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { HoldersTicker } from '@/components/global/HoldersTicker';
import { Tagline } from '@/components/home/Tagline';
import { HowItWorks } from '@/components/home/HowItWorks';
import { TokenGrid } from '@/components/home/TokenGrid';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Sidebar />
      <DesktopHeader />
      <Header />

      <div className="pt-20 lg:pt-0 lg:ml-60 lg:mt-16 max-w-full">

        {/* ⭐ FOMOTicker + HoldersTicker visibili SOLO su mobile */}
        <div className="lg:hidden">
          <FOMOTicker />
          <HoldersTicker />
        </div>

        <Tagline />

        <HowItWorks />
        <TokenGrid />
      </div>

      <MobileBottomNav />
    </div>
  );
}