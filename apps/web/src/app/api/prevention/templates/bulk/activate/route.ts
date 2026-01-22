/**
 * Bulk Activate Templates API
 *
 * POST /api/prevention/templates/bulk/activate
 * Activates multiple templates in a single transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  emitPreventionEventToAll,
} from '@/lib/socket-server';
import { SocketEvent, NotificationPriority } from '@/lib/socket/events';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { templateIds } = body;

    // Validation
    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'templateIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (templateIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Cannot activate more than 100 templates at once' },
        { status: 400 }
      );
    }

    // Use Prisma transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update all templates
      const updated = await tx.preventionPlanTemplate.updateMany({
        where: {
          id: { in: templateIds },
        },
        data: {
          isActive: true,
          updatedAt: new Date(),
        },
      });

      // Create audit logs for each template
      const templates = await tx.preventionPlanTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, templateName: true },
      });

      const ipAddress = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';

      const auditLogs = templates.map((template) => ({
        userId: session.user.id,
        action: 'UPDATE' as const,
        resource: 'prevention_template' as const,
        resourceId: template.id,
        details: `Bulk activated: ${template.templateName}`,
        ipAddress,
      }));

      await tx.auditLog.createMany({
        data: auditLogs,
      });

      return { updated: updated.count, templates };
    });

    logger.info({
      event: 'bulk_templates_activated',
      userId: session.user.id,
      count: result.updated,
    });

    // Emit real-time notification
    const notification = {
      id: crypto.randomUUID(),
      event: SocketEvent.BULK_OPERATION_COMPLETED,
      title: 'Plantillas Activadas',
      message: `${result.updated} plantilla${result.updated !== 1 ? 's' : ''} activada${result.updated !== 1 ? 's' : ''} exitosamente`,
      priority: NotificationPriority.MEDIUM,
      data: {
        operation: 'activate',
        count: result.updated,
        userId: session.user.id,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    emitPreventionEventToAll(SocketEvent.BULK_OPERATION_COMPLETED, notification);

    return NextResponse.json({
      success: true,
      data: {
        updated: result.updated,
        templates: result.templates,
      },
    });
  } catch (error) {
    logger.error({
      event: 'bulk_activate_templates_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate templates',
      },
      { status: 500 }
    );
  }
}
