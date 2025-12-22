// ========================================================================
// BONK BATTLE - SOL PRICE HOOK
// ========================================================================
// Fetches SOL/USD price from Jupiter API (fast, reliable, free)
// Fallback to CoinGecko if Jupiter fails
// ========================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

// ========================================================================
// CONSTANTS
// ========================================================================

// How often to refresh price (in milliseconds)
const PRICE_REFRESH_INTERVAL = 30_000; // 30 seconds

// Cache key for localStorage
const PRICE_CACHE_KEY = 'bonk_sol_price';
const PRICE_CACHE_EXPIRY = 60_000; // 1 minute cache

// Default fallback price if all APIs fail
const DEFAULT_SOL_PRICE = 197; // Update this periodically

// ========================================================================
// API FETCHERS
// ========================================================================

/**
 * Fetch SOL price from Jupiter API
 * Fast and reliable, specifically for Solana
 */
async function fetchFromJupiter(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://price.jup.ag/v6/price?ids=SOL',
      {
        next: { revalidate: 30 },
        signal: AbortSignal.timeout(5000) // 5s timeout
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const price = data?.data?.SOL?.price;

    if (typeof price === 'number' && price > 0) {
      console.log(`💹 SOL price from Jupiter: $${price.toFixed(2)}`);
      return price;
    }

    return null;
  } catch (error) {
    console.warn('Jupiter API failed:', error);
    return null;
  }
}

/**
 * Fetch SOL price from CoinGecko (fallback)
 */
async function fetchFromCoinGecko(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const price = data?.solana?.usd;

    if (typeof price === 'number' && price > 0) {
      console.log(`💹 SOL price from CoinGecko: $${price.toFixed(2)}`);
      return price;
    }

    return null;
  } catch (error) {
    console.warn('CoinGecko API failed:', error);
    return null;
  }
}

/**
 * Get cached price from localStorage
 */
function getCachedPrice(): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(PRICE_CACHE_KEY);
    if (!cached) return null;

    const { price, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age < PRICE_CACHE_EXPIRY && typeof price === 'number' && price > 0) {
      return price;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Save price to localStorage cache
 */
function setCachedPrice(price: number) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({
      price,
      timestamp: Date.now()
    }));
  } catch {
    // Ignore localStorage errors
  }
}

// ========================================================================
// MAIN HOOK
// ========================================================================

interface UseSolPriceResult {
  solPrice: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to get current SOL/USD price
 *
 * Features:
 * - Automatic refresh every 30 seconds
 * - Local caching to reduce API calls
 * - Fallback chain: Jupiter -> CoinGecko -> Cached -> Default
 * - Manual refresh capability
 */
export function useSolPrice(): UseSolPriceResult {
  const [solPrice, setSolPrice] = useState<number>(() => {
    // Initialize with cached price or default
    return getCachedPrice() || DEFAULT_SOL_PRICE;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPrice = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try Jupiter first (fastest for Solana)
      let price = await fetchFromJupiter();

      // Fallback to CoinGecko
      if (!price) {
        price = await fetchFromCoinGecko();
      }

      // Fallback to cached price
      if (!price) {
        price = getCachedPrice();
      }

      // Final fallback to default
      if (!price) {
        price = DEFAULT_SOL_PRICE;
        setError('Using default price - API unavailable');
      }

      setSolPrice(price);
      setCachedPrice(price);
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Failed to fetch SOL price:', err);
      setError('Failed to fetch price');

      // Use cached or default on error
      const cached = getCachedPrice();
      if (cached) {
        setSolPrice(cached);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  // Auto-refresh interval
  useEffect(() => {
    const interval = setInterval(fetchPrice, PRICE_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return {
    solPrice,
    loading,
    error,
    lastUpdated,
    refresh: fetchPrice,
  };
}

// ========================================================================
// SIMPLE GETTER (for non-React contexts)
// ========================================================================

/**
 * Get SOL price synchronously from cache, or fetch if needed
 * Use this for non-React contexts or one-off calculations
 */
export async function getSolPrice(): Promise<number> {
  // Check cache first
  const cached = getCachedPrice();
  if (cached) return cached;

  // Try APIs
  let price = await fetchFromJupiter();
  if (!price) price = await fetchFromCoinGecko();
  if (!price) price = DEFAULT_SOL_PRICE;

  setCachedPrice(price);
  return price;
}

/**
 * Get cached SOL price synchronously (may be stale)
 * Returns default if no cache available
 */
export function getSolPriceCached(): number {
  return getCachedPrice() || DEFAULT_SOL_PRICE;
}
