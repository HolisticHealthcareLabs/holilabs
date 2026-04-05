/**
 * Task MCP Tools - Full CRUD for ProviderTask entity
 *
 * Closes the Action Parity gap: 6 API routes at /api/tasks were
 * previously unreachable by agents.
 *
 * Tools: create_task, get_task, list_tasks, update_task,
 *        complete_task, delete_task
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPContext, MCPResult, MCPTool } from '../types';

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

const TaskCategoryEnum = z.enum([
    'APPOINTMENT', 'LAB_RESULT', 'FOLLOW_UP', 'PRESCRIPTION',
    'DOCUMENTATION', 'REVIEW', 'CALLBACK', 'GENERAL',
]);

const TaskPriorityEnum = z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']);
const TaskStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED']);

const CreateTaskSchema = z.object({
    title: z.string().min(1).max(255).describe('Task title'),
    description: z.string().optional().describe('Detailed task description'),
    category: TaskCategoryEnum.describe('Task category'),
    priority: TaskPriorityEnum.optional().default('NORMAL').describe('Task priority'),
    dueDate: z.string().optional().describe('Due date in ISO format (YYYY-MM-DD)'),
    relatedPatientId: z.string().optional().describe('Patient this task is about'),
    relatedEncounterId: z.string().optional().describe('Encounter this task relates to'),
});

const GetTaskSchema = z.object({
    taskId: z.string().describe('Task ID'),
});

const ListTasksSchema = z.object({
    view: z.enum(['today', 'week', 'all', 'overdue']).optional().default('today'),
    status: TaskStatusEnum.optional().default('PENDING'),
    priority: TaskPriorityEnum.optional(),
    category: TaskCategoryEnum.optional(),
    patientId: z.string().optional().describe('Filter by related patient'),
    limit: z.number().int().min(1).max(100).optional().default(25),
});

const UpdateTaskSchema = z.object({
    taskId: z.string().describe('Task ID'),
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    priority: TaskPriorityEnum.optional(),
    status: TaskStatusEnum.optional(),
    dueDate: z.string().optional().describe('ISO date or null to clear'),
});

const CompleteTaskSchema = z.object({
    taskId: z.string().describe('Task ID'),
    notes: z.string().optional().describe('Optional completion notes'),
});

const DeleteTaskSchema = z.object({
    taskId: z.string().describe('Task ID'),
    reason: z.string().min(3).describe('Reason for deletion'),
});

// =============================================================================
// HANDLERS
// =============================================================================

async function createTaskHandler(
    input: z.infer<typeof CreateTaskSchema>,
    context: MCPContext,
): Promise<MCPResult> {
    let dueDate: Date | undefined;
    if (input.dueDate) {
        dueDate = new Date(input.dueDate);
        if (isNaN(dueDate.getTime())) {
            return { success: false, error: 'Invalid dueDate format. Use ISO (YYYY-MM-DD)', data: null };
        }
    }

    const task: any = await prisma.providerTask.create({
        data: {
            title: input.title,
            description: input.description,
            category: input.category,
            priority: input.priority ?? 'NORMAL',
            assignedTo: context.clinicianId,
            dueDate,
            clinicId: input.relatedPatientId || null,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_task',
        taskId: task.id,
        category: task.category,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            taskId: task.id,
            title: task.title,
            category: task.category,
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate,
            message: 'Task created successfully',
        },
    };
}

async function getTaskHandler(
    input: z.infer<typeof GetTaskSchema>,
    context: MCPContext,
): Promise<MCPResult> {
    const task: any = await prisma.providerTask.findFirst({
        where: {
            id: input.taskId,
            assignedTo: context.clinicianId,
        },
    });

    if (!task) {
        return { success: false, error: 'Task not found or access denied', data: null };
    }

    return { success: true, data: task };
}

async function listTasksHandler(
    input: z.infer<typeof ListTasksSchema>,
    context: MCPContext,
): Promise<MCPResult> {
    const now = new Date();
    let dateFilter: any = {};

    if (input.view === 'today') {
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        dateFilter = { OR: [{ dueDate: { lte: endOfDay } }, { dueDate: null }] };
    } else if (input.view === 'week') {
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + 7);
        dateFilter = { dueDate: { lte: endOfWeek } };
    } else if (input.view === 'overdue') {
        dateFilter = { dueDate: { lt: now } };
    }

    const where: any = {
        assignedTo: context.clinicianId,
        status: input.status,
        ...dateFilter,
    };

    if (input.priority) where.priority = input.priority;
    if (input.category) where.category = input.category;
    if (input.patientId) where.relatedPatientId = input.patientId;

    const tasks: any[] = await prisma.providerTask.findMany({
        where,
        orderBy: [
            { priority: 'asc' },
            { dueDate: 'asc' },
            { createdAt: 'desc' },
        ],
        take: input.limit,
    });

    return {
        success: true,
        data: { tasks, count: tasks.length, view: input.view },
    };
}

async function updateTaskHandler(
    input: z.infer<typeof UpdateTaskSchema>,
    context: MCPContext,
): Promise<MCPResult> {
    const existing: any = await prisma.providerTask.findFirst({
        where: { id: input.taskId, assignedTo: context.clinicianId },
    });

    if (!existing) {
        return { success: false, error: 'Task not found or access denied', data: null };
    }

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.dueDate !== undefined) {
        updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }

    if (Object.keys(updateData).length === 0) {
        return { success: false, error: 'No fields to update', data: null };
    }

    const task: any = await prisma.providerTask.update({
        where: { id: input.taskId },
        data: updateData,
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_task',
        taskId: task.id,
        updatedFields: Object.keys(updateData),
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            taskId: task.id,
            updatedFields: Object.keys(updateData),
            message: 'Task updated successfully',
        },
    };
}

async function completeTaskHandler(
    input: z.infer<typeof CompleteTaskSchema>,
    context: MCPContext,
): Promise<MCPResult> {
    const existing: any = await prisma.providerTask.findFirst({
        where: { id: input.taskId, assignedTo: context.clinicianId },
    });

    if (!existing) {
        return { success: false, error: 'Task not found or access denied', data: null };
    }

    const task: any = await prisma.providerTask.update({
        where: { id: input.taskId },
        data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            description: input.notes
                ? `${existing.description ?? ''}\n[COMPLETED] ${input.notes}`.trim()
                : existing.description,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'complete_task',
        taskId: task.id,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            taskId: task.id,
            status: 'COMPLETED',
            completedAt: task.completedAt,
            message: 'Task marked as completed',
        },
    };
}

async function deleteTaskHandler(
    input: z.infer<typeof DeleteTaskSchema>,
    context: MCPContext,
): Promise<MCPResult> {
    const existing: any = await prisma.providerTask.findFirst({
        where: { id: input.taskId, assignedTo: context.clinicianId },
    });

    if (!existing) {
        return { success: false, error: 'Task not found or access denied', data: null };
    }

    // Soft delete — dismiss rather than hard delete for audit trail
    await prisma.providerTask.update({
        where: { id: input.taskId },
        data: {
            status: 'DISMISSED',
            dismissedAt: new Date(),
            description: `${existing.description ?? ''}\n[DISMISSED] ${input.reason}`.trim(),
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'delete_task',
        taskId: input.taskId,
        reason: input.reason,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            taskId: input.taskId,
            status: 'DISMISSED',
            reason: input.reason,
            message: 'Task dismissed',
        },
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const TASK_TOOL_COUNT = 6;

export const taskTools: MCPTool[] = [
    {
        name: 'create_task',
        description: 'Create a new clinical task and assign it to the current clinician. Use for follow-ups, lab reviews, prescription renewals, and documentation reminders.',
        category: 'task' as any,
        inputSchema: CreateTaskSchema,
        requiredPermissions: ['task:write'],
        handler: createTaskHandler,
    },
    {
        name: 'get_task',
        description: 'Retrieve a single task by ID, including status, priority, due date, and related patient or encounter.',
        category: 'task' as any,
        inputSchema: GetTaskSchema,
        requiredPermissions: ['task:read'],
        handler: getTaskHandler,
    },
    {
        name: 'list_tasks',
        description: 'List tasks for the current clinician. Filter by view (today/week/all/overdue), status, priority, category, or patient.',
        category: 'task' as any,
        inputSchema: ListTasksSchema,
        requiredPermissions: ['task:read'],
        handler: listTasksHandler,
    },
    {
        name: 'update_task',
        description: 'Update task fields: title, description, priority, status, or due date.',
        category: 'task' as any,
        inputSchema: UpdateTaskSchema,
        requiredPermissions: ['task:write'],
        handler: updateTaskHandler,
    },
    {
        name: 'complete_task',
        description: 'Mark a task as completed with optional completion notes. Records completion timestamp.',
        category: 'task' as any,
        inputSchema: CompleteTaskSchema,
        requiredPermissions: ['task:write'],
        handler: completeTaskHandler,
    },
    {
        name: 'delete_task',
        description: 'Dismiss a task (soft delete). Preserves audit trail. Requires a reason.',
        category: 'task' as any,
        inputSchema: DeleteTaskSchema,
        requiredPermissions: ['task:write'],
        handler: deleteTaskHandler,
    },
];
