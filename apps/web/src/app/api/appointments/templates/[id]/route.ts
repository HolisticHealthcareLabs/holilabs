export const dynamic = "force-dynamic";
/**
 * Notification Template API Routes
 * GET /api/appointments/templates/[id] - Get single template
 * PATCH /api/appointments/templates/[id] - Update template
 * DELETE /api/appointments/templates/[id] - Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/appointments/templates/[id]
 * Fetches a single notification template by ID
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const templateId = params.id;
    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID required' },
        { status: 400 }
      );
    }

    const template = await prisma.notificationTemplate.findUnique({
      where: { id: templateId },
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

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { template },
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
    audit: { action: 'READ', resource: 'AppointmentTemplate' },
  }
);

/**
 * PATCH /api/appointments/templates/[id]
 * Updates a notification template
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const templateId = params.id;
    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const userId = context.user!.id;

    const existingTemplate = await prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    if (body.isDefault === true) {
      await prisma.notificationTemplate.updateMany({
        where: {
          type: body.type || existingTemplate.type,
          channel: body.channel || existingTemplate.channel,
          level: body.level || existingTemplate.level,
          doctorId: body.doctorId !== undefined ? body.doctorId : existingTemplate.doctorId,
          isDefault: true,
          id: { not: templateId },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const updatedTemplate = await prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        ...body,
        updatedBy: userId,
        updatedAt: new Date(),
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
        action: 'UPDATE',
        resource: 'NotificationTemplate',
        resourceId: templateId,
        details: {
          changes: body,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: { template: updatedTemplate },
      message: 'Template updated successfully',
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    rateLimit: { windowMs: 60_000, maxRequests: 60 },
    audit: { action: 'UPDATE', resource: 'AppointmentTemplate' },
  }
);

/**
 * DELETE /api/appointments/templates/[id]
 * Deletes a notification template
 */
export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const templateId = params.id;
    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID required' },
        { status: 400 }
      );
    }

    const userId = context.user!.id;

    const template = await prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    if (template.isDefault) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete default template. Set another template as default first.' },
        { status: 400 }
      );
    }

    await prisma.notificationTemplate.delete({
      where: { id: templateId },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        resource: 'NotificationTemplate',
        resourceId: templateId,
        details: {
          name: template.name,
          type: template.type,
          channel: template.channel,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    rateLimit: { windowMs: 60_000, maxRequests: 60 },
    audit: { action: 'DELETE', resource: 'AppointmentTemplate' },
  }
);
