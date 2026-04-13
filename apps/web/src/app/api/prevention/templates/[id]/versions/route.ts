export const dynamic = "force-dynamic";
/**
 * Template Versions API
 *
 * GET /api/prevention/templates/[id]/versions
 * Returns version history for a template
 *
 * POST /api/prevention/templates/[id]/versions
 * Creates a new version snapshot of the template
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

/**
 * GET - Retrieve version history for a template
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const templateId = params?.id;
    const userId = context.user?.id;

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'Template ID required' }, { status: 400 });
    }

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
      userId,
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
  },
  { roles: [...ROLES] }
);

/**
 * POST - Create a new version snapshot
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const templateId = params?.id;
    const userId = context.user?.id;

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'Template ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { versionLabel, changeLog, changedFields } = body;

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

    const result = await prisma.$transaction(async (tx) => {
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

      const latestVersion = await tx.preventionPlanTemplateVersion.findFirst({
        where: { templateId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });

      const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

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

      const version = await tx.preventionPlanTemplateVersion.create({
        data: {
          templateId,
          versionNumber: nextVersionNumber,
          versionLabel: versionLabel || `v${nextVersionNumber}`,
          templateData,
          changeLog,
          changedFields: changedFields || null,
          createdBy: userId!,
        },
        include: {
          createdByUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      const ipAddress = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';

      await tx.auditLog.create({
        data: {
          userId: userId!,
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
      userId,
      templateId,
      versionNumber: result.version.versionNumber,
    });

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
        userId,
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
  },
  { roles: [...ROLES] }
);
