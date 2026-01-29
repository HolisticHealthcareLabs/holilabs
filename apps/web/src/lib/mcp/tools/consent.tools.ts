/**
 * Consent MCP Tools - Patient consent management for LGPD/HIPAA compliance
 *
 * These tools manage patient consent records including creation, retrieval,
 * and revocation. Critical for LGPD (Brazilian) and HIPAA compliance.
 * Uses `any` types for Prisma results due to complex relation typing.
 */

import { z } from 'zod';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// CONSENT TYPE DEFINITIONS
// =============================================================================

const ConsentTypeEnum = z.enum([
    'GENERAL_CONSULTATION',
    'TELEHEALTH',
    'DATA_RESEARCH',
    'SURGERY',
    'PROCEDURE',
    'PHOTOGRAPHY',
    'RECORDING',
    'APPOINTMENT_REMINDERS',
    'MEDICATION_REMINDERS',
    'WELLNESS_TIPS',
    'CUSTOM',
    'TERMS_OF_SERVICE',
    'PRIVACY_POLICY',
    'HIPAA_NOTICE',
    'EHR_CONSENT',
    'TELEMEDICINE_CONSENT',
    'DATA_SHARING_CONSENT',
    'MARKETING_CONSENT',
]);

// =============================================================================
// SCHEMAS
// =============================================================================

const GetPatientConsentsSchema = z.object({
    patientId: z.string().uuid().describe('The patient UUID to get consents for'),
    type: ConsentTypeEnum.optional().describe('Filter by consent type'),
    isActive: z.boolean().optional().describe('Filter by active status'),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
});

const GetConsentSchema = z.object({
    consentId: z.string().describe('The consent ID to retrieve'),
});

const CreateConsentSchema = z.object({
    patientId: z.string().uuid().describe('The patient UUID'),
    type: ConsentTypeEnum.describe('Type of consent'),
    title: z.string().describe('Title of the consent form'),
    content: z.string().describe('Full consent text content'),
    version: z.string().default('1.0').describe('Version of the consent form'),
    signatureData: z.string().describe('Base64 signature image or digital signature'),
    witnessName: z.string().optional().describe('Name of witness if applicable'),
    witnessSignature: z.string().optional().describe('Witness signature if applicable'),
    expiresAt: z.string().optional().describe('Optional expiration date (ISO 8601)'),
});

const RevokeConsentSchema = z.object({
    consentId: z.string().describe('The consent ID to revoke'),
    reason: z.string().describe('Reason for revoking consent (for audit trail)'),
});

const UpdateConsentPreferencesSchema = z.object({
    patientId: z.string().uuid().describe('The patient UUID'),
    preferences: z.object({
        // WhatsApp consent
        whatsappConsentGiven: z.boolean().optional(),
        whatsappConsentMethod: z.string().optional(),
        whatsappConsentLanguage: z.string().optional(),
        // Recording consent
        recordingConsentGiven: z.boolean().optional(),
        recordingConsentMethod: z.string().optional(),
        recordingConsentState: z.string().optional(),
        recordingConsentLanguage: z.string().optional(),
        // Medication reminders
        medicationRemindersEnabled: z.boolean().optional(),
        appointmentRemindersEnabled: z.boolean().optional(),
        labResultsAlertsEnabled: z.boolean().optional(),
    }).describe('Consent preferences to update'),
});

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type GetPatientConsentsInput = z.infer<typeof GetPatientConsentsSchema>;
type GetConsentInput = z.infer<typeof GetConsentSchema>;
type CreateConsentInput = z.infer<typeof CreateConsentSchema>;
type RevokeConsentInput = z.infer<typeof RevokeConsentSchema>;
type UpdateConsentPreferencesInput = z.infer<typeof UpdateConsentPreferencesSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate SHA-256 hash of consent content + signature for blockchain-ready audit
 */
function generateConsentHash(content: string, signature: string, timestamp: Date): string {
    const data = `${content}|${signature}|${timestamp.toISOString()}`;
    return createHash('sha256').update(data).digest('hex');
}

// =============================================================================
// TOOL: get_patient_consents
// =============================================================================

async function getPatientConsentsHandler(
    input: GetPatientConsentsInput,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const { page, limit } = input;
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

        if (input.type) {
            where.type = input.type;
        }

        if (input.isActive !== undefined) {
            where.isActive = input.isActive;
        }

        const [consents, total] = await Promise.all([
            prisma.consent.findMany({
                where,
                skip,
                take: limit,
                orderBy: { signedAt: 'desc' },
                select: {
                    id: true,
                    type: true,
                    title: true,
                    version: true,
                    signedAt: true,
                    isActive: true,
                    revokedAt: true,
                    expiresAt: true,
                    consentHash: true,
                    txHash: true,
                    createdAt: true,
                },
            }),
            prisma.consent.count({ where }),
        ]);

        // Count active vs revoked
        const activeCount = await prisma.consent.count({
            where: { ...where, isActive: true },
        });

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_patient_consents',
            patientId: input.patientId,
            resultCount: consents.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                patientId: input.patientId,
                consents: consents.map((c: any) => ({
                    id: c.id,
                    type: c.type,
                    title: c.title,
                    version: c.version,
                    signedAt: c.signedAt,
                    isActive: c.isActive,
                    revokedAt: c.revokedAt,
                    expiresAt: c.expiresAt,
                    consentHash: c.consentHash,
                    blockchainTxHash: c.txHash,
                })),
                summary: {
                    total,
                    active: activeCount,
                    revoked: total - activeCount,
                },
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'get_patient_consents_error', error, input });
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Failed to get patient consents',
        };
    }
}

// =============================================================================
// TOOL: get_consent
// =============================================================================

async function getConsentHandler(
    input: GetConsentInput,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const consent: any = await prisma.consent.findUnique({
            where: { id: input.consentId },
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

        if (!consent) {
            return {
                success: false,
                error: 'Consent not found',
                data: null,
            };
        }

        // Verify clinician has access to this patient
        if (consent.patient.assignedClinicianId !== context.clinicianId) {
            return {
                success: false,
                error: 'Access denied to this consent record',
                data: null,
            };
        }

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_consent',
            consentId: consent.id,
            patientId: consent.patientId,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                id: consent.id,
                patientId: consent.patientId,
                patient: {
                    id: consent.patient.id,
                    firstName: consent.patient.firstName,
                    lastName: consent.patient.lastName,
                },
                type: consent.type,
                title: consent.title,
                content: consent.content,
                version: consent.version,
                signedAt: consent.signedAt,
                witnessName: consent.witnessName,
                isActive: consent.isActive,
                revokedAt: consent.revokedAt,
                revokedReason: consent.revokedReason,
                expiresAt: consent.expiresAt,
                consentHash: consent.consentHash,
                blockchainTxHash: consent.txHash,
                blockTimestamp: consent.blockTimestamp,
                reminderSent: consent.reminderSent,
                reminderSentAt: consent.reminderSentAt,
                createdAt: consent.createdAt,
                updatedAt: consent.updatedAt,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_consent_error', error, input });
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Failed to get consent',
        };
    }
}

// =============================================================================
// TOOL: create_consent
// =============================================================================

async function createConsentHandler(
    input: CreateConsentInput,
    context: MCPContext
): Promise<MCPResult> {
    try {
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

        const signedAt = new Date();

        // Generate blockchain-ready hash
        const consentHash = generateConsentHash(input.content, input.signatureData, signedAt);

        // Check for duplicate hash (same consent already exists)
        const existingConsent = await prisma.consent.findUnique({
            where: { consentHash },
        });

        if (existingConsent) {
            return {
                success: false,
                error: 'This exact consent has already been recorded',
                data: null,
            };
        }

        // Create consent record
        const consent: any = await prisma.consent.create({
            data: {
                patientId: input.patientId,
                type: input.type,
                title: input.title,
                content: input.content,
                version: input.version,
                signatureData: input.signatureData,
                signedAt,
                witnessName: input.witnessName,
                witnessSignature: input.witnessSignature,
                expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
                consentHash,
                isActive: true,
            },
        });

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'create_consent',
            consentId: consent.id,
            patientId: input.patientId,
            type: input.type,
            consentHash,
            agentId: context.agentId,
            clinicianId: context.clinicianId,
        });

        return {
            success: true,
            data: {
                consentId: consent.id,
                patientId: consent.patientId,
                type: consent.type,
                title: consent.title,
                version: consent.version,
                signedAt: consent.signedAt,
                consentHash: consent.consentHash,
                expiresAt: consent.expiresAt,
                isActive: consent.isActive,
                message: 'Consent recorded successfully with blockchain-ready hash',
            },
        };
    } catch (error) {
        logger.error({ event: 'create_consent_error', error, input });
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Failed to create consent',
        };
    }
}

// =============================================================================
// TOOL: revoke_consent
// =============================================================================

async function revokeConsentHandler(
    input: RevokeConsentInput,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Get consent with patient to verify access
        const consent: any = await prisma.consent.findUnique({
            where: { id: input.consentId },
            include: {
                patient: {
                    select: {
                        id: true,
                        assignedClinicianId: true,
                    },
                },
            },
        });

        if (!consent) {
            return {
                success: false,
                error: 'Consent not found',
                data: null,
            };
        }

        if (consent.patient.assignedClinicianId !== context.clinicianId) {
            return {
                success: false,
                error: 'Access denied to this consent record',
                data: null,
            };
        }

        if (!consent.isActive) {
            return {
                success: false,
                error: 'Consent has already been revoked',
                data: null,
            };
        }

        // Revoke consent
        const revokedAt = new Date();
        const updatedConsent: any = await prisma.consent.update({
            where: { id: input.consentId },
            data: {
                isActive: false,
                revokedAt,
                revokedReason: input.reason,
            },
        });

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'revoke_consent',
            consentId: consent.id,
            patientId: consent.patientId,
            reason: input.reason,
            agentId: context.agentId,
            clinicianId: context.clinicianId,
        });

        return {
            success: true,
            data: {
                consentId: updatedConsent.id,
                patientId: updatedConsent.patientId,
                type: updatedConsent.type,
                title: updatedConsent.title,
                isActive: updatedConsent.isActive,
                revokedAt: updatedConsent.revokedAt,
                revokedReason: updatedConsent.revokedReason,
                message: 'Consent revoked successfully. This action is irreversible for LGPD/HIPAA compliance.',
            },
        };
    } catch (error) {
        logger.error({ event: 'revoke_consent_error', error, input });
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Failed to revoke consent',
        };
    }
}

// =============================================================================
// TOOL: update_consent_preferences
// =============================================================================

async function updateConsentPreferencesHandler(
    input: UpdateConsentPreferencesInput,
    context: MCPContext
): Promise<MCPResult> {
    try {
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

        // Build update data for patient record
        const updateData: any = {};
        const prefs = input.preferences;

        // WhatsApp consent
        if (prefs.whatsappConsentGiven !== undefined) {
            updateData.whatsappConsentGiven = prefs.whatsappConsentGiven;
            if (prefs.whatsappConsentGiven) {
                updateData.whatsappConsentDate = new Date();
            } else {
                updateData.whatsappConsentWithdrawnAt = new Date();
            }
        }
        if (prefs.whatsappConsentMethod !== undefined) updateData.whatsappConsentMethod = prefs.whatsappConsentMethod;
        if (prefs.whatsappConsentLanguage !== undefined) updateData.whatsappConsentLanguage = prefs.whatsappConsentLanguage;

        // Recording consent
        if (prefs.recordingConsentGiven !== undefined) {
            updateData.recordingConsentGiven = prefs.recordingConsentGiven;
            if (prefs.recordingConsentGiven) {
                updateData.recordingConsentDate = new Date();
            } else {
                updateData.recordingConsentWithdrawnAt = new Date();
            }
        }
        if (prefs.recordingConsentMethod !== undefined) updateData.recordingConsentMethod = prefs.recordingConsentMethod;
        if (prefs.recordingConsentState !== undefined) updateData.recordingConsentState = prefs.recordingConsentState;
        if (prefs.recordingConsentLanguage !== undefined) updateData.recordingConsentLanguage = prefs.recordingConsentLanguage;

        // Communication preferences
        if (prefs.medicationRemindersEnabled !== undefined) updateData.medicationRemindersEnabled = prefs.medicationRemindersEnabled;
        if (prefs.appointmentRemindersEnabled !== undefined) updateData.appointmentRemindersEnabled = prefs.appointmentRemindersEnabled;
        if (prefs.labResultsAlertsEnabled !== undefined) updateData.labResultsAlertsEnabled = prefs.labResultsAlertsEnabled;

        if (Object.keys(updateData).length === 0) {
            return {
                success: false,
                error: 'No preferences to update',
                data: null,
            };
        }

        // Update patient record
        const updatedPatient: any = await prisma.patient.update({
            where: { id: input.patientId },
            data: updateData,
            select: {
                id: true,
                whatsappConsentGiven: true,
                whatsappConsentDate: true,
                whatsappConsentMethod: true,
                recordingConsentGiven: true,
                recordingConsentDate: true,
                recordingConsentMethod: true,
                medicationRemindersEnabled: true,
                appointmentRemindersEnabled: true,
                labResultsAlertsEnabled: true,
                updatedAt: true,
            },
        });

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'update_consent_preferences',
            patientId: input.patientId,
            updatedFields: Object.keys(updateData),
            agentId: context.agentId,
            clinicianId: context.clinicianId,
        });

        return {
            success: true,
            data: {
                patientId: updatedPatient.id,
                updatedFields: Object.keys(updateData),
                currentPreferences: {
                    whatsapp: {
                        consentGiven: updatedPatient.whatsappConsentGiven,
                        consentDate: updatedPatient.whatsappConsentDate,
                        consentMethod: updatedPatient.whatsappConsentMethod,
                    },
                    recording: {
                        consentGiven: updatedPatient.recordingConsentGiven,
                        consentDate: updatedPatient.recordingConsentDate,
                        consentMethod: updatedPatient.recordingConsentMethod,
                    },
                    communications: {
                        medicationReminders: updatedPatient.medicationRemindersEnabled,
                        appointmentReminders: updatedPatient.appointmentRemindersEnabled,
                        labResultsAlerts: updatedPatient.labResultsAlertsEnabled,
                    },
                },
                updatedAt: updatedPatient.updatedAt,
                message: 'Consent preferences updated successfully',
            },
        };
    } catch (error) {
        logger.error({ event: 'update_consent_preferences_error', error, input });
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Failed to update consent preferences',
        };
    }
}

// =============================================================================
// EXPORT: Consent Tools
// =============================================================================

export const consentTools: MCPTool[] = [
    {
        name: 'get_patient_consents',
        description: 'Get all consent records for a patient with optional filters. Returns consent history for LGPD/HIPAA compliance.',
        category: 'consent',
        inputSchema: GetPatientConsentsSchema,
        requiredPermissions: ['patient:read', 'consent:read'],
        handler: getPatientConsentsHandler,
    },
    {
        name: 'get_consent',
        description: 'Get detailed information about a specific consent record including full content and blockchain hash.',
        category: 'consent',
        inputSchema: GetConsentSchema,
        requiredPermissions: ['patient:read', 'consent:read'],
        handler: getConsentHandler,
    },
    {
        name: 'create_consent',
        description: 'Create a new consent record with blockchain-ready hash for immutable audit trail.',
        category: 'consent',
        inputSchema: CreateConsentSchema,
        requiredPermissions: ['patient:read', 'consent:write'],
        handler: createConsentHandler,
    },
    {
        name: 'revoke_consent',
        description: 'Revoke a patient consent. This is an irreversible action for LGPD compliance. Requires a reason for audit trail.',
        category: 'consent',
        inputSchema: RevokeConsentSchema,
        requiredPermissions: ['patient:read', 'consent:write'],
        handler: revokeConsentHandler,
    },
    {
        name: 'update_consent_preferences',
        description: 'Update patient consent preferences for WhatsApp, recording, and communication settings.',
        category: 'consent',
        inputSchema: UpdateConsentPreferencesSchema,
        requiredPermissions: ['patient:read', 'consent:write'],
        handler: updateConsentPreferencesHandler,
    },
];

export const CONSENT_TOOL_COUNT = consentTools.length;
