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
  description?: string;  // NUOVO
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
  // Nuovi campi sistema livelli
  invite_code?: string;
  ticker?: string;
  level?: number;
  level_wins?: number;
  total_wins?: number;
  total_losses?: number;
  total_battles?: number;
  season_points?: number;
  follower_count?: number;
  is_eligible_to_create?: boolean;
  // Legacy (per compatibilità)
  battles_won?: number;
  battles_lost?: number;
}

export interface ArmyOrder {
  id: string;
  army_id: string;
  capitano_wallet: string;
  message: string;
  token_mint?: string | null;
  created_at: string;
}

type ArmySortType = 'top' | 'onfire' | 'leaderboard' | 'ultra';

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
    staleTime: 30000,
    refetchInterval: 60000,
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
    enabled: !!armyId,
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
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

// =============================================
// MUTATION: createArmy
// =============================================

interface CreateArmyParams {
  name: string;
  icon: string;
  description: string;  // NUOVO - obbligatorio
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
      return data;  // Ritorna tutto (army + invite_link)
    },
    onSuccess: () => {
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
      queryClient.invalidateQueries({ queryKey: ['army', variables.armyId] });
    },
  });
}

// =============================================
// HOOK: useMyArmies (armate dove sono membro)
// =============================================

export function useMyArmies(wallet: string | null) {
  return useQuery({
    queryKey: ['my-armies', wallet],
    queryFn: async () => {
      if (!wallet) return [];

      const response = await fetch(`/api/armies/my?wallet=${wallet}`);

      if (!response.ok) {
        throw new Error('Failed to fetch my armies');
      }

      const data = await response.json();
      return data.armies as Army[];
    },
    enabled: !!wallet,
    staleTime: 30000,
  });
}