/**
 * Individual Task Actions API
 *
 * PATCH /api/tasks/[id] - Update task (complete, dismiss, update status/priority)
 * DELETE /api/tasks/[id] - Delete task
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

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/tasks/[id]
 * Update task status, priority, or complete/dismiss it
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, status, priority, title, description, dueDate } = body;

    // Find task
    const task = await prisma.providerTask.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found',
        },
        { status: 404 }
      );
    }

    let updatedTask;

    // Handle quick actions
    if (action === 'complete') {
      const completedAt = new Date();
      updatedTask = await prisma.providerTask.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt,
        },
      });
      logger.info({
        event: 'task_completed',
        taskId: id,
        category: task.category,
      });

      // Real-time Socket.IO broadcast for task completion
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
        data: {
          status: 'DISMISSED',
          dismissedAt,
        },
      });
      logger.info({
        event: 'task_dismissed',
        taskId: id,
      });

      // Real-time Socket.IO broadcast for task dismissal
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
        data: {
          status: 'IN_PROGRESS',
        },
      });

      // Real-time Socket.IO broadcast for task status update
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

      // Real-time Socket.IO broadcast for general task update
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

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    logger.error({
      event: 'task_update_error',
      taskId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update task',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // First fetch the task to get assignedTo for broadcasting
    const task = await prisma.providerTask.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found',
        },
        { status: 404 }
      );
    }

    await prisma.providerTask.delete({
      where: { id },
    });

    logger.info({
      event: 'task_deleted',
      taskId: id,
    });

    // Real-time Socket.IO broadcast for task deletion
    emitTaskDeletedEvent({
      id,
      title: task.title,
      assignedTo: task.assignedTo,
      userId: task.assignedTo,
    });

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    logger.error({
      event: 'task_delete_error',
      taskId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete task',
      },
      { status: 500 }
    );
  }
}
