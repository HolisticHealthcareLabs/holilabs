/**
 * Prevention Plan Template Operations API
 *
 * GET /api/prevention/templates/[id] - Get a specific template
 * PUT /api/prevention/templates/[id] - Update a template
 * DELETE /api/prevention/templates/[id] - Delete a template
 * POST /api/prevention/templates/[id]/use - Use a template (increment count)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/prevention/templates/[id]
 * Get a specific template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const template = await prisma.preventionPlanTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { template },
    });
  } catch (error) {
    console.error('Error fetching template:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch template',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/prevention/templates/[id]
 * Update a template (automatically creates version snapshot)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      templateName,
      planType,
      description,
      guidelineSource,
      evidenceLevel,
      targetPopulation,
      goals,
      recommendations,
      isActive,
      createVersion = true,
      versionLabel,
      changeLog,
    } = body;

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Check if template exists
      const existingTemplate = await tx.preventionPlanTemplate.findUnique({
        where: { id: params.id },
      });

      if (!existingTemplate) {
        throw new Error('Template not found');
      }

      // Detect changed fields
      const changedFields: string[] = [];
      if (templateName !== undefined && templateName !== existingTemplate.templateName) {
        changedFields.push('templateName');
      }
      if (planType !== undefined && planType !== existingTemplate.planType) {
        changedFields.push('planType');
      }
      if (description !== undefined && description !== existingTemplate.description) {
        changedFields.push('description');
      }
      if (guidelineSource !== undefined && guidelineSource !== existingTemplate.guidelineSource) {
        changedFields.push('guidelineSource');
      }
      if (evidenceLevel !== undefined && evidenceLevel !== existingTemplate.evidenceLevel) {
        changedFields.push('evidenceLevel');
      }
      if (targetPopulation !== undefined && targetPopulation !== existingTemplate.targetPopulation) {
        changedFields.push('targetPopulation');
      }
      if (goals !== undefined && JSON.stringify(goals) !== JSON.stringify(existingTemplate.goals)) {
        changedFields.push('goals');
      }
      if (recommendations !== undefined && JSON.stringify(recommendations) !== JSON.stringify(existingTemplate.recommendations)) {
        changedFields.push('recommendations');
      }
      if (isActive !== undefined && isActive !== existingTemplate.isActive) {
        changedFields.push('isActive');
      }

      // Create version snapshot before updating (if requested and there are changes)
      let newVersion = null;
      if (createVersion && changedFields.length > 0) {
        // Get current max version number
        const latestVersion = await tx.preventionPlanTemplateVersion.findFirst({
          where: { templateId: params.id },
          orderBy: { versionNumber: 'desc' },
          select: { versionNumber: true },
        });

        const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

        // Create snapshot of current state
        const templateData = {
          id: existingTemplate.id,
          templateName: existingTemplate.templateName,
          planType: existingTemplate.planType,
          description: existingTemplate.description,
          guidelineSource: existingTemplate.guidelineSource,
          evidenceLevel: existingTemplate.evidenceLevel,
          targetPopulation: existingTemplate.targetPopulation,
          goals: existingTemplate.goals,
          recommendations: existingTemplate.recommendations,
          isActive: existingTemplate.isActive,
          useCount: existingTemplate.useCount,
          createdBy: existingTemplate.createdBy,
          createdAt: existingTemplate.createdAt,
          updatedAt: existingTemplate.updatedAt,
        };

        newVersion = await tx.preventionPlanTemplateVersion.create({
          data: {
            templateId: params.id,
            versionNumber: nextVersionNumber,
            versionLabel: versionLabel || `v${nextVersionNumber}`,
            templateData,
            changeLog: changeLog || `Updated ${changedFields.join(', ')}`,
            changedFields,
            createdBy: session.user.id,
          },
        });
      }

      // Update template
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (templateName !== undefined) updateData.templateName = templateName;
      if (planType !== undefined) updateData.planType = planType;
      if (description !== undefined) updateData.description = description;
      if (guidelineSource !== undefined) updateData.guidelineSource = guidelineSource;
      if (evidenceLevel !== undefined) updateData.evidenceLevel = evidenceLevel;
      if (targetPopulation !== undefined) updateData.targetPopulation = targetPopulation;
      if (goals !== undefined) updateData.goals = goals;
      if (recommendations !== undefined) updateData.recommendations = recommendations;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedTemplate = await tx.preventionPlanTemplate.update({
        where: { id: params.id },
        data: updateData,
      });

      // Create audit log
      const ipAddress = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown';

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          resource: 'prevention_template',
          resourceId: params.id,
          details: `Updated template "${updatedTemplate.templateName}"${
            changedFields.length > 0 ? `: ${changedFields.join(', ')}` : ''
          }`,
          ipAddress,
        },
      });

      return {
        updatedTemplate,
        newVersion,
        changedFields,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      data: {
        template: result.updatedTemplate,
        version: result.newVersion ? {
          id: result.newVersion.id,
          versionNumber: result.newVersion.versionNumber,
          versionLabel: result.newVersion.versionLabel,
        } : null,
        changedFields: result.changedFields,
      },
    });
  } catch (error) {
    console.error('Error updating template:', error);

    return NextResponse.json(
      {
        error: 'Failed to update template',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prevention/templates/[id]
 * Delete a template (soft delete by setting isActive to false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Check if template exists
    const existingTemplate = await prisma.preventionPlanTemplate.findUnique({
      where: { id: params.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    const deletedTemplate = await prisma.preventionPlanTemplate.update({
      where: { id: params.id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
      data: { template: deletedTemplate },
    });
  } catch (error) {
    console.error('Error deleting template:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete template',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
