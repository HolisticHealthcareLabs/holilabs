/**
 * MCP Imaging Tools - DICOM studies and radiology management
 *
 * Tools for managing imaging studies (X-Ray, CT, MRI, Ultrasound):
 * - get_study: Get imaging study by ID with full details
 * - list_series: List imaging studies for a patient with filters
 * - get_dicom_url: Get secure DICOM viewer URL for a study
 * - share_study: Share imaging study with external provider
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPContext, MCPResult, MCPTool } from '../types';

// =============================================================================
// SCHEMAS
// =============================================================================

const GetStudySchema = z.object({
    studyId: z.string().describe('The imaging study ID'),
});

const ListSeriesSchema = z.object({
    patientId: z.string().describe('The patient ID'),
    modality: z.string().optional().describe('Filter by modality (X-Ray, CT, MRI, Ultrasound)'),
    bodyPart: z.string().optional().describe('Filter by body part'),
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PRELIMINARY', 'FINAL']).optional().describe('Filter by status'),
    startDate: z.string().optional().describe('Filter studies after this date (ISO 8601)'),
    endDate: z.string().optional().describe('Filter studies before this date (ISO 8601)'),
    abnormalOnly: z.boolean().default(false).describe('Only return abnormal studies'),
    limit: z.number().min(1).max(100).default(20).describe('Maximum results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),
});

const GetDicomUrlSchema = z.object({
    studyId: z.string().describe('The imaging study ID'),
    expiresInMinutes: z.number().min(5).max(1440).default(60).describe('URL expiration time in minutes'),
    includeReport: z.boolean().default(true).describe('Include radiologist report URL'),
});

const ShareStudySchema = z.object({
    studyId: z.string().describe('The imaging study ID'),
    recipientEmail: z.string().email().describe('Email of the recipient (external provider)'),
    recipientName: z.string().describe('Name of the recipient'),
    purpose: z.string().describe('Purpose for sharing (e.g., "Second opinion", "Referral")'),
    expiresInDays: z.number().min(1).max(90).default(30).describe('Access expiration in days'),
    includeReport: z.boolean().default(true).describe('Include radiologist report'),
    notifyRecipient: z.boolean().default(true).describe('Send email notification to recipient'),
});

// =============================================================================
// HANDLERS
// =============================================================================

async function getStudyHandler(input: z.infer<typeof GetStudySchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const study = await prisma.imagingStudy.findUnique({
            where: { id: input.studyId },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        dateOfBirth: true,
                    },
                },
            },
        });

        if (!study) {
            return { success: false, error: `Imaging study not found: ${input.studyId}`, data: null };
        }

        logger.info({
            event: 'imaging_study_retrieved',
            studyId: input.studyId,
            modality: study.modality,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                studyId: study.id,
                studyInstanceUID: study.studyInstanceUID,
                accessionNumber: study.accessionNumber,
                patient: {
                    id: study.patient.id,
                    name: `${study.patient.firstName} ${study.patient.lastName}`,
                    dateOfBirth: study.patient.dateOfBirth?.toISOString(),
                },
                modality: study.modality,
                bodyPart: study.bodyPart,
                description: study.description,
                indication: study.indication,
                status: study.status,
                ordering: {
                    orderingDoctor: study.orderingDoctor,
                    referringDoctor: study.referringDoctor,
                    performingFacility: study.performingFacility,
                },
                images: {
                    count: study.imageCount,
                    thumbnailUrl: study.thumbnailUrl,
                    urls: study.imageUrls,
                },
                report: {
                    url: study.reportUrl,
                    findings: study.findings,
                    impression: study.impression,
                    isAbnormal: study.isAbnormal,
                    radiologist: study.radiologist,
                    reportDate: study.reportDate?.toISOString(),
                },
                dates: {
                    scheduled: study.scheduledDate?.toISOString(),
                    study: study.studyDate.toISOString(),
                    report: study.reportDate?.toISOString(),
                    reviewed: study.reviewedDate?.toISOString(),
                },
                technician: study.technician,
                notes: study.notes,
                createdAt: study.createdAt.toISOString(),
                updatedAt: study.updatedAt.toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'get_study_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get imaging study',
            data: null,
        };
    }
}

async function listSeriesHandler(input: z.infer<typeof ListSeriesSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        // Build where clause
        const where: any = {
            patientId: input.patientId,
        };

        if (input.modality) {
            where.modality = input.modality;
        }

        if (input.bodyPart) {
            where.bodyPart = { contains: input.bodyPart, mode: 'insensitive' };
        }

        if (input.status) {
            where.status = input.status;
        }

        if (input.abnormalOnly) {
            where.isAbnormal = true;
        }

        if (input.startDate || input.endDate) {
            where.studyDate = {};
            if (input.startDate) {
                where.studyDate.gte = new Date(input.startDate);
            }
            if (input.endDate) {
                where.studyDate.lte = new Date(input.endDate);
            }
        }

        const [studies, total] = await Promise.all([
            prisma.imagingStudy.findMany({
                where,
                select: {
                    id: true,
                    studyInstanceUID: true,
                    modality: true,
                    bodyPart: true,
                    description: true,
                    status: true,
                    isAbnormal: true,
                    imageCount: true,
                    thumbnailUrl: true,
                    studyDate: true,
                    reportDate: true,
                    findings: true,
                    orderingDoctor: true,
                },
                orderBy: { studyDate: 'desc' },
                take: input.limit,
                skip: input.offset,
            }),
            prisma.imagingStudy.count({ where }),
        ]);

        logger.info({
            event: 'imaging_series_listed',
            patientId: input.patientId,
            count: studies.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                patientId: input.patientId,
                studies: studies.map(s => ({
                    studyId: s.id,
                    studyInstanceUID: s.studyInstanceUID,
                    modality: s.modality,
                    bodyPart: s.bodyPart,
                    description: s.description,
                    status: s.status,
                    isAbnormal: s.isAbnormal,
                    imageCount: s.imageCount,
                    thumbnailUrl: s.thumbnailUrl,
                    studyDate: s.studyDate.toISOString(),
                    reportDate: s.reportDate?.toISOString(),
                    findings: s.findings,
                    orderingDoctor: s.orderingDoctor,
                })),
                pagination: {
                    total,
                    limit: input.limit,
                    offset: input.offset,
                    hasMore: input.offset + studies.length < total,
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'list_series_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list imaging studies',
            data: null,
        };
    }
}

async function getDicomUrlHandler(input: z.infer<typeof GetDicomUrlSchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const study = await prisma.imagingStudy.findUnique({
            where: { id: input.studyId },
            select: {
                id: true,
                studyInstanceUID: true,
                imageUrls: true,
                reportUrl: true,
                modality: true,
                description: true,
                patientId: true,
            },
        });

        if (!study) {
            return { success: false, error: `Imaging study not found: ${input.studyId}`, data: null };
        }

        // Generate secure viewer URL with expiration token
        // In production, this would be a signed URL from your DICOM server (e.g., Orthanc, OHIF)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + input.expiresInMinutes);

        // Generate a mock token (in production: use JWT or signed URL)
        const viewerToken = Buffer.from(
            JSON.stringify({
                studyId: study.id,
                studyInstanceUID: study.studyInstanceUID,
                exp: expiresAt.getTime(),
                aud: context.clinicianId,
            })
        ).toString('base64url');

        const baseViewerUrl = process.env.DICOM_VIEWER_URL || 'https://viewer.holilabs.com';
        const viewerUrl = `${baseViewerUrl}/viewer/${study.studyInstanceUID}?token=${viewerToken}`;

        // Log access for audit
        await prisma.auditLog.create({
            data: {
                userId: context.clinicianId,
                action: 'VIEW',
                resource: 'ImagingStudy',
                resourceId: study.id,
                success: true,
                ipAddress: 'mcp-tool',
                details: {
                    modality: study.modality,
                    expiresAt: expiresAt.toISOString(),
                    includeReport: input.includeReport,
                },
            },
        });

        logger.info({
            event: 'dicom_url_generated',
            studyId: input.studyId,
            expiresInMinutes: input.expiresInMinutes,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                studyId: study.id,
                studyInstanceUID: study.studyInstanceUID,
                modality: study.modality,
                description: study.description,
                viewerUrl,
                reportUrl: input.includeReport ? study.reportUrl : null,
                imageUrls: study.imageUrls,
                expiresAt: expiresAt.toISOString(),
                expiresInMinutes: input.expiresInMinutes,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_dicom_url_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate DICOM URL',
            data: null,
        };
    }
}

async function shareStudyHandler(input: z.infer<typeof ShareStudySchema>, context: MCPContext): Promise<MCPResult> {
    try {
        const study = await prisma.imagingStudy.findUnique({
            where: { id: input.studyId },
            include: {
                patient: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        if (!study) {
            return { success: false, error: `Imaging study not found: ${input.studyId}`, data: null };
        }

        // Calculate expiration
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

        // Create data access grant for the study
        const grant = await prisma.dataAccessGrant.create({
            data: {
                patientId: study.patientId,
                grantedToType: 'EXTERNAL',
                grantedToEmail: input.recipientEmail,
                grantedToName: input.recipientName,
                resourceType: 'IMAGING_STUDY',
                resourceId: study.id,
                imagingStudyId: study.id,
                canView: true,
                canDownload: true,
                canShare: false,
                expiresAt,
            },
        });

        // Generate secure share link
        const shareToken = Buffer.from(
            JSON.stringify({
                grantId: grant.id,
                studyId: study.id,
                exp: expiresAt.getTime(),
            })
        ).toString('base64url');

        const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.holilabs.com'}/shared/imaging/${shareToken}`;

        // Log sharing action
        await prisma.auditLog.create({
            data: {
                userId: context.clinicianId,
                action: 'SHARE',
                resource: 'ImagingStudy',
                resourceId: study.id,
                success: true,
                ipAddress: 'mcp-tool',
                details: {
                    recipientEmail: input.recipientEmail,
                    recipientName: input.recipientName,
                    purpose: input.purpose,
                    expiresAt: expiresAt.toISOString(),
                    includeReport: input.includeReport,
                    grantId: grant.id,
                },
            },
        });

        logger.info({
            event: 'imaging_study_shared',
            studyId: input.studyId,
            recipientEmail: input.recipientEmail,
            grantId: grant.id,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                studyId: study.id,
                grantId: grant.id,
                patient: {
                    id: study.patient.id,
                    name: `${study.patient.firstName} ${study.patient.lastName}`,
                },
                modality: study.modality,
                recipient: {
                    email: input.recipientEmail,
                    name: input.recipientName,
                },
                purpose: input.purpose,
                shareUrl,
                includesReport: input.includeReport,
                expiresAt: expiresAt.toISOString(),
                notificationSent: input.notifyRecipient,
                message: 'Imaging study shared successfully',
            },
        };
    } catch (error) {
        logger.error({ event: 'share_study_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to share imaging study',
            data: null,
        };
    }
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const imagingTools: MCPTool[] = [
    {
        name: 'get_study',
        description: 'Get detailed information about an imaging study (X-Ray, CT, MRI, Ultrasound) by ID. Returns study metadata, findings, and report details.',
        category: 'lab', // Using 'lab' category for imaging (radiology is a subset)
        inputSchema: GetStudySchema,
        requiredPermissions: ['lab:read'],
        handler: getStudyHandler,
    },
    {
        name: 'list_series',
        description: 'List imaging studies for a patient with optional filters by modality, body part, status, date range, and abnormal findings.',
        category: 'lab',
        inputSchema: ListSeriesSchema,
        requiredPermissions: ['lab:read'],
        handler: listSeriesHandler,
    },
    {
        name: 'get_dicom_url',
        description: 'Generate a secure, time-limited URL for viewing DICOM images in an external viewer. Includes audit logging.',
        category: 'lab',
        inputSchema: GetDicomUrlSchema,
        requiredPermissions: ['lab:read'],
        handler: getDicomUrlHandler,
    },
    {
        name: 'share_study',
        description: 'Share an imaging study with an external provider (e.g., for second opinion or referral). Creates a secure, expiring access grant.',
        category: 'lab',
        inputSchema: ShareStudySchema,
        requiredPermissions: ['lab:write', 'access:write'],
        handler: shareStudyHandler,
    },
];

export const IMAGING_TOOL_COUNT = imagingTools.length;
