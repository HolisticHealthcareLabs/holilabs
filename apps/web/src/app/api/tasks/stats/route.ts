/**
 * Task Statistics API
 * GET /api/tasks/stats - Get task overview statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks/stats
 * Returns overview statistics for tasks
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'system';

    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all statistics in parallel for performance
    const [totalPending, urgent, dueToday, overdue, inProgress] = await Promise.all([
      // Total pending tasks (PENDING + IN_PROGRESS)
      prisma.providerTask.count({
        where: {
          assignedTo: userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),

      // Urgent tasks
      prisma.providerTask.count({
        where: {
          assignedTo: userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          priority: 'URGENT',
        },
      }),

      // Due today (including undated tasks)
      prisma.providerTask.count({
        where: {
          assignedTo: userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          OR: [
            { dueDate: { lte: endOfDay } },
            { dueDate: null },
          ],
        },
      }),

      // Overdue tasks
      prisma.providerTask.count({
        where: {
          assignedTo: userId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: now },
        },
      }),

      // In progress tasks
      prisma.providerTask.count({
        where: {
          assignedTo: userId,
          status: 'IN_PROGRESS',
        },
      }),
    ]);

    // Get completed tasks today
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const completedToday = await prisma.providerTask.count({
      where: {
        assignedTo: userId,
        status: 'COMPLETED',
        completedAt: { gte: startOfDay },
      },
    });

    // Get next upcoming task
    const nextTask = await prisma.providerTask.findFirst({
      where: {
        assignedTo: userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { not: null },
      },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
      },
    });

    logger.info({
      event: 'task_stats_retrieved',
      userId,
      totalPending,
      urgent,
      overdue,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalPending,
        urgent,
        dueToday,
        overdue,
        inProgress,
        completedToday,
        nextTask,
      },
    });
  } catch (error) {
    logger.error({
      event: 'task_stats_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch task statistics',
      },
      { status: 500 }
    );
  }
}
