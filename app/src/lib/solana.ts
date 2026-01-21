/**
 * ========================================================================
 * BONK BATTLE - OPTIMIZED SOLANA CONNECTION MANAGER
 * ========================================================================
 * 
 * Features:
 * ✅ Connection pooling - riutilizzo singola connessione
 * ✅ Exponential backoff - retry intelligente su 429
 * ✅ Request deduplication - previene chiamate duplicate
 * ✅ Helius RPC optimized - configurato per massime performance
 * 
 * Rate Limits (Helius Free Tier):
 * - 100,000 requests/day
 * - ~1,157 requests/hour (~19 req/min)
 * - Burst: 100 req/sec
 * 
 * ========================================================================
 */

import { Connection, PublicKey, Commitment, ConnectionConfig } from '@solana/web3.js';

export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta') as 'devnet' | 'mainnet-beta';

// ✅ FIX CRITICO: Usa sempre Helius MAINNET invece di clusterApiUrl
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=8c51da3b-f506-42bb-9000-1cf7724b3846';

// ✅ FIX: Program ID corretto per BONK BATTLE MAINNET
// MUST MATCH: constants.ts BONK_BATTLE_PROGRAM_ID
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || '6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq'
);

/**
 * ========================================================================
 * CONNECTION MANAGER CLASS
 * ========================================================================
 */
class ConnectionManager {
  private static instance: ConnectionManager;
  private connection: Connection;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  private constructor() {
    // Configurazione ottimizzata per Helius
    const config: ConnectionConfig = {
      commitment: 'confirmed' as Commitment,
      confirmTransactionInitialTimeout: 60000, // 60s timeout
      disableRetryOnRateLimit: false, // Abilita retry automatico
      httpHeaders: {
        'Content-Type': 'application/json',
      },
    };

    this.connection = new Connection(SOLANA_RPC_URL, config);

    console.log('🔗 Connection Manager initialized');
    console.log('📊 RPC:', SOLANA_RPC_URL.split('?')[0] + '?api-key=***');
    console.log('⚙️  Program ID:', PROGRAM_ID.toString());
  }

  /**
   * Singleton pattern - una sola connessione per tutta l'app
   */
  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Get the shared connection instance
   */
  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Execute RPC call con retry logic ed exponential backoff
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationKey?: string,
    maxRetries: number = 3
  ): Promise<T> {
    // Request deduplication - se già in esecuzione, aspetta il risultato
    if (operationKey && this.pendingRequests.has(operationKey)) {
      console.log('🔄 Deduplicating request:', operationKey);
      return this.pendingRequests.get(operationKey)!;
    }

    const executeOperation = async (): Promise<T> => {
      let lastError: Error | null = null;
      let retryDelay = 1000; // Start with 1 second

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Track request count
          this.requestCount++;

          // Reset counter every hour
          const now = Date.now();
          if (now - this.lastResetTime > 3600000) {
            console.log(`📊 Requests last hour: ${this.requestCount}`);
            this.requestCount = 0;
            this.lastResetTime = now;
          }

          const result = await operation();

          // Clear from pending
          if (operationKey) {
            this.pendingRequests.delete(operationKey);
          }

          return result;

        } catch (error: any) {
          lastError = error;

          // Check if it's a rate limit error
          const isRateLimit =
            error.message?.includes('429') ||
            error.message?.includes('rate limit') ||
            error.message?.includes('Too Many Requests');

          if (isRateLimit && attempt < maxRetries) {
            console.warn(`⚠️ Rate limit hit (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${retryDelay}ms...`);

            await new Promise(resolve => setTimeout(resolve, retryDelay));

            // Exponential backoff: 1s -> 2s -> 4s
            retryDelay *= 2;
            continue;
          }

          // Se non è rate limit o abbiamo esaurito i retry, throw
          if (attempt === maxRetries) {
            console.error('❌ Max retries reached:', error.message);
            if (operationKey) {
              this.pendingRequests.delete(operationKey);
            }
            throw error;
          }
        }
      }

      // Should never reach here, but TypeScript needs it
      throw lastError || new Error('Unknown error');
    };

    // Store pending request if key provided
    if (operationKey) {
      const promise = executeOperation();
      this.pendingRequests.set(operationKey, promise);
      return promise;
    }

    return executeOperation();
  }

  /**
   * Get request statistics
   */
  public getStats() {
    return {
      requestCount: this.requestCount,
      pendingRequests: this.pendingRequests.size,
      timeSinceReset: Date.now() - this.lastResetTime,
    };
  }
}

/**
 * ========================================================================
 * EXPORTS
 * ========================================================================
 */

// Singleton instance
export const connectionManager = ConnectionManager.getInstance();

// Shared connection per tutta l'app
export const connection = connectionManager.getConnection();

/**
 * Helper per eseguire RPC calls con retry automatico
 * 
 * @example
 * const accountInfo = await executeWithRetry(
 *   () => connection.getAccountInfo(pubkey),
 *   `getAccountInfo-${pubkey.toString()}`
 * );
 */
export const executeWithRetry = <T>(
  operation: () => Promise<T>,
  operationKey?: string,
  maxRetries?: number
): Promise<T> => {
  return connectionManager.executeWithRetry(operation, operationKey, maxRetries);
};

/**
 * Get RPC stats
 */
export const getRpcStats = () => connectionManager.getStats();