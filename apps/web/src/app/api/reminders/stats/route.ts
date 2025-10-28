/**
 * Reminder Statistics API
 *
 * GET /api/reminders/stats
 * Returns statistics for the reminder dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reminders/stats
 * Get reminder statistics for dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get counts in parallel
    const [totalScheduled, sentToday, failedThisWeek, nextScheduledReminder] = await Promise.all([
      // Total scheduled reminders (active or pending)
      prisma.scheduledReminder.count({
        where: {
          status: {
            in: ['PENDING', 'ACTIVE'],
          },
        },
      }),

      // Sent today (from notifications)
      prisma.notification.count({
        where: {
          OR: [
            {
              emailSentAt: {
                gte: today,
              },
            },
            {
              smsSentAt: {
                gte: today,
              },
            },
          ],
        },
      }),

      // Failed this week
      prisma.scheduledReminder.count({
        where: {
          status: 'FAILED',
          updatedAt: {
            gte: weekAgo,
          },
        },
      }),

      // Next scheduled reminder
      prisma.scheduledReminder.findFirst({
        where: {
          status: {
            in: ['PENDING', 'ACTIVE'],
          },
          OR: [
            {
              scheduledFor: {
                gte: now,
              },
            },
            {
              nextExecution: {
                gte: now,
              },
            },
          ],
        },
        orderBy: [
          {
            scheduledFor: 'asc',
          },
          {
            nextExecution: 'asc',
          },
        ],
        select: {
          id: true,
          templateName: true,
          scheduledFor: true,
          nextExecution: true,
        },
      }),
    ]);

    // Calculate success rate for sent today
    const sentTodayFailed = await prisma.scheduledReminder.count({
      where: {
        status: 'FAILED',
        lastExecuted: {
          gte: today,
        },
      },
    });

    const successRate =
      sentToday > 0 ? Math.round(((sentToday - sentTodayFailed) / sentToday) * 100) : 100;

    const stats = {
      totalScheduled,
      sentToday,
      successRate,
      failedThisWeek,
      nextScheduled: nextScheduledReminder
        ? {
            id: nextScheduledReminder.id,
            templateName: nextScheduledReminder.templateName,
            scheduledFor:
              nextScheduledReminder.nextExecution || nextScheduledReminder.scheduledFor,
          }
        : null,
    };

    logger.info({
      event: 'reminder_stats_retrieved',
      stats,
    });

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({
      event: 'reminder_stats_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch reminder statistics',
      },
      { status: 500 }
    );
  }
}
