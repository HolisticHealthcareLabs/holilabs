/**
 * Notification Template API Routes
 * GET /api/appointments/templates/[id] - Get single template
 * PATCH /api/appointments/templates/[id] - Update template
 * DELETE /api/appointments/templates/[id] - Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * GET /api/appointments/templates/[id]
 * Fetches a single notification template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting - 60 requests per minute for appointments
    const rateLimitResponse = await checkRateLimit(request, 'appointments');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const templateId = params.id;

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
  } catch (error: any) {
    logger.error({
      event: 'appointment_template_fetch_failed',
      templateId: params.id,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/appointments/templates/[id]
 * Updates a notification template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting - 60 requests per minute for appointments
    const rateLimitResponse = await checkRateLimit(request, 'appointments');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const templateId = params.id;
    const body = await request.json();

    // Verify template exists
    const existingTemplate = await prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // If setting as default, unset other defaults of same type/channel/level
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

    // Update template
    const updatedTemplate = await prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        ...body,
        updatedBy: (session.user as any).id,
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

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
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
  } catch (error: any) {
    logger.error({
      event: 'appointment_template_update_failed',
      templateId: params.id,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/appointments/templates/[id]
 * Deletes a notification template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting - 60 requests per minute for appointments
    const rateLimitResponse = await checkRateLimit(request, 'appointments');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const templateId = params.id;

    // Verify template exists
    const template = await prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of default templates
    if (template.isDefault) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete default template. Set another template as default first.' },
        { status: 400 }
      );
    }

    // Delete template
    await prisma.notificationTemplate.delete({
      where: { id: templateId },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
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
  } catch (error: any) {
    logger.error({
      event: 'appointment_template_delete_failed',
      templateId: params.id,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
