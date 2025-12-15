/**
 * Prevention Plan Reminders API
 *
 * GET /api/prevention/plans/[planId]/reminders
 * Returns all reminders associated with a prevention plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

interface RouteContext {
  params: {
    planId: string;
  };
}

/**
 * GET - Retrieve reminders for a prevention plan
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { planId } = context.params;

    // Verify plan exists
    const plan = await prisma.preventionPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        planName: true,
        patientId: true,
        goals: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Prevention plan not found' },
        { status: 404 }
      );
    }

    // Fetch associated reminders
    const reminders = await prisma.preventiveCareReminder.findMany({
      where: {
        preventionPlanId: planId,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Parse goals for reference
    const goals = plan.goals as any[];

    // Enhance reminders with goal info
    const enhancedReminders = reminders.map((reminder) => {
      const goalInfo =
        reminder.goalIndex !== null && reminder.goalIndex < goals.length
          ? goals[reminder.goalIndex]
          : null;

      return {
        id: reminder.id,
        title: reminder.title,
        description: reminder.description,
        screeningType: reminder.screeningType,
        dueDate: reminder.dueDate,
        priority: reminder.priority,
        status: reminder.status,
        goalIndex: reminder.goalIndex,
        goalInfo,
        guidelineSource: reminder.guidelineSource,
        evidenceLevel: reminder.evidenceLevel,
        completedAt: reminder.completedAt,
        completedBy: reminder.completedBy,
        resultNotes: reminder.resultNotes,
        recurringInterval: reminder.recurringInterval,
        nextDueDate: reminder.nextDueDate,
        createdAt: reminder.createdAt,
        updatedAt: reminder.updatedAt,
      };
    });

    logger.info({
      event: 'plan_reminders_retrieved',
      userId: session.user.id,
      planId,
      reminderCount: reminders.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        planId,
        planName: plan.planName,
        patientId: plan.patientId,
        reminders: enhancedReminders,
        summary: {
          total: reminders.length,
          due: reminders.filter((r) => r.status === 'DUE').length,
          completed: reminders.filter((r) => r.status === 'COMPLETED').length,
          overdue: reminders.filter(
            (r) => r.status === 'DUE' && r.dueDate < new Date()
          ).length,
        },
      },
    });
  } catch (error) {
    logger.error({
      event: 'get_plan_reminders_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve reminders',
      },
      { status: 500 }
    );
  }
}
