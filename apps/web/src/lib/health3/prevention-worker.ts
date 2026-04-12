/**
 * Prevention Engine Worker
 * Evaluates ingested records against prevention rules and publishes alerts
 *
 * ELENA: humanReviewRequired=true on every alert
 * CYRUS: tenantId on every rule evaluation, no PII in events
 * QUINN: Fire-and-forget pattern, no blocking
 */

import type { CanonicalHealthRecord } from '@holi/data-ingestion';
import type { PreventionAlert } from '@holi/prevention-engine';
import { PreventionEvaluator } from '@holi/prevention-engine';

/**
 * PreventionWorker
 * Fire-and-forget worker for prevention alert evaluation
 *
 * Usage (from ingest route):
 * ```
 * const worker = new PreventionWorker(eventBus, db);
 * await worker.evaluateRecord(canonicalRecord, tenantId); // Fire-and-forget
 * ```
 */
export class PreventionWorker {
  private engine: PreventionEvaluator;
  private eventBus: any; // EventBus injectable
  private db: any; // Prisma client injectable

  constructor(eventBus: any, db: any) {
    this.engine = new PreventionEvaluator();
    this.eventBus = eventBus;
    this.db = db;
  }

  /**
   * Evaluate a canonical health record against all active prevention rules
   * Returns immediately; alert publishing is fire-and-forget
   *
   * CYRUS: tenantId required on all operations
   * ELENA: humanReviewRequired=true on all alerts
   */
  async evaluateRecord(
    record: CanonicalHealthRecord,
    tenantId: string
  ): Promise<void> {
    if (!tenantId) {
      throw new Error('tenantId is required (CYRUS)');
    }

    // Fire-and-forget: don't await this
    this.evaluateAsync(record, tenantId).catch((error) => {
      // QUINN: Log but don't throw (fire-and-forget pattern)
      console.error(`[PreventionWorker] Error evaluating record ${record.recordType}:`, error);
    });
  }

  /**
   * Internal async evaluation (fire-and-forget)
   */
  private async evaluateAsync(
    record: CanonicalHealthRecord,
    tenantId: string
  ): Promise<void> {
    try {
      // Evaluate record against all registered rules
      const alerts = this.engine.evaluate(record);

      // Publish alerts to event bus (fire-and-forget)
      if (alerts.length > 0) {
        for (const alert of alerts) {
          await this.publishAlert(alert, tenantId);
        }
      }
    } catch (error) {
      // QUINN: Don't throw — fire-and-forget
      console.error(
        `[PreventionWorker] Failed to evaluate record ${record.recordType}:`,
        error
      );
    }
  }

  /**
   * Publish a single alert to the event bus
   * CYRUS: tenantId scoped, ELENA: humanReviewRequired
   */
  private async publishAlert(
    alert: PreventionAlert,
    tenantId: string
  ): Promise<void> {
    try {
      // Persist alert to database
      await this.db.preventionAlert.create({
        data: {
          id: alert.alertId,
          patientId: alert.patientId,
          tenantId,
          ruleId: alert.rule.ruleId,
          ruleName: alert.rule.name,
          severity: alert.severity,
          message: alert.message,
          context: { actionRequired: alert.actionRequired, citationUrl: alert.citationUrl },
          humanReviewRequired: alert.humanReviewRequired, // ELENA
          createdAt: alert.triggeredAt,
        },
      });

      // Publish to event bus (no await — fire-and-forget)
      this.eventBus.publish(
        `tenant:${tenantId}:prevention:alert`,
        {
          type: 'PREVENTION_ALERT',
          alert: {
            id: alert.alertId,
            patientId: alert.patientId,
            ruleId: alert.rule.ruleId,
            severity: alert.severity,
            // CYRUS: No PII in event
            message: alert.message,
            timestamp: alert.triggeredAt.toISOString(),
          },
        }
      );
    } catch (error) {
      console.error(
        `[PreventionWorker] Failed to publish alert ${alert.alertId}:`,
        error
      );
    }
  }
}

/**
 * Create a singleton PreventionWorker instance for use in routes
 * Usage: const worker = getPreventionWorker();
 */
let workerInstance: PreventionWorker | null = null;

export function getPreventionWorker(eventBus?: any, db?: any): PreventionWorker {
  if (!workerInstance && eventBus && db) {
    workerInstance = new PreventionWorker(eventBus, db);
  }

  if (!workerInstance) {
    throw new Error(
      'PreventionWorker not initialized. Call getPreventionWorker(eventBus, db) first.'
    );
  }

  return workerInstance;
}
