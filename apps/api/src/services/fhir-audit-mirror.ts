// @ts-nocheck
/**
 * FHIR Audit Mirror Service
 * Synchronizes Medplum AuditEvents to Holi's audit.audit_events table
 * Provides bidirectional audit trail for compliance
 */

import type { PrismaClient } from '@prisma/client';
import type { AuditEvent, Bundle } from '@medplum/fhirtypes';
import { getMedplumClient } from './fhir-sync-enhanced';

/**
 * Logging utilities
 */
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'fhir-audit-mirror',
    message,
    ...context,
  };
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(logEntry));
}

/**
 * Mirror result
 */
export interface MirrorResult {
  startTime: Date;
  endTime: Date;
  durationMs: number;
  fetched: number;
  mirrored: number;
  skipped: number;
  errors: number;
  lastSyncedAt: Date | null;
}

/**
 * Get last sync timestamp from Holi audit events
 */
async function getLastMirrorTimestamp(prisma: PrismaClient): Promise<Date | null> {
  try {
    const lastMirror = await prisma.auditEvent.findFirst({
      where: {
        eventType: 'FHIR_AUDIT_MIRROR',
      },
      orderBy: {
        ts: 'desc',
      },
    });

    if (lastMirror && lastMirror.payload) {
      const payload = lastMirror.payload as any;
      return payload.lastSyncedAt ? new Date(payload.lastSyncedAt) : null;
    }

    return null;
  } catch (error) {
    log('error', 'Failed to get last mirror timestamp', {
      error: (error as Error).message,
    });
    return null;
  }
}

/**
 * Map Medplum AuditEvent action to Holi event type
 */
function mapAuditAction(action?: string): string {
  const actionMap: Record<string, string> = {
    'C': 'FHIR_CREATE',
    'R': 'FHIR_READ',
    'U': 'FHIR_UPDATE',
    'D': 'FHIR_DELETE',
    'E': 'FHIR_EXECUTE',
  };

  return actionMap[action || ''] || 'FHIR_ACTION';
}

/**
 * Extract organization ID from AuditEvent
 */
function extractOrgId(auditEvent: AuditEvent): string {
  // Try to extract from agent extension
  if (auditEvent.agent) {
    for (const agent of auditEvent.agent) {
      if (agent.extension) {
        const orgExt = agent.extension.find(
          (ext) => ext.url === 'https://holilabs.xyz/fhir/org-id'
        );
        if (orgExt && orgExt.valueString) {
          return orgExt.valueString;
        }
      }
    }
  }

  // Try to extract from entity reference
  if (auditEvent.entity) {
    for (const entity of auditEvent.entity) {
      if (entity.what?.reference) {
        const match = entity.what.reference.match(/Organization\/([^\/]+)/);
        if (match) {
          return match[1];
        }
      }
    }
  }

  // Default to system if we can't determine org
  return 'system';
}

/**
 * Map Medplum AuditEvent to Holi audit event format
 */
function mapAuditEvent(auditEvent: AuditEvent): {
  orgId: string;
  eventType: string;
  payload: Record<string, any>;
  ts: Date;
} {
  const orgId = extractOrgId(auditEvent);
  const eventType = mapAuditAction(auditEvent.action);
  const ts = auditEvent.recorded ? new Date(auditEvent.recorded) : new Date();

  const payload: Record<string, any> = {
    source: 'medplum',
    fhirAuditEventId: auditEvent.id,
    action: auditEvent.action,
    outcome: auditEvent.outcome,
    outcomeDesc: auditEvent.outcomeDesc,
    recorded: auditEvent.recorded,
  };

  // Extract agent information
  if (auditEvent.agent && auditEvent.agent.length > 0) {
    const primaryAgent = auditEvent.agent[0];
    payload.agent = {
      type: primaryAgent.type?.coding?.[0]?.code,
      who: primaryAgent.who?.reference,
      name: primaryAgent.name,
      requestor: primaryAgent.requestor,
    };
  }

  // Extract source information
  if (auditEvent.source) {
    payload.sourceInfo = {
      site: auditEvent.source.site,
      observer: auditEvent.source.observer?.reference,
      type: auditEvent.source.type?.map((t) => t.code),
    };
  }

  // Extract entity information (what was accessed)
  if (auditEvent.entity && auditEvent.entity.length > 0) {
    payload.entities = auditEvent.entity.map((entity) => ({
      what: entity.what?.reference,
      type: entity.type?.code,
      role: entity.role?.code,
      lifecycle: entity.lifecycle?.code,
      securityLabel: entity.securityLabel?.map((l) => l.code),
      name: entity.name,
      description: entity.description,
    }));
  }

  return {
    orgId,
    eventType,
    payload,
    ts,
  };
}

/**
 * Check if audit event already exists in Holi
 */
async function auditEventExists(
  prisma: PrismaClient,
  fhirAuditEventId: string
): Promise<boolean> {
  try {
    const existing = await prisma.auditEvent.findFirst({
      where: {
        payload: {
          path: ['fhirAuditEventId'],
          equals: fhirAuditEventId,
        },
      },
    });

    return !!existing;
  } catch (error) {
    log('warn', 'Failed to check audit event existence', {
      fhirAuditEventId,
      error: (error as Error).message,
    });
    return false;
  }
}

/**
 * Fetch AuditEvents from Medplum
 */
async function fetchMedplumAuditEvents(
  since?: Date,
  limit: number = 1000
): Promise<AuditEvent[]> {
  const correlationId = `audit-fetch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    log('info', 'Fetching AuditEvents from Medplum', {
      correlationId,
      since: since?.toISOString(),
      limit,
    });

    const client = await getMedplumClient();

    // Build search parameters
    const searchParams: Record<string, string> = {
      _count: limit.toString(),
      _sort: '-date', // Most recent first
    };

    if (since) {
      // FHIR date search: ge (greater than or equal)
      searchParams.date = `ge${since.toISOString()}`;
    }

    const bundle = await client.search('AuditEvent', searchParams);

    if (!bundle || bundle.resourceType !== 'Bundle') {
      log('error', 'Invalid bundle response from Medplum', { correlationId });
      return [];
    }

    const auditEvents: AuditEvent[] = [];
    if (bundle.entry) {
      for (const entry of bundle.entry) {
        if (entry.resource?.resourceType === 'AuditEvent') {
          auditEvents.push(entry.resource as AuditEvent);
        }
      }
    }

    log('info', 'Fetched AuditEvents from Medplum', {
      correlationId,
      count: auditEvents.length,
    });

    return auditEvents;
  } catch (error) {
    log('error', 'Failed to fetch AuditEvents from Medplum', {
      correlationId,
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    return [];
  }
}

/**
 * Mirror single AuditEvent to Holi
 */
async function mirrorAuditEvent(
  prisma: PrismaClient,
  auditEvent: AuditEvent
): Promise<{ success: boolean; skipped: boolean; error?: string }> {
  try {
    // Check if already exists
    if (auditEvent.id) {
      const exists = await auditEventExists(prisma, auditEvent.id);
      if (exists) {
        return { success: true, skipped: true };
      }
    }

    // Map to Holi format
    const mappedEvent = mapAuditEvent(auditEvent);

    // Create audit event in Holi
    await prisma.auditEvent.create({
      data: {
        orgId: mappedEvent.orgId,
        eventType: mappedEvent.eventType,
        payload: mappedEvent.payload,
        ts: mappedEvent.ts,
      },
    });

    return { success: true, skipped: false };
  } catch (error) {
    log('error', 'Failed to mirror audit event', {
      auditEventId: auditEvent.id,
      error: (error as Error).message,
    });
    return { success: false, skipped: false, error: (error as Error).message };
  }
}

/**
 * Run audit mirror synchronization
 */
export async function runAuditMirror(
  prisma: PrismaClient,
  options: {
    limit?: number;
    forceSince?: Date;
  } = {}
): Promise<MirrorResult> {
  const startTime = new Date();
  const { limit = 1000, forceSince } = options;

  log('info', 'Starting Medplum audit mirror', { limit, forceSince });

  let fetched = 0;
  let mirrored = 0;
  let skipped = 0;
  let errors = 0;
  let lastSyncedAt: Date | null = null;

  try {
    // Determine since timestamp
    const since = forceSince || (await getLastMirrorTimestamp(prisma));

    log('info', 'Fetching audit events since', {
      since: since?.toISOString() || 'beginning',
    });

    // Fetch AuditEvents from Medplum
    const auditEvents = await fetchMedplumAuditEvents(since || undefined, limit);
    fetched = auditEvents.length;

    if (fetched === 0) {
      log('info', 'No new audit events to mirror');
    } else {
      // Mirror each audit event
      for (const auditEvent of auditEvents) {
        const result = await mirrorAuditEvent(prisma, auditEvent);

        if (result.success) {
          if (result.skipped) {
            skipped++;
          } else {
            mirrored++;
          }
        } else {
          errors++;
        }

        // Track most recent timestamp
        if (auditEvent.recorded) {
          const recordedDate = new Date(auditEvent.recorded);
          if (!lastSyncedAt || recordedDate > lastSyncedAt) {
            lastSyncedAt = recordedDate;
          }
        }
      }

      log('info', 'Audit mirror batch complete', {
        fetched,
        mirrored,
        skipped,
        errors,
      });
    }
  } catch (error) {
    log('error', 'Audit mirror failed', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    errors++;
  }

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();

  const result: MirrorResult = {
    startTime,
    endTime,
    durationMs,
    fetched,
    mirrored,
    skipped,
    errors,
    lastSyncedAt,
  };

  // Store mirror result in audit log
  try {
    await prisma.auditEvent.create({
      data: {
        orgId: 'system',
        eventType: 'FHIR_AUDIT_MIRROR',
        payload: result,
      },
    });
  } catch (error) {
    log('error', 'Failed to log mirror result', {
      error: (error as Error).message,
    });
  }

  log('info', 'Audit mirror complete', {
    durationMs,
    mirrored,
    skipped,
    errors,
  });

  return result;
}

/**
 * Get audit mirror statistics
 */
export async function getAuditMirrorStats(
  prisma: PrismaClient
): Promise<{
  lastRun: Date | null;
  lastSyncedAt: Date | null;
  totalMirrored: number;
  recentRuns: Array<{
    timestamp: Date;
    mirrored: number;
    skipped: number;
    errors: number;
  }>;
}> {
  try {
    // Get recent mirror runs
    const recentMirrorEvents = await prisma.auditEvent.findMany({
      where: {
        eventType: 'FHIR_AUDIT_MIRROR',
      },
      orderBy: {
        ts: 'desc',
      },
      take: 10,
    });

    let lastRun: Date | null = null;
    let lastSyncedAt: Date | null = null;
    let totalMirrored = 0;

    const recentRuns = recentMirrorEvents.map((event) => {
      const payload = event.payload as any;

      if (!lastRun) {
        lastRun = event.ts;
      }

      if (!lastSyncedAt && payload.lastSyncedAt) {
        lastSyncedAt = new Date(payload.lastSyncedAt);
      }

      totalMirrored += payload.mirrored || 0;

      return {
        timestamp: event.ts,
        mirrored: payload.mirrored || 0,
        skipped: payload.skipped || 0,
        errors: payload.errors || 0,
      };
    });

    return {
      lastRun,
      lastSyncedAt,
      totalMirrored,
      recentRuns,
    };
  } catch (error) {
    log('error', 'Failed to get audit mirror stats', {
      error: (error as Error).message,
    });

    return {
      lastRun: null,
      lastSyncedAt: null,
      totalMirrored: 0,
      recentRuns: [],
    };
  }
}

/**
 * Search mirrored audit events
 */
export async function searchMirroredAuditEvents(
  prisma: PrismaClient,
  options: {
    orgId?: string;
    eventTypes?: string[];
    since?: Date;
    until?: Date;
    agentReference?: string;
    entityReference?: string;
    limit?: number;
  }
): Promise<Array<{
  id: string;
  ts: Date;
  eventType: string;
  orgId: string;
  action: string;
  outcome: string;
  agent: any;
  entities: any[];
}>> {
  const { orgId, eventTypes, since, until, agentReference, entityReference, limit = 100 } = options;

  try {
    const events = await prisma.auditEvent.findMany({
      where: {
        // Filter by mirrored events
        payload: {
          path: ['source'],
          equals: 'medplum',
        },
        // Optional filters
        ...(orgId ? { orgId } : {}),
        ...(eventTypes && eventTypes.length > 0
          ? { eventType: { in: eventTypes } }
          : {}),
        ...(since ? { ts: { gte: since } } : {}),
        ...(until ? { ts: { lte: until } } : {}),
      },
      orderBy: {
        ts: 'desc',
      },
      take: limit,
    });

    // Post-filter by agent or entity reference (stored in JSON)
    let filtered = events;

    if (agentReference) {
      filtered = filtered.filter((event) => {
        const payload = event.payload as any;
        return payload.agent?.who === agentReference;
      });
    }

    if (entityReference) {
      filtered = filtered.filter((event) => {
        const payload = event.payload as any;
        return payload.entities?.some((e: any) => e.what === entityReference);
      });
    }

    // Map to response format
    return filtered.map((event) => {
      const payload = event.payload as any;
      return {
        id: event.id,
        ts: event.ts,
        eventType: event.eventType,
        orgId: event.orgId,
        action: payload.action || 'UNKNOWN',
        outcome: payload.outcome || 'UNKNOWN',
        agent: payload.agent || {},
        entities: payload.entities || [],
      };
    });
  } catch (error) {
    log('error', 'Failed to search mirrored audit events', {
      error: (error as Error).message,
      options,
    });
    return [];
  }
}
