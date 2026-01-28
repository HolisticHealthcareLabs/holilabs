/**
 * TISS Reconciliation API
 *
 * Handles TISS XML ingestion and fuzzy matching of insurer returns
 * to our internal AssuranceEvents for ground truth linking.
 *
 * Endpoints:
 * - POST /api/reconciliation/ingest - Ingest TISS XML batch
 * - GET /api/reconciliation/pending - List pending reconciliations
 * - POST /api/reconciliation/link - Manually link TISS to event
 * - GET /api/reconciliation/stats - Get reconciliation statistics
 *
 * @module api/reconciliation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyInternalAgentToken } from '@/lib/hash';
import {
  tissReconciliationService,
  type TissRecord,
} from '@/services/tiss-reconciliation.service';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const tissRecordSchema = z.object({
  insurerProtocol: z.string().min(1),
  insurerId: z.string().min(1),
  patientCpf: z.string().optional(),
  patientName: z.string().optional(),
  patientBirthDate: z.string().optional(),
  tissCode: z.string().min(1),
  tissDescription: z.string().optional(),
  procedureDate: z.coerce.date(),
  billingDate: z.coerce.date(),
  isGlosa: z.boolean(),
  glosaCode: z.string().optional(),
  glosaReason: z.string().optional(),
  billedAmount: z.number().min(0),
  glosaAmount: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  rawXml: z.string().optional(),
});

const ingestBatchSchema = z.object({
  records: z.array(tissRecordSchema).min(1).max(1000),
  source: z.string().optional(), // e.g., "UNIMED-SP-2024-01"
});

const manualLinkSchema = z.object({
  tissProtocol: z.string().min(1),
  eventId: z.string().min(1),
  record: tissRecordSchema,
});

const statsQuerySchema = z.object({
  clinicId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH HELPER
// ═══════════════════════════════════════════════════════════════════════════════

async function authenticateRequest(
  req: NextRequest
): Promise<{ userId: string } | null> {
  const internalToken = req.headers.get('X-Agent-Internal-Token');

  if (internalToken && verifyInternalAgentToken(internalToken)) {
    const userEmail = req.headers.get('X-Agent-User-Email');
    const headerUserId = req.headers.get('X-Agent-User-Id');

    if (userEmail) {
      const dbUser = await prisma.user.findFirst({
        where: { OR: [{ id: headerUserId || '' }, { email: userEmail }] },
        select: { id: true },
      });

      if (dbUser) {
        return { userId: dbUser.id };
      }
    }
  }

  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  if (!userId) {
    return null;
  }

  return { userId };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST: Ingest TISS Records and Reconcile
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = ingestBatchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { records, source } = validation.data;

    logger.info({
      event: 'tiss_ingest_started',
      recordCount: records.length,
      source,
      userId: authResult.userId,
    });

    // Process the batch
    const results = await tissReconciliationService.processBatch(
      records as TissRecord[]
    );

    // Count results by status
    const summary = {
      total: results.length,
      matched: results.filter((r) => r.status === 'matched').length,
      pendingReview: results.filter((r) => r.status === 'pending_review').length,
      noMatch: results.filter((r) => r.status === 'no_candidates').length,
    };

    // Audit log
    await createAuditLog(
      {
        action: 'CREATE',
        resource: 'TissReconciliation',
        resourceId: source || 'batch',
        details: {
          recordCount: records.length,
          matched: summary.matched,
          pendingReview: summary.pendingReview,
          noMatch: summary.noMatch,
          matchRate: records.length > 0 ? summary.matched / records.length : 0,
        },
        success: true,
      },
      req
    );

    return NextResponse.json({
      success: true,
      summary,
      results: results.map((r) => ({
        tissProtocol: r.tissProtocol,
        status: r.status,
        matchScore: r.matchScore,
        eventId: r.eventId,
        candidateCount: r.candidates?.length,
      })),
    });
  } catch (error) {
    logger.error({
      event: 'tiss_ingest_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to process TISS records',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET: Get Reconciliation Stats or List Pending
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const action = searchParams.action;

    if (action === 'stats') {
      const validation = statsQuerySchema.safeParse(searchParams);

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Validation error',
            details: validation.error.errors,
          },
          { status: 400 }
        );
      }

      const { clinicId, startDate, endDate } = validation.data;
      const stats = await tissReconciliationService.getStats(clinicId, startDate, endDate);

      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    // Default: list outcomes with match details
    const clinicId = searchParams.clinicId;
    const limit = Math.min(parseInt(searchParams.limit || '50', 10), 100);
    const offset = parseInt(searchParams.offset || '0', 10);

    const where: Record<string, unknown> = {};

    if (clinicId) {
      where.assuranceEvent = { clinicId };
    }

    // Filter by match method if specified
    if (searchParams.matchMethod) {
      where.matchMethod = searchParams.matchMethod;
    }

    // Filter for low-confidence matches needing review
    if (searchParams.needsReview === 'true') {
      where.matchScore = { lt: 0.95 };
    }

    const [outcomes, total] = await Promise.all([
      prisma.outcomeGroundTruth.findMany({
        where,
        include: {
          assuranceEvent: {
            select: {
              id: true,
              eventType: true,
              clinicId: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.outcomeGroundTruth.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: outcomes,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + outcomes.length < total,
      },
    });
  } catch (error) {
    logger.error({
      event: 'reconciliation_get_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to get reconciliation data' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH: Manual Link
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = manualLinkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { tissProtocol, eventId, record } = validation.data;

    // Verify event exists and doesn't already have an outcome
    const event = await prisma.assuranceEvent.findUnique({
      where: { id: eventId },
      include: { outcome: true },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.outcome) {
      return NextResponse.json(
        { error: 'Event already has an outcome linked' },
        { status: 409 }
      );
    }

    await tissReconciliationService.manualLink(
      tissProtocol,
      eventId,
      record as TissRecord
    );

    // Audit log
    await createAuditLog(
      {
        action: 'UPDATE',
        resource: 'TissReconciliation',
        resourceId: tissProtocol,
        details: {
          action: 'manual_link',
          eventId,
          userId: authResult.userId,
        },
        success: true,
      },
      req
    );

    return NextResponse.json({
      success: true,
      tissProtocol,
      eventId,
      matchMethod: 'MANUAL',
    });
  } catch (error) {
    logger.error({
      event: 'manual_link_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to link TISS record' },
      { status: 500 }
    );
  }
}
