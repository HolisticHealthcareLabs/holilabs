/**
 * Assurance Event API
 *
 * Captures AI/Rules recommendations and human decisions for RLHF training.
 * This is the primary data ingestion endpoint for the Clinical Assurance Platform.
 *
 * Endpoints:
 * - POST /api/assurance - Capture a new assurance event
 * - GET /api/assurance - List events (with filters)
 * - POST /api/assurance/decision - Record human decision
 * - POST /api/assurance/feedback - Add human feedback
 *
 * LGPD Compliance:
 * - Patient IDs are hashed before storage
 * - Override reasons captured for explainability
 * - Audit trail maintained for all operations
 *
 * @module api/assurance
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyInternalAgentToken } from '@/lib/hash';
import {
  assuranceCaptureService,
  type AssuranceEventInput,
} from '@/services/assurance-capture.service';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const inputContextSchema = z.object({
  rawText: z.string().max(10000).optional(),
  tissCode: z.string().max(20).optional(),
  domState: z.record(z.unknown()).optional(),
  formFields: z.record(z.string()).optional(),
  vitalSigns: z.record(z.number()).optional(),
  chiefComplaint: z.string().max(1000).optional(),
  symptoms: z.array(z.string().max(200)).max(50).optional(),
}).passthrough(); // Allow additional fields

const aiRecommendationSchema = z.record(z.unknown());

const captureEventSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().optional(),
  eventType: z.enum(['DIAGNOSIS', 'TREATMENT', 'ORDER', 'ALERT', 'BILLING']),
  clinicId: z.string().min(1),
  inputContextSnapshot: inputContextSchema,
  aiRecommendation: aiRecommendationSchema,
  aiConfidence: z.number().min(0).max(1).optional(),
  aiProvider: z.string().max(50).optional(),
  aiLatencyMs: z.number().int().min(0).optional(),
  ruleVersionId: z.string().optional(),
});

const recordDecisionSchema = z.object({
  eventId: z.string().min(1),
  decision: z.record(z.unknown()),
  override: z.boolean(),
  reason: z.string().max(2000).optional(),
});

const listEventsSchema = z.object({
  clinicId: z.string().optional(),
  eventType: z.enum(['DIAGNOSIS', 'TREATMENT', 'ORDER', 'ALERT', 'BILLING']).optional(),
  overridesOnly: z.coerce.boolean().optional(),
  pending: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH HELPER
// ═══════════════════════════════════════════════════════════════════════════════

async function authenticateRequest(
  req: NextRequest
): Promise<{ userId: string; clinicId?: string } | null> {
  // Check for internal agent token first
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

  // Fall back to session auth
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  if (!userId) {
    return null;
  }

  return { userId };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST: Capture Assurance Event
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = captureEventSchema.safeParse(body);

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

    const input: AssuranceEventInput = {
      patientId: validation.data.patientId,
      encounterId: validation.data.encounterId,
      eventType: validation.data.eventType,
      clinicId: validation.data.clinicId,
      inputContextSnapshot: validation.data.inputContextSnapshot,
      aiRecommendation: validation.data.aiRecommendation,
      aiConfidence: validation.data.aiConfidence,
      aiProvider: validation.data.aiProvider,
      aiLatencyMs: validation.data.aiLatencyMs,
      ruleVersionId: validation.data.ruleVersionId,
    };

    const result = await assuranceCaptureService.captureAIEvent(input);

    // Audit log
    await createAuditLog(
      {
        action: 'CREATE',
        resource: 'AssuranceEvent',
        resourceId: result.eventId,
        details: {
          eventType: input.eventType,
          clinicId: input.clinicId,
          aiProvider: input.aiProvider,
          patientIdHash: result.patientIdHash,
        },
        success: true,
      },
      req
    );

    return NextResponse.json(
      {
        success: true,
        eventId: result.eventId,
        patientIdHash: result.patientIdHash,
        inputHash: result.inputHash,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({
      event: 'assurance_api_error',
      method: 'POST',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to capture assurance event',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET: List Assurance Events
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const validation = listEventsSchema.safeParse(searchParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { clinicId, eventType, overridesOnly, pending, limit, offset } = validation.data;

    const where: Record<string, unknown> = {};

    if (clinicId) where.clinicId = clinicId;
    if (eventType) where.eventType = eventType;
    if (overridesOnly) where.humanOverride = true;
    if (pending) where.decidedAt = null;

    const [events, total] = await Promise.all([
      prisma.assuranceEvent.findMany({
        where,
        include: {
          feedback: {
            select: {
              id: true,
              feedbackType: true,
              feedbackSource: true,
              createdAt: true,
            },
          },
          outcome: {
            select: {
              id: true,
              outcomeType: true,
              glosaCode: true,
              glosaAmount: true,
              matchScore: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.assuranceEvent.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: events,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + events.length < total,
      },
    });
  } catch (error) {
    logger.error({
      event: 'assurance_api_error',
      method: 'GET',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to list assurance events' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE: Delete Assurance Event (with cascade)
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const eventId = searchParams.get('id');
    const hard = searchParams.get('hard') === 'true';

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required (use ?id=...)' },
        { status: 400 }
      );
    }

    // Verify event exists
    const event = await prisma.assuranceEvent.findUnique({
      where: { id: eventId },
      include: {
        feedback: { select: { id: true } },
        outcome: { select: { id: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (hard) {
      // Hard delete - cascade delete related records
      await prisma.$transaction([
        prisma.humanFeedback.deleteMany({ where: { assuranceEventId: eventId } }),
        prisma.outcomeGroundTruth.deleteMany({ where: { assuranceEventId: eventId } }),
        prisma.assuranceEvent.delete({ where: { id: eventId } }),
      ]);
    } else {
      // Soft delete - mark as deleted (add deletedAt field if needed)
      // For now, we'll do a hard delete since there's no soft-delete field
      await prisma.$transaction([
        prisma.humanFeedback.deleteMany({ where: { assuranceEventId: eventId } }),
        prisma.outcomeGroundTruth.deleteMany({ where: { assuranceEventId: eventId } }),
        prisma.assuranceEvent.delete({ where: { id: eventId } }),
      ]);
    }

    // Audit log
    await createAuditLog(
      {
        action: 'DELETE',
        resource: 'AssuranceEvent',
        resourceId: eventId,
        details: {
          hardDelete: hard,
          feedbackCount: event.feedback.length,
          hadOutcome: !!event.outcome,
        },
        success: true,
      },
      req
    );

    logger.info({
      event: 'assurance_event_deleted',
      eventId,
      hardDelete: hard,
      feedbackDeleted: event.feedback.length,
      outcomeDeleted: !!event.outcome,
    });

    return NextResponse.json({
      success: true,
      message: 'Assurance event deleted',
      deletedRelations: {
        feedback: event.feedback.length,
        outcome: event.outcome ? 1 : 0,
      },
    });
  } catch (error) {
    logger.error({
      event: 'assurance_api_error',
      method: 'DELETE',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to delete assurance event' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH: Record Human Decision
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = recordDecisionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { eventId, decision, override, reason } = validation.data;

    // Verify event exists
    const event = await prisma.assuranceEvent.findUnique({
      where: { id: eventId },
      select: { id: true, decidedAt: true },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.decidedAt) {
      return NextResponse.json(
        { error: 'Decision already recorded for this event' },
        { status: 409 }
      );
    }

    await assuranceCaptureService.recordHumanDecision(eventId, {
      decision,
      override,
      reason,
    });

    // Audit log
    await createAuditLog(
      {
        action: 'UPDATE',
        resource: 'AssuranceEvent',
        resourceId: eventId,
        details: {
          action: 'record_decision',
          override,
          hasReason: !!reason,
        },
        success: true,
      },
      req
    );

    return NextResponse.json({
      success: true,
      eventId,
      override,
    });
  } catch (error) {
    logger.error({
      event: 'assurance_api_error',
      method: 'PATCH',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to record decision' },
      { status: 500 }
    );
  }
}
