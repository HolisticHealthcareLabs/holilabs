/**
 * Template Revert API
 *
 * POST /api/prevention/templates/[id]/revert
 * Reverts a template to a specific version
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
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
 * POST - Revert template to a specific version
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: templateId } = context.params;
    const body = await request.json();
    const { versionId, createSnapshot = true } = body;

    // Validation
    if (!versionId || typeof versionId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'versionId is required' },
        { status: 400 }
      );
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get the version to revert to
      const targetVersion = await tx.preventionPlanTemplateVersion.findUnique({
        where: { id: versionId },
      });

      if (!targetVersion) {
        throw new Error('Version not found');
      }

      if (targetVersion.templateId !== templateId) {
        throw new Error('Version does not belong to this template');
      }

      // Get current template state
      const currentTemplate = await tx.preventionPlanTemplate.findUnique({
        where: { id: templateId },
      });

      if (!currentTemplate) {
        throw new Error('Template not found');
      }

      // Optionally create a snapshot of current state before reverting
      let preRevertSnapshot = null;
      if (createSnapshot) {
        const latestVersion = await tx.preventionPlanTemplateVersion.findFirst({
          where: { templateId },
          orderBy: { versionNumber: 'desc' },
          select: { versionNumber: true },
        });

        const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

        const currentTemplateData = {
          id: currentTemplate.id,
          templateName: currentTemplate.templateName,
          planType: currentTemplate.planType,
          description: currentTemplate.description,
          guidelineSource: currentTemplate.guidelineSource,
          evidenceLevel: currentTemplate.evidenceLevel,
          targetPopulation: currentTemplate.targetPopulation,
          goals: currentTemplate.goals,
          recommendations: currentTemplate.recommendations,
          isActive: currentTemplate.isActive,
          useCount: currentTemplate.useCount,
          createdBy: currentTemplate.createdBy,
          createdAt: currentTemplate.createdAt,
          updatedAt: currentTemplate.updatedAt,
        };

        preRevertSnapshot = await tx.preventionPlanTemplateVersion.create({
          data: {
            templateId,
            versionNumber: nextVersionNumber,
            versionLabel: `Pre-revert snapshot (v${nextVersionNumber})`,
            templateData: currentTemplateData,
            changeLog: `Automatic snapshot before reverting to version ${targetVersion.versionNumber}`,
            createdBy: session.user.id,
          },
        });
      }

      // Extract data from target version
      const versionData = targetVersion.templateData as any;

      // Update template with version data
      const updatedTemplate = await tx.preventionPlanTemplate.update({
        where: { id: templateId },
        data: {
          templateName: versionData.templateName,
          planType: versionData.planType,
          description: versionData.description,
          guidelineSource: versionData.guidelineSource,
          evidenceLevel: versionData.evidenceLevel,
          targetPopulation: versionData.targetPopulation,
          goals: versionData.goals,
          recommendations: versionData.recommendations,
          isActive: versionData.isActive,
          // Note: useCount is not reverted
          updatedAt: new Date(),
        },
      });

      // Create audit log
      const ipAddress = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ROLLBACK',
          resource: 'prevention_template',
          resourceId: templateId,
          details: `Reverted template "${updatedTemplate.templateName}" to version ${targetVersion.versionNumber}`,
          ipAddress,
        },
      });

      return {
        updatedTemplate,
        targetVersion,
        preRevertSnapshot,
      };
    });

    logger.info({
      event: 'template_reverted',
      userId: session.user.id,
      templateId,
      versionId,
      targetVersionNumber: result.targetVersion.versionNumber,
      snapshotCreated: !!result.preRevertSnapshot,
    });

    // Emit real-time notification
    const notification = {
      id: crypto.randomUUID(),
      event: SocketEvent.TEMPLATE_UPDATED,
      title: 'Plantilla Revertida',
      message: `"${result.updatedTemplate.templateName}" revertida a versión ${result.targetVersion.versionNumber}`,
      priority: NotificationPriority.HIGH,
      data: {
        templateId,
        versionId,
        versionNumber: result.targetVersion.versionNumber,
        userId: session.user.id,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    emitPreventionEventToAll(SocketEvent.TEMPLATE_UPDATED, notification);

    return NextResponse.json({
      success: true,
      data: {
        template: {
          id: result.updatedTemplate.id,
          templateName: result.updatedTemplate.templateName,
          updatedAt: result.updatedTemplate.updatedAt,
        },
        revertedToVersion: {
          id: result.targetVersion.id,
          versionNumber: result.targetVersion.versionNumber,
          versionLabel: result.targetVersion.versionLabel,
        },
        preRevertSnapshot: result.preRevertSnapshot ? {
          id: result.preRevertSnapshot.id,
          versionNumber: result.preRevertSnapshot.versionNumber,
        } : null,
      },
    });
  } catch (error) {
    logger.error({
      event: 'revert_template_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revert template',
      },
      { status: 500 }
    );
  }
}
