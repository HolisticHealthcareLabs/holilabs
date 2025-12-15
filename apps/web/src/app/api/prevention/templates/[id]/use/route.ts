/**
 * Use Prevention Plan Template API
 *
 * POST /api/prevention/templates/[id]/use - Create a plan from template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/prevention/templates/[id]/use
 * Create a new prevention plan from a template
 */
export async function POST(
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
    const { patientId, planName, customizations } = body;

    // Validate required fields
    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Get template
    const template = await prisma.preventionPlanTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (!template.isActive) {
      return NextResponse.json(
        { error: 'Template is not active' },
        { status: 400 }
      );
    }

    // Create plan from template
    const newPlan = await prisma.preventionPlan.create({
      data: {
        patientId,
        planName: planName || template.templateName,
        planType: template.planType,
        description: customizations?.description || template.description,
        status: 'ACTIVE',
        guidelineSource: template.guidelineSource,
        evidenceLevel: template.evidenceLevel,
        goals: customizations?.goals || template.goals,
        recommendations: customizations?.recommendations || template.recommendations,
        activatedAt: new Date(),
        statusChanges: [
          {
            timestamp: new Date().toISOString(),
            userId: session.user.id,
            fromStatus: null,
            toStatus: 'ACTIVE',
            reason: 'created_from_template',
            notes: `Created from template: ${template.templateName}`,
          },
        ] as any,
      },
    });

    // Increment template use count
    await prisma.preventionPlanTemplate.update({
      where: { id: params.id },
      data: {
        useCount: {
          increment: 1,
        },
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Plan created from template successfully',
      data: {
        plan: newPlan,
        templateId: template.id,
        templateName: template.templateName,
      },
    });
  } catch (error) {
    console.error('Error creating plan from template:', error);

    return NextResponse.json(
      {
        error: 'Failed to create plan from template',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
