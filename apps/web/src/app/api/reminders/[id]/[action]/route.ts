/**
 * Reminder Actions API
 *
 * POST /api/reminders/[id]/cancel - Cancel a scheduled reminder
 * POST /api/reminders/[id]/pause - Pause a recurring reminder
 * POST /api/reminders/[id]/resume - Resume a paused reminder
 * POST /api/reminders/[id]/retry - Retry a failed reminder
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Calculate next execution time for recurring reminders
 */
function calculateNextExecution(
  currentDate: Date,
  pattern: string,
  interval: number
): Date {
  const next = new Date(currentDate);

  switch (pattern) {
    case 'DAILY':
      next.setDate(next.getDate() + interval);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + interval * 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  return next;
}

/**
 * POST /api/reminders/[id]/[action]
 * Perform actions on scheduled reminders
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; action: string } }
) {
  try {
    const { id, action } = params;

    // Validate action
    const validActions = ['cancel', 'pause', 'resume', 'retry'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid action: ${action}`,
        },
        { status: 400 }
      );
    }

    // Find the reminder
    const reminder = await prisma.scheduledReminder.findUnique({
      where: { id },
    });

    if (!reminder) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reminder not found',
        },
        { status: 404 }
      );
    }

    let updatedReminder;

    // Perform action
    switch (action) {
      case 'cancel':
        updatedReminder = await prisma.scheduledReminder.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            nextExecution: null,
          },
        });
        logger.info({
          event: 'reminder_cancelled',
          reminderId: id,
          templateName: reminder.templateName,
        });
        break;

      case 'pause':
        if (!reminder.recurrencePattern) {
          return NextResponse.json(
            {
              success: false,
              error: 'Can only pause recurring reminders',
            },
            { status: 400 }
          );
        }
        updatedReminder = await prisma.scheduledReminder.update({
          where: { id },
          data: {
            status: 'PAUSED',
          },
        });
        logger.info({
          event: 'reminder_paused',
          reminderId: id,
          templateName: reminder.templateName,
        });
        break;

      case 'resume':
        if (reminder.status !== 'PAUSED') {
          return NextResponse.json(
            {
              success: false,
              error: 'Can only resume paused reminders',
            },
            { status: 400 }
          );
        }
        if (!reminder.recurrencePattern || !reminder.recurrenceInterval) {
          return NextResponse.json(
            {
              success: false,
              error: 'Reminder missing recurrence configuration',
            },
            { status: 400 }
          );
        }

        // Calculate next execution from now
        const nextExecution = calculateNextExecution(
          new Date(),
          reminder.recurrencePattern,
          reminder.recurrenceInterval
        );

        updatedReminder = await prisma.scheduledReminder.update({
          where: { id },
          data: {
            status: 'ACTIVE',
            nextExecution,
          },
        });
        logger.info({
          event: 'reminder_resumed',
          reminderId: id,
          templateName: reminder.templateName,
          nextExecution,
        });
        break;

      case 'retry':
        if (reminder.status !== 'FAILED') {
          return NextResponse.json(
            {
              success: false,
              error: 'Can only retry failed reminders',
            },
            { status: 400 }
          );
        }

        // Reset status and schedule for immediate execution
        updatedReminder = await prisma.scheduledReminder.update({
          where: { id },
          data: {
            status: reminder.recurrencePattern ? 'ACTIVE' : 'PENDING',
            scheduledFor: new Date(),
            nextExecution: reminder.recurrencePattern ? new Date() : null,
          },
        });
        logger.info({
          event: 'reminder_retry',
          reminderId: id,
          templateName: reminder.templateName,
        });
        break;
    }

    return NextResponse.json({
      success: true,
      data: updatedReminder,
      message: `Reminder ${action}ed successfully`,
    });
  } catch (error) {
    logger.error({
      event: 'reminder_action_error',
      action: params.action,
      reminderId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: `Failed to ${params.action} reminder`,
      },
      { status: 500 }
    );
  }
}
