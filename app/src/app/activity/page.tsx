'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { ActivityFeed } from '@/components/feed/ActivityFeed';

export default function ActivityPage() {
  return (
    <div className="min-h-screen bg-bonk-dark">
      {/* FOMO Ticker - Desktop Only */}
      <div className="hidden lg:block fixed top-0 left-56 right-0 z-40 bg-bonk-dark">
        <div className="px-5 py-2">
          <FOMOTicker />
        </div>
      </div>

      <DesktopHeader />
      <Header />
      <Sidebar />

      {/* Main Content */}
      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16">
        <div className="max-w-[1200px] mx-auto px-5 py-8">

          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span>📊</span>
              Live Activity
            </h1>
            <p className="text-gray-400 mt-2">
              Real-time trades across all battles. See what warriors are buying and selling.
            </p>
          </div>

          {/* Activity Feed */}
          <ActivityFeed
            limit={100}
            showHeader={true}
            showFilters={true}
            showStats={true}
            showTokenInfo={true}
            maxHeight="calc(100vh - 300px)"
          />

        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
