/**
 * Use Prevention Plan Template API
 *
 * POST /api/prevention/templates/[id]/use - Create a plan from template
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/prevention/templates/[id]/use
 * Create a new prevention plan from a template
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const templateId = params?.id;
    const userId = context.user?.id;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { patientId, planName, customizations } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const template = await prisma.preventionPlanTemplate.findUnique({
      where: { id: templateId },
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
            userId: userId!,
            fromStatus: null,
            toStatus: 'ACTIVE',
            reason: 'created_from_template',
            notes: `Created from template: ${template.templateName}`,
          },
        ] as any,
      },
    });

    await prisma.preventionPlanTemplate.update({
      where: { id: templateId },
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
  },
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);
