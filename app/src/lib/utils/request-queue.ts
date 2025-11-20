/**
 * ========================================================================
 * BONK BATTLE - ADVANCED REQUEST QUEUE
 * ========================================================================
 * 
 * Features:
 * ✅ Rate limiting - controllo preciso timing
 * ✅ Exponential backoff - gestione 429 intelligente
 * ✅ Priority queue - richieste critiche prima
 * ✅ Request deduplication - previene duplicati
 * ✅ Statistics tracking - monitora performance
 * 
 * ========================================================================
 */

interface QueuedRequest<T> {
    operation: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: any) => void;
    key?: string;
    priority: number;
    addedAt: number;
}

export class RequestQueue {
    private queue: QueuedRequest<any>[] = [];
    private processing = false;
    private lastRequestTime = 0;
    private delayMs: number;
    private pendingKeys: Set<string> = new Set();
    private retryDelay = 1000; // Start with 1s
    private consecutiveErrors = 0;
    private successCount = 0;
    private errorCount = 0;

    constructor(delayMs: number = 100) {
        // ⭐ Ridotto a 100ms invece di 300ms
        // Helius free tier può gestire burst di 100 req/sec
        this.delayMs = delayMs;
    }

    /**
     * Add request to queue con priority e deduplication
     * 
     * @param operation - Async operation to execute
     * @param options - Optional configuration
     * @param options.key - Unique key for deduplication
     * @param options.priority - Higher = more important (default: 0)
     * 
     * @example
     * // Normal request
     * await queue.add(() => fetchData());
     * 
     * // High priority request
     * await queue.add(() => fetchCriticalData(), { priority: 10 });
     * 
     * // Deduplicated request
     * await queue.add(() => fetchData(), { key: 'token-ABC123' });
     */
    add<T>(
        operation: () => Promise<T>,
        options: {
            key?: string;
            priority?: number;
        } = {}
    ): Promise<T> {
        const { key, priority = 0 } = options;

        // Request deduplication
        if (key && this.pendingKeys.has(key)) {
            console.log('🔄 Skipping duplicate request:', key);
            return Promise.reject(new Error('Duplicate request in queue'));
        }

        return new Promise((resolve, reject) => {
            const request: QueuedRequest<T> = {
                operation,
                resolve,
                reject,
                key,
                priority,
                addedAt: Date.now(),
            };

            // Add to queue based on priority
            if (priority > 0) {
                // High priority - insert at appropriate position
                const insertIndex = this.queue.findIndex(r => r.priority < priority);
                if (insertIndex === -1) {
                    this.queue.push(request);
                } else {
                    this.queue.splice(insertIndex, 0, request);
                }
            } else {
                // Normal priority - add to end
                this.queue.push(request);
            }

            if (key) {
                this.pendingKeys.add(key);
            }

            this.process();
        });
    }

    /**
     * Process queue con exponential backoff
     */
    private async process() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            const now = Date.now();
            const timeSinceLast = now - this.lastRequestTime;

            // Respect rate limit delay
            if (timeSinceLast < this.delayMs) {
                await new Promise(resolve =>
                    setTimeout(resolve, this.delayMs - timeSinceLast)
                );
            }

            const task = this.queue.shift();
            if (!task) continue;

            try {
                this.lastRequestTime = Date.now();
                const result = await task.operation();

                // Success - reset error counter and delay
                this.consecutiveErrors = 0;
                this.retryDelay = 1000;
                this.successCount++;

                task.resolve(result);

                // Remove from pending
                if (task.key) {
                    this.pendingKeys.delete(task.key);
                }

            } catch (error: any) {
                // Check if rate limit error
                const isRateLimit =
                    error.message?.includes('429') ||
                    error.message?.includes('rate limit') ||
                    error.message?.includes('Too Many Requests');

                if (isRateLimit) {
                    this.consecutiveErrors++;
                    this.errorCount++;

                    console.warn(
                        `⚠️ Rate limit hit (${this.consecutiveErrors} consecutive), ` +
                        `backing off for ${this.retryDelay}ms...`
                    );

                    // Exponential backoff: 1s -> 2s -> 4s -> 8s (max 8s)
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                    this.retryDelay = Math.min(this.retryDelay * 2, 8000);

                    // Re-add to front of queue for retry
                    this.queue.unshift(task);
                    continue;
                }

                // Not rate limit - reject immediately
                this.errorCount++;
                task.reject(error);
                if (task.key) {
                    this.pendingKeys.delete(task.key);
                }
            }
        }

        this.processing = false;
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            queueLength: this.queue.length,
            pendingKeys: this.pendingKeys.size,
            currentDelay: this.delayMs,
            retryDelay: this.retryDelay,
            consecutiveErrors: this.consecutiveErrors,
            processing: this.processing,
            successCount: this.successCount,
            errorCount: this.errorCount,
            successRate: this.successCount / (this.successCount + this.errorCount) || 0,
        };
    }

    /**
     * Clear all pending requests
     */
    clear() {
        this.queue.forEach(task => {
            task.reject(new Error('Queue cleared'));
            if (task.key) {
                this.pendingKeys.delete(task.key);
            }
        });
        this.queue = [];
        this.consecutiveErrors = 0;
        this.retryDelay = 1000;
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.successCount = 0;
        this.errorCount = 0;
    }
}

/**
 * ========================================================================
 * GLOBAL INSTANCES
 * ========================================================================
 */

// ⭐ RPC Queue - per chiamate blockchain (100ms delay)
// Ridotto da 300ms per sfruttare meglio Helius burst capacity
export const rpcQueue = new RequestQueue(100);

// ⭐ API Queue - per chiamate API/Supabase (50ms delay)
// Supabase ha rate limits molto più alti
export const apiQueue = new RequestQueue(50);

/**
 * ========================================================================
 * HELPERS
 * ========================================================================
 */

/**
 * Execute RPC operation con queue automatica
 * 
 * @example
 * const data = await queuedRpcCall(
 *   () => connection.getAccountInfo(pubkey),
 *   'account-ABC123',
 *   10 // high priority
 * );
 */
export async function queuedRpcCall<T>(
    operation: () => Promise<T>,
    key?: string,
    priority?: number
): Promise<T> {
    return rpcQueue.add(operation, { key, priority });
}

/**
 * Execute API operation con queue automatica
 * 
 * @example
 * const data = await queuedApiCall(
 *   () => supabase.from('tokens').select(),
 *   'tokens-list'
 * );
 */
export async function queuedApiCall<T>(
    operation: () => Promise<T>,
    key?: string
): Promise<T> {
    return apiQueue.add(operation, { key });
}

/**
 * Get all queue stats
 */
export function getAllQueueStats() {
    return {
        rpc: rpcQueue.getStats(),
        api: apiQueue.getStats(),
    };
}

/**
 * Log queue stats (dev helper)
 */
export function logQueueStats() {
    const stats = getAllQueueStats();
    console.log('📊 Queue Statistics:', {
        rpc: {
            pending: stats.rpc.queueLength,
            successRate: `${(stats.rpc.successRate * 100).toFixed(1)}%`,
            errors: stats.rpc.consecutiveErrors,
        },
        api: {
            pending: stats.api.queueLength,
            successRate: `${(stats.api.successRate * 100).toFixed(1)}%`,
        },
    });
}