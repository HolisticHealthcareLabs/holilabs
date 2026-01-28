/**
 * MCP Clinical Referral Tools
 *
 * Tools for AI agents to manage patient referrals to specialists:
 * - Create clinical referrals (PRIMITIVE: direct database write)
 * - Read referral details
 * - Update referral status
 * - Delete/cancel referrals
 * - List referrals with filters
 *
 * These tools operate on the ClinicalReferral model (distinct from product Referrals).
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// SPECIALTY DEFINITIONS
// =============================================================================

const SPECIALTIES = [
    'Cardiology', 'Pulmonology', 'Endocrinology', 'Gastroenterology',
    'Neurology', 'Nephrology', 'Rheumatology', 'Oncology', 'Hematology',
    'Dermatology', 'Ophthalmology', 'Orthopedics', 'Psychiatry', 'Psychology',
    'Physical Therapy', 'Occupational Therapy', 'Speech Therapy',
    'General Surgery', 'Urology', 'Gynecology', 'Allergy/Immunology',
    'Infectious Disease', 'Pain Management', 'Palliative Care', 'Geriatrics',
] as const;

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const referralTools: MCPTool[] = [
    // =========================================================================
    // CREATE - Create a new clinical referral
    // =========================================================================
    {
        name: 'create_referral',
        description: 'Create a specialist referral for a patient. This creates a ClinicalReferral record linking the patient to a specialist consultation request.',
        category: 'referral',
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            specialty: z.string().describe(`Medical specialty. Options: ${SPECIALTIES.join(', ')}`),
            priority: z.enum(['ROUTINE', 'URGENT', 'EMERGENT']).default('ROUTINE').describe('Referral urgency'),
            reason: z.string().describe('Clinical reason for referral'),
            preferredProvider: z.string().optional().describe('Preferred specialist name/ID'),
            clinicalNotes: z.string().optional().describe('Clinical notes for the specialist'),
            includeDiagnoses: z.boolean().default(true).describe('Include patient diagnoses in referral'),
            includeMedications: z.boolean().default(true).describe('Include current medications'),
            includeLabResults: z.boolean().default(false).describe('Include recent lab results'),
        }),
        requiredPermissions: ['patient:read', 'referral:write'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                // Verify patient exists
                const patient = await prisma.patient.findUnique({
                    where: { id: input.patientId },
                    select: { id: true, firstName: true, lastName: true },
                });

                if (!patient) {
                    return {
                        success: false,
                        error: `Patient not found: ${input.patientId}`,
                    };
                }

                // Create the clinical referral
                const referral = await prisma.clinicalReferral.create({
                    data: {
                        patientId: input.patientId,
                        referringClinicianId: context.userId,
                        specialty: input.specialty,
                        priority: input.priority,
                        status: 'PENDING',
                        reason: input.reason,
                        preferredProvider: input.preferredProvider,
                        clinicalNotes: input.clinicalNotes,
                        includeDiagnoses: input.includeDiagnoses,
                        includeMedications: input.includeMedications,
                        includeLabResults: input.includeLabResults,
                    },
                    include: {
                        patient: {
                            select: { id: true, firstName: true, lastName: true },
                        },
                        referringClinician: {
                            select: { id: true, firstName: true, lastName: true },
                        },
                    },
                });

                logger.info({
                    event: 'clinical_referral_created',
                    referralId: referral.id,
                    patientId: input.patientId,
                    specialty: input.specialty,
                    priority: input.priority,
                    userId: context.userId,
                });

                return {
                    success: true,
                    data: {
                        referralId: referral.id,
                        patientId: referral.patientId,
                        patientName: `${referral.patient.firstName} ${referral.patient.lastName}`,
                        specialty: referral.specialty,
                        priority: referral.priority,
                        status: referral.status,
                        reason: referral.reason,
                        preferredProvider: referral.preferredProvider,
                        referringClinician: `${referral.referringClinician.firstName} ${referral.referringClinician.lastName}`,
                        attachments: {
                            diagnoses: referral.includeDiagnoses,
                            medications: referral.includeMedications,
                            labResults: referral.includeLabResults,
                        },
                        createdAt: referral.createdAt.toISOString(),
                    },
                };
            } catch (error) {
                logger.error({ event: 'create_referral_error', error, input });
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to create referral',
                };
            }
        },
    },

    // =========================================================================
    // READ - Get referral details by ID
    // =========================================================================
    {
        name: 'get_referral',
        description: 'Get details of a specific clinical referral by ID',
        category: 'referral',
        inputSchema: z.object({
            referralId: z.string().describe('The referral ID'),
        }),
        requiredPermissions: ['referral:read'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                const referral = await prisma.clinicalReferral.findUnique({
                    where: { id: input.referralId },
                    include: {
                        patient: {
                            select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
                        },
                        referringClinician: {
                            select: { id: true, firstName: true, lastName: true, specialty: true },
                        },
                    },
                });

                if (!referral) {
                    return {
                        success: false,
                        error: `Referral not found: ${input.referralId}`,
                    };
                }

                return {
                    success: true,
                    data: {
                        referralId: referral.id,
                        patient: {
                            id: referral.patient.id,
                            name: `${referral.patient.firstName} ${referral.patient.lastName}`,
                            dateOfBirth: referral.patient.dateOfBirth.toISOString(),
                        },
                        referringClinician: {
                            id: referral.referringClinician.id,
                            name: `${referral.referringClinician.firstName} ${referral.referringClinician.lastName}`,
                            specialty: referral.referringClinician.specialty,
                        },
                        specialty: referral.specialty,
                        preferredProvider: referral.preferredProvider,
                        receivingProvider: referral.receivingProvider,
                        priority: referral.priority,
                        status: referral.status,
                        reason: referral.reason,
                        clinicalNotes: referral.clinicalNotes,
                        specialistResponse: referral.specialistResponse,
                        appointmentDate: referral.appointmentDate?.toISOString(),
                        attachments: {
                            diagnoses: referral.includeDiagnoses,
                            medications: referral.includeMedications,
                            labResults: referral.includeLabResults,
                        },
                        timestamps: {
                            createdAt: referral.createdAt.toISOString(),
                            updatedAt: referral.updatedAt.toISOString(),
                            acceptedAt: referral.acceptedAt?.toISOString(),
                            scheduledAt: referral.scheduledAt?.toISOString(),
                            completedAt: referral.completedAt?.toISOString(),
                            cancelledAt: referral.cancelledAt?.toISOString(),
                        },
                        cancellationReason: referral.cancellationReason,
                    },
                };
            } catch (error) {
                logger.error({ event: 'get_referral_error', error, input });
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get referral',
                };
            }
        },
    },

    // =========================================================================
    // LIST - List referrals with filters
    // =========================================================================
    {
        name: 'list_referrals',
        description: 'List clinical referrals with optional filters by patient, status, specialty, or priority',
        category: 'referral',
        inputSchema: z.object({
            patientId: z.string().optional().describe('Filter by patient ID'),
            status: z.enum(['PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'REJECTED']).optional().describe('Filter by status'),
            specialty: z.string().optional().describe('Filter by specialty'),
            priority: z.enum(['ROUTINE', 'URGENT', 'EMERGENT']).optional().describe('Filter by priority'),
            referringClinicianId: z.string().optional().describe('Filter by referring clinician'),
            limit: z.number().min(1).max(100).default(20).describe('Maximum number of referrals to return'),
            offset: z.number().min(0).default(0).describe('Number of referrals to skip'),
        }),
        requiredPermissions: ['referral:read'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                const where: any = {};

                if (input.patientId) where.patientId = input.patientId;
                if (input.status) where.status = input.status;
                if (input.specialty) where.specialty = input.specialty;
                if (input.priority) where.priority = input.priority;
                if (input.referringClinicianId) where.referringClinicianId = input.referringClinicianId;

                const [referrals, total] = await Promise.all([
                    prisma.clinicalReferral.findMany({
                        where,
                        include: {
                            patient: {
                                select: { id: true, firstName: true, lastName: true },
                            },
                            referringClinician: {
                                select: { id: true, firstName: true, lastName: true },
                            },
                        },
                        orderBy: [
                            { priority: 'desc' }, // EMERGENT first
                            { createdAt: 'desc' },
                        ],
                        take: input.limit,
                        skip: input.offset,
                    }),
                    prisma.clinicalReferral.count({ where }),
                ]);

                return {
                    success: true,
                    data: {
                        referrals: referrals.map(r => ({
                            referralId: r.id,
                            patientId: r.patientId,
                            patientName: `${r.patient.firstName} ${r.patient.lastName}`,
                            specialty: r.specialty,
                            priority: r.priority,
                            status: r.status,
                            reason: r.reason,
                            preferredProvider: r.preferredProvider,
                            receivingProvider: r.receivingProvider,
                            appointmentDate: r.appointmentDate?.toISOString(),
                            referringClinician: `${r.referringClinician.firstName} ${r.referringClinician.lastName}`,
                            createdAt: r.createdAt.toISOString(),
                        })),
                        pagination: {
                            total,
                            limit: input.limit,
                            offset: input.offset,
                            hasMore: input.offset + referrals.length < total,
                        },
                    },
                };
            } catch (error) {
                logger.error({ event: 'list_referrals_error', error, input });
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to list referrals',
                };
            }
        },
    },

    // =========================================================================
    // UPDATE - Update referral status or add notes
    // =========================================================================
    {
        name: 'update_referral',
        description: 'Update a clinical referral status, add specialist response, or set appointment date',
        category: 'referral',
        inputSchema: z.object({
            referralId: z.string().describe('The referral ID'),
            status: z.enum(['PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'REJECTED']).optional().describe('New status'),
            specialistResponse: z.string().optional().describe('Response from the specialist'),
            receivingProvider: z.string().optional().describe('Name/ID of specialist who accepted'),
            appointmentDate: z.string().optional().describe('Scheduled appointment date (ISO 8601)'),
            clinicalNotes: z.string().optional().describe('Additional clinical notes'),
            cancellationReason: z.string().optional().describe('Reason for cancellation (required if status=CANCELLED)'),
        }),
        requiredPermissions: ['referral:write'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                // Verify referral exists
                const existing = await prisma.clinicalReferral.findUnique({
                    where: { id: input.referralId },
                });

                if (!existing) {
                    return {
                        success: false,
                        error: `Referral not found: ${input.referralId}`,
                    };
                }

                // Build update data
                const updateData: any = {};

                if (input.status) {
                    updateData.status = input.status;

                    // Set timestamps based on status
                    if (input.status === 'ACCEPTED') {
                        updateData.acceptedAt = new Date();
                    } else if (input.status === 'SCHEDULED') {
                        updateData.scheduledAt = new Date();
                    } else if (input.status === 'COMPLETED') {
                        updateData.completedAt = new Date();
                    } else if (input.status === 'CANCELLED') {
                        updateData.cancelledAt = new Date();
                        if (!input.cancellationReason) {
                            return {
                                success: false,
                                error: 'cancellationReason is required when status is CANCELLED',
                            };
                        }
                    }
                }

                if (input.specialistResponse) updateData.specialistResponse = input.specialistResponse;
                if (input.receivingProvider) updateData.receivingProvider = input.receivingProvider;
                if (input.appointmentDate) updateData.appointmentDate = new Date(input.appointmentDate);
                if (input.clinicalNotes) updateData.clinicalNotes = input.clinicalNotes;
                if (input.cancellationReason) updateData.cancellationReason = input.cancellationReason;

                const referral = await prisma.clinicalReferral.update({
                    where: { id: input.referralId },
                    data: updateData,
                    include: {
                        patient: {
                            select: { id: true, firstName: true, lastName: true },
                        },
                    },
                });

                logger.info({
                    event: 'clinical_referral_updated',
                    referralId: referral.id,
                    patientId: referral.patientId,
                    newStatus: referral.status,
                    userId: context.userId,
                });

                return {
                    success: true,
                    data: {
                        referralId: referral.id,
                        patientId: referral.patientId,
                        patientName: `${referral.patient.firstName} ${referral.patient.lastName}`,
                        specialty: referral.specialty,
                        status: referral.status,
                        receivingProvider: referral.receivingProvider,
                        specialistResponse: referral.specialistResponse,
                        appointmentDate: referral.appointmentDate?.toISOString(),
                        updatedAt: referral.updatedAt.toISOString(),
                    },
                };
            } catch (error) {
                logger.error({ event: 'update_referral_error', error, input });
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to update referral',
                };
            }
        },
    },

    // =========================================================================
    // DELETE - Cancel/delete a referral
    // =========================================================================
    {
        name: 'delete_referral',
        description: 'Cancel and delete a clinical referral. Only pending referrals can be deleted.',
        category: 'referral',
        inputSchema: z.object({
            referralId: z.string().describe('The referral ID to delete'),
            reason: z.string().describe('Reason for deletion/cancellation'),
        }),
        requiredPermissions: ['referral:delete'],
        handler: async (input: any, context: MCPContext): Promise<MCPResult> => {
            try {
                // Verify referral exists and is deletable
                const referral = await prisma.clinicalReferral.findUnique({
                    where: { id: input.referralId },
                });

                if (!referral) {
                    return {
                        success: false,
                        error: `Referral not found: ${input.referralId}`,
                    };
                }

                // Only allow deletion of PENDING or CANCELLED referrals
                if (!['PENDING', 'CANCELLED', 'REJECTED'].includes(referral.status)) {
                    return {
                        success: false,
                        error: `Cannot delete referral with status ${referral.status}. Only PENDING, CANCELLED, or REJECTED referrals can be deleted.`,
                    };
                }

                await prisma.clinicalReferral.delete({
                    where: { id: input.referralId },
                });

                logger.info({
                    event: 'clinical_referral_deleted',
                    referralId: input.referralId,
                    patientId: referral.patientId,
                    reason: input.reason,
                    userId: context.userId,
                });

                return {
                    success: true,
                    data: {
                        referralId: input.referralId,
                        deleted: true,
                        reason: input.reason,
                        deletedAt: new Date().toISOString(),
                    },
                };
            } catch (error) {
                logger.error({ event: 'delete_referral_error', error, input });
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to delete referral',
                };
            }
        },
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const REFERRAL_TOOL_COUNT = referralTools.length;
export { SPECIALTIES };
