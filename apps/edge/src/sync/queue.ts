/**
 * Offline Queue Manager
 *
 * Queues events for cloud sync when connection is available.
 * Priority-based ordering: critical > high > routine
 * Automatic retry with exponential backoff.
 */

import { PrismaClient, QueueItem, LocalAssuranceEvent, LocalHumanFeedback } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { SyncConfig } from './index.js';
import { getConnectionStatus } from './connectivity.js';

let processorInterval: NodeJS.Timeout | null = null;
let cloudUrl: string = '';

type QueueItemType = 'assurance_event' | 'human_feedback' | 'outcome';
type Priority = 'critical' | 'high' | 'routine';

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  routine: 2,
};

const MAX_BATCH_SIZE = 50;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 300_000; // 5 minutes

/**
 * Queue an assurance event for cloud sync
 */
export async function queueAssuranceEvent(
  prisma: PrismaClient,
  event: LocalAssuranceEvent
): Promise<void> {
  const priority: Priority = event.humanOverride ? 'high' : 'routine';

  await prisma.queueItem.create({
    data: {
      type: 'assurance_event',
      priority,
      payload: JSON.stringify({
        id: event.id,
        patientHash: event.patientHash,
        encounterId: event.encounterId,
        eventType: event.eventType,
        inputContextSnapshot: event.inputContextSnapshot,
        aiRecommendation: event.aiRecommendation,
        aiConfidence: event.aiConfidence,
        aiProvider: event.aiProvider,
        aiLatencyMs: event.aiLatencyMs,
        humanDecision: event.humanDecision,
        humanOverride: event.humanOverride,
        overrideReason: event.overrideReason,
        ruleVersionId: event.ruleVersionId,
        clinicId: event.clinicId,
        createdAt: event.createdAt.toISOString(),
      }),
      status: 'pending',
    },
  });

  logger.debug('Assurance event queued', {
    eventId: event.id,
    priority,
  });
}

/**
 * Queue human feedback for cloud sync
 */
export async function queueHumanFeedback(
  prisma: PrismaClient,
  feedback: LocalHumanFeedback
): Promise<void> {
  // Human feedback is always high priority (affects RLHF)
  const priority: Priority = 'high';

  await prisma.queueItem.create({
    data: {
      type: 'human_feedback',
      priority,
      payload: JSON.stringify({
        id: feedback.id,
        assuranceEventId: feedback.assuranceEventId,
        feedbackType: feedback.feedbackType,
        feedbackValue: feedback.feedbackValue,
        feedbackSource: feedback.feedbackSource,
        createdAt: feedback.createdAt.toISOString(),
      }),
      status: 'pending',
    },
  });

  logger.debug('Human feedback queued', {
    feedbackId: feedback.id,
    priority,
  });
}

/**
 * Start the queue processor
 */
export async function startQueueProcessor(
  prisma: PrismaClient,
  config: SyncConfig
): Promise<void> {
  cloudUrl = config.cloudUrl;

  // Initial processing attempt
  await processQueue(prisma);

  // Set up interval
  processorInterval = setInterval(
    () => processQueue(prisma),
    config.queueProcessIntervalMs
  );

  logger.info('Queue processor started', {
    intervalMs: config.queueProcessIntervalMs,
  });
}

/**
 * Stop the queue processor
 */
export function stopQueueProcessor(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
  }
  logger.info('Queue processor stopped');
}

/**
 * Process pending queue items
 */
export async function processQueue(prisma: PrismaClient): Promise<void> {
  const connectionStatus = getConnectionStatus();

  if (connectionStatus === 'offline') {
    logger.debug('Skipping queue processing - offline');
    return;
  }

  try {
    // Get pending items ordered by priority and creation time
    const items = await prisma.queueItem.findMany({
      where: {
        status: 'pending',
        scheduledAt: { lte: new Date() },
      },
      orderBy: [
        { priority: 'asc' }, // critical < high < routine (alphabetical)
        { createdAt: 'asc' },
      ],
      take: MAX_BATCH_SIZE,
    });

    if (items.length === 0) {
      return;
    }

    logger.info(`Processing ${items.length} queued items`);

    // Group by type for batch processing
    const groupedItems = groupByType(items);

    for (const [type, typeItems] of Object.entries(groupedItems)) {
      await processItemGroup(prisma, type as QueueItemType, typeItems);
    }
  } catch (error) {
    logger.error('Queue processing error', { error });
  }
}

/**
 * Group items by type for batch processing
 */
function groupByType(items: QueueItem[]): Record<string, QueueItem[]> {
  return items.reduce((groups, item) => {
    const type = item.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(item);
    return groups;
  }, {} as Record<string, QueueItem[]>);
}

/**
 * Process a group of items of the same type
 */
async function processItemGroup(
  prisma: PrismaClient,
  type: QueueItemType,
  items: QueueItem[]
): Promise<void> {
  const endpoint = getEndpointForType(type);
  const payloads = items.map(item => JSON.parse(item.payload));

  try {
    // Mark as processing
    await prisma.queueItem.updateMany({
      where: { id: { in: items.map(i => i.id) } },
      data: { status: 'processing' },
    });

    // Send to cloud
    const response = await fetch(`${cloudUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Clinic-ID': process.env.CLINIC_ID || '',
        'X-Edge-Node-ID': process.env.EDGE_NODE_ID || 'unknown',
      },
      body: JSON.stringify({ items: payloads }),
    });

    if (response.ok) {
      // Mark as completed
      await prisma.queueItem.updateMany({
        where: { id: { in: items.map(i => i.id) } },
        data: {
          status: 'completed',
          processedAt: new Date(),
        },
      });

      // Update local records sync status
      await updateLocalRecordsSyncStatus(prisma, type, items, 'synced');

      logger.info(`Successfully synced ${items.length} ${type} items`);
    } else {
      throw new Error(`Cloud returned ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to sync ${type} items`, { error: message, count: items.length });

    // Handle retry with exponential backoff
    await handleRetry(prisma, items, message);
  }
}

/**
 * Get the cloud endpoint for a queue item type
 */
function getEndpointForType(type: QueueItemType): string {
  switch (type) {
    case 'assurance_event':
      return '/api/sync/assurance-events';
    case 'human_feedback':
      return '/api/sync/feedback';
    case 'outcome':
      return '/api/sync/outcomes';
    default:
      throw new Error(`Unknown queue item type: ${type}`);
  }
}

/**
 * Update local records after successful sync
 */
async function updateLocalRecordsSyncStatus(
  prisma: PrismaClient,
  type: QueueItemType,
  items: QueueItem[],
  status: 'synced' | 'failed'
): Promise<void> {
  const ids = items.map(item => {
    const payload = JSON.parse(item.payload);
    return payload.id;
  });

  switch (type) {
    case 'assurance_event':
      await prisma.localAssuranceEvent.updateMany({
        where: { id: { in: ids } },
        data: {
          syncStatus: status,
          syncedAt: status === 'synced' ? new Date() : undefined,
        },
      });
      break;
    case 'human_feedback':
      await prisma.localHumanFeedback.updateMany({
        where: { id: { in: ids } },
        data: {
          syncStatus: status,
          syncedAt: status === 'synced' ? new Date() : undefined,
        },
      });
      break;
  }
}

/**
 * Handle retry with exponential backoff
 */
async function handleRetry(
  prisma: PrismaClient,
  items: QueueItem[],
  errorMessage: string
): Promise<void> {
  for (const item of items) {
    const attempts = item.attempts + 1;

    if (attempts >= item.maxAttempts) {
      // Mark as failed
      await prisma.queueItem.update({
        where: { id: item.id },
        data: {
          status: 'failed',
          attempts,
          lastError: errorMessage,
        },
      });

      logger.warn('Queue item failed permanently', {
        itemId: item.id,
        type: item.type,
        attempts,
      });
    } else {
      // Schedule retry with exponential backoff
      const delayMs = Math.min(
        BASE_RETRY_DELAY_MS * Math.pow(2, attempts),
        MAX_RETRY_DELAY_MS
      );
      const scheduledAt = new Date(Date.now() + delayMs);

      await prisma.queueItem.update({
        where: { id: item.id },
        data: {
          status: 'pending',
          attempts,
          lastError: errorMessage,
          scheduledAt,
        },
      });

      logger.debug('Queue item scheduled for retry', {
        itemId: item.id,
        attempts,
        scheduledAt: scheduledAt.toISOString(),
      });
    }
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(prisma: PrismaClient): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}> {
  const [pending, processing, completed, failed] = await Promise.all([
    prisma.queueItem.count({ where: { status: 'pending' } }),
    prisma.queueItem.count({ where: { status: 'processing' } }),
    prisma.queueItem.count({ where: { status: 'completed' } }),
    prisma.queueItem.count({ where: { status: 'failed' } }),
  ]);

  // Group by type
  const byTypeRaw = await prisma.queueItem.groupBy({
    by: ['type'],
    where: { status: 'pending' },
    _count: { type: true },
  });

  const byType: Record<string, number> = {};
  for (const item of byTypeRaw) {
    byType[item.type] = item._count.type;
  }

  // Group by priority
  const byPriorityRaw = await prisma.queueItem.groupBy({
    by: ['priority'],
    where: { status: 'pending' },
    _count: { priority: true },
  });

  const byPriority: Record<string, number> = {};
  for (const item of byPriorityRaw) {
    byPriority[item.priority] = item._count.priority;
  }

  return {
    pending,
    processing,
    completed,
    failed,
    byType,
    byPriority,
  };
}
