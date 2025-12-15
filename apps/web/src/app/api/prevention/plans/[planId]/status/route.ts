/**
 * Prevention Plan Status Management API
 *
 * PATCH /api/prevention/plans/[planId]/status - Update plan status (ACTIVE/COMPLETED/DEACTIVATED)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'DEACTIVATED']),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const StatusChangeHistoryEntry = z.object({
  timestamp: z.string(),
  userId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type StatusChangeHistory = z.infer<typeof StatusChangeHistoryEntry>;

/**
 * PATCH /api/prevention/plans/[planId]/status
 * Update prevention plan status with reason and history tracking
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const planId = params.planId;
    const body = await request.json();
    const validation = UpdateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { status, reason, notes } = validation.data;

    // Get the existing prevention plan
    const preventionPlan = await prisma.preventionPlan.findUnique({
      where: { id: planId },
    });

    if (!preventionPlan) {
      return NextResponse.json(
        { error: 'Prevention plan not found' },
        { status: 404 }
      );
    }

    // Prevent invalid status transitions
    const currentStatus = preventionPlan.status;
    if (currentStatus === status) {
      return NextResponse.json(
        { error: `Plan is already ${status}` },
        { status: 400 }
      );
    }

    // Get existing status change history or initialize empty array
    const statusHistory = (preventionPlan.statusChanges as StatusChangeHistory[]) || [];

    // Create new history entry
    const historyEntry: StatusChangeHistory = {
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      fromStatus: currentStatus,
      toStatus: status,
      reason: reason || undefined,
      notes: notes || undefined,
    };

    // Add to history
    statusHistory.push(historyEntry);

    // Prepare update data
    const updateData: any = {
      status: status as any,
      statusChanges: statusHistory,
      updatedAt: new Date(),
    };

    // Add specific fields based on status
    if (status === 'COMPLETED') {
      updateData.completionReason = reason || null;
      updateData.completedAt = new Date();
      updateData.completedBy = session.user.id;
    } else if (status === 'DEACTIVATED') {
      updateData.deactivationReason = reason || null;
      updateData.deactivatedAt = new Date();
      updateData.deactivatedBy = session.user.id;
    } else if (status === 'ACTIVE' && currentStatus === 'DEACTIVATED') {
      // Reactivating a deactivated plan
      updateData.activatedAt = new Date();
      updateData.deactivationReason = null;
      updateData.deactivatedAt = null;
      updateData.deactivatedBy = null;
    }

    // Update the prevention plan
    const updatedPlan = await prisma.preventionPlan.update({
      where: { id: planId },
      data: updateData,
    });

    // Prepare response message
    let message = '';
    if (status === 'COMPLETED') {
      message = 'Plan marked as completed';
    } else if (status === 'DEACTIVATED') {
      message = 'Plan deactivated';
    } else if (status === 'ACTIVE') {
      message = 'Plan reactivated';
    }

    return NextResponse.json({
      success: true,
      message,
      data: {
        planId: updatedPlan.id,
        status: updatedPlan.status,
        previousStatus: currentStatus,
        reason: reason || null,
        timestamp: new Date().toISOString(),
        statusChangeCount: statusHistory.length,
      },
    });
  } catch (error) {
    console.error('Error updating prevention plan status:', error);

    return NextResponse.json(
      {
        error: 'Failed to update plan status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/prevention/plans/[planId]/status/history
 * Get status change history for a plan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const planId = params.planId;

    // Get the prevention plan
    const preventionPlan = await prisma.preventionPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        planName: true,
        status: true,
        statusChanges: true,
        createdAt: true,
        completedAt: true,
        deactivatedAt: true,
        completionReason: true,
        deactivationReason: true,
      },
    });

    if (!preventionPlan) {
      return NextResponse.json(
        { error: 'Prevention plan not found' },
        { status: 404 }
      );
    }

    const statusHistory = (preventionPlan.statusChanges as StatusChangeHistory[]) || [];

    return NextResponse.json({
      success: true,
      data: {
        planId: preventionPlan.id,
        planName: preventionPlan.planName,
        currentStatus: preventionPlan.status,
        statusHistory,
        completionReason: preventionPlan.completionReason,
        deactivationReason: preventionPlan.deactivationReason,
        createdAt: preventionPlan.createdAt,
        completedAt: preventionPlan.completedAt,
        deactivatedAt: preventionPlan.deactivatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching status history:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch status history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
