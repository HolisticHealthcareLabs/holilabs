/**
 * Background Sync Queue
 * Manages offline writes and retry logic with exponential backoff
 *
 * Safety Invariants:
 * - QUINN: Sync failures are non-blocking - queue retries, never blocks clinical workflow
 * - CYRUS: Queue respects tenantId for isolation
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SyncQueueItem,
  SyncQueueEvent,
  SyncMethod,
  ClinicalResourceType,
  ConflictResolutionStrategy,
  ISyncQueue,
  IStorageBackend,
} from './types';

/**
 * In-memory storage backend for testing
 */
export class InMemorySyncStorage implements IStorageBackend {
  private store = new Map<string, unknown>();

  async get(key: string): Promise<unknown> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async keys(pattern?: string): Promise<string[]> {
    if (!pattern) return Array.from(this.store.keys());

    const regex = new RegExp(pattern);
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

/**
 * SyncQueue
 * Manages queuing of offline writes with automatic retry and exponential backoff
 */
export class SyncQueue implements ISyncQueue {
  private storage: IStorageBackend;
  private eventHandlers: Map<string, Set<(data: SyncQueueEvent) => void>> = new Map();
  private isProcessing = false;

  // Exponential backoff delays in milliseconds: 1s, 2s, 4s, 8s, 16s
  private readonly RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];

  constructor(storage?: IStorageBackend) {
    this.storage = storage || new InMemorySyncStorage();
  }

  /**
   * Enqueue a new sync item (offline write)
   */
  async enqueue(
    item: Omit<SyncQueueItem, 'id' | 'status' | 'retryCount' | 'createdAt'>,
  ): Promise<string> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const queueItem: SyncQueueItem = {
      ...item,
      id,
      status: 'PENDING',
      retryCount: 0,
      createdAt: now,
    };

    // Store in storage backend
    const key = this.getItemKey(id);
    await this.storage.set(key, queueItem);

    // Emit event
    this.emit('item-enqueued', {
      type: 'item-enqueued',
      itemId: id,
      resourceType: item.resourceType,
    });

    return id;
  }

  /**
   * Dequeue the next pending item
   * Marks the item as IN_FLIGHT so subsequent dequeue calls skip it.
   * Returns null if queue is empty.
   */
  async dequeue(): Promise<SyncQueueItem | null> {
    const allItems = await this.getAllItems();
    const pending = allItems.filter((item) => item.status === 'PENDING');

    if (pending.length === 0) return null;

    // Return oldest pending item (FIFO)
    const item = pending.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

    // Mark as IN_FLIGHT so it won't be dequeued again
    item.status = 'IN_FLIGHT';
    await this.storage.set(this.getItemKey(item.id), item);

    return item;
  }

  /**
   * Get current queue depth
   */
  async getQueueDepth(): Promise<number> {
    const allItems = await this.getAllItems();
    return allItems.filter((item) => item.status === 'PENDING' || item.status === 'IN_FLIGHT').length;
  }

  /**
   * Get the oldest pending item for monitoring
   */
  async getOldestPendingItem(): Promise<SyncQueueItem | null> {
    const allItems = await this.getAllItems();
    const pending = allItems.filter((item) => item.status === 'PENDING');

    if (pending.length === 0) return null;

    return pending.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
  }

  /**
   * Mark an item as successfully synced
   */
  async markCompleted(itemId: string): Promise<void> {
    const key = this.getItemKey(itemId);
    const item = (await this.storage.get(key)) as SyncQueueItem | null;

    if (!item) throw new Error(`Queue item not found: ${itemId}`);

    item.status = 'COMPLETED';
    await this.storage.set(key, item);

    this.emit('item-dequeued', {
      type: 'item-dequeued',
      itemId,
      status: 'COMPLETED',
    });
  }

  /**
   * Mark an item as failed with error message
   * QUINN: Never blocks - item stays queued for retry
   */
  async markFailed(itemId: string, error: string): Promise<void> {
    const key = this.getItemKey(itemId);
    const item = (await this.storage.get(key)) as SyncQueueItem | null;

    if (!item) throw new Error(`Queue item not found: ${itemId}`);

    item.retryCount += 1;
    item.lastError = error;
    item.lastAttemptAt = new Date().toISOString();

    // Check if we've exceeded max retries
    if (item.retryCount >= item.maxRetries) {
      item.status = 'FAILED';
      this.emit('item-dequeued', {
        type: 'item-dequeued',
        itemId,
        status: 'FAILED',
      });
    } else {
      // Reset to PENDING for next retry
      item.status = 'PENDING';
      this.emit('sync-failed', {
        type: 'sync-failed',
        itemId,
        error,
        retryCount: item.retryCount,
      });
    }

    await this.storage.set(key, item);
  }

  /**
   * Subscribe to sync queue events
   */
  on(event: string, handler: (data: SyncQueueEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, handler: (data: SyncQueueEvent) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Process all pending items in queue (single pass)
   * Each item is attempted at most once per process() call.
   * Failed items remain PENDING for the next process() invocation.
   * QUINN: Failures are non-blocking - retried on next pass, never blocks clinical workflow
   */
  async process(syncFn: (item: SyncQueueItem) => Promise<void>): Promise<void> {
    if (this.isProcessing) return; // Prevent concurrent processing

    this.isProcessing = true;

    try {
      // Snapshot all pending items at the start of this pass
      const allItems = await this.getAllItems();
      const pendingItems = allItems
        .filter((item) => item.status === 'PENDING')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (pendingItems.length === 0) {
        return;
      }

      const oldestAge = Date.now() - new Date(pendingItems[0].createdAt).getTime();

      this.emit('sync-started', {
        type: 'sync-started',
        itemCount: pendingItems.length,
        oldestItemAgeMs: oldestAge,
      });

      let completedCount = 0;
      let failedCount = 0;

      for (const item of pendingItems) {
        try {
          // Mark as in-flight
          const key = this.getItemKey(item.id);
          item.status = 'IN_FLIGHT';
          await this.storage.set(key, item);

          // Attempt sync (no sleep in single-pass mode — delays are for real-time retry)
          await syncFn(item);
          await this.markCompleted(item.id);
          completedCount += 1;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          await this.markFailed(item.id, errorMsg);
          failedCount += 1;
          // QUINN: Continue processing other items despite failure
        }
      }

      if (completedCount > 0 || failedCount > 0) {
        this.emit('sync-completed', {
          type: 'sync-completed',
          itemsCompleted: completedCount,
          itemsFailed: failedCount,
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get retry delay for an item
   */
  getRetryDelay(retryCount: number): number {
    const index = Math.min(retryCount, this.RETRY_DELAYS_MS.length - 1);
    return this.RETRY_DELAYS_MS[index];
  }

  /**
   * Clear all completed items from queue
   */
  async clearCompleted(): Promise<void> {
    const allItems = await this.getAllItems();
    const completed = allItems.filter((item) => item.status === 'COMPLETED');

    for (const item of completed) {
      const key = this.getItemKey(item.id);
      await this.storage.delete(key);
    }
  }

  /**
   * Get all items in queue
   */
  private async getAllItems(): Promise<SyncQueueItem[]> {
    const allKeys = await this.storage.keys();
    const itemKeys = allKeys.filter((k) => k.startsWith('queue-item:'));

    const items: SyncQueueItem[] = [];
    for (const key of itemKeys) {
      const item = (await this.storage.get(key)) as SyncQueueItem;
      items.push(item);
    }

    return items;
  }

  /**
   * Generate storage key for queue item
   */
  private getItemKey(itemId: string): string {
    return `queue-item:${itemId}`;
  }

  /**
   * Emit event to all listeners
   */
  private emit(eventType: string, data: SyncQueueEvent): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      }
    }
  }

  /**
   * Get queue statistics
   */
  async getStatistics(): Promise<{
    totalItems: number;
    pendingItems: number;
    failedItems: number;
    completedItems: number;
    oldestItemAgeMs: number | null;
  }> {
    const allItems = await this.getAllItems();
    const pendingCount = allItems.filter((i) => i.status === 'PENDING' || i.status === 'IN_FLIGHT').length;
    const failedCount = allItems.filter((i) => i.status === 'FAILED').length;
    const completedCount = allItems.filter((i) => i.status === 'COMPLETED').length;

    const oldestItem = await this.getOldestPendingItem();
    const oldestAgeMs = oldestItem
      ? Date.now() - new Date(oldestItem.createdAt).getTime()
      : null;

    return {
      totalItems: allItems.length,
      pendingItems: pendingCount,
      failedItems: failedCount,
      completedItems: completedCount,
      oldestItemAgeMs: oldestAgeMs,
    };
  }
}
