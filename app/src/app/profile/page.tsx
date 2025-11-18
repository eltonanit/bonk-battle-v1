'use client';

import { useState, useEffect, Suspense } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';
import { Connection, PublicKey } from '@solana/web3.js';
import { Header } from '@/components/layout/Header';
import { DesktopHeader } from '@/components/layout/DesktopHeader';
import { FOMOTicker } from '@/components/global/FOMOTicker';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { BalancesTab } from '@/components/profile/BalancesTab';
import { CoinsTab } from '@/components/profile/CoinsTab';
import { RefundsTab } from '@/components/profile/RefundsTab';
import { PROGRAM_ID, RPC_ENDPOINT } from '@/config/solana';

function ProfileContent() {
  const { publicKey } = useWallet();
  const searchParams = useSearchParams();

  // ⭐ NUOVO: Support ?tab=refunds query param
  const initialTab = (searchParams.get('tab') as 'balances' | 'coins' | 'refunds') || 'balances';

  const [activeTab, setActiveTab] = useState<'balances' | 'coins' | 'refunds'>(initialTab);
  const [createdCoinsCount, setCreatedCoinsCount] = useState(0);

  // ⭐ NUOVO: Update tab quando cambia URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'balances' || tab === 'coins' || tab === 'refunds') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!publicKey) return;

    async function fetchCreatedCount() {
      if (!publicKey) return;

      try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');

        // ⭐ Fetch V1 tokens (443 bytes)
        const accountsV1 = await connection.getProgramAccounts(
          new PublicKey(PROGRAM_ID),
          {
            filters: [
              { dataSize: 443 },
              { memcmp: { offset: 8, bytes: publicKey.toBase58() } }
            ]
          }
        );

        // ⭐ Fetch V2 tokens (439 bytes)
        const accountsV2 = await connection.getProgramAccounts(
          new PublicKey(PROGRAM_ID),
          {
            filters: [
              { dataSize: 439 },
              { memcmp: { offset: 8, bytes: publicKey.toBase58() } }
            ]
          }
        );

        const totalCount = accountsV1.length + accountsV2.length;
        setCreatedCoinsCount(totalCount);

        console.log(`✅ Created tokens: ${accountsV1.length} v1 + ${accountsV2.length} v2 = ${totalCount}`);
      } catch (error) {
        console.error('Error fetching created count:', error);
      }
    }

    fetchCreatedCount();
  }, [publicKey]);

  return (
    <>
      {/* ⭐ RIMOSSO: <Tagline /> */}
      <div className="max-w-[1200px] pl-8 pr-5 py-8">
        <ProfileHeader createdCoinsCount={createdCoinsCount} />

        <div className="border-b border-white/10 mb-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('balances')}
              className={`pb-4 px-2 font-semibold transition-colors border-b-2 ${activeTab === 'balances'
                ? 'text-white border-green-500'
                : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
            >
              Balances
            </button>
            <button
              onClick={() => setActiveTab('coins')}
              className={`pb-4 px-2 font-semibold transition-colors border-b-2 ${activeTab === 'coins'
                ? 'text-white border-green-500'
                : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
            >
              Coins
            </button>
            <button
              onClick={() => setActiveTab('refunds')}
              className={`pb-4 px-2 font-semibold transition-colors border-b-2 ${activeTab === 'refunds'
                ? 'text-white border-green-500'
                : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
            >
              Refunds
            </button>
          </div>
        </div>

        <div>
          {activeTab === 'balances' && <BalancesTab />}
          {activeTab === 'coins' && <CoinsTab />}
          {activeTab === 'refunds' && <RefundsTab />}
        </div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <DesktopHeader />
      <Header />
      <Sidebar />

      {/* ⭐ MODIFICATO: Aggiunto pt-20 lg:pt-0 e FOMOTicker */}
      <div className="pt-20 lg:pt-0 lg:ml-60 lg:mt-16">
        {/* ⭐ FOMOTicker visibile SOLO su mobile */}
        <div className="lg:hidden">
          <FOMOTicker />
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-gray-400">Loading profile...</div>
          </div>
        }>
          <ProfileContent />
        </Suspense>
      </div>
      <MobileBottomNav />
    </div>
  );
}