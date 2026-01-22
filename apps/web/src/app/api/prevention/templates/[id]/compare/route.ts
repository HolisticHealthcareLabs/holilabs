/**
 * Template Version Comparison API
 *
 * POST /api/prevention/templates/[id]/compare
 * Compares two versions of a template and returns differences
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

interface RouteContext {
  params: {
    id: string;
  };
}

type FieldDifference = {
  field: string;
  oldValue: any;
  newValue: any;
  changed: boolean;
};

/**
 * Deep comparison helper for arrays
 */
function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compare two template data objects and return differences
 */
function compareTemplateData(oldData: any, newData: any): FieldDifference[] {
  const fields = [
    'templateName',
    'planType',
    'description',
    'guidelineSource',
    'evidenceLevel',
    'targetPopulation',
    'goals',
    'recommendations',
    'isActive',
  ];

  const differences: FieldDifference[] = [];

  for (const field of fields) {
    const oldValue = oldData[field];
    const newValue = newData[field];

    let changed = false;

    // Handle array comparisons
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      changed = !arraysEqual(oldValue, newValue);
    }
    // Handle object/null comparisons
    else if (typeof oldValue === 'object' || typeof newValue === 'object') {
      changed = JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }
    // Handle primitive comparisons
    else {
      changed = oldValue !== newValue;
    }

    differences.push({
      field,
      oldValue,
      newValue,
      changed,
    });
  }

  return differences;
}

/**
 * POST - Compare two versions
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
    const { versionId1, versionId2, compareWithCurrent = false } = body;

    // Validation
    if (!versionId1 || typeof versionId1 !== 'string') {
      return NextResponse.json(
        { success: false, error: 'versionId1 is required' },
        { status: 400 }
      );
    }

    if (!compareWithCurrent && (!versionId2 || typeof versionId2 !== 'string')) {
      return NextResponse.json(
        { success: false, error: 'versionId2 is required when compareWithCurrent is false' },
        { status: 400 }
      );
    }

    // Fetch first version
    const version1 = await prisma.preventionPlanTemplateVersion.findUnique({
      where: { id: versionId1 },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!version1) {
      return NextResponse.json(
        { success: false, error: 'Version 1 not found' },
        { status: 404 }
      );
    }

    if (version1.templateId !== templateId) {
      return NextResponse.json(
        { success: false, error: 'Version 1 does not belong to this template' },
        { status: 400 }
      );
    }

    let version2Data: any;
    let version2Meta: any;

    if (compareWithCurrent) {
      // Compare with current template state
      const currentTemplate = await prisma.preventionPlanTemplate.findUnique({
        where: { id: templateId },
      });

      if (!currentTemplate) {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }

      version2Data = {
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

      version2Meta = {
        id: 'current',
        versionNumber: 'Current',
        versionLabel: 'Current State',
        createdAt: currentTemplate.updatedAt,
      };
    } else {
      // Compare with another version
      const version2 = await prisma.preventionPlanTemplateVersion.findUnique({
        where: { id: versionId2 },
        include: {
          createdByUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      if (!version2) {
        return NextResponse.json(
          { success: false, error: 'Version 2 not found' },
          { status: 404 }
        );
      }

      if (version2.templateId !== templateId) {
        return NextResponse.json(
          { success: false, error: 'Version 2 does not belong to this template' },
          { status: 400 }
        );
      }

      version2Data = version2.templateData;
      version2Meta = {
        id: version2.id,
        versionNumber: version2.versionNumber,
        versionLabel: version2.versionLabel,
        changeLog: version2.changeLog,
        createdBy: version2.createdByUser,
        createdAt: version2.createdAt,
      };
    }

    // Compare the two versions
    const differences = compareTemplateData(version1.templateData, version2Data);
    const changedFields = differences.filter((d) => d.changed);

    logger.info({
      event: 'template_versions_compared',
      userId: session.user.id,
      templateId,
      versionId1,
      versionId2: compareWithCurrent ? 'current' : versionId2,
      changedFieldsCount: changedFields.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        version1: {
          id: version1.id,
          versionNumber: version1.versionNumber,
          versionLabel: version1.versionLabel,
          changeLog: version1.changeLog,
          createdBy: version1.createdByUser,
          createdAt: version1.createdAt,
        },
        version2: version2Meta,
        differences,
        changedFields: changedFields.map((d) => d.field),
        summary: {
          totalFields: differences.length,
          changedFields: changedFields.length,
          unchangedFields: differences.length - changedFields.length,
        },
      },
    });
  } catch (error) {
    logger.error({
      event: 'compare_template_versions_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare versions',
      },
      { status: 500 }
    );
  }
}
