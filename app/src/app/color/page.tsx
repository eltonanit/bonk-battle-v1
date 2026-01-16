'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function ColorPage() {
  const [selectedMode, setSelectedMode] = useState<'dark' | 'light'>('dark');

  return (
    <div className="min-h-screen bg-bonk-dark text-white overflow-x-hidden">
      <Sidebar />
      <DesktopHeader />
      <Header />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Card Container */}
          <div className="bg-bonk-card border-2 border-bonk-orange-brand rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-white mb-3">
                Color Mode Selection
              </h1>
              <p className="text-bonk-text text-lg">
                Choose your preferred theme for the interface
              </p>
            </div>

            {/* Toggle Switch Container */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative bg-bonk-dark rounded-full p-2 inline-flex items-center">
                {/* Background Slider */}
                <div
                  className={`absolute top-2 bottom-2 w-1/2 bg-gradient-to-r transition-all duration-300 ease-in-out rounded-full ${
                    selectedMode === 'dark'
                      ? 'left-2 from-purple-600 to-purple-700'
                      : 'left-1/2 from-yellow-400 to-orange-500'
                  }`}
                />

                {/* Dark Button */}
                <button
                  onClick={() => setSelectedMode('dark')}
                  className={`relative z-10 px-8 py-4 rounded-full font-bold text-lg transition-colors duration-300 ${
                    selectedMode === 'dark'
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  🌙 Dark
                </button>

                {/* Light Button */}
                <button
                  onClick={() => setSelectedMode('light')}
                  className={`relative z-10 px-8 py-4 rounded-full font-bold text-lg transition-colors duration-300 ${
                    selectedMode === 'light'
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                >
                  ☀️ Light
                </button>
              </div>
            </div>

            {/* Mode Info */}
            <div className="text-center space-y-4">
              {selectedMode === 'dark' ? (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
                    <h3 className="text-xl font-bold text-purple-400">Dark Mode</h3>
                  </div>
                  <p className="text-white/70 text-sm">
                    Optimized for low-light environments and reduced eye strain.
                    <br />
                    Perfect for extended trading sessions at night.
                  </p>
                </div>
              ) : (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                    <h3 className="text-xl font-bold text-orange-400">Light Mode</h3>
                  </div>
                  <p className="text-white/70 text-sm">
                    Bright and vibrant interface for daytime use.
                    <br />
                    Enhanced visibility in well-lit environments.
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Button */}
            <div className="mt-8 flex justify-center">
              <button
                className={`px-8 py-3 rounded-lg font-bold text-lg transition-all duration-300 ${
                  selectedMode === 'dark'
                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
                onClick={() => {
                  alert(`Theme switched to ${selectedMode.toUpperCase()} mode (Coming soon!)`);
                }}
              >
                Apply Theme
              </button>
            </div>

            {/* Warning */}
            <div className="mt-8 text-center">
              <p className="text-xs text-white/40">
                ⚠️ Theme switching functionality will be enabled soon
              </p>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
