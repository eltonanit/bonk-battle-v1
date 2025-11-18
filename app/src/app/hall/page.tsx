'use client';

import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Tagline } from '@/components/home/Tagline';
import { HallCarousel } from '@/components/hall/HallCarousel';
import { HallRanking } from '@/components/hall/HallRanking';
import { HALL_TOKENS } from '@/lib/hall/mock-data';

export default function HallPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <DesktopHeader />
      <Header />
      <Sidebar />
      <div className="lg:ml-60 lg:mt-16">
        <Tagline />
        <div className="max-w-[1200px] pl-8 pr-5 py-10">
          <h1 className="text-5xl font-extrabold text-center mb-4 bg-gradient-to-r from-yellow-400 via-green-400 to-yellow-400 bg-clip-text text-transparent">
            🏛️ THE HALL
          </h1>
          <p className="text-xl font-semibold text-center mb-12 text-white/70">
            Fantastic 4 • Genesis Tokens • 6 Months Countdown
          </p>

          <HallCarousel tokens={HALL_TOKENS} />
          <HallRanking initialTokens={HALL_TOKENS} />
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
