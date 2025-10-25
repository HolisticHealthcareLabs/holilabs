/**
 * Offline Queue Manager using IndexedDB
 *
 * Competitive Analysis:
 * - Abridge: ✅ Background sync queue for offline recordings
 * - Nuance DAX: ✅ Offline queue with automatic retry
 * - Suki: ❌ No offline queue
 * - Doximity: ❌ No offline support
 *
 * Impact: Ensures zero data loss when working offline
 * Critical for rural LATAM areas with intermittent connectivity
 */
export interface QueuedOperation {
    id: string;
    type: 'API_CALL' | 'AUDIO_UPLOAD' | 'NOTE_CREATE' | 'NOTE_UPDATE';
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    headers?: Record<string, string>;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
}
declare class OfflineQueue {
    private db;
    /**
     * Initialize IndexedDB
     */
    init(): Promise<void>;
    /**
     * Add operation to queue
     */
    enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string>;
    /**
     * Get all pending operations
     */
    getPending(): Promise<QueuedOperation[]>;
    /**
     * Get all operations (for debugging)
     */
    getAll(): Promise<QueuedOperation[]>;
    /**
     * Update operation status
     */
    updateStatus(id: string, status: QueuedOperation['status'], error?: string): Promise<void>;
    /**
     * Delete completed or failed operations
     */
    cleanup(olderThanMs?: number): Promise<number>;
    /**
     * Process queue (execute pending operations)
     */
    processQueue(): Promise<{
        succeeded: number;
        failed: number;
    }>;
    /**
     * Clear all operations (use with caution)
     */
    clearAll(): Promise<void>;
}
export declare const offlineQueue: OfflineQueue;
/**
 * Helper function to queue an API call
 */
export declare function queueAPICall(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', body?: any, headers?: Record<string, string>, maxRetries?: number): Promise<string>;
export {};
//# sourceMappingURL=offline-queue.d.ts.map