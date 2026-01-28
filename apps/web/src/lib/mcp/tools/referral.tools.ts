/**
 * MCP Referral Tools
 * 
 * Tools for AI agents to manage patient referrals:
 * - Create referrals
 * - Track referral status
 * - Get referral history
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// =============================================================================
// SPECIALTY DEFINITIONS
// =============================================================================

const SPECIALTIES = [
    'Cardiology', 'Pulmonology', 'Endocrinology', 'Gastroenterology',
    'Neurology', 'Nephrology', 'Rheumatology', 'Oncology', 'Hematology',
    'Dermatology', 'Ophthalmology', 'Orthopedics', 'Psychiatry', 'Psychology',
    'Physical Therapy', 'Occupational Therapy', 'Speech Therapy',
    'General Surgery', 'Urology', 'Gynecology', 'Allergy/Immunology',
];

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const referralTools = [
    {
        name: 'create_referral',
        description: 'Create a specialist referral for a patient',
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            specialty: z.string().describe('Medical specialty (e.g., Cardiology, Endocrinology)'),
            priority: z.enum(['ROUTINE', 'URGENT', 'EMERGENT']).default('ROUTINE'),
            reason: z.string().describe('Clinical reason for referral'),
            preferredProvider: z.string().optional().describe('Preferred specialist name/ID'),
            clinicalNotes: z.string().optional().describe('Clinical notes for the specialist'),
            attachDiagnoses: z.boolean().default(true).describe('Include patient diagnoses'),
            attachMedications: z.boolean().default(true).describe('Include current medications'),
            attachLabResults: z.boolean().default(false).describe('Include recent lab results'),
        }),
        handler: async (input: any, context: { userId: string; clinicId: string }) => {
            if (!SPECIALTIES.includes(input.specialty)) {
                return {
                    success: false,
                    error: `Unknown specialty. Available: ${SPECIALTIES.join(', ')}`
                };
            }

            const referralId = `REF-${Date.now().toString(36).toUpperCase()}`;

            logger.info({
                event: 'referral_created_by_agent',
                referralId,
                patientId: input.patientId,
                specialty: input.specialty,
                priority: input.priority,
                userId: context.userId,
            });

            return {
                success: true,
                data: {
                    referralId,
                    patientId: input.patientId,
                    specialty: input.specialty,
                    priority: input.priority,
                    reason: input.reason,
                    status: 'PENDING',
                    createdAt: new Date().toISOString(),
                    attachments: {
                        diagnoses: input.attachDiagnoses,
                        medications: input.attachMedications,
                        labResults: input.attachLabResults,
                    },
                },
            };
        },
    },

    {
        name: 'get_referral_status',
        description: 'Get the status of a referral',
        inputSchema: z.object({
            referralId: z.string().optional().describe('Specific referral ID'),
            patientId: z.string().optional().describe('Get all referrals for patient'),
            status: z.enum(['PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
            limit: z.number().default(10),
        }),
        handler: async (input: any, context: { userId: string }) => {
            // Mock referral data
            const referrals = [
                {
                    referralId: 'REF-DEMO1',
                    specialty: 'Cardiology',
                    referredTo: 'Dr. Heart',
                    reason: 'Elevated cardiovascular risk, family history',
                    status: 'SCHEDULED',
                    appointmentDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                },
                {
                    referralId: 'REF-DEMO2',
                    specialty: 'Endocrinology',
                    referredTo: 'Dr. Gland',
                    reason: 'Poorly controlled HbA1c despite medication adjustment',
                    status: 'PENDING',
                    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                },
            ];

            let filtered = referrals;
            if (input.status) {
                filtered = referrals.filter(r => r.status === input.status);
            }

            return {
                success: true,
                data: {
                    referrals: filtered.slice(0, input.limit),
                    count: filtered.length,
                },
            };
        },
    },

    {
        name: 'update_referral',
        description: 'Update referral status or add notes',
        inputSchema: z.object({
            referralId: z.string().describe('The referral ID'),
            status: z.enum(['PENDING', 'ACCEPTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
            notes: z.string().optional().describe('Add notes to referral'),
            specialistResponse: z.string().optional().describe('Response from specialist'),
            appointmentDate: z.string().optional().describe('Scheduled appointment date'),
        }),
        handler: async (input: any, context: { userId: string }) => {
            logger.info({
                event: 'referral_updated_by_agent',
                referralId: input.referralId,
                newStatus: input.status,
                userId: context.userId,
            });

            return {
                success: true,
                data: {
                    referralId: input.referralId,
                    status: input.status || 'UPDATED',
                    notes: input.notes,
                    specialistResponse: input.specialistResponse,
                    appointmentDate: input.appointmentDate,
                    updatedAt: new Date().toISOString(),
                },
            };
        },
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const REFERRAL_TOOL_COUNT = referralTools.length;
export { SPECIALTIES };
