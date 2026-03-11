/**
 * Task Statistics API
 * GET /api/tasks/stats - Get task overview statistics
 *
 * RBAC: Requires authenticated clinician/admin session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createProtectedRoute, type ApiContext } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks/stats
 * Returns overview statistics for tasks
 */
async function handleGET(_request: NextRequest, context: ApiContext) {
  const userId = context.user!.id; // From authenticated session

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all statistics in parallel for performance
  const [totalPending, urgent, dueToday, overdue, inProgress] = await Promise.all([
    prisma.providerTask.count({
      where: {
        assignedTo: userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    }),
    prisma.providerTask.count({
      where: {
        assignedTo: userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        priority: 'URGENT',
      },
    }),
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
    prisma.providerTask.count({
      where: {
        assignedTo: userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: now },
      },
    }),
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
}

export const GET = createProtectedRoute(handleGET, {
  roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE', 'STAFF'],
  skipCsrf: true,
  audit: { action: 'VIEW', resource: 'ProviderTask' },
});
