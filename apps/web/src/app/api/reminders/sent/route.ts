/**
 * Sent Reminders API
 *
 * GET /api/reminders/sent
 * Returns list of sent reminders (from notifications)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reminders/sent
 * Get list of sent reminders
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const dateRange = searchParams.get('dateRange') || 'all'; // today, week, month, all
    const search = searchParams.get('search') || '';

    // Build date filter
    let dateFilter = {};
    const now = new Date();
    if (dateRange === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = {
        OR: [
          { emailSentAt: { gte: today } },
          { smsSentAt: { gte: today } },
        ],
      };
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = {
        OR: [
          { emailSentAt: { gte: weekAgo } },
          { smsSentAt: { gte: weekAgo } },
        ],
      };
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = {
        OR: [
          { emailSentAt: { gte: monthAgo } },
          { smsSentAt: { gte: monthAgo } },
        ],
      };
    }

    // Build where clause
    const where: any = {
      OR: [
        { deliveredEmail: true },
        { deliveredSMS: true },
      ],
      ...(Object.keys(dateFilter).length > 0 && dateFilter),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Get sent notifications
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [
          {
            emailSentAt: 'desc',
          },
          {
            smsSentAt: 'desc',
          },
        ],
        take: limit,
        skip: offset,
        select: {
          id: true,
          recipientId: true,
          recipientType: true,
          type: true,
          title: true,
          message: true,
          deliveredEmail: true,
          deliveredSMS: true,
          emailSentAt: true,
          smsSentAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
    ]);

    // Get patient info for recipients
    const patientIds = notifications
      .filter((n) => n.recipientType === 'PATIENT')
      .map((n) => n.recipientId);

    const patients = await prisma.patient.findMany({
      where: {
        id: {
          in: patientIds,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    const patientMap = new Map(patients.map((p) => [p.id, p]));

    // Format response
    const sentReminders = notifications.map((notification) => {
      const patient = patientMap.get(notification.recipientId);
      const channel = notification.deliveredEmail
        ? 'EMAIL'
        : notification.deliveredSMS
        ? 'SMS'
        : 'UNKNOWN';
      const sentAt = notification.emailSentAt || notification.smsSentAt;

      return {
        id: notification.id,
        templateName: notification.title,
        recipient: patient
          ? {
              id: patient.id,
              name: `${patient.firstName} ${patient.lastName}`,
              contact: channel === 'EMAIL' ? patient.email : patient.phone,
            }
          : null,
        channel,
        message: notification.message,
        sentAt,
        status: 'SENT',
      };
    });

    logger.info({
      event: 'sent_reminders_retrieved',
      count: sentReminders.length,
      total,
    });

    return NextResponse.json({
      success: true,
      data: sentReminders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error({
      event: 'sent_reminders_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sent reminders',
      },
      { status: 500 }
    );
  }
}
