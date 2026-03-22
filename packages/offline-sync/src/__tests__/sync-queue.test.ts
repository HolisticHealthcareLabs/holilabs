/**
 * Sync Queue Tests
 * Test background sync with QUINN invariant (non-blocking failures)
 */

import { SyncQueue, InMemorySyncStorage } from '../sync-queue';
import { SyncQueueItem } from '../types';

describe('SyncQueue', () => {
  let queue: SyncQueue;
  let storage: InMemorySyncStorage;

  beforeEach(() => {
    storage = new InMemorySyncStorage();
    queue = new SyncQueue(storage);
  });

  describe('Queue Operations', () => {
    it('should enqueue items', async () => {
      const itemId = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'vital-signs',
        method: 'POST',
        url: '/api/vitals',
        body: { heart_rate: 72 },
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });

      expect(itemId).toBeDefined();
      expect(typeof itemId).toBe('string');
    });

    it('should dequeue items FIFO', async () => {
      const id1 = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'vital-signs',
        method: 'POST',
        url: '/api/vitals',
        body: { heart_rate: 72 },
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });

      const id2 = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'lab-results',
        method: 'POST',
        url: '/api/labs',
        body: { result: 'positive' },
        maxRetries: 5,
        conflictResolution: 'SERVER_WINS',
      });

      const first = await queue.dequeue();
      expect(first?.id).toBe(id1);

      const second = await queue.dequeue();
      expect(second?.id).toBe(id2);
    });

    it('should return null when queue is empty', async () => {
      const item = await queue.dequeue();
      expect(item).toBeNull();
    });

    it('should track queue depth', async () => {
      const depth1 = await queue.getQueueDepth();
      expect(depth1).toBe(0);

      await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'vital-signs',
        method: 'POST',
        url: '/api/vitals',
        body: { heart_rate: 72 },
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });

      const depth2 = await queue.getQueueDepth();
      expect(depth2).toBe(1);
    });

    it('should track oldest pending item', async () => {
      const id = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'vital-signs',
        method: 'POST',
        url: '/api/vitals',
        body: { heart_rate: 72 },
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });

      const oldest = await queue.getOldestPendingItem();
      expect(oldest?.id).toBe(id);
    });
  });

  describe('Item Lifecycle', () => {
    it('should mark items as completed', async () => {
      const itemId = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'vital-signs',
        method: 'POST',
        url: '/api/vitals',
        body: { heart_rate: 72 },
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });

      await queue.markCompleted(itemId);

      const depth = await queue.getQueueDepth();
      expect(depth).toBe(0); // Completed items don't count toward depth
    });

    it('should track retry count on failure', async () => {
      const itemId = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'vital-signs',
        method: 'POST',
        url: '/api/vitals',
        body: { heart_rate: 72 },
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });

      await queue.markFailed(itemId, 'Network error');

      // Item should still be in queue for retry (QUINN: non-blocking)
      const depth = await queue.getQueueDepth();
      expect(depth).toBe(1);

      const item = await queue.dequeue();
      expect(item?.retryCount).toBe(1);
      expect(item?.lastError).toBe('Network error');
    });

    it('should remove item after max retries exceeded', async () => {
      const itemId = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'vital-signs',
        method: 'POST',
        url: '/api/vitals',
        body: { heart_rate: 72 },
        maxRetries: 2, // Max 2 retries
        conflictResolution: 'LAST_WRITE_WINS',
      });

      // First failure
      await queue.markFailed(itemId, 'Network error 1');
      let depth = await queue.getQueueDepth();
      expect(depth).toBe(1);

      let item = await queue.dequeue();
      expect(item?.retryCount).toBe(1);

      // Second failure
      await queue.markFailed(itemId, 'Network error 2');
      depth = await queue.getQueueDepth();
      expect(depth).toBe(0); // Max retries exceeded, removed from active queue

      // Item should be in FAILED state
      item = await queue.dequeue();
      expect(item).toBeNull(); // No more pending items
    });
  });

  describe('Retry Delays', () => {
    it('should use exponential backoff: 1s, 2s, 4s, 8s, 16s', () => {
      expect(queue.getRetryDelay(0)).toBe(1000);
      expect(queue.getRetryDelay(1)).toBe(2000);
      expect(queue.getRetryDelay(2)).toBe(4000);
      expect(queue.getRetryDelay(3)).toBe(8000);
      expect(queue.getRetryDelay(4)).toBe(16000);
      expect(queue.getRetryDelay(5)).toBe(16000); // Capped at max
    });
  });

  describe('QUINN: Non-blocking Sync Failures', () => {
    it('should not block on sync failure', async () => {
      const item1Id = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'vital-signs',
        method: 'POST',
        url: '/api/vitals-1',
        body: { heart_rate: 72 },
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });

      const item2Id = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'lab-results',
        method: 'POST',
        url: '/api/labs-1',
        body: { result: 'positive' },
        maxRetries: 5,
        conflictResolution: 'SERVER_WINS',
      });

      let completedCount = 0;
      let failedCount = 0;

      const syncFn = jest.fn(async (item: SyncQueueItem) => {
        if (item.id === item1Id) {
          throw new Error('Network timeout');
        }
        // item2 succeeds
      });

      queue.on('sync-completed', (event) => {
        if (event.type === 'sync-completed') {
          completedCount = event.itemsCompleted;
          failedCount = event.itemsFailed;
        }
      });

      await queue.process(syncFn);

      // item2 should be completed despite item1 failure
      expect(syncFn).toHaveBeenCalledTimes(2);
      expect(completedCount).toBe(1); // item2 succeeded
      expect(failedCount).toBe(1); // item1 failed but queued for retry
    });

    it('should continue processing after failure', async () => {
      const itemIds: string[] = [];

      for (let i = 0; i < 5; i++) {
        const id = await queue.enqueue({
          tenantId: 'tenant-123',
          resourceType: 'vital-signs',
          method: 'POST',
          url: `/api/vitals-${i}`,
          body: { heart_rate: 72 + i },
          maxRetries: 5,
          conflictResolution: 'LAST_WRITE_WINS',
        });
        itemIds.push(id);
      }

      const syncFn = jest.fn(async (item: SyncQueueItem) => {
        // Fail on third item
        if (itemIds.indexOf(item.id) === 2) {
          throw new Error('Simulated failure');
        }
      });

      await queue.process(syncFn);

      // Should have attempted all items
      expect(syncFn).toHaveBeenCalledTimes(5);

      // First, second, fourth, and fifth should be completed
      const depth = await queue.getQueueDepth();
      expect(depth).toBe(1); // Only the failed item remains pending
    });
  });

  describe('Queue Processing', () => {
    it('should process all pending items', async () => {
      const ids = [];

      for (let i = 0; i < 3; i++) {
        const id = await queue.enqueue({
          tenantId: 'tenant-123',
          resourceType: 'vital-signs',
          method: 'POST',
          url: `/api/vitals-${i}`,
          body: { heart_rate: 72 },
          maxRetries: 5,
          conflictResolution: 'LAST_WRITE_WINS',
        });
        ids.push(id);
      }

      const syncFn = jest.fn().mockResolvedValue(undefined);
      await queue.process(syncFn);

      expect(syncFn).toHaveBeenCalledTimes(3);

      // All items should be completed
      const depth = await queue.getQueueDepth();
      expect(depth).toBe(0);
    });

    it('should emit sync events', async () => {
      const itemId = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'vital-signs',
        method: 'POST',
        url: '/api/vitals',
        body: { heart_rate: 72 },
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });

      const events: any[] = [];

      queue.on('sync-started', (event) => events.push(event));
      queue.on('sync-completed', (event) => events.push(event));
      queue.on('item-enqueued', (event) => events.push(event));

      const syncFn = jest.fn().mockResolvedValue(undefined);
      await queue.process(syncFn);

      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === 'sync-started')).toBe(true);
      expect(events.some((e) => e.type === 'sync-completed')).toBe(true);
    });

    it('should prevent concurrent processing', async () => {
      const itemId = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'vital-signs',
        method: 'POST',
        url: '/api/vitals',
        body: { heart_rate: 72 },
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });

      let callCount = 0;
      const syncFn = jest.fn(async () => {
        callCount++;
        // Simulate long operation
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const promise1 = queue.process(syncFn);
      const promise2 = queue.process(syncFn); // This should not process concurrently

      await Promise.all([promise1, promise2]);

      // Should be called once due to concurrency protection
      expect(syncFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Statistics', () => {
    it('should track queue statistics', async () => {
      const id1 = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'vital-signs',
        method: 'POST',
        url: '/api/vitals-1',
        body: { heart_rate: 72 },
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });

      const id2 = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'lab-results',
        method: 'POST',
        url: '/api/labs-1',
        body: { result: 'positive' },
        maxRetries: 5,
        conflictResolution: 'SERVER_WINS',
      });

      await queue.markFailed(id1, 'Network error');

      const stats = await queue.getStatistics();

      expect(stats.totalItems).toBe(2);
      expect(stats.pendingItems).toBe(2); // Both still pending (one needs retry)
      expect(stats.failedItems).toBe(0); // Not yet at max retries
    });
  });

  describe('Clear Completed Items', () => {
    it('should clear completed items from storage', async () => {
      const id1 = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'vital-signs',
        method: 'POST',
        url: '/api/vitals-1',
        body: { heart_rate: 72 },
        maxRetries: 5,
        conflictResolution: 'LAST_WRITE_WINS',
      });

      const id2 = await queue.enqueue({
        tenantId: 'tenant-123',
        resourceType: 'lab-results',
        method: 'POST',
        url: '/api/labs-1',
        body: { result: 'positive' },
        maxRetries: 5,
        conflictResolution: 'SERVER_WINS',
      });

      await queue.markCompleted(id1);
      await queue.markCompleted(id2);

      let stats = await queue.getStatistics();
      expect(stats.completedItems).toBe(2);

      await queue.clearCompleted();

      stats = await queue.getStatistics();
      expect(stats.completedItems).toBe(0);
    });
  });
});
