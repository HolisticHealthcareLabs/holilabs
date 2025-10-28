/**
 * Schedule Reminder API
 *
 * Creates scheduled reminders that will be executed at a specific time
 * Supports one-time and recurring reminders
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface ScheduleReminderRequest {
  patientIds: string[];
  template: {
    name: string;
    category: string;
    subject?: string;
    message: string;
    variables: string[];
  };
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP';
  scheduledFor: string; // ISO datetime
  recurrence?: {
    pattern: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    interval: number;
    endDate?: string;
    count?: number;
  };
}

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
 * POST /api/reminders/schedule
 * Create a scheduled reminder
 */
export async function POST(request: NextRequest) {
  try {
    const body: ScheduleReminderRequest = await request.json();

    const { patientIds, template, channel, scheduledFor, recurrence } = body;

    // Validate input
    if (!patientIds || patientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one patient ID is required' },
        { status: 400 }
      );
    }

    if (!template.message) {
      return NextResponse.json(
        { success: false, error: 'Template message is required' },
        { status: 400 }
      );
    }

    if (!['SMS', 'EMAIL', 'WHATSAPP'].includes(channel)) {
      return NextResponse.json(
        { success: false, error: 'Invalid channel. Must be SMS, EMAIL, or WHATSAPP' },
        { status: 400 }
      );
    }

    if (!scheduledFor) {
      return NextResponse.json(
        { success: false, error: 'scheduledFor is required' },
        { status: 400 }
      );
    }

    const scheduleDate = new Date(scheduledFor);
    if (isNaN(scheduleDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduledFor date' },
        { status: 400 }
      );
    }

    if (scheduleDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    // Validate recurrence if provided
    if (recurrence) {
      if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(recurrence.pattern)) {
        return NextResponse.json(
          { success: false, error: 'Invalid recurrence pattern' },
          { status: 400 }
        );
      }

      if (recurrence.interval < 1) {
        return NextResponse.json(
          { success: false, error: 'Recurrence interval must be at least 1' },
          { status: 400 }
        );
      }

      if (recurrence.endDate) {
        const endDate = new Date(recurrence.endDate);
        if (endDate <= scheduleDate) {
          return NextResponse.json(
            { success: false, error: 'Recurrence end date must be after scheduled date' },
            { status: 400 }
          );
        }
      }

      if (recurrence.count && recurrence.count < 1) {
        return NextResponse.json(
          { success: false, error: 'Recurrence count must be at least 1' },
          { status: 400 }
        );
      }
    }

    // TODO: Get current user ID from session
    const createdBy = 'system'; // Replace with actual user ID from auth session

    // Calculate next execution for recurring reminders
    const nextExecution = recurrence
      ? calculateNextExecution(scheduleDate, recurrence.pattern, recurrence.interval)
      : null;

    // Create scheduled reminder
    const scheduledReminder = await prisma.scheduledReminder.create({
      data: {
        templateName: template.name,
        templateSubject: template.subject || null,
        templateMessage: template.message,
        templateVars: template.variables,
        patientIds: patientIds,
        channel: channel,
        scheduledFor: scheduleDate,
        recurrencePattern: recurrence?.pattern || null,
        recurrenceInterval: recurrence?.interval || null,
        recurrenceEndDate: recurrence?.endDate ? new Date(recurrence.endDate) : null,
        recurrenceCount: recurrence?.count || null,
        status: recurrence ? 'ACTIVE' : 'PENDING',
        nextExecution: nextExecution,
        createdBy: createdBy,
      },
    });

    logger.info({
      event: 'reminder_scheduled',
      reminderId: scheduledReminder.id,
      patientCount: patientIds.length,
      channel,
      scheduledFor: scheduleDate.toISOString(),
      isRecurring: !!recurrence,
      recurrencePattern: recurrence?.pattern,
    });

    return NextResponse.json({
      success: true,
      message: `Reminder scheduled successfully for ${patientIds.length} patient(s)${
        recurrence ? ` with ${recurrence.pattern.toLowerCase()} recurrence` : ''
      }`,
      reminder: {
        id: scheduledReminder.id,
        scheduledFor: scheduledReminder.scheduledFor,
        isRecurring: !!recurrence,
        nextExecution: nextExecution?.toISOString() || null,
      },
    });
  } catch (error) {
    logger.error({
      event: 'reminder_schedule_api_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule reminder',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reminders/schedule
 * Get all scheduled reminders
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING, ACTIVE, COMPLETED, etc.
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [reminders, total] = await Promise.all([
      prisma.scheduledReminder.findMany({
        where,
        orderBy: { scheduledFor: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.scheduledReminder.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: reminders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error({
      event: 'reminder_schedule_list_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch scheduled reminders',
      },
      { status: 500 }
    );
  }
}
