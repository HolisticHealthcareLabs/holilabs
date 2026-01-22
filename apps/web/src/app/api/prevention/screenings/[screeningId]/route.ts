/**
 * Individual Screening Outcome API
 *
 * GET /api/prevention/screenings/[screeningId] - Get screening details
 * PATCH /api/prevention/screenings/[screeningId] - Update screening result/status
 * DELETE /api/prevention/screenings/[screeningId] - Cancel/delete screening
 *
 * Phase 3: History & Compliance
 * Latency Budget: ≤200ms
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';
import { auditUpdate, auditView } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ screeningId: string }>;
}

// Valid result values
const RESULT_VALUES = ['normal', 'abnormal', 'needs_followup', 'inconclusive'] as const;

// Update validation schema
const UpdateScreeningSchema = z.object({
  completedDate: z.string().optional().refine(
    (date) => !date || !isNaN(Date.parse(date)),
    { message: 'Invalid completedDate format' }
  ),
  result: z.enum(RESULT_VALUES).optional(),
  notes: z.string().optional(),
  followUpPlanId: z.string().optional(),
  scheduledDate: z.string().optional().refine(
    (date) => !date || !isNaN(Date.parse(date)),
    { message: 'Invalid scheduledDate format' }
  ),
});

/**
 * GET /api/prevention/screenings/[screeningId]
 * Get details of a specific screening
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const start = performance.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { screeningId } = await params;

    if (!screeningId) {
      return NextResponse.json(
        { error: 'Screening ID is required' },
        { status: 400 }
      );
    }

    const screening = await prisma.screeningOutcome.findUnique({
      where: { id: screeningId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!screening) {
      return NextResponse.json(
        { error: 'Screening not found' },
        { status: 404 }
      );
    }

    // Compute status
    const now = new Date();
    let status: 'completed' | 'scheduled' | 'overdue';
    if (screening.completedDate) {
      status = 'completed';
    } else if (new Date(screening.scheduledDate) < now) {
      status = 'overdue';
    } else {
      status = 'scheduled';
    }

    const elapsed = performance.now() - start;

    logger.info({
      event: 'screening_fetched',
      screeningId,
      patientId: screening.patientId,
      latencyMs: elapsed.toFixed(2),
      userId: session.user.id,
    });

    // HIPAA Audit: Log screening access
    await auditView('ScreeningOutcome', screeningId, request, {
      patientId: screening.patientId,
      screeningType: screening.screeningType,
      accessedBy: session.user.id,
      action: 'screening_viewed',
    });

    return NextResponse.json({
      success: true,
      data: {
        ...screening,
        status,
      },
      meta: {
        latencyMs: Math.round(elapsed),
      },
    });
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'screening_fetch_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch screening',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/prevention/screenings/[screeningId]
 * Update a screening result, completion date, or reschedule
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const start = performance.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { screeningId } = await params;

    if (!screeningId) {
      return NextResponse.json(
        { error: 'Screening ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = UpdateScreeningSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    // Verify screening exists
    const existingScreening = await prisma.screeningOutcome.findUnique({
      where: { id: screeningId },
    });

    if (!existingScreening) {
      return NextResponse.json(
        { error: 'Screening not found' },
        { status: 404 }
      );
    }

    const { completedDate, result, notes, followUpPlanId, scheduledDate } = validation.data;

    // Build update data
    const updateData: Record<string, unknown> = {};
    const changes: string[] = [];

    if (completedDate !== undefined) {
      updateData.completedDate = completedDate ? new Date(completedDate) : null;
      changes.push(`completedDate: ${completedDate || 'cleared'}`);
    }

    if (result !== undefined) {
      updateData.result = result;
      changes.push(`result: ${result}`);
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
      changes.push('notes updated');
    }

    if (followUpPlanId !== undefined) {
      // Verify follow-up plan exists and belongs to same patient
      if (followUpPlanId) {
        const plan = await prisma.preventionPlan.findUnique({
          where: { id: followUpPlanId },
          select: { id: true, patientId: true },
        });

        if (!plan) {
          return NextResponse.json(
            { error: 'Follow-up plan not found' },
            { status: 404 }
          );
        }

        if (plan.patientId !== existingScreening.patientId) {
          return NextResponse.json(
            { error: 'Follow-up plan does not belong to same patient' },
            { status: 400 }
          );
        }
      }
      updateData.followUpPlanId = followUpPlanId || null;
      changes.push(`followUpPlanId: ${followUpPlanId || 'cleared'}`);
    }

    if (scheduledDate !== undefined) {
      updateData.scheduledDate = new Date(scheduledDate);
      changes.push(`rescheduled to: ${scheduledDate}`);
    }

    // Perform update
    const updatedScreening = await prisma.screeningOutcome.update({
      where: { id: screeningId },
      data: updateData,
    });

    // Compute new status
    const now = new Date();
    let status: 'completed' | 'scheduled' | 'overdue';
    if (updatedScreening.completedDate) {
      status = 'completed';
    } else if (new Date(updatedScreening.scheduledDate) < now) {
      status = 'overdue';
    } else {
      status = 'scheduled';
    }

    const elapsed = performance.now() - start;

    logger.info({
      event: 'screening_updated',
      screeningId,
      patientId: updatedScreening.patientId,
      changes,
      updatedBy: session.user.id,
      latencyMs: elapsed.toFixed(2),
    });

    // HIPAA Audit: Log screening update
    await auditUpdate('ScreeningOutcome', screeningId, request, {
      patientId: updatedScreening.patientId,
      screeningType: updatedScreening.screeningType,
      changes,
      result: updatedScreening.result,
      updatedBy: session.user.id,
      action: result ? 'screening_result_recorded' : 'screening_updated',
    });

    return NextResponse.json({
      success: true,
      message: 'Screening updated successfully',
      data: {
        ...updatedScreening,
        status,
      },
      meta: {
        latencyMs: Math.round(elapsed),
        changes,
      },
    });
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'screening_update_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to update screening',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prevention/screenings/[screeningId]
 * Cancel/delete a scheduled screening
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const start = performance.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { screeningId } = await params;

    if (!screeningId) {
      return NextResponse.json(
        { error: 'Screening ID is required' },
        { status: 400 }
      );
    }

    // Verify screening exists
    const existingScreening = await prisma.screeningOutcome.findUnique({
      where: { id: screeningId },
    });

    if (!existingScreening) {
      return NextResponse.json(
        { error: 'Screening not found' },
        { status: 404 }
      );
    }

    // Prevent deleting completed screenings
    if (existingScreening.completedDate) {
      return NextResponse.json(
        { error: 'Cannot delete completed screenings' },
        { status: 400 }
      );
    }

    // Delete the screening
    await prisma.screeningOutcome.delete({
      where: { id: screeningId },
    });

    const elapsed = performance.now() - start;

    logger.info({
      event: 'screening_cancelled',
      screeningId,
      patientId: existingScreening.patientId,
      screeningType: existingScreening.screeningType,
      cancelledBy: session.user.id,
      latencyMs: elapsed.toFixed(2),
    });

    // HIPAA Audit: Log screening cancellation
    await auditUpdate('ScreeningOutcome', screeningId, request, {
      patientId: existingScreening.patientId,
      screeningType: existingScreening.screeningType,
      cancelledBy: session.user.id,
      action: 'screening_cancelled',
    });

    return NextResponse.json({
      success: true,
      message: 'Screening cancelled successfully',
      meta: {
        latencyMs: Math.round(elapsed),
      },
    });
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'screening_delete_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to cancel screening',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
