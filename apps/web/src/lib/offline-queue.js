"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.offlineQueue = void 0;
exports.queueAPICall = queueAPICall;
const DB_NAME = 'HoliLabsOfflineDB';
const DB_VERSION = 1;
const QUEUE_STORE = 'syncQueue';
class OfflineQueue {
    db = null;
    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Create queue store if it doesn't exist
                if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                    const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }
    /**
     * Add operation to queue
     */
    async enqueue(operation) {
        if (!this.db)
            await this.init();
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const queuedOp = {
            id,
            timestamp: Date.now(),
            retryCount: 0,
            status: 'pending',
            ...operation,
        };
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.add(queuedOp);
            request.onsuccess = () => resolve(id);
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * Get all pending operations
     */
    async getPending() {
        if (!this.db)
            await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([QUEUE_STORE], 'readonly');
            const store = transaction.objectStore(QUEUE_STORE);
            const index = store.index('status');
            const request = index.getAll('pending');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * Get all operations (for debugging)
     */
    async getAll() {
        if (!this.db)
            await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([QUEUE_STORE], 'readonly');
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * Update operation status
     */
    async updateStatus(id, status, error) {
        if (!this.db)
            await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(QUEUE_STORE);
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const operation = getRequest.result;
                if (operation) {
                    operation.status = status;
                    if (error)
                        operation.error = error;
                    if (status === 'processing')
                        operation.retryCount++;
                    const putRequest = store.put(operation);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                }
                else {
                    reject(new Error('Operation not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }
    /**
     * Delete completed or failed operations
     */
    async cleanup(olderThanMs = 7 * 24 * 60 * 60 * 1000) {
        if (!this.db)
            await this.init();
        const cutoffTime = Date.now() - olderThanMs;
        let deletedCount = 0;
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.openCursor();
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const operation = cursor.value;
                    // Delete completed/failed operations older than cutoff
                    if ((operation.status === 'completed' || operation.status === 'failed') &&
                        operation.timestamp < cutoffTime) {
                        cursor.delete();
                        deletedCount++;
                    }
                    cursor.continue();
                }
                else {
                    resolve(deletedCount);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
    /**
     * Process queue (execute pending operations)
     */
    async processQueue() {
        const pending = await this.getPending();
        let succeeded = 0;
        let failed = 0;
        for (const operation of pending) {
            try {
                // Skip if max retries exceeded
                if (operation.retryCount >= operation.maxRetries) {
                    await this.updateStatus(operation.id, 'failed', 'Max retries exceeded');
                    failed++;
                    continue;
                }
                // Mark as processing
                await this.updateStatus(operation.id, 'processing');
                // Execute the API call
                const response = await fetch(operation.endpoint, {
                    method: operation.method,
                    headers: {
                        'Content-Type': 'application/json',
                        ...operation.headers,
                    },
                    body: operation.body ? JSON.stringify(operation.body) : undefined,
                });
                if (response.ok) {
                    await this.updateStatus(operation.id, 'completed');
                    succeeded++;
                    console.log(`✅ Synced operation ${operation.id} (${operation.type})`);
                }
                else {
                    const errorText = await response.text();
                    await this.updateStatus(operation.id, 'pending', `HTTP ${response.status}: ${errorText}`);
                    failed++;
                    console.error(`❌ Failed to sync operation ${operation.id}: ${errorText}`);
                }
            }
            catch (error) {
                await this.updateStatus(operation.id, 'pending', error.message);
                failed++;
                console.error(`❌ Error syncing operation ${operation.id}:`, error);
            }
        }
        return { succeeded, failed };
    }
    /**
     * Clear all operations (use with caution)
     */
    async clearAll() {
        if (!this.db)
            await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([QUEUE_STORE], 'readwrite');
            const store = transaction.objectStore(QUEUE_STORE);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}
// Singleton instance
exports.offlineQueue = new OfflineQueue();
/**
 * Helper function to queue an API call
 */
async function queueAPICall(endpoint, method, body, headers, maxRetries = 3) {
    return exports.offlineQueue.enqueue({
        type: 'API_CALL',
        endpoint,
        method,
        body,
        headers,
        maxRetries,
    });
}
/**
 * Auto-sync when online
 */
if (typeof window !== 'undefined') {
    // Process queue when coming online
    window.addEventListener('online', async () => {
        console.log('🌐 Connection restored - processing offline queue...');
        try {
            const result = await exports.offlineQueue.processQueue();
            console.log(`✅ Sync complete: ${result.succeeded} succeeded, ${result.failed} failed`);
            // Show notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Holi Labs - Sincronización completa', {
                    body: `${result.succeeded} cambios sincronizados exitosamente`,
                    icon: '/icon-192x192.png',
                });
            }
        }
        catch (error) {
            console.error('❌ Error processing queue:', error);
        }
    });
    // Periodic cleanup (every 24 hours)
    setInterval(async () => {
        const deleted = await exports.offlineQueue.cleanup();
        console.log(`🧹 Cleaned up ${deleted} old operations`);
    }, 24 * 60 * 60 * 1000);
}
//# sourceMappingURL=offline-queue.js.map