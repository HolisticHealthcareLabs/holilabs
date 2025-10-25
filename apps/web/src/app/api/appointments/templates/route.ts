/**
 * Notification Templates API Routes
 * GET /api/appointments/templates - List all notification templates
 * POST /api/appointments/templates - Create new notification template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

/**
 * GET /api/appointments/templates
 * Lists all notification templates with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    await limiter.check(request, 60, 'TEMPLATES_GET');

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level'); // 'CLINIC' or 'DOCTOR'
    const doctorId = searchParams.get('doctorId');
    const channel = searchParams.get('channel'); // 'WHATSAPP', 'EMAIL', 'SMS', 'PUSH', 'IN_APP'
    const type = searchParams.get('type'); // 'REMINDER', 'CONFIRMATION', 'CANCELLATION', etc.
    const isActive = searchParams.get('isActive');

    // Build filter query
    const where: any = {};

    if (level) {
      where.level = level;
    }

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (channel) {
      where.channel = channel;
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Fetch templates
    const templates = await prisma.notificationTemplate.findMany({
      where,
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { level: 'asc' }, // CLINIC first, then DOCTOR
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: { templates },
      message: `Found ${templates.length} template(s)`,
    });
  } catch (error: any) {
    console.error('Error fetching notification templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/appointments/templates
 * Creates a new notification template
 */
export async function POST(request: NextRequest) {
  try {
    await limiter.check(request, 20, 'TEMPLATES_POST');

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      type,
      channel,
      level = 'CLINIC',
      doctorId,
      subject,
      body: templateBody,
      availableVariables,
      sendTiming,
      sendTimingUnit = 'minutes',
      requireConfirmation = true,
      isActive = true,
      isDefault = false,
    } = body;

    // Validation
    if (!name || !type || !channel || !templateBody) {
      return NextResponse.json(
        { success: false, error: 'name, type, channel, and body are required' },
        { status: 400 }
      );
    }

    // If level is DOCTOR, doctorId is required
    if (level === 'DOCTOR' && !doctorId) {
      return NextResponse.json(
        { success: false, error: 'doctorId is required for doctor-level templates' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults of same type/channel/level
    if (isDefault) {
      await prisma.notificationTemplate.updateMany({
        where: {
          type,
          channel,
          level,
          doctorId: level === 'DOCTOR' ? doctorId : null,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Create template
    const template = await prisma.notificationTemplate.create({
      data: {
        name,
        type,
        channel,
        level,
        doctorId: level === 'DOCTOR' ? doctorId : null,
        subject,
        body: templateBody,
        availableVariables: availableVariables || [
          'firstName',
          'lastName',
          'appointmentDate',
          'appointmentTime',
          'doctorName',
          'branch',
          'branchAddress',
        ],
        sendTiming,
        sendTimingUnit,
        requireConfirmation,
        isActive,
        isDefault,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        resource: 'NotificationTemplate',
        resourceId: template.id,
        details: {
          name,
          type,
          channel,
          level,
          doctorId,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: { template },
      message: 'Template created successfully',
    });
  } catch (error: any) {
    console.error('Error creating notification template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
