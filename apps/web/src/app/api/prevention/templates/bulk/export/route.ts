/**
 * Bulk Export Templates API
 *
 * POST /api/prevention/templates/bulk/export
 * Exports multiple templates to JSON or CSV format
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { templateIds, format = 'json' } = body;

    // Validation
    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'templateIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (templateIds.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Cannot export more than 500 templates at once' },
        { status: 400 }
      );
    }

    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'format must be either "json" or "csv"' },
        { status: 400 }
      );
    }

    // Fetch templates
    const templates = await prisma.preventionPlanTemplate.findMany({
      where: {
        id: { in: templateIds },
      },
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
    });

    if (templates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No templates found' },
        { status: 404 }
      );
    }

    logger.info({
      event: 'bulk_templates_exported',
      userId: session.user.id,
      count: templates.length,
      format,
    });

    // JSON Export
    if (format === 'json') {
      const exportData = {
        exportDate: new Date().toISOString(),
        exportedBy: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        },
        templateCount: templates.length,
        templates: templates.map((t) => ({
          id: t.id,
          templateName: t.templateName,
          planType: t.planType,
          description: t.description,
          guidelineSource: t.guidelineSource,
          evidenceLevel: t.evidenceLevel,
          targetPopulation: t.targetPopulation,
          goals: t.goals,
          recommendations: t.recommendations,
          isActive: t.isActive,
          useCount: t.useCount,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          createdBy: t.createdByUser,
        })),
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="prevention-templates-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    // CSV Export
    if (format === 'csv') {
      const headers = [
        'ID',
        'Template Name',
        'Plan Type',
        'Description',
        'Guideline Source',
        'Evidence Level',
        'Target Population',
        'Goals Count',
        'Recommendations Count',
        'Is Active',
        'Use Count',
        'Created At',
        'Updated At',
        'Created By',
      ];

      const rows = templates.map((t) => [
        t.id,
        t.templateName,
        t.planType,
        t.description || '',
        t.guidelineSource || '',
        t.evidenceLevel || '',
        t.targetPopulation || '',
        (t.goals as any[]).length,
        (t.recommendations as any[]).length,
        t.isActive ? 'Yes' : 'No',
        t.useCount,
        t.createdAt.toISOString(),
        t.updatedAt.toISOString(),
        t.createdByUser ? `${t.createdByUser.firstName} ${t.createdByUser.lastName}` : '',
      ]);

      // Escape CSV values
      const escapeCsvValue = (value: any): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvContent = [
        headers.map(escapeCsvValue).join(','),
        ...rows.map((row) => row.map(escapeCsvValue).join(',')),
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="prevention-templates-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Should never reach here
    return NextResponse.json(
      { success: false, error: 'Invalid format' },
      { status: 400 }
    );
  } catch (error) {
    logger.error({
      event: 'bulk_export_templates_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export templates',
      },
      { status: 500 }
    );
  }
}
