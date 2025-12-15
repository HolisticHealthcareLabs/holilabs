/**
 * Template Versions API
 *
 * GET /api/prevention/templates/[id]/versions
 * Returns version history for a template
 *
 * POST /api/prevention/templates/[id]/versions
 * Creates a new version snapshot of the template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  emitPreventionEventToAll,
} from '@/lib/socket-server';
import { SocketEvent, NotificationPriority } from '@/lib/socket/events';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET - Retrieve version history for a template
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: templateId } = context.params;

    // Verify template exists
    const template = await prisma.preventionPlanTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, templateName: true },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Fetch all versions
    const versions = await prisma.preventionPlanTemplateVersion.findMany({
      where: { templateId },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    logger.info({
      event: 'template_versions_retrieved',
      userId: session.user.id,
      templateId,
      versionCount: versions.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        templateName: template.templateName,
        versions: versions.map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
          versionLabel: v.versionLabel,
          changeLog: v.changeLog,
          changedFields: v.changedFields,
          createdBy: v.createdByUser,
          createdAt: v.createdAt,
        })),
      },
    });
  } catch (error) {
    logger.error({
      event: 'get_template_versions_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve versions',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new version snapshot
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: templateId } = context.params;
    const body = await request.json();
    const { versionLabel, changeLog, changedFields } = body;

    // Validation
    if (changeLog && typeof changeLog !== 'string') {
      return NextResponse.json(
        { success: false, error: 'changeLog must be a string' },
        { status: 400 }
      );
    }

    if (changedFields && !Array.isArray(changedFields)) {
      return NextResponse.json(
        { success: false, error: 'changedFields must be an array' },
        { status: 400 }
      );
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get current template
      const template = await tx.preventionPlanTemplate.findUnique({
        where: { id: templateId },
        include: {
          createdByUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Get current max version number
      const latestVersion = await tx.preventionPlanTemplateVersion.findFirst({
        where: { templateId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });

      const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

      // Create snapshot
      const templateData = {
        id: template.id,
        templateName: template.templateName,
        planType: template.planType,
        description: template.description,
        guidelineSource: template.guidelineSource,
        evidenceLevel: template.evidenceLevel,
        targetPopulation: template.targetPopulation,
        goals: template.goals,
        recommendations: template.recommendations,
        isActive: template.isActive,
        useCount: template.useCount,
        createdBy: template.createdBy,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };

      // Create version record
      const version = await tx.preventionPlanTemplateVersion.create({
        data: {
          templateId,
          versionNumber: nextVersionNumber,
          versionLabel: versionLabel || `v${nextVersionNumber}`,
          templateData,
          changeLog,
          changedFields: changedFields || null,
          createdBy: session.user.id,
        },
        include: {
          createdByUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      // Create audit log
      const ipAddress = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          resource: 'prevention_template',
          resourceId: templateId,
          details: `Created version ${nextVersionNumber}: ${template.templateName}`,
          ipAddress,
        },
      });

      return { template, version };
    });

    logger.info({
      event: 'template_version_created',
      userId: session.user.id,
      templateId,
      versionNumber: result.version.versionNumber,
    });

    // Emit real-time notification
    const notification = {
      id: crypto.randomUUID(),
      event: SocketEvent.TEMPLATE_UPDATED,
      title: 'Nueva Versión Creada',
      message: `Versión ${result.version.versionNumber} de "${result.template.templateName}"`,
      priority: NotificationPriority.MEDIUM,
      data: {
        templateId,
        versionId: result.version.id,
        versionNumber: result.version.versionNumber,
        userId: session.user.id,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    emitPreventionEventToAll(SocketEvent.TEMPLATE_UPDATED, notification);

    return NextResponse.json({
      success: true,
      data: {
        version: {
          id: result.version.id,
          versionNumber: result.version.versionNumber,
          versionLabel: result.version.versionLabel,
          changeLog: result.version.changeLog,
          changedFields: result.version.changedFields,
          createdBy: result.version.createdByUser,
          createdAt: result.version.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error({
      event: 'create_template_version_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create version',
      },
      { status: 500 }
    );
  }
}
