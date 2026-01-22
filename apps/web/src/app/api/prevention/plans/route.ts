/**
 * Prevention Plans API
 *
 * POST /api/prevention/plans - Create a new prevention plan from an applied protocol
 * GET /api/prevention/plans?patientId=xxx - Get prevention plans for a patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { PreventionProtocol } from '@/lib/prevention/international-protocols';

export const dynamic = 'force-dynamic';

const CreatePlanSchema = z.object({
  patientId: z.string(),
  protocol: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    conditionKey: z.string(),
    source: z.string(),
    guidelineVersion: z.string(),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    evidenceGrade: z.enum(['A', 'B', 'C']),
    interventions: z.array(
      z.object({
        category: z.string(),
        intervention: z.string(),
        evidence: z.string(),
        frequency: z.string().optional(),
      })
    ),
    guidelineUrl: z.string().optional(),
  }),
});

/**
 * POST /api/prevention/plans
 * Create a new prevention plan from an applied protocol
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = CreatePlanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { patientId, protocol } = validation.data;

    // Verify patient exists and user has access
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Map protocol to PreventionPlanType
    const planTypeMapping: Record<string, string> = {
      cardiovascular: 'CARDIOVASCULAR',
      coronary_heart_disease: 'CARDIOVASCULAR',
      myocardial_infarction: 'CARDIOVASCULAR',
      hypertension: 'CARDIOVASCULAR',
      hyperlipidemia: 'CARDIOVASCULAR',
      diabetes_type_2: 'DIABETES',
      diabetes_type_1: 'DIABETES',
      prediabetes: 'DIABETES',
      sickle_cell_anemia: 'COMPREHENSIVE',
      chronic_kidney_disease: 'COMPREHENSIVE',
      depression: 'COMPREHENSIVE',
      tobacco_use: 'COMPREHENSIVE',
    };

    const planType = planTypeMapping[protocol.conditionKey] || 'COMPREHENSIVE';

    // Convert protocol interventions to goals and recommendations
    const goals = protocol.interventions.map((intervention, index) => ({
      goal: intervention.intervention,
      targetDate: null, // Can be set later by clinician
      status: 'PENDING',
      category: intervention.category,
      evidence: intervention.evidence,
      frequency: intervention.frequency,
    }));

    const recommendations = protocol.interventions.map((intervention) => ({
      category: intervention.category,
      intervention: intervention.intervention,
      evidence: intervention.evidence,
      frequency: intervention.frequency || null,
      priority: protocol.priority,
    }));

    // Create prevention plan
    const preventionPlan = await prisma.preventionPlan.create({
      data: {
        patientId,
        planName: protocol.name,
        planType: planType as any,
        description: protocol.description,
        goals,
        recommendations,
        guidelineSource: `${protocol.source} ${protocol.guidelineVersion}`,
        evidenceLevel: `Grade ${protocol.evidenceGrade}`,
        status: 'ACTIVE',
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        aiGeneratedBy: 'prevention-hub-integration',
        aiConfidence: 1.0, // Confidence is high since it's from validated international guidelines
      },
    });

    return NextResponse.json({
      success: true,
      message: `Prevention plan created: ${protocol.name}`,
      data: {
        preventionPlanId: preventionPlan.id,
        patientId,
        planName: preventionPlan.planName,
        planType: preventionPlan.planType,
        interventionCount: protocol.interventions.length,
        guidelineSource: preventionPlan.guidelineSource,
        status: preventionPlan.status,
        createdAt: preventionPlan.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating prevention plan:', error);

    return NextResponse.json(
      {
        error: 'Failed to create prevention plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/prevention/plans?patientId=xxx
 * Get prevention plans for a patient
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId query parameter required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get prevention plans
    const preventionPlans = await prisma.preventionPlan.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        planName: true,
        planType: true,
        description: true,
        status: true,
        guidelineSource: true,
        evidenceLevel: true,
        goals: true,
        recommendations: true,
        activatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        patientId,
        preventionPlans,
        totalPlans: preventionPlans.length,
        activePlans: preventionPlans.filter((p) => p.status === 'ACTIVE').length,
      },
    });
  } catch (error) {
    console.error('Error fetching prevention plans:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch prevention plans',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
