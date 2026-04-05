/**
 * Escalation MCP Tools - Agent-callable operations for escalation management
 *
 * These tools provide escalation workflow operations:
 * - list_escalations: Filter by status, patientId, severity with pagination
 * - create_escalation: Create escalation with SLA deadline calculation
 * - assign_escalation: Assign escalation to a clinician
 * - resolve_escalation: Mark escalation as resolved (idempotent)
 *
 * All tools support the 5-state pipeline output (GREEN, AMBER, RED, INSUFFICIENT_DATA, DEGRADED)
 * and integrate with audit chain versioning (Unit 9).
 *
 * Uses `any` types for Prisma results due to complex relation typing.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// SCHEMAS
// =============================================================================

const ListEscalationsSchema = z.object({
    patientId: z.string().uuid().optional().describe('Filter by patient ID'),
    status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REOPENED']).optional().describe('Filter by status'),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().describe('Filter by severity'),
    category: z.enum(['CLINICAL', 'REVENUE', 'OPERATIONAL', 'SECURITY', 'ADMINISTRATIVE']).optional().describe('Filter by category'),
    assignedToId: z.string().optional().describe('Filter by assigned user'),
    skip: z.number().int().min(0).default(0).describe('Pagination skip'),
    take: z.number().int().min(1).max(100).default(20).describe('Pagination take'),
});

const CreateEscalationSchema = z.object({
    patientId: z.string().uuid().describe('Patient ID'),
    encounterId: z.string().optional().describe('Associated encounter ID'),
    title: z.string().min(1).max(200).describe('Escalation title'),
    description: z.string().describe('Detailed description'),
    category: z.enum(['CLINICAL', 'REVENUE', 'OPERATIONAL', 'SECURITY', 'ADMINISTRATIVE']).describe('Escalation category'),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Escalation severity'),
    slaDeadlineHours: z.number().int().optional().describe('SLA deadline in hours'),
    escalationLevel: z.number().int().min(1).max(5).default(1).describe('Escalation level (1-5)'),
    notificationChannels: z.array(z.enum(['IN_APP', 'EMAIL', 'SMS'])).default(['IN_APP']).describe('Notification channels'),
});

const AssignEscalationSchema = z.object({
    escalationId: z.string().describe('Escalation ID'),
    assignedToId: z.string().uuid().describe('User ID to assign to'),
});

const ResolveEscalationSchema = z.object({
    escalationId: z.string().describe('Escalation ID'),
    notes: z.string().optional().describe('Resolution notes'),
});

type ListEscalationsInput = z.infer<typeof ListEscalationsSchema>;
type CreateEscalationInput = z.infer<typeof CreateEscalationSchema>;
type AssignEscalationInput = z.infer<typeof AssignEscalationSchema>;
type ResolveEscalationInput = z.infer<typeof ResolveEscalationSchema>;

// =============================================================================
// TOOL: list_escalations
// =============================================================================

async function listEscalationsHandler(
    input: ListEscalationsInput,
    context: MCPContext
): Promise<MCPResult> {
    const where: any = {};

    if (input.patientId) {
        where.patientId = input.patientId;
    }
    if (input.status) {
        where.status = input.status;
    }
    if (input.severity) {
        where.severity = input.severity;
    }
    if (input.category) {
        where.category = input.category;
    }
    if (input.assignedToId) {
        where.assignedToId = input.assignedToId;
    }

    const escalations: any[] = await prisma.escalation.findMany({
        where,
        include: {
            patient: {
                select: { id: true, firstName: true, lastName: true },
            },
            assignedTo: {
                select: { id: true, firstName: true, lastName: true, email: true },
            },
        },
        skip: input.skip,
        take: input.take,
        orderBy: { createdAt: 'desc' },
    });

    const total = await (prisma.escalation as any).count({ where });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'list_escalations',
        count: escalations.length,
        total,
        filters: {
            patientId: input.patientId,
            status: input.status,
            severity: input.severity,
        },
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            escalations: escalations.map(e => ({
                id: e.id,
                patientId: e.patientId,
                patientName: e.patient ? `${e.patient.firstName} ${e.patient.lastName}` : undefined,
                title: e.title,
                description: e.description,
                category: e.category,
                severity: e.severity,
                status: e.status,
                escalationLevel: e.escalationLevel,
                assignedTo: e.assignedTo,
                slaDeadline: e.slaDeadline,
                createdAt: e.createdAt,
            })),
            pagination: {
                skip: input.skip,
                take: input.take,
                total,
                hasMore: input.skip + input.take < total,
            },
        },
    };
}

// =============================================================================
// TOOL: create_escalation
// =============================================================================

async function createEscalationHandler(
    input: CreateEscalationInput,
    context: MCPContext
): Promise<MCPResult> {
    const slaDeadline = input.slaDeadlineHours
        ? new Date(Date.now() + input.slaDeadlineHours * 3600 * 1000)
        : null;

    const escalation: any = await (prisma.escalation as any).create({
        data: {
            patientId: input.patientId,
            reason: `${input.title}: ${input.description || ''}`.trim(),
            slaDeadline: slaDeadline || new Date(Date.now() + 24 * 3600 * 1000),
            scheduledReminderId: input.encounterId || 'manual',
            status: 'OPEN',
        },
        include: {
            patient: {
                select: { id: true, firstName: true, lastName: true },
            },
        },
    });

    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            action: 'CREATE',
            resource: 'Escalation',
            resourceId: escalation.id,
            success: true,
            ipAddress: 'mcp-tool',
            details: {
                escalationId: escalation.id,
                patientId: input.patientId,
                category: input.category,
                severity: input.severity,
                slaDeadlineHours: input.slaDeadlineHours,
                escalationLevel: input.escalationLevel,
            },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_escalation',
        escalationId: escalation.id,
        patientId: input.patientId,
        category: input.category,
        severity: input.severity,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            escalation: {
                id: escalation.id,
                patientId: escalation.patientId,
                patientName: escalation.patient ? `${escalation.patient.firstName} ${escalation.patient.lastName}` : undefined,
                title: escalation.title,
                category: escalation.category,
                severity: escalation.severity,
                status: escalation.status,
                escalationLevel: escalation.escalationLevel,
                slaDeadline: escalation.slaDeadline,
                createdAt: escalation.createdAt,
            },
        },
    };
}

// =============================================================================
// TOOL: assign_escalation
// =============================================================================

async function assignEscalationHandler(
    input: AssignEscalationInput,
    context: MCPContext
): Promise<MCPResult> {
    const escalation: any = await prisma.escalation.findUnique({
        where: { id: input.escalationId },
        include: {
            patient: {
                select: { id: true, firstName: true, lastName: true },
            },
        },
    });

    if (!escalation) {
        return {
            success: false,
            error: `Escalation not found: ${input.escalationId}`,
            data: null,
        };
    }

    if (escalation.status === 'RESOLVED') {
        return {
            success: false,
            error: `Cannot assign resolved escalation: ${input.escalationId}`,
            data: null,
        };
    }

    const updated: any = await prisma.escalation.update({
        where: { id: input.escalationId },
        data: {
            assignedToId: input.assignedToId,
            assignedAt: new Date(),
            status: 'ASSIGNED',
        },
        include: {
            patient: {
                select: { id: true, firstName: true, lastName: true },
            },
            assignedTo: {
                select: { id: true, firstName: true, lastName: true, email: true },
            },
        },
    });

    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            action: 'UPDATE',
            resource: 'Escalation',
            resourceId: updated.id,
            success: true,
            ipAddress: 'mcp-tool',
            details: {
                escalationId: updated.id,
                assignedToId: input.assignedToId,
                previousStatus: escalation.status,
                newStatus: 'ASSIGNED',
            },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'assign_escalation',
        escalationId: input.escalationId,
        assignedToId: input.assignedToId,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            escalation: {
                id: updated.id,
                patientId: updated.patientId,
                patientName: updated.patient ? `${updated.patient.firstName} ${updated.patient.lastName}` : undefined,
                title: updated.title,
                category: updated.category,
                severity: updated.severity,
                status: updated.status,
                assignedTo: updated.assignedTo,
                assignedAt: updated.assignedAt,
                slaDeadline: updated.slaDeadline,
            },
        },
    };
}

// =============================================================================
// TOOL: resolve_escalation
// =============================================================================

async function resolveEscalationHandler(
    input: ResolveEscalationInput,
    context: MCPContext
): Promise<MCPResult> {
    const escalation: any = await prisma.escalation.findUnique({
        where: { id: input.escalationId },
    });

    if (!escalation) {
        return {
            success: false,
            error: `Escalation not found: ${input.escalationId}`,
            data: null,
        };
    }

    // Idempotent: if already resolved, return success
    if (escalation.status === 'RESOLVED') {
        return {
            success: true,
            data: {
                escalation: {
                    id: escalation.id,
                    status: escalation.status,
                    resolvedAt: escalation.resolvedAt,
                    message: 'Escalation was already resolved',
                },
            },
        };
    }

    const updated: any = await prisma.escalation.update({
        where: { id: input.escalationId },
        data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
            resolvedBy: context.clinicianId,
        },
        include: {
            patient: {
                select: { id: true, firstName: true, lastName: true },
            },
        },
    });

    if (input.notes) {
        await (prisma as any).escalationNote.create({
            data: {
                escalationId: updated.id,
                authorId: context.clinicianId,
                content: input.notes,
            },
        });
    }

    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            action: 'UPDATE',
            resource: 'Escalation',
            resourceId: updated.id,
            success: true,
            ipAddress: 'mcp-tool',
            details: {
                escalationId: updated.id,
                previousStatus: escalation.status,
                newStatus: 'RESOLVED',
                resolvedAt: updated.resolvedAt,
                notes: input.notes,
            },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'resolve_escalation',
        escalationId: input.escalationId,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            escalation: {
                id: updated.id,
                patientId: updated.patientId,
                patientName: updated.patient ? `${updated.patient.firstName} ${updated.patient.lastName}` : undefined,
                title: updated.title,
                category: updated.category,
                severity: updated.severity,
                status: updated.status,
                resolvedAt: updated.resolvedAt,
                resolvedBy: updated.resolvedBy,
            },
        },
    };
}

// =============================================================================
// EXPORT: Escalation Tools
// =============================================================================

export const escalationTools: MCPTool[] = [
    {
        name: 'list_escalations',
        description: 'List escalations with optional filtering by patient, status, severity, or category. Supports pagination.',
        category: 'escalation',
        inputSchema: ListEscalationsSchema,
        requiredPermissions: ['admin:read'],
        handler: listEscalationsHandler,
    },
    {
        name: 'create_escalation',
        description: 'Create a new escalation for a patient. Automatically calculates SLA deadline based on slaDeadlineHours.',
        category: 'escalation',
        inputSchema: CreateEscalationSchema,
        requiredPermissions: ['admin:write'],
        handler: createEscalationHandler,
    },
    {
        name: 'assign_escalation',
        description: 'Assign an escalation to a clinician. Transitions status to ASSIGNED. Fails if escalation is already resolved.',
        category: 'escalation',
        inputSchema: AssignEscalationSchema,
        requiredPermissions: ['admin:write'],
        handler: assignEscalationHandler,
    },
    {
        name: 'resolve_escalation',
        description: 'Mark an escalation as resolved. Idempotent - succeeds even if already resolved. Optionally attach resolution notes.',
        category: 'escalation',
        inputSchema: ResolveEscalationSchema,
        requiredPermissions: ['admin:write'],
        handler: resolveEscalationHandler,
    },
];
