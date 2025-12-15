/**
 * Prevention Analytics API
 *
 * GET /api/prevention/analytics - Get prevention statistics and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface GoalData {
  goal: string;
  category: string;
  status: string;
}

/**
 * GET /api/prevention/analytics
 * Get comprehensive prevention analytics and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build filter conditions
    const whereConditions: any = {};

    if (patientId) {
      whereConditions.patientId = patientId;
    }

    if (startDate || endDate) {
      whereConditions.createdAt = {};
      if (startDate) {
        whereConditions.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereConditions.createdAt.lte = endDateTime;
      }
    }

    // Fetch all prevention plans
    const plans = await prisma.preventionPlan.findMany({
      where: whereConditions,
      select: {
        id: true,
        status: true,
        planType: true,
        goals: true,
        createdAt: true,
        activatedAt: true,
        completedAt: true,
        deactivatedAt: true,
        completionReason: true,
        deactivationReason: true,
      },
    });

    // Calculate overall statistics
    const totalPlans = plans.length;
    const activePlans = plans.filter((p) => p.status === 'ACTIVE').length;
    const completedPlans = plans.filter((p) => p.status === 'COMPLETED').length;
    const deactivatedPlans = plans.filter((p) => p.status === 'DEACTIVATED').length;

    const completionRate = totalPlans > 0 ? (completedPlans / totalPlans) * 100 : 0;

    // Plans by status
    const plansByStatus = {
      ACTIVE: activePlans,
      COMPLETED: completedPlans,
      DEACTIVATED: deactivatedPlans,
    };

    // Plans by type
    const plansByType: Record<string, number> = {};
    plans.forEach((plan) => {
      plansByType[plan.planType] = (plansByType[plan.planType] || 0) + 1;
    });

    // Goal statistics
    let totalGoals = 0;
    let completedGoals = 0;
    const goalsByCategory: Record<string, { total: number; completed: number }> = {};

    plans.forEach((plan) => {
      const goals = (plan.goals as unknown as GoalData[]) || [];
      goals.forEach((goal) => {
        totalGoals++;
        if (goal.status === 'COMPLETED') {
          completedGoals++;
        }

        if (!goalsByCategory[goal.category]) {
          goalsByCategory[goal.category] = { total: 0, completed: 0 };
        }
        goalsByCategory[goal.category].total++;
        if (goal.status === 'COMPLETED') {
          goalsByCategory[goal.category].completed++;
        }
      });
    });

    const goalCompletionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

    // Timeline data (plans created per month)
    const timelineData: Record<string, number> = {};
    plans.forEach((plan) => {
      const monthKey = new Date(plan.createdAt).toISOString().substring(0, 7); // YYYY-MM
      timelineData[monthKey] = (timelineData[monthKey] || 0) + 1;
    });

    // Convert timeline to array and sort
    const timeline = Object.entries(timelineData)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Completion reasons analysis
    const completionReasons: Record<string, number> = {};
    plans
      .filter((p) => p.completionReason)
      .forEach((plan) => {
        const reason = plan.completionReason as string;
        completionReasons[reason] = (completionReasons[reason] || 0) + 1;
      });

    // Deactivation reasons analysis
    const deactivationReasons: Record<string, number> = {};
    plans
      .filter((p) => p.deactivationReason)
      .forEach((plan) => {
        const reason = plan.deactivationReason as string;
        deactivationReasons[reason] = (deactivationReasons[reason] || 0) + 1;
      });

    // Average time to completion (for completed plans)
    let totalCompletionTime = 0;
    let completedPlansWithTime = 0;

    plans
      .filter((p) => p.status === 'COMPLETED' && p.completedAt && p.activatedAt)
      .forEach((plan) => {
        const startTime = new Date(plan.activatedAt!).getTime();
        const endTime = new Date(plan.completedAt!).getTime();
        const daysToComplete = (endTime - startTime) / (1000 * 60 * 60 * 24);
        totalCompletionTime += daysToComplete;
        completedPlansWithTime++;
      });

    const averageDaysToComplete =
      completedPlansWithTime > 0 ? totalCompletionTime / completedPlansWithTime : 0;

    // Top intervention categories
    const interventionCounts: Record<string, number> = {};
    plans.forEach((plan) => {
      const goals = (plan.goals as unknown as GoalData[]) || [];
      goals.forEach((goal) => {
        interventionCounts[goal.category] = (interventionCounts[goal.category] || 0) + 1;
      });
    });

    const topInterventions = Object.entries(interventionCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate category completion rates
    const categoryCompletionRates = Object.entries(goalsByCategory).map(
      ([category, data]) => ({
        category,
        total: data.total,
        completed: data.completed,
        completionRate: (data.completed / data.total) * 100,
      })
    );

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentPlans = plans.filter(
      (p) => new Date(p.createdAt) >= sevenDaysAgo
    ).length;

    const recentCompletions = plans.filter(
      (p) => p.completedAt && new Date(p.completedAt) >= sevenDaysAgo
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        // Overall statistics
        overview: {
          totalPlans,
          activePlans,
          completedPlans,
          deactivatedPlans,
          completionRate: Math.round(completionRate * 10) / 10,
          totalGoals,
          completedGoals,
          goalCompletionRate: Math.round(goalCompletionRate * 10) / 10,
          averageDaysToComplete: Math.round(averageDaysToComplete * 10) / 10,
        },

        // Breakdowns
        plansByStatus,
        plansByType,
        goalsByCategory: categoryCompletionRates,

        // Trends
        timeline,
        topInterventions,

        // Insights
        completionReasons,
        deactivationReasons,

        // Recent activity
        recentActivity: {
          newPlans: recentPlans,
          completions: recentCompletions,
          period: 'Last 7 days',
        },

        // Metadata
        metadata: {
          dateRange: {
            start: startDate || null,
            end: endDate || null,
          },
          patientId: patientId || null,
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching prevention analytics:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
