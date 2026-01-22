/**
 * Auto-Generate Reminders from Prevention Plan API
 *
 * POST /api/prevention/plans/[planId]/reminders/auto-generate
 * Automatically creates reminders for each goal in the prevention plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  emitPreventionEventToAll,
} from '@/lib/socket-server';
import { SocketEvent, NotificationPriority } from '@/lib/socket/events';

interface RouteContext {
  params: {
    planId: string;
  };
}

interface PlanGoal {
  goal: string;
  targetDate?: string;
  status?: string;
  category?: string;
  timeframe?: string;
  priority?: string;
}

/**
 * POST - Auto-generate reminders from plan goals
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { planId } = context.params;

    // Fetch the prevention plan
    const plan = await prisma.preventionPlan.findUnique({
      where: { id: planId },
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

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Prevention plan not found' },
        { status: 404 }
      );
    }

    // Parse goals from JSON
    const goals = plan.goals as unknown as PlanGoal[];

    if (!Array.isArray(goals) || goals.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No goals found in prevention plan' },
        { status: 400 }
      );
    }

    // Check for existing reminders
    const existingReminders = await prisma.preventiveCareReminder.findMany({
      where: {
        preventionPlanId: planId,
      },
      select: { goalIndex: true },
    });

    const existingGoalIndices = new Set(existingReminders.map((r) => r.goalIndex));

    // Create reminders for each goal that doesn't have one
    const createdReminders = [];
    const skippedGoals = [];

    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];

      // Skip if reminder already exists for this goal
      if (existingGoalIndices.has(i)) {
        skippedGoals.push({
          index: i,
          reason: 'Reminder already exists',
          goal: goal.goal,
        });
        continue;
      }

      // Skip completed goals
      if (goal.status === 'completed') {
        skippedGoals.push({
          index: i,
          reason: 'Goal already completed',
          goal: goal.goal,
        });
        continue;
      }

      // Calculate due date
      let dueDate: Date;
      if (goal.targetDate) {
        dueDate = new Date(goal.targetDate);
      } else if (goal.timeframe) {
        // Parse timeframe like "3 months", "6 weeks", "1 year"
        const match = goal.timeframe.match(/(\d+)\s*(day|week|month|year)s?/i);
        if (match) {
          const [, amount, unit] = match;
          const num = parseInt(amount);
          dueDate = new Date();

          switch (unit.toLowerCase()) {
            case 'day':
              dueDate.setDate(dueDate.getDate() + num);
              break;
            case 'week':
              dueDate.setDate(dueDate.getDate() + num * 7);
              break;
            case 'month':
              dueDate.setMonth(dueDate.getMonth() + num);
              break;
            case 'year':
              dueDate.setFullYear(dueDate.getFullYear() + num);
              break;
          }
        } else {
          // Default to 1 month if can't parse
          dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
      } else {
        // Default to 1 month
        dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      // Map priority
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
      if (goal.priority) {
        const p = goal.priority.toUpperCase();
        if (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(p)) {
          priority = p as any;
        }
      }

      // Map category to screening type (simplified mapping)
      let screeningType = 'OTHER';
      if (goal.category) {
        const cat = goal.category.toLowerCase();
        if (cat.includes('blood pressure')) screeningType = 'BLOOD_PRESSURE';
        else if (cat.includes('cholesterol')) screeningType = 'CHOLESTEROL';
        else if (cat.includes('diabetes')) screeningType = 'DIABETES_SCREENING';
        else if (cat.includes('mammogram')) screeningType = 'MAMMOGRAM';
        else if (cat.includes('colonoscopy')) screeningType = 'COLONOSCOPY';
      }

      // Create reminder
      const reminder = await prisma.preventiveCareReminder.create({
        data: {
          patientId: plan.patientId,
          preventionPlanId: planId,
          goalIndex: i,
          title: goal.goal,
          description: `Reminder auto-generated from prevention plan: ${plan.planName}`,
          screeningType: screeningType as any,
          recommendedBy: new Date(),
          dueDate,
          priority: priority as any,
          guidelineSource: plan.guidelineSource,
          evidenceLevel: plan.evidenceLevel,
          status: 'DUE',
        },
      });

      createdReminders.push({
        id: reminder.id,
        goalIndex: i,
        goal: goal.goal,
        dueDate: reminder.dueDate,
      });
    }

    // Create audit log
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        resource: 'prevention_plan',
        resourceId: planId,
        details: `Auto-generated ${createdReminders.length} reminder(s) for "${plan.planName}"`,
        ipAddress,
      },
    });

    logger.info({
      event: 'reminders_auto_generated',
      userId: session.user.id,
      planId,
      created: createdReminders.length,
      skipped: skippedGoals.length,
    });

    // Emit real-time notification
    const notification = {
      id: crypto.randomUUID(),
      event: SocketEvent.REMINDER_CREATED,
      title: 'Recordatorios Creados',
      message: `${createdReminders.length} recordatorio${createdReminders.length !== 1 ? 's' : ''} creado${createdReminders.length !== 1 ? 's' : ''} automáticamente para "${plan.planName}"`,
      priority: NotificationPriority.MEDIUM,
      data: {
        planId,
        patientId: plan.patientId,
        count: createdReminders.length,
        userId: session.user.id,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    emitPreventionEventToAll(SocketEvent.REMINDER_CREATED, notification);

    return NextResponse.json({
      success: true,
      data: {
        planId,
        planName: plan.planName,
        patient: plan.patient,
        created: createdReminders,
        skipped: skippedGoals,
        summary: {
          totalGoals: goals.length,
          remindersCreated: createdReminders.length,
          goalsSkipped: skippedGoals.length,
        },
      },
    });
  } catch (error) {
    logger.error({
      event: 'auto_generate_reminders_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to auto-generate reminders',
      },
      { status: 500 }
    );
  }
}
