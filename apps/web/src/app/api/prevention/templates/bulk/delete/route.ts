/**
 * Bulk Delete Templates API
 *
 * POST /api/prevention/templates/bulk/delete
 * Soft deletes multiple templates in a single transaction
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
        { success: false, error: 'Cannot delete more than 100 templates at once' },
        { status: 400 }
      );
    }

    // Use Prisma transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get template names before deletion for audit log
      const templates = await tx.preventionPlanTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, templateName: true },
      });

      // Delete all templates (hard delete for now, can change to soft delete)
      const deleted = await tx.preventionPlanTemplate.deleteMany({
        where: {
          id: { in: templateIds },
        },
      });

      // Create audit logs
      const ipAddress = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';

      const auditLogs = templates.map((template) => ({
        userId: session.user.id,
        action: 'DELETE' as const,
        resource: 'prevention_template' as const,
        resourceId: template.id,
        details: `Bulk deleted: ${template.templateName}`,
        ipAddress,
      }));

      await tx.auditLog.createMany({
        data: auditLogs,
      });

      return { deleted: deleted.count, templates };
    });

    logger.info({
      event: 'bulk_templates_deleted',
      userId: session.user.id,
      count: result.deleted,
    });

    // Emit real-time notification
    const notification = {
      id: crypto.randomUUID(),
      event: SocketEvent.BULK_OPERATION_COMPLETED,
      title: 'Plantillas Eliminadas',
      message: `${result.deleted} plantilla${result.deleted !== 1 ? 's' : ''} eliminada${result.deleted !== 1 ? 's' : ''} exitosamente`,
      priority: NotificationPriority.HIGH,
      data: {
        operation: 'delete',
        count: result.deleted,
        userId: session.user.id,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    emitPreventionEventToAll(SocketEvent.BULK_OPERATION_COMPLETED, notification);

    return NextResponse.json({
      success: true,
      data: {
        deleted: result.deleted,
        templates: result.templates,
      },
    });
  } catch (error) {
    logger.error({
      event: 'bulk_delete_templates_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete templates',
      },
      { status: 500 }
    );
  }
}
