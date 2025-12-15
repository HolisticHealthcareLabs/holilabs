/**
 * Specific Template Version API
 *
 * GET /api/prevention/templates/[id]/versions/[versionId]
 * Returns complete snapshot data for a specific version
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

interface RouteContext {
  params: {
    id: string;
    versionId: string;
  };
}

/**
 * GET - Retrieve a specific version's complete data
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

    const { id: templateId, versionId } = context.params;

    // Fetch version with full template data
    const version = await prisma.preventionPlanTemplateVersion.findUnique({
      where: {
        id: versionId,
      },
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

    // Verify version belongs to the template
    if (version.templateId !== templateId) {
      return NextResponse.json(
        { success: false, error: 'Version does not belong to this template' },
        { status: 400 }
      );
    }

    logger.info({
      event: 'template_version_retrieved',
      userId: session.user.id,
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
  } catch (error) {
    logger.error({
      event: 'get_template_version_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve version',
      },
      { status: 500 }
    );
  }
}
