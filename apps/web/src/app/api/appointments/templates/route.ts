export const dynamic = "force-dynamic";
/**
 * Notification Templates API Routes
 * GET /api/appointments/templates - List all notification templates
 * POST /api/appointments/templates - Create new notification template
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/appointments/templates
 * Lists all notification templates with optional filtering
 */
export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const doctorId = searchParams.get('doctorId');
    const channel = searchParams.get('channel');
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');

    const where: any = {};

    if (level) where.level = level;
    if (doctorId) where.doctorId = doctorId;
    if (channel) where.channel = channel;
    if (type) where.type = type;
    if (isActive !== null) where.isActive = isActive === 'true';

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
        { level: 'asc' },
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: { templates },
      message: `Found ${templates.length} template(s)`,
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);

/**
 * POST /api/appointments/templates
 * Creates a new notification template
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
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

    if (!name || !type || !channel || !templateBody) {
      return NextResponse.json(
        { success: false, error: 'name, type, channel, and body are required' },
        { status: 400 }
      );
    }

    if (level === 'DOCTOR' && !doctorId) {
      return NextResponse.json(
        { success: false, error: 'doctorId is required for doctor-level templates' },
        { status: 400 }
      );
    }

    const userId = context.user!.id;

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
        createdBy: userId,
        updatedBy: userId,
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

    await prisma.auditLog.create({
      data: {
        userId,
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
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    rateLimit: { windowMs: 60_000, maxRequests: 60 },
  }
);
