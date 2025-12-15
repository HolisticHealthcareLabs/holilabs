/**
 * Prevention Plan Goals API
 *
 * PATCH /api/prevention/plans/[planId]/goals - Update goal status, target dates, and notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateGoalSchema = z.object({
  goalIndex: z.number().int().min(0),
  updates: z.object({
    status: z.enum(['PENDING', 'COMPLETED', 'IN_PROGRESS', 'DEFERRED']).optional(),
    targetDate: z.string().nullable().optional(),
    notes: z.string().optional(),
  }),
});

/**
 * PATCH /api/prevention/plans/[planId]/goals
 * Update a specific goal in a prevention plan
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const planId = params.planId;
    const body = await request.json();
    const validation = UpdateGoalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { goalIndex, updates } = validation.data;

    // Get the existing prevention plan
    const preventionPlan = await prisma.preventionPlan.findUnique({
      where: { id: planId },
    });

    if (!preventionPlan) {
      return NextResponse.json(
        { error: 'Prevention plan not found' },
        { status: 404 }
      );
    }

    // Get goals array from database (it's stored as JSON)
    const goals = preventionPlan.goals as any[];

    if (!Array.isArray(goals) || goalIndex >= goals.length) {
      return NextResponse.json(
        { error: 'Invalid goal index' },
        { status: 400 }
      );
    }

    // Update the specific goal
    const updatedGoals = [...goals];
    updatedGoals[goalIndex] = {
      ...updatedGoals[goalIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.id,
    };

    // Check if all goals are completed
    const allCompleted = updatedGoals.every((g) => g.status === 'COMPLETED');
    const newPlanStatus = allCompleted ? 'COMPLETED' : preventionPlan.status;

    // Update the prevention plan
    const updatedPlan = await prisma.preventionPlan.update({
      where: { id: planId },
      data: {
        goals: updatedGoals,
        status: newPlanStatus as any,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Goal updated successfully',
      data: {
        planId: updatedPlan.id,
        goalIndex,
        updatedGoal: updatedGoals[goalIndex],
        planStatus: newPlanStatus,
        allGoalsCompleted: allCompleted,
        completedCount: updatedGoals.filter((g) => g.status === 'COMPLETED').length,
        totalCount: updatedGoals.length,
      },
    });
  } catch (error) {
    console.error('Error updating prevention plan goal:', error);

    return NextResponse.json(
      {
        error: 'Failed to update goal',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prevention/plans/[planId]/goals/bulk
 * Bulk update multiple goals at once
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const planId = params.planId;
    const body = await request.json();

    const { goalIndices, status } = body as {
      goalIndices: number[];
      status: 'PENDING' | 'COMPLETED' | 'IN_PROGRESS' | 'DEFERRED';
    };

    if (!Array.isArray(goalIndices) || !status) {
      return NextResponse.json(
        { error: 'Invalid request: goalIndices array and status required' },
        { status: 400 }
      );
    }

    // Get the existing prevention plan
    const preventionPlan = await prisma.preventionPlan.findUnique({
      where: { id: planId },
    });

    if (!preventionPlan) {
      return NextResponse.json(
        { error: 'Prevention plan not found' },
        { status: 404 }
      );
    }

    // Get goals array from database
    const goals = preventionPlan.goals as any[];

    if (!Array.isArray(goals)) {
      return NextResponse.json(
        { error: 'Invalid goals data structure' },
        { status: 500 }
      );
    }

    // Update multiple goals
    const updatedGoals = goals.map((goal, index) => {
      if (goalIndices.includes(index)) {
        return {
          ...goal,
          status,
          updatedAt: new Date().toISOString(),
          updatedBy: session.user.id,
        };
      }
      return goal;
    });

    // Check if all goals are completed
    const allCompleted = updatedGoals.every((g) => g.status === 'COMPLETED');
    const newPlanStatus = allCompleted ? 'COMPLETED' : preventionPlan.status;

    // Update the prevention plan
    const updatedPlan = await prisma.preventionPlan.update({
      where: { id: planId },
      data: {
        goals: updatedGoals,
        status: newPlanStatus as any,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${goalIndices.length} goals updated successfully`,
      data: {
        planId: updatedPlan.id,
        updatedCount: goalIndices.length,
        planStatus: newPlanStatus,
        allGoalsCompleted: allCompleted,
        completedCount: updatedGoals.filter((g) => g.status === 'COMPLETED').length,
        totalCount: updatedGoals.length,
      },
    });
  } catch (error) {
    console.error('Error bulk updating prevention plan goals:', error);

    return NextResponse.json(
      {
        error: 'Failed to bulk update goals',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
