/**
 * ========================================================================
 * BONK BATTLE - REACT QUERY UTILITIES
 * ========================================================================
 * 
 * Centralizza:
 * ✅ Query keys - naming convention uniforme
 * ✅ Cache invalidation - helpers per aggiornare cache
 * ✅ Prefetch utilities - ottimizzazione navigazione
 * ✅ Dev tools - debug helpers
 * 
 * ========================================================================
 */

import { queryClient } from '@/components/providers/QueryProvider';

/**
 * ========================================================================
 * QUERY KEYS - CENTRALIZED KEY MANAGEMENT
 * ========================================================================
 * 
 * Convention: ['entity', 'identifier', 'subResource']
 * 
 * Examples:
 * - ['tokens', 'ABC123'] - token detail
 * - ['tokens', 'ABC123', 'battleState'] - token battle state
 * - ['battles', 'active'] - active battles list
 */
export const queryKeys = {
    // Token queries
    token: {
        all: ['tokens'] as const,
        detail: (mint: string) => ['tokens', mint] as const,
        battleState: (mint: string) => ['tokens', mint, 'battleState'] as const,
        balance: (mint: string, wallet: string) => ['tokens', mint, 'balance', wallet] as const,
        holders: (mint: string) => ['tokens', mint, 'holders'] as const,
        trades: (mint: string) => ['tokens', mint, 'trades'] as const,
    },

    // Battle queries
    battle: {
        all: ['battles'] as const,
        active: ['battles', 'active'] as const,
        qualified: ['battles', 'qualified'] as const,
        detail: (mint: string) => ['battles', mint] as const,
    },

    // Oracle queries
    oracle: {
        price: ['oracle', 'price'] as const,
    },

    // User queries
    user: {
        profile: (wallet: string) => ['users', wallet] as const,
        tokens: (wallet: string) => ['users', wallet, 'tokens'] as const,
        positions: (wallet: string) => ['users', wallet, 'positions'] as const,
        points: (wallet: string) => ['users', wallet, 'points'] as const,
        notifications: (wallet: string) => ['users', wallet, 'notifications'] as const,
    },

    // Feed queries
    feed: {
        activity: ['feed', 'activity'] as const,
        trending: ['feed', 'trending'] as const,
    },
} as const;

/**
 * ========================================================================
 * CACHE INVALIDATION HELPERS
 * ========================================================================
 */

/**
 * Invalida cache di un token specifico dopo trade/battle
 * 
 * @example
 * // Dopo un trade
 * await buyToken(mint);
 * invalidateTokenCache(mint.toString());
 */
export function invalidateTokenCache(mint: string) {
    queryClient.invalidateQueries({ queryKey: queryKeys.token.detail(mint) });
    queryClient.invalidateQueries({ queryKey: queryKeys.token.battleState(mint) });
    console.log('🔄 Token cache invalidated:', mint);
}

/**
 * Invalida cache battles dopo match/victory
 * 
 * @example
 * // Dopo un battle start
 * await startBattle(mintA, mintB);
 * invalidateBattleCache();
 */
export function invalidateBattleCache() {
    queryClient.invalidateQueries({ queryKey: queryKeys.battle.all });
    console.log('🔄 Battle cache invalidated');
}

/**
 * Invalida cache user dopo azione (buy, create, etc)
 * 
 * @example
 * // Dopo un acquisto
 * await buyToken(mint);
 * invalidateUserCache(wallet.toString());
 */
export function invalidateUserCache(wallet: string) {
    queryClient.invalidateQueries({ queryKey: queryKeys.user.profile(wallet) });
    queryClient.invalidateQueries({ queryKey: queryKeys.user.positions(wallet) });
    queryClient.invalidateQueries({ queryKey: queryKeys.user.points(wallet) });
    console.log('🔄 User cache invalidated:', wallet);
}

/**
 * Invalida tutto dopo una transazione complessa
 * 
 * @example
 * // Dopo battle victory + liquidity transfer
 * await finalizeVictory(winner, loser);
 * invalidateAllCache();
 */
export function invalidateAllCache() {
    queryClient.invalidateQueries();
    console.log('🔄 All cache invalidated');
}

/**
 * ========================================================================
 * PREFETCH UTILITIES
 * ========================================================================
 */

/**
 * Prefetch token data (per ottimizzare navigazione)
 * 
 * @example
 * // User hovera su link token
 * <Link 
 *   href={`/tokens/${mint}`}
 *   onMouseEnter={() => prefetchToken(mint)}
 * >
 */
export function prefetchToken(mint: string) {
    // Implementato quando ottimizziamo gli hooks
    console.log('🔮 Prefetching token:', mint);
}

/**
 * ========================================================================
 * CACHE MANAGEMENT
 * ========================================================================
 */

/**
 * Set manual data in cache (ottimistico update)
 * 
 * @example
 * // Update ottimistico dopo buy
 * setTokenData(mint, { ...oldData, solCollected: newAmount });
 */
export function setTokenData(mint: string, data: any) {
    queryClient.setQueryData(queryKeys.token.battleState(mint), data);
    console.log('💾 Token data set in cache:', mint);
}

/**
 * Get data from cache without fetching
 * 
 * @example
 * const cachedState = getTokenData(mint);
 * if (cachedState) {
 *   // Use cached data
 * }
 */
export function getTokenData(mint: string) {
    return queryClient.getQueryData(queryKeys.token.battleState(mint));
}

/**
 * ========================================================================
 * DEVELOPMENT HELPERS
 * ========================================================================
 */

/**
 * Get cache statistics (dev only)
 */
export function getCacheStats() {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    return {
        totalQueries: queries.length,
        freshQueries: queries.filter(q => q.state.dataUpdatedAt && Date.now() - q.state.dataUpdatedAt < 10_000).length,
        staleQueries: queries.filter(q => q.isStale()).length,
        inactiveQueries: queries.filter(q => !q.getObserversCount()).length,
        errorQueries: queries.filter(q => q.state.status === 'error').length,
    };
}

/**
 * Clear all cache (dev/debug only)
 */
export function clearAllCache() {
    queryClient.clear();
    console.log('🧹 All cache cleared');
}

/**
 * Log cache stats (dev only)
 */
export function logCacheStats() {
    if (process.env.NODE_ENV !== 'development') return;

    const stats = getCacheStats();
    console.log('📊 React Query Cache Stats:', stats);
}

// Auto-log stats ogni 30s in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    setInterval(() => {
        logCacheStats();
    }, 30_000);
}