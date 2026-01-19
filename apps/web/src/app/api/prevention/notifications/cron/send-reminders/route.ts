/**
 * Scheduled Screening Reminders Cron Job
 *
 * POST /api/prevention/notifications/cron/send-reminders
 * Called by cron job to send scheduled screening reminders
 *
 * Features:
 * - Sends reminders 7, 3, and 1 days before scheduled screenings
 * - Sends overdue alerts for missed screenings
 * - Respects patient communication preferences
 * - Rate limited to prevent spam
 *
 * Phase 4: Notifications via Novu
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getPreventionNotificationService } from '@/lib/services/prevention-notification.service';

export const dynamic = 'force-dynamic';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

interface ScreeningWithPatient {
  id: string;
  patientId: string;
  screeningType: string;
  scheduledDate: Date;
  dueDate: Date | null;
  completedDate: Date | null;
  remindersSent: number;
  lastReminderAt: Date | null;
  facility: string | null;
  patient: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

/**
 * POST /api/prevention/notifications/cron/send-reminders
 * Process and send scheduled screening reminders
 */
export async function POST(request: NextRequest) {
  const start = performance.now();

  try {
    // Verify cron authentication
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationService = getPreventionNotificationService();
    const now = new Date();
    const results = {
      reminders7Days: 0,
      reminders3Days: 0,
      reminders1Day: 0,
      overdueAlerts: 0,
      errors: 0,
    };

    // Calculate date ranges
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
    oneDayFromNow.setHours(23, 59, 59, 999);

    const sixDaysFromNow = new Date(now);
    sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6);
    sixDaysFromNow.setHours(0, 0, 0, 0);

    const twoDaysFromNow = new Date(now);
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(0, 0, 0, 0);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Fetch all upcoming screenings in parallel
    const [
      sevenDayScreenings,
      threeDayScreenings,
      oneDayScreenings,
      overdueScreenings,
    ] = await Promise.all([
      // 7-day reminders (between 6-7 days from now)
      prisma.screeningOutcome.findMany({
        where: {
          scheduledDate: {
            gte: sixDaysFromNow,
            lte: sevenDaysFromNow,
          },
          completedDate: null,
          remindersSent: { lt: 1 }, // Haven't sent 7-day reminder
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        take: 100, // Batch limit
      }),

      // 3-day reminders (between 2-3 days from now)
      prisma.screeningOutcome.findMany({
        where: {
          scheduledDate: {
            gte: twoDaysFromNow,
            lte: threeDaysFromNow,
          },
          completedDate: null,
          remindersSent: { lt: 2 }, // Haven't sent 3-day reminder
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        take: 100,
      }),

      // 1-day reminders (tomorrow)
      prisma.screeningOutcome.findMany({
        where: {
          scheduledDate: {
            gte: tomorrow,
            lte: oneDayFromNow,
          },
          completedDate: null,
          remindersSent: { lt: 3 }, // Haven't sent 1-day reminder
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        take: 100,
      }),

      // Overdue screenings (up to 30 days overdue)
      prisma.screeningOutcome.findMany({
        where: {
          scheduledDate: {
            lt: now,
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
          completedDate: null,
          // Only send overdue alerts once per week
          OR: [
            { lastReminderAt: null },
            {
              lastReminderAt: {
                lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        take: 100,
      }),
    ]);

    // Process 7-day reminders
    for (const screening of sevenDayScreenings as ScreeningWithPatient[]) {
      try {
        await notificationService.sendScreeningReminder({
          patientId: screening.patientId,
          screeningId: screening.id,
          screeningType: screening.screeningType,
          scheduledDate: screening.scheduledDate,
          dueDate: screening.dueDate || undefined,
          facility: screening.facility || undefined,
        });

        await prisma.screeningOutcome.update({
          where: { id: screening.id },
          data: {
            remindersSent: { increment: 1 },
            lastReminderAt: now,
          },
        });

        results.reminders7Days++;
      } catch (error) {
        logger.error({
          event: 'reminder_send_error',
          screeningId: screening.id,
          type: '7day',
          error: error instanceof Error ? error.message : String(error),
        });
        results.errors++;
      }
    }

    // Process 3-day reminders
    for (const screening of threeDayScreenings as ScreeningWithPatient[]) {
      try {
        await notificationService.sendScreeningReminder({
          patientId: screening.patientId,
          screeningId: screening.id,
          screeningType: screening.screeningType,
          scheduledDate: screening.scheduledDate,
          dueDate: screening.dueDate || undefined,
          facility: screening.facility || undefined,
        });

        await prisma.screeningOutcome.update({
          where: { id: screening.id },
          data: {
            remindersSent: { increment: 1 },
            lastReminderAt: now,
          },
        });

        results.reminders3Days++;
      } catch (error) {
        logger.error({
          event: 'reminder_send_error',
          screeningId: screening.id,
          type: '3day',
          error: error instanceof Error ? error.message : String(error),
        });
        results.errors++;
      }
    }

    // Process 1-day reminders
    for (const screening of oneDayScreenings as ScreeningWithPatient[]) {
      try {
        await notificationService.sendScreeningReminder({
          patientId: screening.patientId,
          screeningId: screening.id,
          screeningType: screening.screeningType,
          scheduledDate: screening.scheduledDate,
          dueDate: screening.dueDate || undefined,
          facility: screening.facility || undefined,
        });

        await prisma.screeningOutcome.update({
          where: { id: screening.id },
          data: {
            remindersSent: { increment: 1 },
            lastReminderAt: now,
          },
        });

        results.reminders1Day++;
      } catch (error) {
        logger.error({
          event: 'reminder_send_error',
          screeningId: screening.id,
          type: '1day',
          error: error instanceof Error ? error.message : String(error),
        });
        results.errors++;
      }
    }

    // Process overdue alerts
    for (const screening of overdueScreenings as ScreeningWithPatient[]) {
      try {
        const daysOverdue = Math.floor(
          (now.getTime() - screening.scheduledDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        await notificationService.sendScreeningOverdueAlert({
          patientId: screening.patientId,
          screeningId: screening.id,
          screeningType: screening.screeningType,
          scheduledDate: screening.scheduledDate,
          dueDate: screening.dueDate || undefined,
          daysOverdue,
        });

        await prisma.screeningOutcome.update({
          where: { id: screening.id },
          data: {
            lastReminderAt: now,
          },
        });

        results.overdueAlerts++;
      } catch (error) {
        logger.error({
          event: 'overdue_alert_send_error',
          screeningId: screening.id,
          error: error instanceof Error ? error.message : String(error),
        });
        results.errors++;
      }
    }

    const elapsed = performance.now() - start;

    logger.info({
      event: 'cron_send_reminders_completed',
      results,
      totalProcessed:
        results.reminders7Days +
        results.reminders3Days +
        results.reminders1Day +
        results.overdueAlerts,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        latencyMs: Math.round(elapsed),
      },
    });
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'cron_send_reminders_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to process reminders',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
