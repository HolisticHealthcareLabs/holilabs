/**
 * Screening Outcome Tracking API
 *
 * POST /api/prevention/screenings - Schedule a new screening
 * GET /api/prevention/screenings?patientId=xxx - List screenings for a patient
 *
 * Phase 3: History & Compliance
 * Latency Budget: ≤200ms
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';
import { auditCreate, auditView } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Valid screening types
const SCREENING_TYPES = [
  'mammogram',
  'colonoscopy',
  'pap_smear',
  'lipid_panel',
  'a1c',
  'dexa_scan',
  'lung_ct',
  'psa',
  'eye_exam',
  'foot_exam',
  'skin_exam',
  'hearing_test',
  'vision_test',
  'blood_pressure',
  'bmi_assessment',
] as const;

// Request validation schemas
const ScheduleScreeningSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  screeningType: z.enum(SCREENING_TYPES, {
    errorMap: () => ({ message: `Invalid screening type. Must be one of: ${SCREENING_TYPES.join(', ')}` }),
  }),
  scheduledDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  dueDate: z.string().optional().refine(
    (date) => !date || !isNaN(Date.parse(date)),
    { message: 'Invalid dueDate format' }
  ),
  notes: z.string().optional(),
  description: z.string().optional(),
  screeningCode: z.string().optional(),
  orderingProvider: z.string().optional(),
  facility: z.string().optional(),
  preventionPlanId: z.string().optional(),
});

/**
 * POST /api/prevention/screenings
 * Schedule a new screening for a patient
 */
export async function POST(request: NextRequest) {
  const start = performance.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = ScheduleScreeningSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      patientId,
      screeningType,
      scheduledDate,
      dueDate,
      notes,
      description,
      screeningCode,
      orderingProvider,
      facility,
      preventionPlanId,
    } = validation.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Verify prevention plan if provided
    if (preventionPlanId) {
      const plan = await prisma.preventionPlan.findUnique({
        where: { id: preventionPlanId },
        select: { id: true, patientId: true },
      });

      if (!plan) {
        return NextResponse.json({ error: 'Prevention plan not found' }, { status: 404 });
      }

      if (plan.patientId !== patientId) {
        return NextResponse.json(
          { error: 'Prevention plan does not belong to patient' },
          { status: 400 }
        );
      }
    }

    // Create screening outcome record
    const screening = await prisma.screeningOutcome.create({
      data: {
        patientId,
        screeningType,
        scheduledDate: new Date(scheduledDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        description: description || null,
        screeningCode: screeningCode || null,
        orderingProvider: orderingProvider || session.user.id,
        facility: facility || null,
        followUpPlanId: preventionPlanId || null,
      },
    });

    const elapsed = performance.now() - start;

    logger.info({
      event: 'screening_scheduled',
      screeningId: screening.id,
      patientId,
      screeningType,
      scheduledDate,
      scheduledBy: session.user.id,
      latencyMs: elapsed.toFixed(2),
    });

    // HIPAA Audit: Log screening creation
    await auditCreate('ScreeningOutcome', screening.id, request, {
      patientId,
      screeningType,
      scheduledDate,
      scheduledBy: session.user.id,
      action: 'screening_scheduled',
    });

    return NextResponse.json({
      success: true,
      message: `${screeningType.replace(/_/g, ' ')} screening scheduled`,
      data: {
        id: screening.id,
        patientId: screening.patientId,
        screeningType: screening.screeningType,
        scheduledDate: screening.scheduledDate,
        status: 'scheduled',
      },
      meta: {
        latencyMs: Math.round(elapsed),
      },
    });
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'screening_schedule_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to schedule screening',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/prevention/screenings
 * List screenings for a patient with optional filters
 */
export async function GET(request: NextRequest) {
  const start = performance.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const screeningType = searchParams.get('type');
    const status = searchParams.get('status'); // scheduled, completed, overdue

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Build query conditions
    const where: Record<string, unknown> = { patientId };

    if (screeningType) {
      where.screeningType = screeningType;
    }

    const now = new Date();

    if (status === 'completed') {
      where.completedDate = { not: null };
    } else if (status === 'scheduled') {
      where.completedDate = null;
      where.scheduledDate = { gte: now };
    } else if (status === 'overdue') {
      where.completedDate = null;
      where.scheduledDate = { lt: now };
    }

    // Fetch screenings with parallel count
    const [screenings, totalCount] = await Promise.all([
      prisma.screeningOutcome.findMany({
        where,
        orderBy: { scheduledDate: 'desc' },
        take: 50, // Limit for performance
      }),
      prisma.screeningOutcome.count({ where }),
    ]);

    // Add computed status to each screening
    const screeningsWithStatus = screenings.map((s) => {
      let computedStatus: 'completed' | 'scheduled' | 'overdue';
      if (s.completedDate) {
        computedStatus = 'completed';
      } else if (new Date(s.scheduledDate) < now) {
        computedStatus = 'overdue';
      } else {
        computedStatus = 'scheduled';
      }

      return {
        ...s,
        status: computedStatus,
      };
    });

    const elapsed = performance.now() - start;

    logger.info({
      event: 'screenings_fetched',
      patientId,
      count: screenings.length,
      filters: { screeningType, status },
      latencyMs: elapsed.toFixed(2),
      userId: session.user.id,
    });

    // HIPAA Audit: Log screening list access
    await auditView('ScreeningOutcome', patientId, request, {
      patientId,
      screeningCount: screenings.length,
      filters: { screeningType, status },
      accessedBy: session.user.id,
      action: 'screenings_viewed',
    });

    return NextResponse.json({
      success: true,
      data: {
        screenings: screeningsWithStatus,
        total: totalCount,
      },
      meta: {
        latencyMs: Math.round(elapsed),
      },
    });
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'screenings_fetch_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch screenings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
