// app/src/app/emperor/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { CreatedTicker } from '@/components/global/CreatedTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

const PROGRAMS = [
  {
    name: '10 Days Program',
    duration: '10 days',
    rewards: '50,000 pts + $50',
    description: 'Perfect for getting started. Promote on your socials for 10 days.',
    color: 'from-blue-500 to-cyan-500',
    badge: 'Starter',
  },
  {
    name: '30 Days Program',
    duration: '30 days',
    rewards: '200,000 pts + $200',
    description: 'Build momentum. Consistent promotion across multiple platforms.',
    color: 'from-purple-500 to-pink-500',
    badge: 'Pro',
  },
  {
    name: '60 Days Program',
    duration: '60 days',
    rewards: '1,000,000 pts + $500',
    description: 'Maximum impact. Become a true BONK Battle Emperor.',
    color: 'from-yellow-400 to-orange-500',
    badge: 'Emperor',
  },
];

export default function EmperorPage() {
  return (
    <div className="min-h-screen bg-[#0a1a1a] text-white">
      {/* Tickers SOPRA Header - SOLO mobile/tablet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] pb-0.5 pt-2 bg-bonk-dark">
        <div className="flex items-center gap-2 px-2 justify-center xs:justify-start">
          <FOMOTicker />
          <div className="hidden sm:block">
            <CreatedTicker />
          </div>
        </div>
      </div>

      <DesktopHeader />
      <Header />
      <Sidebar />

      <div className="pt-36 lg:pt-0 lg:ml-56 lg:mt-16">
        <div className="max-w-[900px] mx-auto px-5 py-8">

          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-900/40 via-amber-900/30 to-orange-900/40 p-8 mb-8 shadow-[0_0_60px_rgba(234,179,8,0.3)]">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/5 to-transparent animate-shimmer" />

            {/* Logo decorations */}
            <div className="absolute top-4 right-8 w-10 h-10 animate-bounce">
              <Image src="/BONK-LOGO.svg" alt="BONK" width={40} height={40} />
            </div>
            <div className="absolute top-8 right-24 text-2xl animate-pulse">✨</div>
            <div className="absolute bottom-4 left-8 text-2xl animate-pulse">⭐</div>
            <div className="absolute bottom-8 right-16 text-xl animate-bounce delay-200">💎</div>

            <div className="relative text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/50 animate-pulse p-4">
                <Image src="/BONK-LOGO.svg" alt="BONK" width={64} height={64} />
              </div>
              <h1 className="text-4xl font-black text-yellow-400 mb-2 uppercase tracking-wide" style={{ textShadow: '0 0 30px rgba(234,179,8,0.5)' }}>
                Become an Emperor
              </h1>
              <p className="text-yellow-300/80 text-lg mb-4">
                Join our affiliate program and earn <span className="text-white font-bold">REAL DOLLARS</span>
              </p>
              <div className="text-yellow-400 font-black text-5xl animate-pulse" style={{ textShadow: '0 0 30px rgba(234,179,8,0.6)' }}>
                Up to 1,000,000 pts
              </div>
            </div>
          </div>

          {/* What does an Emperor do? */}
          <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
              <Image src="/BONK-LOGO.svg" alt="BONK" width={28} height={28} /> What does an Emperor do?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20">
                <div className="text-2xl mb-2">📢</div>
                <h3 className="text-white font-bold mb-1">Promote on X (Twitter)</h3>
                <p className="text-gray-400 text-sm">Share BONK Battle with your followers and community</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20">
                <div className="text-2xl mb-2">👥</div>
                <h3 className="text-white font-bold mb-1">Grow Multiple Groups</h3>
                <p className="text-gray-400 text-sm">Earn on Telegram, Discord, and other communities</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20">
                <div className="text-2xl mb-2">🎖️</div>
                <h3 className="text-white font-bold mb-1">Emperor Badge</h3>
                <p className="text-gray-400 text-sm">Exclusive badge on your profile showing your status</p>
              </div>
              <div className="bg-black/30 rounded-lg p-4 border border-yellow-500/20">
                <div className="text-2xl mb-2">💰</div>
                <h3 className="text-white font-bold mb-1">Real Dollar Earnings</h3>
                <p className="text-gray-400 text-sm">Get paid in USD for your promotional efforts</p>
              </div>
            </div>
          </div>

          {/* Programs */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Choose Your Program</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PROGRAMS.map((program) => (
                <div
                  key={program.name}
                  className={`relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br ${program.color} p-1`}
                >
                  <div className="bg-[#0a1a1a] rounded-lg p-5 h-full">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-black bg-gradient-to-r ${program.color} mb-3`}>
                      {program.badge}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{program.name}</h3>
                    <p className="text-gray-400 text-sm mb-4">{program.description}</p>
                    <div className="border-t border-gray-700 pt-4">
                      <div className="text-gray-500 text-xs mb-1">Duration</div>
                      <div className="text-white font-bold mb-3">{program.duration}</div>
                      <div className="text-gray-500 text-xs mb-1">Rewards</div>
                      <div className="text-yellow-400 font-bold text-lg">{program.rewards}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How to become an Emperor */}
          <div className="bg-[#0d2626] border border-[#1a3a3a] rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">How to Apply</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-white font-bold">Contact us</h3>
                  <p className="text-gray-400 text-sm">Reach out via X or email with your social stats</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-white font-bold">Choose your program</h3>
                  <p className="text-gray-400 text-sm">Select 10, 30, or 60 days based on your commitment</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-white font-bold">Start promoting</h3>
                  <p className="text-gray-400 text-sm">Share BONK Battle and track your referrals</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="text-white font-bold">Get paid!</h3>
                  <p className="text-gray-400 text-sm">Receive your points and USD rewards</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500/30 rounded-xl p-6 text-center">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Ready to become an Emperor?</h2>
            <p className="text-gray-300 mb-6">
              Contact us to discuss your partnership and start earning today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://x.com/bonk_battle"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black hover:bg-gray-900 text-white font-bold rounded-lg transition-all hover:scale-105"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Contact on X
              </a>
              <a
                href="mailto:emperor@bonkbattle.com"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold rounded-lg transition-all hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Us
              </a>
            </div>
          </div>

          {/* Back link */}
          <div className="mt-8 text-center">
            <Link href="/points" className="text-gray-400 hover:text-white transition-colors">
              ← Back to Points
            </Link>
          </div>

        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
