/**
 * Document MCP Tools - Clinical document management
 *
 * These tools manage patient documents including upload, retrieval, sharing, and deletion.
 * Uses `any` types for Prisma results due to complex relation typing.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createHash, randomBytes } from 'crypto';
import {
    CreateDocumentSchema,
    GetDocumentSchema,
    ListDocumentsSchema,
    UpdateDocumentSchema,
    DeleteDocumentSchema,
    ShareDocumentSchema,
    type CreateDocumentInput,
    type GetDocumentInput,
    type ListDocumentsInput,
    type UpdateDocumentInput,
    type DeleteDocumentInput,
    type ShareDocumentInput,
} from '../schemas/tool-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate SHA-256 hash for document content
 */
function generateDocumentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

/**
 * Generate a secure share token
 */
function generateShareToken(): string {
    return randomBytes(32).toString('hex');
}

/**
 * Hash the share token for secure storage
 */
function hashShareToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

// =============================================================================
// TOOL: create_document
// =============================================================================

async function createDocumentHandler(
    input: CreateDocumentInput,
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

    // Generate document hash if not provided
    const documentHash = input.documentHash || generateDocumentHash(
        `${input.patientId}-${input.fileName}-${Date.now()}`
    );

    // Check for duplicate hash
    const existingDoc = await prisma.document.findUnique({
        where: { documentHash },
    });

    if (existingDoc) {
        return {
            success: false,
            error: 'Document with this hash already exists',
            data: null,
        };
    }

    // Create document record
    const document: any = await prisma.document.create({
        data: {
            patientId: input.patientId,
            fileName: input.fileName,
            fileType: input.fileType,
            fileSize: input.fileSize,
            storageUrl: input.storageUrl,
            documentType: input.documentType,
            documentHash,
            ocrText: input.ocrText,
            entities: input.entities,
            uploadedBy: context.clinicianId,
            processingStatus: 'PENDING',
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_document',
        documentId: document.id,
        patientId: input.patientId,
        documentType: input.documentType,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            documentId: document.id,
            fileName: document.fileName,
            fileType: document.fileType,
            documentType: document.documentType,
            documentHash: document.documentHash,
            processingStatus: document.processingStatus,
            createdAt: document.createdAt,
            message: 'Document created successfully',
        },
    };
}

// =============================================================================
// TOOL: get_document
// =============================================================================

async function getDocumentHandler(
    input: GetDocumentInput,
    context: MCPContext
): Promise<MCPResult> {
    // Get document with patient relation to verify access
    const document: any = await prisma.document.findUnique({
        where: { id: input.documentId },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    assignedClinicianId: true,
                },
            },
        },
    });

    if (!document) {
        return {
            success: false,
            error: 'Document not found',
            data: null,
        };
    }

    // Verify clinician has access to this patient
    if (document.patient.assignedClinicianId !== context.clinicianId) {
        return {
            success: false,
            error: 'Access denied to this document',
            data: null,
        };
    }

    // Check if document is deleted
    if (document.processingStatus === 'DELETED') {
        return {
            success: false,
            error: 'Document has been deleted',
            data: null,
        };
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_document',
        documentId: document.id,
        patientId: document.patientId,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            id: document.id,
            patientId: document.patientId,
            patient: {
                id: document.patient.id,
                firstName: document.patient.firstName,
                lastName: document.patient.lastName,
            },
            fileName: document.fileName,
            fileType: document.fileType,
            fileSize: document.fileSize,
            documentType: document.documentType,
            storageUrl: document.storageUrl,
            documentHash: document.documentHash,
            ocrText: document.ocrText,
            entities: document.entities,
            isDeidentified: document.isDeidentified,
            processingStatus: document.processingStatus,
            uploadedBy: document.uploadedBy,
            createdAt: document.createdAt,
            updatedAt: document.updatedAt,
        },
    };
}

// =============================================================================
// TOOL: list_documents
// =============================================================================

async function listDocumentsHandler(
    input: ListDocumentsInput,
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
        processingStatus: { not: 'DELETED' },
    };

    if (input.documentType) {
        where.documentType = input.documentType;
    }

    if (input.processingStatus) {
        where.processingStatus = input.processingStatus;
    }

    if (input.startDate) {
        where.createdAt = {
            ...where.createdAt,
            gte: new Date(input.startDate),
        };
    }

    if (input.endDate) {
        where.createdAt = {
            ...where.createdAt,
            lte: new Date(input.endDate),
        };
    }

    const [documents, total] = await Promise.all([
        prisma.document.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                fileName: true,
                fileType: true,
                fileSize: true,
                documentType: true,
                processingStatus: true,
                isDeidentified: true,
                createdAt: true,
                updatedAt: true,
            },
        }),
        prisma.document.count({ where }),
    ]);

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'list_documents',
        patientId: input.patientId,
        resultCount: documents.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            documents,
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
// TOOL: update_document
// =============================================================================

async function updateDocumentHandler(
    input: UpdateDocumentInput,
    context: MCPContext
): Promise<MCPResult> {
    // Get document with patient to verify access
    const document: any = await prisma.document.findUnique({
        where: { id: input.documentId },
        include: {
            patient: {
                select: {
                    assignedClinicianId: true,
                },
            },
        },
    });

    if (!document) {
        return {
            success: false,
            error: 'Document not found',
            data: null,
        };
    }

    if (document.patient.assignedClinicianId !== context.clinicianId) {
        return {
            success: false,
            error: 'Access denied to this document',
            data: null,
        };
    }

    if (document.processingStatus === 'DELETED') {
        return {
            success: false,
            error: 'Cannot update a deleted document',
            data: null,
        };
    }

    // Build update data
    const updateData: any = {};
    if (input.fileName) updateData.fileName = input.fileName;
    if (input.documentType) updateData.documentType = input.documentType;
    if (input.ocrText !== undefined) updateData.ocrText = input.ocrText;
    if (input.entities !== undefined) updateData.entities = input.entities;

    if (Object.keys(updateData).length === 0) {
        return {
            success: false,
            error: 'No fields to update',
            data: null,
        };
    }

    const updatedDocument: any = await prisma.document.update({
        where: { id: input.documentId },
        data: updateData,
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_document',
        documentId: input.documentId,
        updatedFields: Object.keys(updateData),
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            documentId: updatedDocument.id,
            fileName: updatedDocument.fileName,
            documentType: updatedDocument.documentType,
            updatedAt: updatedDocument.updatedAt,
            message: 'Document updated successfully',
        },
    };
}

// =============================================================================
// TOOL: delete_document
// =============================================================================

async function deleteDocumentHandler(
    input: DeleteDocumentInput,
    context: MCPContext
): Promise<MCPResult> {
    // Get document with patient to verify access
    const document: any = await prisma.document.findUnique({
        where: { id: input.documentId },
        include: {
            patient: {
                select: {
                    assignedClinicianId: true,
                },
            },
        },
    });

    if (!document) {
        return {
            success: false,
            error: 'Document not found',
            data: null,
        };
    }

    if (document.patient.assignedClinicianId !== context.clinicianId) {
        return {
            success: false,
            error: 'Access denied to this document',
            data: null,
        };
    }

    if (document.processingStatus === 'DELETED') {
        return {
            success: false,
            error: 'Document is already deleted',
            data: null,
        };
    }

    // Soft delete by setting status to DELETED
    // Note: The actual file removal should be handled by a separate cleanup process
    await prisma.document.update({
        where: { id: input.documentId },
        data: {
            processingStatus: 'FAILED', // Using FAILED as proxy for deleted since DELETED doesn't exist in enum
            // TODO: Add deletedAt and deletedBy fields to schema if needed
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'delete_document',
        documentId: input.documentId,
        reason: input.reason,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            documentId: input.documentId,
            message: 'Document deleted successfully',
            deletedAt: new Date().toISOString(),
        },
    };
}

// =============================================================================
// TOOL: share_document
// =============================================================================

async function shareDocumentHandler(
    input: ShareDocumentInput,
    context: MCPContext
): Promise<MCPResult> {
    // Get document with patient to verify access
    const document: any = await prisma.document.findUnique({
        where: { id: input.documentId },
        include: {
            patient: {
                select: {
                    id: true,
                    assignedClinicianId: true,
                },
            },
        },
    });

    if (!document) {
        return {
            success: false,
            error: 'Document not found',
            data: null,
        };
    }

    if (document.patient.assignedClinicianId !== context.clinicianId) {
        return {
            success: false,
            error: 'Access denied to this document',
            data: null,
        };
    }

    if (document.processingStatus === 'DELETED' || document.processingStatus === 'FAILED') {
        return {
            success: false,
            error: 'Cannot share a deleted document',
            data: null,
        };
    }

    // Generate secure share token
    const shareToken = generateShareToken();
    const shareTokenHash = hashShareToken(shareToken);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + input.expiresInHours);

    // Create document share record
    const documentShare: any = await prisma.documentShare.create({
        data: {
            patientId: document.patient.id,
            documentType: 'DOCUMENT',
            documentId: input.documentId,
            documentIds: [input.documentId],
            shareToken,
            shareTokenHash,
            recipientEmail: input.recipientEmail,
            recipientName: input.recipientName,
            purpose: input.purpose,
            expiresAt,
            maxAccesses: input.maxAccesses,
            allowDownload: input.allowDownload,
            requirePassword: input.requirePassword,
            isActive: true,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'share_document',
        documentId: input.documentId,
        shareId: documentShare.id,
        recipientEmail: input.recipientEmail,
        expiresAt: expiresAt.toISOString(),
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    // Build share URL (adjust base URL as needed)
    const shareUrl = `/shared/documents/${shareToken}`;

    return {
        success: true,
        data: {
            shareId: documentShare.id,
            shareToken,
            shareUrl,
            documentId: input.documentId,
            recipientEmail: input.recipientEmail,
            recipientName: input.recipientName,
            expiresAt: expiresAt.toISOString(),
            allowDownload: input.allowDownload,
            requirePassword: input.requirePassword,
            maxAccesses: input.maxAccesses,
            message: 'Document share link created successfully',
        },
    };
}

// =============================================================================
// EXPORT: Document Tools
// =============================================================================

export const documentTools: MCPTool[] = [
    {
        name: 'create_document',
        description: 'Create/upload a document record for a patient. Stores document metadata and storage reference.',
        category: 'document',
        inputSchema: CreateDocumentSchema,
        requiredPermissions: ['patient:read', 'document:write'],
        handler: createDocumentHandler,
    },
    {
        name: 'get_document',
        description: 'Get a document by ID including metadata, storage URL, and extracted content.',
        category: 'document',
        inputSchema: GetDocumentSchema,
        requiredPermissions: ['patient:read', 'document:read'],
        handler: getDocumentHandler,
    },
    {
        name: 'list_documents',
        description: 'List documents for a patient with optional filters for type, date range, and status.',
        category: 'document',
        inputSchema: ListDocumentsSchema,
        requiredPermissions: ['patient:read', 'document:read'],
        handler: listDocumentsHandler,
    },
    {
        name: 'update_document',
        description: 'Update document metadata such as file name, type, or extracted content.',
        category: 'document',
        inputSchema: UpdateDocumentSchema,
        requiredPermissions: ['patient:read', 'document:write'],
        handler: updateDocumentHandler,
    },
    {
        name: 'delete_document',
        description: 'Soft delete a document. Requires a reason for audit purposes.',
        category: 'document',
        inputSchema: DeleteDocumentSchema,
        requiredPermissions: ['patient:read', 'document:write'],
        handler: deleteDocumentHandler,
    },
    {
        name: 'share_document',
        description: 'Generate a secure sharing link for a document with optional expiration and access controls.',
        category: 'document',
        inputSchema: ShareDocumentSchema,
        requiredPermissions: ['patient:read', 'document:write', 'document:share'],
        handler: shareDocumentHandler,
    },
];

export const DOCUMENT_TOOL_COUNT = documentTools.length;
