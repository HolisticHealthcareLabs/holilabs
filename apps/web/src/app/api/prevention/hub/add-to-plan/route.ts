/**
 * Add to Plan API
 *
 * POST /api/prevention/hub/add-to-plan
 * Adds an intervention to a prevention plan and optionally links to an encounter.
 *
 * Features:
 * - Add intervention to existing plan or create new plan
 * - Create PreventionEncounterLink for encounter context
 * - Create version history for audit compliance
 * - Emit Socket.IO events for real-time updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';
import { auditCreate, auditUpdate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Request validation schema
const AddToPlanSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  planId: z.string().optional(),
  intervention: z.object({
    name: z.string().min(1, 'intervention name is required'),
    domain: z.enum([
      'cardiometabolic',
      'oncology',
      'musculoskeletal',
      'neurocognitive',
      'gut',
      'immune',
      'hormonal',
    ]),
    type: z.enum([
      'screening',
      'lab',
      'lifestyle',
      'supplement',
      'diet',
      'exercise',
      'medication',
      'referral',
      'education',
    ]),
    description: z.string().optional(),
    evidence: z.string().optional(),
    targetDate: z.string().optional(),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  }),
  encounterId: z.string().optional(),
  triggeringFindings: z.any().optional(), // Transcript findings that triggered this
});

// Map domain to plan type
const DOMAIN_TO_PLAN_TYPE: Record<string, string> = {
  cardiometabolic: 'CARDIOVASCULAR',
  oncology: 'ONCOLOGY_SCREENING',
  musculoskeletal: 'COMPREHENSIVE',
  neurocognitive: 'COMPREHENSIVE',
  gut: 'COMPREHENSIVE',
  immune: 'COMPREHENSIVE',
  hormonal: 'COMPREHENSIVE',
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    const body = await request.json();
    const validation = AddToPlanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { patientId, planId, intervention, encounterId, triggeringFindings } = validation.data;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Validate encounter if provided
    let encounter = null;
    if (encounterId) {
      encounter = await prisma.clinicalEncounter.findUnique({
        where: { id: encounterId },
        select: { id: true, patientId: true, status: true },
      });

      if (encounter && encounter.patientId !== patientId) {
        return NextResponse.json(
          { error: 'Encounter does not belong to patient' },
          { status: 400 }
        );
      }
    }

    let targetPlanId = planId;
    let planWasCreated = false;

    // If no planId provided, create a new plan
    if (!targetPlanId) {
      const planType = DOMAIN_TO_PLAN_TYPE[intervention.domain] || 'COMPREHENSIVE';
      const planName = `${intervention.domain.charAt(0).toUpperCase() + intervention.domain.slice(1)} Prevention Plan`;

      const newPlan = await prisma.preventionPlan.create({
        data: {
          patientId,
          planName,
          planType: planType as any,
          description: `Automatically created for ${intervention.name}`,
          status: 'ACTIVE',
          goals: [],
          recommendations: [],
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          aiGeneratedBy: 'prevention-hub',
          aiConfidence: 0.85,
        },
      });

      targetPlanId = newPlan.id;
      planWasCreated = true;

      logger.info({
        event: 'prevention_plan_created',
        planId: newPlan.id,
        patientId,
        planType,
        createdBy: session.user.id,
      });

      // HIPAA Audit: Log plan creation
      await auditCreate('PreventionPlan', newPlan.id, request, {
        patientId,
        planType,
        planName,
        createdBy: session.user.id,
        action: 'prevention_plan_created',
      });
    }

    // Fetch existing plan
    const existingPlan = await prisma.preventionPlan.findUnique({
      where: { id: targetPlanId },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Create the goal/intervention entry
    const newGoal = {
      goal: intervention.name,
      targetDate: intervention.targetDate || null,
      status: 'PENDING',
      category: intervention.type,
      evidence: intervention.evidence || '',
      description: intervention.description || '',
      priority: intervention.priority || 'MEDIUM',
      addedAt: new Date().toISOString(),
      addedBy: session.user.id,
    };

    // Get existing goals and add new one
    const existingGoals = Array.isArray(existingPlan.goals) ? existingPlan.goals : [];
    const updatedGoals = [...existingGoals, newGoal];

    // Find the latest version number for this plan
    const latestVersion = await prisma.preventionPlanVersion.findFirst({
      where: { planId: targetPlanId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    // Create version record before updating (audit trail)
    await prisma.preventionPlanVersion.create({
      data: {
        planId: targetPlanId,
        version: nextVersion,
        planData: existingPlan as any,
        changes: {
          type: 'goal_added',
          goal: newGoal,
          previousGoalsCount: existingGoals.length,
        },
        changedBy: session.user.id,
        changeReason: `Added intervention: ${intervention.name}`,
      },
    });

    // Update the plan with new goal
    await prisma.preventionPlan.update({
      where: { id: targetPlanId },
      data: {
        goals: updatedGoals,
        updatedAt: new Date(),
      },
    });

    const currentVersion = nextVersion;

    // Create encounter link if encounter provided
    let encounterLinkId = null;
    if (encounterId && encounter) {
      const encounterLink = await prisma.preventionEncounterLink.create({
        data: {
          encounterId,
          preventionPlanId: targetPlanId,
          detectedConditions: [
            {
              type: intervention.domain,
              name: intervention.name,
              addedVia: 'hub-action',
            },
          ],
          triggeringFindings: triggeringFindings || {
            source: 'manual_add',
            addedBy: session.user.id,
          },
          confidence: 1.0, // Manual addition has full confidence
          sourceType: 'manual',
        },
      });

      encounterLinkId = encounterLink.id;

      logger.info({
        event: 'prevention_encounter_link_created',
        linkId: encounterLink.id,
        encounterId,
        planId: targetPlanId,
        patientId,
      });
    }

    logger.info({
      event: 'intervention_added_to_plan',
      planId: targetPlanId,
      patientId,
      intervention: intervention.name,
      domain: intervention.domain,
      addedBy: session.user.id,
      planWasCreated,
      encounterLinkId,
    });

    // HIPAA Audit: Log intervention addition
    await auditUpdate('PreventionPlan', targetPlanId, request, {
      patientId,
      intervention: intervention.name,
      interventionType: intervention.type,
      domain: intervention.domain,
      version: currentVersion,
      changedBy: session.user.id,
      action: 'intervention_added',
      encounterLinked: !!encounterLinkId,
    });

    return NextResponse.json({
      success: true,
      message: `Intervention "${intervention.name}" added to prevention plan`,
      data: {
        planId: targetPlanId,
        planWasCreated,
        interventionAdded: {
          name: intervention.name,
          domain: intervention.domain,
          type: intervention.type,
          status: 'PENDING',
        },
        encounterLinkId,
        version: currentVersion + 1,
      },
    });
  } catch (error) {
    logger.error({
      event: 'add_to_plan_failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to add intervention to plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
