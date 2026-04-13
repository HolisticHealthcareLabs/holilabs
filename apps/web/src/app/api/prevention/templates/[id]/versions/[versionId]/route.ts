export const dynamic = "force-dynamic";
/**
 * Specific Template Version API
 *
 * GET /api/prevention/templates/[id]/versions/[versionId]
 * Returns complete snapshot data for a specific version
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const ROLES = ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as const;

/**
 * GET - Retrieve a specific version's complete data
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const templateId = params?.id;
    const versionId = params?.versionId;
    const userId = context.user?.id;

    if (!templateId || !versionId) {
      return NextResponse.json(
        { success: false, error: 'Template ID and version ID required' },
        { status: 400 }
      );
    }

    const version = await prisma.preventionPlanTemplateVersion.findUnique({
      where: { id: versionId },
      include: {
        template: {
          select: {
            id: true,
            templateName: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }

    if (version.templateId !== templateId) {
      return NextResponse.json(
        { success: false, error: 'Version does not belong to this template' },
        { status: 400 }
      );
    }

    logger.info({
      event: 'template_version_retrieved',
      userId,
      templateId,
      versionId,
      versionNumber: version.versionNumber,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: version.id,
        templateId: version.templateId,
        templateName: version.template.templateName,
        versionNumber: version.versionNumber,
        versionLabel: version.versionLabel,
        templateData: version.templateData,
        changeLog: version.changeLog,
        changedFields: version.changedFields,
        createdBy: version.createdByUser,
        createdAt: version.createdAt,
      },
    });
  },
  { roles: [...ROLES] }
);
