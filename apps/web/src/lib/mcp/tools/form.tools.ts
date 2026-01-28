/**
 * Form MCP Tools - Form template and instance management
 *
 * These tools manage form templates and patient form submissions.
 * Uses `any` types for Prisma results due to complex relation typing.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createHash, randomBytes } from 'crypto';
import {
    CreateFormSchema,
    SendFormSchema,
    GetFormResponsesSchema,
    ListFormsSchema,
    GetFormInstanceSchema,
    ListFormInstancesSchema,
    type CreateFormInput,
    type SendFormInput,
    type GetFormResponsesInput,
    type ListFormsInput,
    type GetFormInstanceInput,
    type ListFormInstancesInput,
} from '../schemas/tool-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a secure access token for form instance
 */
function generateAccessToken(): string {
    return randomBytes(32).toString('hex');
}

/**
 * Hash the access token for secure storage
 */
function hashAccessToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

// =============================================================================
// TOOL: create_form
// =============================================================================

async function createFormHandler(
    input: CreateFormInput,
    context: MCPContext
): Promise<MCPResult> {
    // Create form template
    const formTemplate: any = await prisma.formTemplate.create({
        data: {
            title: input.title,
            description: input.description,
            category: input.category,
            structure: input.structure,
            fileUrl: input.fileUrl,
            fileType: input.fileType,
            tags: input.tags,
            estimatedMinutes: input.estimatedMinutes,
            createdBy: context.clinicianId,
            isBuiltIn: false,
            isActive: true,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_form',
        templateId: formTemplate.id,
        category: input.category,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            templateId: formTemplate.id,
            title: formTemplate.title,
            category: formTemplate.category,
            isActive: formTemplate.isActive,
            createdAt: formTemplate.createdAt,
            message: 'Form template created successfully',
        },
    };
}

// =============================================================================
// TOOL: send_form
// =============================================================================

async function sendFormHandler(
    input: SendFormInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
            assignedClinicianId: context.clinicianId,
        },
    });

    if (!patient) {
        return {
            success: false,
            error: 'Patient not found or access denied',
            data: null,
        };
    }

    // Verify form template exists and is active
    const template = await prisma.formTemplate.findUnique({
        where: { id: input.templateId },
    });

    if (!template) {
        return {
            success: false,
            error: 'Form template not found',
            data: null,
        };
    }

    if (!template.isActive) {
        return {
            success: false,
            error: 'Form template is not active',
            data: null,
        };
    }

    // Generate access token
    const accessToken = generateAccessToken();
    const accessTokenHash = hashAccessToken(accessToken);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

    // Create form instance
    const formInstance: any = await prisma.formInstance.create({
        data: {
            templateId: input.templateId,
            patientId: input.patientId,
            assignedBy: context.clinicianId,
            status: 'PENDING',
            accessToken,
            accessTokenHash,
            expiresAt,
        },
    });

    // Increment template usage count
    await prisma.formTemplate.update({
        where: { id: input.templateId },
        data: {
            usageCount: { increment: 1 },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'send_form',
        formInstanceId: formInstance.id,
        templateId: input.templateId,
        patientId: input.patientId,
        expiresAt: expiresAt.toISOString(),
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    // Build form access URL
    const formUrl = `/portal/forms/${accessToken}`;

    return {
        success: true,
        data: {
            formInstanceId: formInstance.id,
            templateId: input.templateId,
            templateTitle: template.title,
            patientId: input.patientId,
            status: formInstance.status,
            accessToken,
            formUrl,
            expiresAt: expiresAt.toISOString(),
            message: 'Form sent to patient successfully',
        },
    };
}

// =============================================================================
// TOOL: get_form_responses
// =============================================================================

async function getFormResponsesHandler(
    input: GetFormResponsesInput,
    context: MCPContext
): Promise<MCPResult> {
    // Get form instance with patient and template
    const formInstance: any = await prisma.formInstance.findUnique({
        where: { id: input.formInstanceId },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    assignedClinicianId: true,
                },
            },
            template: {
                select: {
                    id: true,
                    title: true,
                    category: true,
                    structure: true,
                },
            },
        },
    });

    if (!formInstance) {
        return {
            success: false,
            error: 'Form instance not found',
            data: null,
        };
    }

    // Verify clinician has access to this patient
    if (formInstance.patient.assignedClinicianId !== context.clinicianId) {
        return {
            success: false,
            error: 'Access denied to this form instance',
            data: null,
        };
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_form_responses',
        formInstanceId: formInstance.id,
        status: formInstance.status,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            formInstanceId: formInstance.id,
            template: {
                id: formInstance.template.id,
                title: formInstance.template.title,
                category: formInstance.template.category,
            },
            patient: {
                id: formInstance.patient.id,
                firstName: formInstance.patient.firstName,
                lastName: formInstance.patient.lastName,
            },
            status: formInstance.status,
            responses: formInstance.responses,
            submittedData: formInstance.submittedData,
            progressPercent: formInstance.progressPercent,
            currentStepIndex: formInstance.currentStepIndex,
            sentAt: formInstance.sentAt,
            viewedAt: formInstance.viewedAt,
            startedAt: formInstance.startedAt,
            completedAt: formInstance.completedAt,
            signedAt: formInstance.signedAt,
            expiresAt: formInstance.expiresAt,
        },
    };
}

// =============================================================================
// TOOL: list_forms
// =============================================================================

async function listFormsHandler(
    input: ListFormsInput,
    context: MCPContext
): Promise<MCPResult> {
    const { page = 1, limit = 20 } = input;
    const skip = (page - 1) * limit;

    // Build query conditions
    const where: any = {
        isActive: input.isActive,
    };

    if (input.category) {
        where.category = input.category;
    }

    if (input.isBuiltIn !== undefined) {
        where.isBuiltIn = input.isBuiltIn;
    }

    const [templates, total] = await Promise.all([
        prisma.formTemplate.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                isBuiltIn: true,
                isActive: true,
                tags: true,
                estimatedMinutes: true,
                usageCount: true,
                version: true,
                createdAt: true,
                updatedAt: true,
            },
        }),
        prisma.formTemplate.count({ where }),
    ]);

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'list_forms',
        resultCount: templates.length,
        category: input.category,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            templates,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        },
    };
}

// =============================================================================
// TOOL: get_form_instance
// =============================================================================

async function getFormInstanceHandler(
    input: GetFormInstanceInput,
    context: MCPContext
): Promise<MCPResult> {
    // Get form instance with relations
    const formInstance: any = await prisma.formInstance.findUnique({
        where: { id: input.formInstanceId },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    assignedClinicianId: true,
                },
            },
            template: {
                select: {
                    id: true,
                    title: true,
                    category: true,
                },
            },
        },
    });

    if (!formInstance) {
        return {
            success: false,
            error: 'Form instance not found',
            data: null,
        };
    }

    // Verify clinician has access to this patient
    if (formInstance.patient.assignedClinicianId !== context.clinicianId) {
        return {
            success: false,
            error: 'Access denied to this form instance',
            data: null,
        };
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_form_instance',
        formInstanceId: formInstance.id,
        status: formInstance.status,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            formInstanceId: formInstance.id,
            template: formInstance.template,
            patient: {
                id: formInstance.patient.id,
                firstName: formInstance.patient.firstName,
                lastName: formInstance.patient.lastName,
            },
            status: formInstance.status,
            progressPercent: formInstance.progressPercent,
            sentAt: formInstance.sentAt,
            viewedAt: formInstance.viewedAt,
            startedAt: formInstance.startedAt,
            completedAt: formInstance.completedAt,
            signedAt: formInstance.signedAt,
            expiresAt: formInstance.expiresAt,
            remindersSent: formInstance.remindersSent,
            lastReminderAt: formInstance.lastReminderAt,
        },
    };
}

// =============================================================================
// TOOL: list_form_instances
// =============================================================================

async function listFormInstancesHandler(
    input: ListFormInstancesInput,
    context: MCPContext
): Promise<MCPResult> {
    const { page = 1, limit = 20 } = input;
    const skip = (page - 1) * limit;

    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
            assignedClinicianId: context.clinicianId,
        },
    });

    if (!patient) {
        return {
            success: false,
            error: 'Patient not found or access denied',
            data: null,
        };
    }

    // Build query conditions
    const where: any = {
        patientId: input.patientId,
    };

    if (input.status) {
        where.status = input.status;
    }

    const [instances, total] = await Promise.all([
        prisma.formInstance.findMany({
            where,
            skip,
            take: limit,
            orderBy: { sentAt: 'desc' },
            include: {
                template: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                    },
                },
            },
        }),
        prisma.formInstance.count({ where }),
    ]);

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'list_form_instances',
        patientId: input.patientId,
        resultCount: instances.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            formInstances: instances.map((instance: any) => ({
                id: instance.id,
                template: instance.template,
                status: instance.status,
                progressPercent: instance.progressPercent,
                sentAt: instance.sentAt,
                viewedAt: instance.viewedAt,
                completedAt: instance.completedAt,
                expiresAt: instance.expiresAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        },
    };
}

// =============================================================================
// EXPORT: Form Tools
// =============================================================================

export const formTools: MCPTool[] = [
    {
        name: 'create_form',
        description: 'Create a new form template with structure definition.',
        category: 'form',
        inputSchema: CreateFormSchema,
        requiredPermissions: ['form:write'],
        handler: createFormHandler,
    },
    {
        name: 'send_form',
        description: 'Send a form to a patient. Creates a form instance with secure access link.',
        category: 'form',
        inputSchema: SendFormSchema,
        requiredPermissions: ['patient:read', 'form:write'],
        handler: sendFormHandler,
    },
    {
        name: 'get_form_responses',
        description: 'Get responses and submission data for a form instance.',
        category: 'form',
        inputSchema: GetFormResponsesSchema,
        requiredPermissions: ['patient:read', 'form:read'],
        handler: getFormResponsesHandler,
    },
    {
        name: 'list_forms',
        description: 'List available form templates with optional category filter.',
        category: 'form',
        inputSchema: ListFormsSchema,
        requiredPermissions: ['form:read'],
        handler: listFormsHandler,
    },
    {
        name: 'get_form_instance',
        description: 'Get status and details of a specific form instance.',
        category: 'form',
        inputSchema: GetFormInstanceSchema,
        requiredPermissions: ['patient:read', 'form:read'],
        handler: getFormInstanceHandler,
    },
    {
        name: 'list_form_instances',
        description: 'List form instances for a patient with optional status filter.',
        category: 'form',
        inputSchema: ListFormInstancesSchema,
        requiredPermissions: ['patient:read', 'form:read'],
        handler: listFormInstancesHandler,
    },
];

export const FORM_TOOL_COUNT = formTools.length;
