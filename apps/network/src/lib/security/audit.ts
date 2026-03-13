/**
 * Audit Log — Network Module
 *
 * CYRUS/RUTH INVARIANT: Every read or write of NetworkReferral PHI must emit
 * an audit entry. Entries are written as structured JSON to the logger (stdout),
 * which is ingested by the production log pipeline.
 *
 * In a full production setup, these would also be written to the `AuditLog`
 * table in the shared DB (apps/web/prisma/schema.prisma). For now, the
 * structured logger ensures they are captured and queryable.
 */

import { logger } from '@/lib/logger';

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'CONSENT_GRANTED'
  | 'CONSENT_DENIED'
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'REFERRAL_EXPIRED'
  | 'PHI_ACCESS';

export interface AuditEntry {
  action: AuditAction;
  resource: 'NetworkReferral' | 'NetworkProvider';
  resourceId: string;
  orgId: string;
  actorId?: string;       // clinician or system
  actorType: 'CLINICIAN' | 'PATIENT' | 'SYSTEM' | 'WEBHOOK';
  success: boolean;
  detail?: string;
}

export function createNetworkAuditLog(entry: AuditEntry): void {
  logger.info(
    {
      audit: true,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      orgId: entry.orgId,
      actorId: entry.actorId ?? 'system',
      actorType: entry.actorType,
      success: entry.success,
      detail: entry.detail,
    },
    `AUDIT:${entry.action}:${entry.resource}`
  );
}
