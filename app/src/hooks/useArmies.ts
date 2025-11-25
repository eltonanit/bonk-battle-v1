// app/src/hooks/useArmies.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================
// TYPES
// =============================================

export interface Army {
  id: string;
  name: string;
  icon: string;
  image_url: string;
  twitter_url?: string | null;
  telegram_url?: string | null;
  capitano_wallet: string;
  member_count: number;
  member_count_checkpoint: number;
  promoted_token_mint?: string | null;
  created_at: string;
  last_join_at: string;
  is_active: boolean;
}

export interface ArmyOrder {
  id: string;
  army_id: string;
  capitano_wallet: string;
  message: string;
  token_mint?: string | null;
  created_at: string;
}

type ArmySortType = 'top' | 'onfire';

// =============================================
// HOOK: useArmies
// =============================================

export function useArmies(sort: ArmySortType = 'top', wallet?: string) {
  return useQuery({
    queryKey: ['armies', sort, wallet],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('sort', sort);
      if (wallet) {
        params.append('wallet', wallet);
      }

      const response = await fetch(`/api/armies?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch armies');
      }

      const data = await response.json();
      return data.armies as Army[];
    },
    staleTime: 30000, // 30 secondi
    refetchInterval: 60000, // Auto-refresh ogni 60 secondi
  });
}

// =============================================
// HOOK: useArmy (singola army)
// =============================================

export function useArmy(armyId: string | null) {
  return useQuery({
    queryKey: ['army', armyId],
    queryFn: async () => {
      if (!armyId) return null;

      const response = await fetch(`/api/armies/${armyId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch army');
      }

      const data = await response.json();
      return data.army as Army;
    },
    enabled: !!armyId, // Solo se armyId è presente
    staleTime: 30000,
  });
}

// =============================================
// HOOK: useArmyOrders
// =============================================

export function useArmyOrders(armyId: string | null) {
  return useQuery({
    queryKey: ['army-orders', armyId],
    queryFn: async () => {
      if (!armyId) return [];

      const response = await fetch(`/api/armies/${armyId}/orders`);

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      return data.orders as ArmyOrder[];
    },
    enabled: !!armyId,
    staleTime: 10000, // 10 secondi (ordini cambiano più frequentemente)
    refetchInterval: 30000, // Auto-refresh ogni 30 secondi
  });
}

// =============================================
// MUTATION: createArmy
// =============================================

interface CreateArmyParams {
  name: string;
  icon: string;
  image_url: string;
  twitter_url?: string;
  telegram_url?: string;
  capitano_wallet: string;
}

export function useCreateArmy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateArmyParams) => {
      const response = await fetch('/api/armies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create army');
      }

      const data = await response.json();
      return data.army as Army;
    },
    onSuccess: () => {
      // Invalida cache per re-fetch automatico
      queryClient.invalidateQueries({ queryKey: ['armies'] });
    },
  });
}

// =============================================
// MUTATION: joinArmy
// =============================================

interface JoinArmyParams {
  armyId: string;
  wallet_address: string;
}

export function useJoinArmy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ armyId, wallet_address }: JoinArmyParams) => {
      const response = await fetch(`/api/armies/${armyId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wallet_address }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join army');
      }

      return await response.json();
    },
    onSuccess: () => {
      // Invalida cache
      queryClient.invalidateQueries({ queryKey: ['armies'] });
      queryClient.invalidateQueries({ queryKey: ['army'] });
    },
  });
}

// =============================================
// MUTATION: leaveArmy
// =============================================

interface LeaveArmyParams {
  armyId: string;
  wallet_address: string;
}

export function useLeaveArmy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ armyId, wallet_address }: LeaveArmyParams) => {
      const response = await fetch(`/api/armies/${armyId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wallet_address }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to leave army');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['armies'] });
      queryClient.invalidateQueries({ queryKey: ['army'] });
    },
  });
}

// =============================================
// MUTATION: postOrder
// =============================================

interface PostOrderParams {
  armyId: string;
  capitano_wallet: string;
  message: string;
  token_mint?: string;
}

export function usePostOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ armyId, capitano_wallet, message, token_mint }: PostOrderParams) => {
      const response = await fetch(`/api/armies/${armyId}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ capitano_wallet, message, token_mint }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to post order');
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      // Invalida solo gli ordini di questa army
      queryClient.invalidateQueries({ queryKey: ['army-orders', variables.armyId] });
    },
  });
}

// =============================================
// MUTATION: promoteToken
// =============================================

interface PromoteTokenParams {
  armyId: string;
  capitano_wallet: string;
  token_mint: string;
}

export function usePromoteToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ armyId, capitano_wallet, token_mint }: PromoteTokenParams) => {
      const response = await fetch(`/api/armies/${armyId}/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ capitano_wallet, token_mint }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to promote token');
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      // Invalida cache army
      queryClient.invalidateQueries({ queryKey: ['army', variables.armyId] });
    },
  });
}
