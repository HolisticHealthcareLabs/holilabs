/**
 * Webhook Dispatch System — Blue Ocean Phase 5 (Track 4)
 *
 * Real-time partner notifications when risk thresholds are crossed.
 * Write-through persistence: in-memory + Prisma DB backing.
 */

import { createHmac, randomBytes } from 'crypto';

// Persistence layer — lazy import to avoid test breakage
let _db: typeof import('@/lib/prisma') | null = null;
function getDb() {
  if (_db !== null) return _db;
  try {
    _db = require('@/lib/prisma');
  } catch {
    _db = null;
  }
  return _db;
}

// =============================================================================
// TYPES
// =============================================================================

export type WebhookEventType =
  | 'RISK_THRESHOLD_CROSSED'
  | 'ASSESSMENT_COMPLETED'
  | 'BULK_ASSESSMENT_COMPLETED';

export interface WebhookSubscription {
  id: string;
  apiKeyHash: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  isActive: boolean;
  createdAt: string;
}

export interface WebhookDeliveryLog {
  id: string;
  subscriptionId: string;
  eventType: WebhookEventType;
  statusCode: number | null;
  success: boolean;
  attemptCount: number;
  deliveredAt: string;
  error?: string;
}

// =============================================================================
// SINGLETON
// =============================================================================

class WebhookDispatcher {
  private subscriptions: WebhookSubscription[] = [];
  private deliveryLogs: WebhookDeliveryLog[] = [];
  private counter = 0;
  private logCounter = 0;
  private hydrated = false;

  constructor() {
    this.hydrateFromDb().catch(() => {});
  }

  private async hydrateFromDb(): Promise<void> {
    if (this.hydrated) return;
    try {
      const db = getDb();
      if (!db?._prisma) return;
      const rows = await db.prisma.enterpriseWebhookSubscription.findMany({
        include: { deliveryLogs: true },
      });
      for (const row of rows) {
        this.subscriptions.push({
          id: row.id,
          apiKeyHash: row.apiKeyHash,
          url: row.url,
          events: row.events as WebhookEventType[],
          secret: row.secret,
          isActive: row.isActive,
          createdAt: row.createdAt.toISOString(),
        });
        for (const log of row.deliveryLogs) {
          this.deliveryLogs.push({
            id: log.id,
            subscriptionId: log.subscriptionId,
            eventType: log.eventType as WebhookEventType,
            statusCode: log.statusCode,
            success: log.success,
            attemptCount: log.attemptCount,
            deliveredAt: log.deliveredAt.toISOString(),
            error: log.error ?? undefined,
          });
        }
      }
      this.counter = this.subscriptions.length;
      this.logCounter = this.deliveryLogs.length;
    } catch {
      // DB unavailable — continue in-memory only
    } finally {
      this.hydrated = true;
    }
  }

  private persistSubscription(sub: WebhookSubscription): void {
    const db = getDb();
    if (!db?._prisma) return;
    db.prisma.enterpriseWebhookSubscription.create({
      data: {
        id: sub.id,
        apiKeyHash: sub.apiKeyHash,
        url: sub.url,
        events: sub.events as any,
        secret: sub.secret,
        isActive: sub.isActive,
        createdAt: new Date(sub.createdAt),
      },
    }).catch(() => {});
  }

  private persistDeliveryLog(log: WebhookDeliveryLog): void {
    const db = getDb();
    if (!db?._prisma) return;
    db.prisma.enterpriseWebhookDeliveryLog.create({
      data: {
        id: log.id,
        subscriptionId: log.subscriptionId,
        eventType: log.eventType,
        statusCode: log.statusCode,
        success: log.success,
        attemptCount: log.attemptCount,
        error: log.error,
        deliveredAt: new Date(log.deliveredAt),
      },
    }).catch(() => {});
  }

  private deleteSubscriptionFromDb(subscriptionId: string): void {
    const db = getDb();
    if (!db?._prisma) return;
    db.prisma.enterpriseWebhookSubscription.delete({
      where: { id: subscriptionId },
    }).catch(() => {});
  }

  register(params: {
    apiKeyHash: string;
    url: string;
    events: WebhookEventType[];
  }): WebhookSubscription {
    const secret = randomBytes(32).toString('hex');
    const sub: WebhookSubscription = {
      id: `wh-${++this.counter}-${Date.now().toString(36)}`,
      apiKeyHash: params.apiKeyHash,
      url: params.url,
      events: params.events,
      secret,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.subscriptions.push(sub);
    this.persistSubscription(sub);
    return sub;
  }

  listSubscriptions(apiKeyHash: string): Array<Omit<WebhookSubscription, 'secret'> & { secret: string }> {
    return this.subscriptions
      .filter((s) => s.apiKeyHash === apiKeyHash)
      .map((s) => ({
        ...s,
        secret: `${s.secret.slice(0, 8)}...${s.secret.slice(-4)}`,
      }));
  }

  deleteSubscription(subscriptionId: string, apiKeyHash: string): boolean {
    const idx = this.subscriptions.findIndex(
      (s) => s.id === subscriptionId && s.apiKeyHash === apiKeyHash,
    );
    if (idx === -1) return false;
    this.subscriptions.splice(idx, 1);
    this.deleteSubscriptionFromDb(subscriptionId);
    return true;
  }

  async dispatch(eventType: WebhookEventType, data: Record<string, unknown>): Promise<void> {
    const matching = this.subscriptions.filter(
      (s) => s.isActive && s.events.includes(eventType),
    );

    const promises = matching.map((sub) =>
      this.deliverWithRetry(sub, { eventType, data, timestamp: new Date().toISOString() }, 3),
    );

    await Promise.allSettled(promises);
  }

  signPayload(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  async deliverWithRetry(
    subscription: WebhookSubscription,
    payload: Record<string, unknown>,
    maxRetries: number,
  ): Promise<void> {
    const body = JSON.stringify(payload);
    const signature = this.signPayload(body, subscription.secret);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(subscription.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': String(payload.eventType ?? ''),
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        const successLog: WebhookDeliveryLog = {
          id: `dl-${++this.logCounter}`,
          subscriptionId: subscription.id,
          eventType: payload.eventType as WebhookEventType,
          statusCode: response.status,
          success: response.ok,
          attemptCount: attempt,
          deliveredAt: new Date().toISOString(),
        };
        this.deliveryLogs.push(successLog);
        this.persistDeliveryLog(successLog);

        if (response.ok) return;
      } catch (err) {
        const errorLog: WebhookDeliveryLog = {
          id: `dl-${++this.logCounter}`,
          subscriptionId: subscription.id,
          eventType: payload.eventType as WebhookEventType,
          statusCode: null,
          success: false,
          attemptCount: attempt,
          deliveredAt: new Date().toISOString(),
          error: err instanceof Error ? err.message : 'Unknown error',
        };
        this.deliveryLogs.push(errorLog);
        this.persistDeliveryLog(errorLog);

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 4s, 16s
          const delay = Math.pow(4, attempt - 1) * 1000;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
  }

  getDeliveryLogs(subscriptionId: string): WebhookDeliveryLog[] {
    return this.deliveryLogs.filter((l) => l.subscriptionId === subscriptionId);
  }

  clearAll(): void {
    this.subscriptions = [];
    this.deliveryLogs = [];
    this.counter = 0;
    this.logCounter = 0;
  }
}

export const webhookDispatcher = new WebhookDispatcher();
