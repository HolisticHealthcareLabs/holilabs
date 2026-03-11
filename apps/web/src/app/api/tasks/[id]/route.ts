/**
 * Individual Task Actions API
 *
 * PATCH /api/tasks/[id] - Update task (complete, dismiss, update status/priority)
 * DELETE /api/tasks/[id] - Delete task
 *
 * RBAC: Requires authenticated clinician/admin session.
 * Ownership check: user can only modify tasks assigned to them (or ADMIN bypass).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import {
  emitTaskUpdatedEvent,
  emitTaskCompletedEvent,
  emitTaskDismissedEvent,
  emitTaskDeletedEvent,
} from '@/lib/socket-server';
import { createProtectedRoute, type ApiContext } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/tasks/[id]
 * Update task status, priority, or complete/dismiss it
 */
async function handlePATCH(
  request: NextRequest,
  context: ApiContext
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Task ID required' }, { status: 400 });
  }

  const body = await request.json();
  const { action, status, priority, title, description, dueDate } = body;

  // Find task
  const task = await prisma.providerTask.findUnique({
    where: { id },
  });

  if (!task) {
    return NextResponse.json(
      { success: false, error: 'Task not found' },
      { status: 404 }
    );
  }

  // Ownership check: only the assignee or ADMIN can modify
  const userRole = context.user!.role;
  if (task.assignedTo !== context.user!.id && userRole !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: You can only modify your own tasks' },
      { status: 403 }
    );
  }

  let updatedTask;

  // Handle quick actions
  if (action === 'complete') {
    const completedAt = new Date();
    updatedTask = await prisma.providerTask.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt },
    });
    logger.info({ event: 'task_completed', taskId: id, category: task.category, userId: context.user!.id });

    emitTaskCompletedEvent({
      id: updatedTask.id,
      title: updatedTask.title,
      category: updatedTask.category,
      priority: updatedTask.priority as 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW',
      assignedTo: updatedTask.assignedTo,
      completedAt,
      userId: updatedTask.assignedTo,
    });
  } else if (action === 'dismiss') {
    const dismissedAt = new Date();
    updatedTask = await prisma.providerTask.update({
      where: { id },
      data: { status: 'DISMISSED', dismissedAt },
    });
    logger.info({ event: 'task_dismissed', taskId: id, userId: context.user!.id });

    emitTaskDismissedEvent({
      id: updatedTask.id,
      title: updatedTask.title,
      category: updatedTask.category,
      assignedTo: updatedTask.assignedTo,
      dismissedAt,
      userId: updatedTask.assignedTo,
    });
  } else if (action === 'start') {
    updatedTask = await prisma.providerTask.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    emitTaskUpdatedEvent({
      id: updatedTask.id,
      title: updatedTask.title,
      category: updatedTask.category,
      priority: updatedTask.priority as 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW',
      status: updatedTask.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED',
      assignedTo: updatedTask.assignedTo,
      dueDate: updatedTask.dueDate ?? undefined,
      relatedType: updatedTask.relatedType ?? undefined,
      relatedId: updatedTask.relatedId ?? undefined,
      userId: updatedTask.assignedTo,
    });
  } else {
    // General update
    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    updatedTask = await prisma.providerTask.update({
      where: { id },
      data: updateData,
    });

    emitTaskUpdatedEvent({
      id: updatedTask.id,
      title: updatedTask.title,
      category: updatedTask.category,
      priority: updatedTask.priority as 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW',
      status: updatedTask.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED',
      assignedTo: updatedTask.assignedTo,
      dueDate: updatedTask.dueDate ?? undefined,
      relatedType: updatedTask.relatedType ?? undefined,
      relatedId: updatedTask.relatedId ?? undefined,
      userId: updatedTask.assignedTo,
    });
  }

  return NextResponse.json({ success: true, data: updatedTask });
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task
 */
async function handleDELETE(
  _request: NextRequest,
  context: ApiContext
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Task ID required' }, { status: 400 });
  }

  const task = await prisma.providerTask.findUnique({
    where: { id },
  });

  if (!task) {
    return NextResponse.json(
      { success: false, error: 'Task not found' },
      { status: 404 }
    );
  }

  // Ownership check: only the assignee or ADMIN can delete
  const userRole = context.user!.role;
  if (task.assignedTo !== context.user!.id && userRole !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: 'Forbidden: You can only delete your own tasks' },
      { status: 403 }
    );
  }

  await prisma.providerTask.delete({ where: { id } });

  logger.info({ event: 'task_deleted', taskId: id, deletedBy: context.user!.id });

  emitTaskDeletedEvent({
    id,
    title: task.title,
    assignedTo: task.assignedTo,
    userId: task.assignedTo,
  });

  return NextResponse.json({ success: true, message: 'Task deleted successfully' });
}

// Protected route exports with RBAC guard
export const PATCH = createProtectedRoute(handlePATCH, {
  roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE', 'STAFF'],
  audit: { action: 'UPDATE', resource: 'ProviderTask' },
});

export const DELETE = createProtectedRoute(handleDELETE, {
  roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN'],
  audit: { action: 'DELETE', resource: 'ProviderTask' },
});
