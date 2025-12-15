/**
 * Prevention Plan Status Undo API
 *
 * POST /api/prevention/plans/[planId]/status/undo - Undo the last status change
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface StatusChangeHistory {
  timestamp: string;
  userId: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  notes?: string;
}

/**
 * POST /api/prevention/plans/[planId]/status/undo
 * Undo the last status change (within 24 hours)
 */
export async function POST(
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

    // Get status change history
    const statusHistory = (preventionPlan.statusChanges as unknown as StatusChangeHistory[]) || [];

    if (statusHistory.length === 0) {
      return NextResponse.json(
        { error: 'No status changes to undo' },
        { status: 400 }
      );
    }

    // Get the most recent status change
    const lastChange = statusHistory[statusHistory.length - 1];

    // Check if the last change was made within 24 hours
    const lastChangeTime = new Date(lastChange.timestamp);
    const now = new Date();
    const hoursSinceChange = (now.getTime() - lastChangeTime.getTime()) / (1000 * 60 * 60);

    if (hoursSinceChange > 24) {
      return NextResponse.json(
        {
          error: 'Cannot undo status change',
          message: 'Only changes made within the last 24 hours can be undone',
          hoursSinceChange: Math.round(hoursSinceChange),
        },
        { status: 400 }
      );
    }

    // Get the previous status (the fromStatus of the last change)
    const previousStatus = lastChange.fromStatus;

    // Create undo entry for history
    const undoEntry: StatusChangeHistory = {
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      fromStatus: preventionPlan.status,
      toStatus: previousStatus,
      reason: 'undo_last_change',
      notes: `Undo of change made on ${lastChange.timestamp}`,
    };

    // Add undo entry to history
    const updatedHistory = [...statusHistory, undoEntry];

    // Prepare update data
    const updateData: any = {
      status: previousStatus as any,
      statusChanges: updatedHistory,
      updatedAt: new Date(),
    };

    // Reset status-specific fields based on what we're reverting to
    if (previousStatus === 'ACTIVE') {
      // Reverting to ACTIVE - clear completion/deactivation fields
      if (preventionPlan.status === 'COMPLETED') {
        updateData.completionReason = null;
        updateData.completedAt = null;
        updateData.completedBy = null;
      } else if (preventionPlan.status === 'DEACTIVATED') {
        updateData.deactivationReason = null;
        updateData.deactivatedAt = null;
        updateData.deactivatedBy = null;
      }
    } else if (previousStatus === 'COMPLETED') {
      // Reverting to COMPLETED - restore completion fields if available
      // (This would require storing previous field values, which we don't have)
      // For now, just set the status
    } else if (previousStatus === 'DEACTIVATED') {
      // Reverting to DEACTIVATED - restore deactivation fields if available
      // (Same limitation as above)
    }

    // Update the prevention plan
    const updatedPlan = await prisma.preventionPlan.update({
      where: { id: planId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Status change undone successfully',
      data: {
        planId: updatedPlan.id,
        previousStatus: preventionPlan.status,
        restoredStatus: previousStatus,
        undoneChange: {
          timestamp: lastChange.timestamp,
          fromStatus: lastChange.fromStatus,
          toStatus: lastChange.toStatus,
          reason: lastChange.reason,
        },
        timestamp: new Date().toISOString(),
        canUndoMore: statusHistory.length > 1,
      },
    });
  } catch (error) {
    console.error('Error undoing prevention plan status change:', error);

    return NextResponse.json(
      {
        error: 'Failed to undo status change',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/prevention/plans/[planId]/status/undo/check
 * Check if the last status change can be undone
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

    // Get the existing prevention plan
    const preventionPlan = await prisma.preventionPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        status: true,
        statusChanges: true,
      },
    });

    if (!preventionPlan) {
      return NextResponse.json(
        { error: 'Prevention plan not found' },
        { status: 404 }
      );
    }

    // Get status change history
    const statusHistory = (preventionPlan.statusChanges as unknown as StatusChangeHistory[]) || [];

    if (statusHistory.length === 0) {
      return NextResponse.json({
        success: true,
        canUndo: false,
        reason: 'No status changes to undo',
      });
    }

    // Get the most recent status change
    const lastChange = statusHistory[statusHistory.length - 1];

    // Check if the last change was made within 24 hours
    const lastChangeTime = new Date(lastChange.timestamp);
    const now = new Date();
    const hoursSinceChange = (now.getTime() - lastChangeTime.getTime()) / (1000 * 60 * 60);

    const canUndo = hoursSinceChange <= 24;

    return NextResponse.json({
      success: true,
      canUndo,
      data: {
        lastChange: {
          timestamp: lastChange.timestamp,
          fromStatus: lastChange.fromStatus,
          toStatus: lastChange.toStatus,
          reason: lastChange.reason,
          hoursSinceChange: Math.round(hoursSinceChange * 10) / 10,
        },
        currentStatus: preventionPlan.status,
        wouldRevertTo: lastChange.fromStatus,
        timeRemaining: canUndo ? Math.max(0, 24 - hoursSinceChange) : 0,
      },
      reason: canUndo ? 'Can undo' : 'Time limit exceeded (24 hours)',
    });
  } catch (error) {
    console.error('Error checking undo eligibility:', error);

    return NextResponse.json(
      {
        error: 'Failed to check undo eligibility',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
