export const dynamic = "force-dynamic";
/**
 * Bulk Delete Templates API
 *
 * POST /api/prevention/templates/bulk/delete
 * Soft deletes multiple templates in a single transaction
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  emitPreventionEventToAll,
} from '@/lib/socket-server';
import { SocketEvent, NotificationPriority } from '@/lib/socket/events';

const ROLES = ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as const;

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user?.id;

    const body = await request.json();
    const { templateIds } = body;

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

    const result = await prisma.$transaction(async (tx) => {
      const templates = await tx.preventionPlanTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, templateName: true },
      });

      const deleted = await tx.preventionPlanTemplate.deleteMany({
        where: {
          id: { in: templateIds },
        },
      });

      const ipAddress = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';

      const auditLogs = templates.map((template) => ({
        userId: userId!,
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
      userId,
      count: result.deleted,
    });

    const notification = {
      id: crypto.randomUUID(),
      event: SocketEvent.BULK_OPERATION_COMPLETED,
      title: 'Plantillas Eliminadas',
      message: `${result.deleted} plantilla${result.deleted !== 1 ? 's' : ''} eliminada${result.deleted !== 1 ? 's' : ''} exitosamente`,
      priority: NotificationPriority.HIGH,
      data: {
        operation: 'delete',
        count: result.deleted,
        userId,
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
  },
  { roles: [...ROLES] }
);
