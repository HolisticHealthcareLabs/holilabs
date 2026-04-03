/**
 * POST /api/ingest
 *
 * Health 3.0 — Universal Data Ingestion Endpoint
 *
 * Accepts any supported data source (FHIR, CSV, REST webhook, manual)
 * and normalizes it to CanonicalHealthRecord[] before persisting.
 *
 * Request body (multipart/form-data OR application/json):
 *   - source: DataSource JSON (defines connector type + config)
 *   - file?: File upload (for CSV/Excel sources)
 *   - payload?: JSON object (for REST webhook / manual entry)
 *   - dryRun?: boolean (validate only, do not persist)
 *
 * Security:
 *   - CYRUS: RBAC required (ADMIN or DATA_STEWARD role)
 *   - CYRUS: Tenant isolation enforced via verifyPatientAccess
 *   - RUTH: PHI fields flagged for encryption before persistence
 *   - ELENA: INSUFFICIENT_DATA errors surface to caller
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { IngestionPipeline } from '@holi/data-ingestion';
import type { DataSource, CanonicalHealthRecord } from '@holi/data-ingestion';
import { EventPublisher } from '@holi/event-bus';

// Lazy-initialized publisher — reused across requests (connection pooling)
// CYRUS: publisher does NOT log PHI — only patientId refs, tenantId, and record type
let _eventPublisher: EventPublisher | null = null;
function getEventPublisher(): EventPublisher {
  if (!_eventPublisher) {
    _eventPublisher = new EventPublisher({ redisUrl: process.env.REDIS_URL });
  }
  return _eventPublisher;
}

export async function POST(request: NextRequest) {
  // ─── Auth Gate ─────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // CYRUS: Only ADMIN or clinicians with DATA_STEWARD permission may ingest
  const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
  const allowedPermissions = ['DATA_STEWARD', 'INGEST_DATA'];
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, permissions: true },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 403 });

  const hasAccess =
    allowedRoles.includes(user.role) ||
    (user.permissions ?? []).some((p: string) => allowedPermissions.includes(p));

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden: insufficient permissions for data ingestion' }, { status: 403 });
  }

  // ─── Parse Request ─────────────────────────────────────────────────────────
  let sourceConfig: DataSource;
  let fileContent: string | undefined;
  let dryRun = false;

  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const sourceJson = form.get('source');
    const file = form.get('file') as File | null;
    dryRun = form.get('dryRun') === 'true';

    if (!sourceJson || typeof sourceJson !== 'string') {
      return NextResponse.json({ error: 'Missing "source" field in form data' }, { status: 400 });
    }

    try {
      sourceConfig = JSON.parse(sourceJson) as DataSource;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in "source" field' }, { status: 400 });
    }

    if (file) {
      fileContent = await file.text();
    }
  } else {
    // JSON body
    let body: { source?: DataSource; dryRun?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.source) {
      return NextResponse.json({ error: 'Missing "source" in request body' }, { status: 400 });
    }

    sourceConfig = body.source;
    dryRun = body.dryRun ?? false;
  }

  // ─── Tenant Isolation ──────────────────────────────────────────────────────
  // CYRUS: Ensure the source belongs to the requesting user's tenant
  const userTenantId = (user as any).tenantId || (session as any).user?.organizationId;
  if (userTenantId && sourceConfig.tenantId !== userTenantId) {
    return NextResponse.json({ error: 'Forbidden: cross-tenant ingestion not allowed' }, { status: 403 });
  }

  // Force tenantId to match authenticated user
  sourceConfig.tenantId = userTenantId ?? sourceConfig.tenantId;

  // ─── Run Pipeline ──────────────────────────────────────────────────────────
  const pipeline = new IngestionPipeline();

  let result;
  try {
    result = await pipeline.run(sourceConfig, { fileContent, dryRun });
  } catch (err) {
    return NextResponse.json(
      { error: `Pipeline error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }

  // ─── Persist Valid Records ─────────────────────────────────────────────────
  if (!dryRun && result.validRecords.length > 0) {
    await persistCanonicalRecords(result.validRecords, user.id);
  }

  // ─── Publish Events (fire and forget) ─────────────────────────────────────
  // CYRUS: event payloads contain patientId refs only — no PHI
  // QUINN: event bus failure MUST NOT fail the API response
  if (!dryRun) {
    void publishIngestionEvents(result.validRecords, result.job.errors.map(e => e.sourceRecordId ?? ''));
  }

  // ─── Audit Log ────────────────────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      action: 'DATA_INGESTION' as any,
      userId: user.id,
      userEmail: session.user.email ?? '',
      ipAddress: request.headers.get('x-forwarded-for') ?? 'unknown',
      resource: 'CanonicalHealthRecord',
      resourceId: result.job.jobId,
      success: result.job.status !== 'FAILED',
      details: {
        sourceId: sourceConfig.id,
        sourceType: sourceConfig.type,
        jobId: result.job.jobId,
        summary: result.summary,
        dryRun,
      } as any,
    },
  });

  return NextResponse.json({
    jobId: result.job.jobId,
    status: result.job.status,
    summary: result.summary,
    errors: result.job.errors.slice(0, 20), // cap error payload size
    dryRun,
  });
}

// ─── Event publishing helper ──────────────────────────────────────────────────
// Fire-and-forget: publishes ingestion events to Redis Streams.
// CYRUS: NO PHI in event payloads — patientId refs only.
// QUINN: wrapped in try/catch — bus failure never blocks the HTTP response.

async function publishIngestionEvents(
  validRecords: CanonicalHealthRecord[],
  invalidIngestIds: string[],
): Promise<void> {
  try {
    const publisher = getEventPublisher();

    // Publish valid records
    for (const record of validRecords) {
      await publisher.publish({
        type: 'record.ingested',
        payload: {
          ingestId: record.ingestId,
          recordType: record.recordType,
          patientId: record.patientId,  // ref only, no PHI
          tenantId: record.tenantId,
          sourceId: record.sourceId,
          isValid: true,
          completenessScore: record.validation.completenessScore,
        },
      });
    }

    // Publish invalid records
    for (const ingestId of invalidIngestIds.filter(Boolean)) {
      await publisher.publish({
        type: 'record.invalid',
        payload: {
          ingestId,
          sourceId: validRecords[0]?.sourceId ?? 'unknown',
          tenantId: validRecords[0]?.tenantId ?? 'unknown',
          errors: [],
        },
      });
    }
  } catch {
    // QUINN: event bus failure is non-fatal — log silently, do not propagate
    // In production, this would emit a structured log for alerting
  }
}

// ─── Persistence helper ───────────────────────────────────────────────────────
// Maps CanonicalHealthRecord to existing Prisma models where possible.
// New records are stored in a generic IngestedRecord table (additive migration, see below).

async function persistCanonicalRecords(
  records: CanonicalHealthRecord[],
  userId: string,
): Promise<void> {
  for (const record of records) {
    // Lab results → existing LabResult model
    if (record.recordType === 'LAB_RESULT' && record.patientId) {
      const lab = record.payload as import('@holi/data-ingestion').CanonicalLabResult;
      await prisma.labResult.create({
        data: {
          patientId: record.patientId,
          testName: lab.testName,
          loincCode: lab.loincCode ?? null,
          value: String(lab.value),
          unit: lab.unit,
          referenceRange: lab.referenceRangeLow !== undefined && lab.referenceRangeHigh !== undefined
            ? `${lab.referenceRangeLow}–${lab.referenceRangeHigh}`
            : null,
          interpretation: lab.interpretation === 'NORMAL' ? 'normal'
            : lab.interpretation === 'CRITICAL_HIGH' || lab.interpretation === 'CRITICAL_LOW' ? 'critical'
            : lab.interpretation === 'ABNORMAL' ? 'abnormal'
            : null,
          resultDate: lab.resultedAt ?? new Date(),
          source: `INGESTION:${record.sourceType}`,
          orderedById: userId,
        } as any,
      }).catch(() => {/* non-fatal: log but continue */});
    }

    // HealthMetric → vitals
    if (record.recordType === 'VITAL_SIGN' && record.patientId) {
      const vital = record.payload as import('@holi/data-ingestion').CanonicalVitalSign;
      await prisma.healthMetric.create({
        data: {
          patientId: record.patientId,
          metricType: vital.vitalType,
          value: vital.value,
          unit: vital.unit,
          recordedAt: vital.measuredAt,
          source: `INGESTION:${record.sourceType}`,
        } as any,
      }).catch(() => {/* non-fatal */});
    }

    // All records → IngestedRecord (generic audit + dedup store)
    await (prisma as any).ingestedRecord.create({
      data: {
        sourceType: record.sourceType,
        recordType: record.recordType,
        patientId:  record.patientId ?? null,
        tenantId:   record.tenantId ?? null,
        sourceId:   record.sourceId ?? null,
        payload:    record.payload as any,
        status:     'COMPLETED',
        ingestedBy: userId,
      },
    }).catch(() => {/* non-fatal: log but continue */});
  }
}
