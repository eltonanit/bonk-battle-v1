// app/src/hooks/useCanCreateToken.ts
// ⭐ Hook per verificare se il wallet connesso può creare un token
// Usa l'API /api/can-create-token

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export type CreateTokenReason =
  | 'NO_WALLET'
  | 'NOT_COMMANDER'
  | 'NOT_ENOUGH_MEMBERS'
  | 'ELIGIBLE'
  | 'ERROR'
  | 'LOADING';

export interface ArmyInfo {
  id: string;
  name: string;
  ticker: string;
  memberCount: number;
  minRequired?: number;
  needed?: number;
}

export interface CanCreateTokenResult {
  canCreate: boolean;
  reason: CreateTokenReason;
  message: string;
  army: ArmyInfo | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useCanCreateToken(): CanCreateTokenResult {
  const { publicKey, connected } = useWallet();
  const [canCreate, setCanCreate] = useState(false);
  const [reason, setReason] = useState<CreateTokenReason>('LOADING');
  const [message, setMessage] = useState('Checking eligibility...');
  const [army, setArmy] = useState<ArmyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEligibility = useCallback(async () => {
    // No wallet connected
    if (!connected || !publicKey) {
      setCanCreate(false);
      setReason('NO_WALLET');
      setMessage('Connect your wallet to create a token');
      setArmy(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setReason('LOADING');
    setMessage('Checking eligibility...');

    try {
      const response = await fetch(`/api/can-create-token?wallet=${publicKey.toString()}`);
      const data = await response.json();

      if (data.success) {
        setCanCreate(data.canCreate);
        setReason(data.reason);
        setMessage(data.message);
        setArmy(data.army);
      } else {
        setCanCreate(false);
        setReason('ERROR');
        setMessage(data.error || 'Error checking eligibility');
        setArmy(null);
      }
    } catch (error) {
      console.error('❌ Error fetching create eligibility:', error);
      setCanCreate(false);
      setReason('ERROR');
      setMessage('Failed to check eligibility');
      setArmy(null);
    } finally {
      setLoading(false);
    }
  }, [connected, publicKey]);

  // Fetch on mount and when wallet changes
  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  return {
    canCreate,
    reason,
    message,
    army,
    loading,
    refetch: fetchEligibility,
  };
}
