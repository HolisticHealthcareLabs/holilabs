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

const DB_NAME = 'HoliLabsOfflineDB';
const DB_VERSION = 1;
const QUEUE_STORE = 'syncQueue';

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

class OfflineQueue {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

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
  async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    if (!this.db) await this.init();

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queuedOp: QueuedOperation = {
      id,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      ...operation,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.add(queuedOp);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending operations
   */
  async getPending(): Promise<QueuedOperation[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readonly');
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
  async getAll(): Promise<QueuedOperation[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update operation status
   */
  async updateStatus(
    id: string,
    status: QueuedOperation['status'],
    error?: string
  ): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.status = status;
          if (error) operation.error = error;
          if (status === 'processing') operation.retryCount++;

          const putRequest = store.put(operation);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Operation not found'));
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Delete completed or failed operations
   */
  async cleanup(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.db) await this.init();

    const cutoffTime = Date.now() - olderThanMs;
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const operation: QueuedOperation = cursor.value;
          // Delete completed/failed operations older than cutoff
          if (
            (operation.status === 'completed' || operation.status === 'failed') &&
            operation.timestamp < cutoffTime
          ) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Process queue (execute pending operations)
   */
  async processQueue(): Promise<{ succeeded: number; failed: number }> {
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
        } else {
          const errorText = await response.text();
          await this.updateStatus(operation.id, 'pending', `HTTP ${response.status}: ${errorText}`);
          failed++;
          console.error(`❌ Failed to sync operation ${operation.id}: ${errorText}`);
        }
      } catch (error: any) {
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
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();

/**
 * Helper function to queue an API call
 */
export async function queueAPICall(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  body?: any,
  headers?: Record<string, string>,
  maxRetries: number = 3
): Promise<string> {
  return offlineQueue.enqueue({
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
      const result = await offlineQueue.processQueue();
      console.log(`✅ Sync complete: ${result.succeeded} succeeded, ${result.failed} failed`);

      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Holi Labs - Sincronización completa', {
          body: `${result.succeeded} cambios sincronizados exitosamente`,
          icon: '/icon-192x192.png',
        });
      }
    } catch (error) {
      console.error('❌ Error processing queue:', error);
    }
  });

  // Periodic cleanup (every 24 hours)
  setInterval(async () => {
    const deleted = await offlineQueue.cleanup();
    console.log(`🧹 Cleaned up ${deleted} old operations`);
  }, 24 * 60 * 60 * 1000);
}
