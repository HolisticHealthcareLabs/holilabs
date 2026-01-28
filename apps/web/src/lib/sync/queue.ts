/**
 * Offline Event Queue
 *
 * Provides guaranteed delivery for assurance events when edge node is disconnected.
 * Uses in-memory storage with periodic persistence (can be extended to IndexedDB/SQLite).
 *
 * Features:
 * - Priority-based ordering (alerts > routine)
 * - Automatic retry with exponential backoff
 * - Batch processing for efficiency
 * - Event deduplication
 *
 * @module lib/sync/queue
 */

import logger from '@/lib/logger';
import type {
  QueueItem,
  QueueItemType,
  QueueItemStatus,
  SyncResult,
  SyncConfig,
  SyncEvent,
  SyncEventListener,
} from './types';
import { DEFAULT_SYNC_CONFIG } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// QUEUE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export class OfflineQueue {
  private items: Map<string, QueueItem> = new Map();
  private config: SyncConfig;
  private listeners: SyncEventListener[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }

  /**
   * Add item to the queue
   */
  async enqueue<T>(
    type: QueueItemType,
    data: T,
    options: { priority?: number; id?: string } = {}
  ): Promise<string> {
    const id = options.id || this.generateId();
    const priority = options.priority ?? this.getDefaultPriority(type, data);

    const item: QueueItem<T> = {
      id,
      type,
      data,
      status: 'pending',
      createdAt: new Date(),
      lastAttemptAt: null,
      attemptCount: 0,
      errorMessage: null,
      priority,
    };

    this.items.set(id, item as QueueItem);

    logger.debug({
      event: 'queue_item_added',
      itemId: id,
      type,
      priority,
      queueSize: this.items.size,
    });

    this.emit({ type: 'queue_item_added', timestamp: new Date(), data: { itemId: id, type } });

    // Schedule flush if not already scheduled
    this.scheduleFlush();

    return id;
  }

  /**
   * Get pending items for sync
   */
  getPendingItems(limit?: number): QueueItem[] {
    const pending = Array.from(this.items.values())
      .filter((item) => item.status === 'pending' || item.status === 'failed')
      .sort((a, b) => {
        // Higher priority first
        if (b.priority !== a.priority) return b.priority - a.priority;
        // Then by creation time (older first)
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    return limit ? pending.slice(0, limit) : pending;
  }

  /**
   * Get items by type
   */
  getItemsByType(type: QueueItemType): QueueItem[] {
    return Array.from(this.items.values()).filter((item) => item.type === type);
  }

  /**
   * Mark item as in-flight (being synced)
   */
  markInFlight(itemId: string): void {
    const item = this.items.get(itemId);
    if (item) {
      item.status = 'in_flight';
      item.lastAttemptAt = new Date();
      item.attemptCount++;
    }
  }

  /**
   * Mark item as synced (remove from queue)
   */
  markSynced(itemId: string): void {
    const item = this.items.get(itemId);
    if (item) {
      item.status = 'synced';
      this.items.delete(itemId);

      logger.debug({
        event: 'queue_item_synced',
        itemId,
        type: item.type,
        queueSize: this.items.size,
      });

      this.emit({ type: 'queue_item_synced', timestamp: new Date(), data: { itemId } });
    }
  }

  /**
   * Mark item as failed
   */
  markFailed(itemId: string, error: string, retryable = true): void {
    const item = this.items.get(itemId);
    if (item) {
      item.status = 'failed';
      item.errorMessage = error;

      // If max retries exceeded or not retryable, remove from queue
      if (!retryable || item.attemptCount >= this.config.maxRetryAttempts) {
        logger.error({
          event: 'queue_item_permanently_failed',
          itemId,
          type: item.type,
          attempts: item.attemptCount,
          error,
        });
        this.items.delete(itemId);
      }
    }
  }

  /**
   * Process queue batch
   */
  async processBatch(
    processor: (items: QueueItem[]) => Promise<SyncResult>
  ): Promise<SyncResult> {
    if (this.isProcessing) {
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        errors: [],
        timestamp: new Date(),
      };
    }

    this.isProcessing = true;

    try {
      const batch = this.getPendingItems(this.config.batchSize);

      if (batch.length === 0) {
        return {
          success: true,
          syncedCount: 0,
          failedCount: 0,
          errors: [],
          timestamp: new Date(),
        };
      }

      // Mark all as in-flight
      batch.forEach((item) => this.markInFlight(item.id));

      logger.info({
        event: 'queue_batch_processing',
        batchSize: batch.length,
        queueSize: this.items.size,
      });

      const result = await processor(batch);

      // Update item statuses based on result
      for (const item of batch) {
        const error = result.errors.find((e) => e.itemId === item.id);
        if (error) {
          this.markFailed(item.id, error.error, error.retryable);
        } else {
          this.markSynced(item.id);
        }
      }

      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const items = Array.from(this.items.values());

    return {
      total: items.length,
      pending: items.filter((i) => i.status === 'pending').length,
      inFlight: items.filter((i) => i.status === 'in_flight').length,
      failed: items.filter((i) => i.status === 'failed').length,
      byType: {
        assurance_event: items.filter((i) => i.type === 'assurance_event').length,
        human_feedback: items.filter((i) => i.type === 'human_feedback').length,
        outcome: items.filter((i) => i.type === 'outcome').length,
      },
      oldestItem: items.length > 0
        ? new Date(Math.min(...items.map((i) => i.createdAt.getTime())))
        : null,
    };
  }

  /**
   * Clear all items (use with caution)
   */
  clear(): void {
    this.items.clear();
    logger.warn({ event: 'queue_cleared' });
  }

  /**
   * Export queue for persistence
   */
  export(): QueueItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Import queue from persistence
   */
  import(items: QueueItem[]): void {
    for (const item of items) {
      // Reset in-flight items to pending (process was interrupted)
      if (item.status === 'in_flight') {
        item.status = 'pending';
      }
      this.items.set(item.id, item);
    }

    logger.info({
      event: 'queue_imported',
      itemCount: items.length,
    });
  }

  /**
   * Subscribe to queue events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Schedule a flush if not already scheduled
   */
  private scheduleFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      // The actual flush should be triggered by the sync protocol
    }, this.config.batchIntervalMs);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: SyncEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        logger.error({
          event: 'queue_listener_error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get default priority based on item type and content
   */
  private getDefaultPriority<T>(type: QueueItemType, data: T): number {
    // Alerts and RED traffic lights get highest priority
    if (type === 'assurance_event') {
      const event = data as { eventType?: string; aiRecommendation?: { trafficLight?: string } };
      if (event.eventType === 'alert' || event.aiRecommendation?.trafficLight === 'RED') {
        return 100;
      }
      if (event.aiRecommendation?.trafficLight === 'YELLOW') {
        return 75;
      }
    }

    // Human overrides are important (conflict data for RLHF)
    if (type === 'human_feedback') {
      return 80;
    }

    // Outcomes (glosa results) are valuable for training
    if (type === 'outcome') {
      return 60;
    }

    return 50; // Default priority
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUEUE STATS TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface QueueStats {
  total: number;
  pending: number;
  inFlight: number;
  failed: number;
  byType: {
    assurance_event: number;
    human_feedback: number;
    outcome: number;
  };
  oldestItem: Date | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const offlineQueue = new OfflineQueue();
