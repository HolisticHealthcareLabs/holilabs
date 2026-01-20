/**
 * Mark Intervention Complete API
 *
 * POST /api/prevention/hub/mark-complete
 * Marks a screening outcome or prevention plan goal as completed.
 *
 * Request Body:
 * - interventionId: string (required) - ID of screening or plan-goal combo
 * - completedDate: Date (optional) - Defaults to now
 * - notes: string (optional) - Completion notes
 *
 * Phase 5: Hub Actions & Clinical Workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';
import { auditUpdate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Request validation schema
const MarkCompleteSchema = z.object({
  interventionId: z.string().min(1, 'interventionId is required'),
  completedDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/prevention/hub/mark-complete
 * Mark a screening or plan goal as completed
 */
export async function POST(request: NextRequest) {
  const start = performance.now();

  try {
    // Verify authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = MarkCompleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed: interventionId is required',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { interventionId, completedDate, notes } = validation.data;
    const completionDate = completedDate ? new Date(completedDate) : new Date();

    // Try to find as a screening outcome first
    const screening = await prisma.screeningOutcome.findUnique({
      where: { id: interventionId },
    });

    if (screening) {
      // Update screening outcome
      const updatedScreening = await prisma.screeningOutcome.update({
        where: { id: interventionId },
        data: {
          completedDate: completionDate,
          notes: notes || screening.notes,
        },
      });

      const elapsed = performance.now() - start;

      logger.info({
        event: 'intervention_marked_complete',
        type: 'screening',
        interventionId,
        patientId: screening.patientId,
        userId: session.user.id,
        latencyMs: elapsed.toFixed(2),
      });

      // HIPAA Audit
      await auditUpdate('ScreeningIntervention', interventionId, request, {
        action: 'intervention_marked_complete',
        type: 'screening',
        patientId: screening.patientId,
        completedBy: session.user.id,
      });

      return NextResponse.json({
        success: true,
        data: {
          intervention: {
            id: updatedScreening.id,
            type: 'screening',
            screeningType: updatedScreening.screeningType,
            completedDate: updatedScreening.completedDate,
            notes: updatedScreening.notes,
          },
        },
        meta: {
          latencyMs: Math.round(elapsed),
        },
      });
    }

    // If not a screening, check if it's a prevention plan goal
    // Goal IDs are formatted as: {planId}-{goalPrefix}
    const planIdMatch = interventionId.match(/^([^-]+-[^-]+(?:-[^-]+)*)-/);
    const potentialPlanId = planIdMatch ? planIdMatch[1] : interventionId.split('-').slice(0, -1).join('-');

    const plan = await prisma.preventionPlan.findUnique({
      where: { id: potentialPlanId },
    });

    if (plan) {
      // Update the goal within the plan's goals JSON
      const goals = plan.goals as Array<{
        goal: string;
        targetDate?: string | null;
        status: string;
        category?: string;
        evidence?: string;
        completedDate?: string;
        notes?: string;
      }>;

      // Find the goal by matching the ID pattern
      const goalPrefix = interventionId.replace(`${potentialPlanId}-`, '');
      const goalIndex = goals.findIndex((g) =>
        g.goal.slice(0, 10) === goalPrefix || g.goal.toLowerCase().includes(goalPrefix.toLowerCase())
      );

      if (goalIndex >= 0) {
        goals[goalIndex] = {
          ...goals[goalIndex],
          status: 'COMPLETED',
          completedDate: completionDate.toISOString(),
          notes: notes || goals[goalIndex].notes,
        };

        const updatedPlan = await prisma.preventionPlan.update({
          where: { id: potentialPlanId },
          data: { goals },
        });

        const elapsed = performance.now() - start;

        logger.info({
          event: 'intervention_marked_complete',
          type: 'plan_goal',
          interventionId,
          planId: potentialPlanId,
          patientId: plan.patientId,
          userId: session.user.id,
          latencyMs: elapsed.toFixed(2),
        });

        // HIPAA Audit
        await auditUpdate('GoalIntervention', interventionId, request, {
          action: 'intervention_marked_complete',
          type: 'plan_goal',
          planId: potentialPlanId,
          patientId: plan.patientId,
          completedBy: session.user.id,
        });

        return NextResponse.json({
          success: true,
          data: {
            intervention: {
              id: interventionId,
              type: 'plan_goal',
              planId: potentialPlanId,
              goal: goals[goalIndex].goal,
              completedDate: completionDate,
              notes: goals[goalIndex].notes,
            },
          },
          meta: {
            latencyMs: Math.round(elapsed),
          },
        });
      }
    }

    // Not found as screening or plan goal
    return NextResponse.json(
      { error: 'Intervention not found' },
      { status: 404 }
    );
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'mark_complete_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to mark intervention as complete',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
