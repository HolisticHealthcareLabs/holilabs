/**
 * Individual Task Actions API
 *
 * PATCH /api/tasks/[id] - Update task (complete, dismiss, update status/priority)
 * DELETE /api/tasks/[id] - Delete task
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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
      updatedTask = await prisma.providerTask.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      logger.info({
        event: 'task_completed',
        taskId: id,
        category: task.category,
      });
    } else if (action === 'dismiss') {
      updatedTask = await prisma.providerTask.update({
        where: { id },
        data: {
          status: 'DISMISSED',
          dismissedAt: new Date(),
        },
      });
      logger.info({
        event: 'task_dismissed',
        taskId: id,
      });
    } else if (action === 'start') {
      updatedTask = await prisma.providerTask.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
        },
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

    await prisma.providerTask.delete({
      where: { id },
    });

    logger.info({
      event: 'task_deleted',
      taskId: id,
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
