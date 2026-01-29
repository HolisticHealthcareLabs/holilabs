/**
 * MCP Billing Tools
 *
 * REFACTORED: Real Prisma CRUD operations per agent-native architecture.
 *
 * Primitives:
 * - get_patient_insurance: Get patient's insurance record from database
 * - create_patient_insurance: Add insurance coverage for a patient
 * - update_patient_insurance: Update insurance details
 * - submit_claim: Submit an insurance claim (stored in database)
 * - get_claim: Get a specific claim by ID
 * - list_claims: List claims with filtering
 * - update_claim_status: Update claim status (processed, paid, denied)
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// SCHEMAS
// =============================================================================

const GetPatientInsuranceSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    insuranceType: z.enum(['PRIMARY', 'SECONDARY', 'TERTIARY']).optional().describe('Filter by insurance type'),
});

const CreatePatientInsuranceSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    insuranceType: z.enum(['PRIMARY', 'SECONDARY', 'TERTIARY']).default('PRIMARY'),
    payerId: z.string().describe('Payer identifier'),
    payerName: z.string().describe('Payer name'),
    payerType: z.enum(['COMMERCIAL', 'MEDICARE', 'MEDICAID', 'VA', 'OTHER']).default('COMMERCIAL'),
    planId: z.string().describe('Plan identifier'),
    planName: z.string().describe('Plan name'),
    planType: z.enum(['PPO', 'HMO', 'EPO', 'POS', 'HDHP']).default('PPO'),
    memberId: z.string().describe('Member ID on insurance card'),
    groupNumber: z.string().optional().describe('Group number'),
    subscriberName: z.string().optional().describe('Policy holder name'),
    relationshipToPatient: z.enum(['SELF', 'SPOUSE', 'CHILD', 'OTHER']).default('SELF'),
    effectiveDate: z.string().describe('Coverage effective date (ISO 8601)'),
    terminationDate: z.string().optional().describe('Coverage end date (ISO 8601)'),
    inNetworkDeductible: z.number().optional().describe('In-network deductible in cents'),
    outOfNetworkDeductible: z.number().optional().describe('Out-of-network deductible in cents'),
    coinsurancePercent: z.number().optional().describe('Coinsurance percentage (e.g., 20)'),
    copayPrimaryCare: z.number().optional().describe('Primary care copay in cents'),
    copaySpecialist: z.number().optional().describe('Specialist copay in cents'),
});

const UpdatePatientInsuranceSchema = z.object({
    insuranceId: z.string().describe('The insurance record UUID'),
    isVerified: z.boolean().optional().describe('Verification status'),
    verificationNote: z.string().optional().describe('Verification notes'),
    isActive: z.boolean().optional().describe('Active status'),
    terminationDate: z.string().optional().describe('Coverage end date (ISO 8601)'),
    inNetworkDeductible: z.number().optional().describe('In-network deductible in cents'),
    coinsurancePercent: z.number().optional().describe('Coinsurance percentage'),
});

const SubmitClaimSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    patientInsuranceId: z.string().optional().describe('Insurance record to bill'),
    encounterId: z.string().optional().describe('Encounter/visit ID'),
    diagnosisCodes: z.array(z.string()).describe('ICD-10 diagnosis codes'),
    procedureCodes: z.array(z.object({
        code: z.string().describe('CPT/HCPCS code'),
        modifier: z.string().optional().describe('CPT modifier'),
        units: z.number().default(1).describe('Service units'),
        chargeAmount: z.number().describe('Charge amount in cents'),
    })).describe('Procedure codes with charges'),
    serviceDate: z.string().describe('Date of service (ISO 8601)'),
    placeOfService: z.string().default('11').describe('CMS place of service code'),
    billedAmount: z.number().describe('Total billed amount in cents'),
    notes: z.string().optional().describe('Claim notes'),
});

const GetClaimSchema = z.object({
    claimId: z.string().describe('The claim UUID or claim number'),
});

const ListClaimsSchema = z.object({
    patientId: z.string().optional().describe('Filter by patient'),
    status: z.enum(['DRAFT', 'SUBMITTED', 'PENDING', 'IN_REVIEW', 'APPROVED', 'PAID', 'DENIED', 'APPEALED', 'VOIDED']).optional(),
    startDate: z.string().optional().describe('Filter claims submitted after this date'),
    endDate: z.string().optional().describe('Filter claims submitted before this date'),
    limit: z.number().default(20).describe('Maximum results to return'),
    offset: z.number().default(0).describe('Pagination offset'),
});

const UpdateClaimStatusSchema = z.object({
    claimId: z.string().describe('The claim UUID'),
    status: z.enum(['PENDING', 'IN_REVIEW', 'APPROVED', 'PAID', 'DENIED', 'APPEALED', 'VOIDED']).describe('New status'),
    allowedAmount: z.number().optional().describe('Amount allowed by payer in cents'),
    paidAmount: z.number().optional().describe('Amount paid by payer in cents'),
    adjustmentAmount: z.number().optional().describe('Contractual adjustments in cents'),
    patientResponsibility: z.number().optional().describe('Patient share in cents'),
    denialCode: z.string().optional().describe('Denial code if denied'),
    denialReason: z.string().optional().describe('Denial reason'),
    notes: z.string().optional().describe('Processing notes'),
});

// =============================================================================
// HANDLERS
// =============================================================================

async function getPatientInsuranceHandler(
    input: z.infer<typeof GetPatientInsuranceSchema>,
    context: MCPContext
): Promise<MCPResult> {
    const { patientId, insuranceType } = input;

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_patient_insurance',
        patientId,
        insuranceType,
    });

    const insuranceRecords = await prisma.patientInsurance.findMany({
        where: {
            patientId,
            ...(insuranceType && { insuranceType }),
        },
        orderBy: {
            insuranceType: 'asc',
        },
    });

    return {
        success: true,
        data: {
            patientId,
            hasInsurance: insuranceRecords.length > 0,
            insuranceRecords: insuranceRecords.map(record => ({
                id: record.id,
                insuranceType: record.insuranceType,
                payer: {
                    payerId: record.payerId,
                    payerName: record.payerName,
                    payerType: record.payerType,
                },
                plan: {
                    planId: record.planId,
                    planName: record.planName,
                    planType: record.planType,
                },
                subscriber: {
                    memberId: record.memberId,
                    groupNumber: record.groupNumber,
                    subscriberName: record.subscriberName,
                    relationshipToPatient: record.relationshipToPatient,
                },
                coverage: {
                    effectiveDate: record.effectiveDate.toISOString(),
                    terminationDate: record.terminationDate?.toISOString() || null,
                    isActive: record.isActive,
                },
                benefits: {
                    inNetworkDeductible: record.inNetworkDeductible,
                    outOfNetworkDeductible: record.outOfNetworkDeductible,
                    inNetworkOopMax: record.inNetworkOopMax,
                    outOfNetworkOopMax: record.outOfNetworkOopMax,
                    coinsurancePercent: record.coinsurancePercent,
                },
                copays: {
                    primaryCare: record.copayPrimaryCare,
                    specialist: record.copaySpecialist,
                    urgentCare: record.copayUrgentCare,
                    emergencyRoom: record.copayEmergencyRoom,
                    genericRx: record.copayGenericRx,
                    brandRx: record.copayBrandRx,
                },
                verification: {
                    isVerified: record.isVerified,
                    lastVerifiedAt: record.lastVerifiedAt?.toISOString() || null,
                    verificationNote: record.verificationNote,
                },
            })),
            count: insuranceRecords.length,
        },
    };
}

async function createPatientInsuranceHandler(
    input: z.infer<typeof CreatePatientInsuranceSchema>,
    context: MCPContext
): Promise<MCPResult> {
    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_patient_insurance',
        patientId: input.patientId,
        insuranceType: input.insuranceType,
    });

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
        where: { id: input.patientId },
    });

    if (!patient) {
        return {
            success: false,
            error: `Patient not found: ${input.patientId}`,
            data: null,
        };
    }

    const insurance = await prisma.patientInsurance.create({
        data: {
            patientId: input.patientId,
            insuranceType: input.insuranceType,
            payerId: input.payerId,
            payerName: input.payerName,
            payerType: input.payerType,
            planId: input.planId,
            planName: input.planName,
            planType: input.planType,
            memberId: input.memberId,
            groupNumber: input.groupNumber,
            subscriberName: input.subscriberName,
            relationshipToPatient: input.relationshipToPatient,
            effectiveDate: new Date(input.effectiveDate),
            terminationDate: input.terminationDate ? new Date(input.terminationDate) : null,
            inNetworkDeductible: input.inNetworkDeductible,
            outOfNetworkDeductible: input.outOfNetworkDeductible,
            coinsurancePercent: input.coinsurancePercent,
            copayPrimaryCare: input.copayPrimaryCare,
            copaySpecialist: input.copaySpecialist,
        },
    });

    return {
        success: true,
        data: {
            id: insurance.id,
            patientId: insurance.patientId,
            insuranceType: insurance.insuranceType,
            payerName: insurance.payerName,
            planName: insurance.planName,
            memberId: insurance.memberId,
            effectiveDate: insurance.effectiveDate.toISOString(),
            createdAt: insurance.createdAt.toISOString(),
        },
    };
}

async function updatePatientInsuranceHandler(
    input: z.infer<typeof UpdatePatientInsuranceSchema>,
    context: MCPContext
): Promise<MCPResult> {
    const { insuranceId, ...updates } = input;

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_patient_insurance',
        insuranceId,
    });

    const existing = await prisma.patientInsurance.findUnique({
        where: { id: insuranceId },
    });

    if (!existing) {
        return {
            success: false,
            error: `Insurance record not found: ${insuranceId}`,
            data: null,
        };
    }

    const insurance = await prisma.patientInsurance.update({
        where: { id: insuranceId },
        data: {
            ...(updates.isVerified !== undefined && {
                isVerified: updates.isVerified,
                lastVerifiedAt: updates.isVerified ? new Date() : existing.lastVerifiedAt,
            }),
            ...(updates.verificationNote && { verificationNote: updates.verificationNote }),
            ...(updates.isActive !== undefined && { isActive: updates.isActive }),
            ...(updates.terminationDate && { terminationDate: new Date(updates.terminationDate) }),
            ...(updates.inNetworkDeductible !== undefined && { inNetworkDeductible: updates.inNetworkDeductible }),
            ...(updates.coinsurancePercent !== undefined && { coinsurancePercent: updates.coinsurancePercent }),
        },
    });

    return {
        success: true,
        data: {
            id: insurance.id,
            patientId: insurance.patientId,
            isVerified: insurance.isVerified,
            isActive: insurance.isActive,
            updatedAt: insurance.updatedAt.toISOString(),
        },
    };
}

async function submitClaimHandler(
    input: z.infer<typeof SubmitClaimSchema>,
    context: MCPContext
): Promise<MCPResult> {
    logger.info({
        event: 'mcp_tool_executed',
        tool: 'submit_claim',
        patientId: input.patientId,
        encounterId: input.encounterId,
    });

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
        where: { id: input.patientId },
    });

    if (!patient) {
        return {
            success: false,
            error: `Patient not found: ${input.patientId}`,
            data: null,
        };
    }

    // Generate claim number
    const year = new Date().getFullYear();
    const count = await prisma.insuranceClaim.count({
        where: {
            claimNumber: {
                startsWith: `CLM-${year}`,
            },
        },
    });
    const claimNumber = `CLM-${year}-${String(count + 1).padStart(5, '0')}`;

    const claim = await prisma.insuranceClaim.create({
        data: {
            patientId: input.patientId,
            patientInsuranceId: input.patientInsuranceId,
            encounterId: input.encounterId,
            claimNumber,
            serviceDate: new Date(input.serviceDate),
            placeOfService: input.placeOfService,
            diagnosisCodes: input.diagnosisCodes,
            procedureCodes: input.procedureCodes,
            billedAmount: input.billedAmount,
            status: 'SUBMITTED',
            notes: input.notes,
            createdBy: context.clinicianId,
        },
    });

    logger.info({
        event: 'claim_submitted',
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        patientId: input.patientId,
        billedAmount: input.billedAmount,
        userId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            claimId: claim.id,
            claimNumber: claim.claimNumber,
            patientId: claim.patientId,
            encounterId: claim.encounterId,
            status: claim.status,
            billedAmount: claim.billedAmount,
            serviceDate: claim.serviceDate.toISOString(),
            submittedAt: claim.submittedAt.toISOString(),
            diagnosisCodes: claim.diagnosisCodes,
            procedureCodes: claim.procedureCodes,
        },
    };
}

async function getClaimHandler(
    input: z.infer<typeof GetClaimSchema>,
    context: MCPContext
): Promise<MCPResult> {
    const { claimId } = input;

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_claim',
        claimId,
    });

    // Try to find by ID or claim number
    const claim = await prisma.insuranceClaim.findFirst({
        where: {
            OR: [
                { id: claimId },
                { claimNumber: claimId },
            ],
        },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    mrn: true,
                },
            },
            patientInsurance: {
                select: {
                    payerName: true,
                    planName: true,
                    memberId: true,
                },
            },
        },
    });

    if (!claim) {
        return {
            success: false,
            error: `Claim not found: ${claimId}`,
            data: null,
        };
    }

    return {
        success: true,
        data: {
            claimId: claim.id,
            claimNumber: claim.claimNumber,
            externalClaimId: claim.externalClaimId,
            status: claim.status,
            claimType: claim.claimType,
            patient: claim.patient,
            insurance: claim.patientInsurance,
            serviceDate: claim.serviceDate.toISOString(),
            placeOfService: claim.placeOfService,
            diagnosisCodes: claim.diagnosisCodes,
            procedureCodes: claim.procedureCodes,
            financials: {
                billedAmount: claim.billedAmount,
                allowedAmount: claim.allowedAmount,
                paidAmount: claim.paidAmount,
                adjustmentAmount: claim.adjustmentAmount,
                patientResponsibility: claim.patientResponsibility,
                deductibleApplied: claim.deductibleApplied,
                coinsuranceAmount: claim.coinsuranceAmount,
                copayAmount: claim.copayAmount,
            },
            denial: claim.denialCode ? {
                code: claim.denialCode,
                reason: claim.denialReason,
            } : null,
            dates: {
                submittedAt: claim.submittedAt.toISOString(),
                processedAt: claim.processedAt?.toISOString() || null,
                paidAt: claim.paidAt?.toISOString() || null,
                appealedAt: claim.appealedAt?.toISOString() || null,
            },
            appeal: claim.appealStatus ? {
                status: claim.appealStatus,
                note: claim.appealNote,
            } : null,
            notes: claim.notes,
        },
    };
}

async function listClaimsHandler(
    input: z.infer<typeof ListClaimsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    const { patientId, status, startDate, endDate, limit, offset } = input;

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'list_claims',
        patientId,
        status,
    });

    const where = {
        ...(patientId && { patientId }),
        ...(status && { status }),
        ...(startDate || endDate ? {
            submittedAt: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
            },
        } : {}),
    };

    const [claims, total] = await Promise.all([
        prisma.insuranceClaim.findMany({
            where,
            include: {
                patient: {
                    select: {
                        firstName: true,
                        lastName: true,
                        mrn: true,
                    },
                },
                patientInsurance: {
                    select: {
                        payerName: true,
                    },
                },
            },
            orderBy: {
                submittedAt: 'desc',
            },
            take: limit,
            skip: offset,
        }),
        prisma.insuranceClaim.count({ where }),
    ]);

    return {
        success: true,
        data: {
            claims: claims.map(claim => ({
                claimId: claim.id,
                claimNumber: claim.claimNumber,
                status: claim.status,
                patient: {
                    name: `${claim.patient.firstName} ${claim.patient.lastName}`,
                    mrn: claim.patient.mrn,
                },
                payerName: claim.patientInsurance?.payerName || 'Self-Pay',
                serviceDate: claim.serviceDate.toISOString(),
                billedAmount: claim.billedAmount,
                paidAmount: claim.paidAmount,
                patientResponsibility: claim.patientResponsibility,
                submittedAt: claim.submittedAt.toISOString(),
                processedAt: claim.processedAt?.toISOString() || null,
            })),
            total,
            limit,
            offset,
            hasMore: offset + claims.length < total,
        },
    };
}

async function updateClaimStatusHandler(
    input: z.infer<typeof UpdateClaimStatusSchema>,
    context: MCPContext
): Promise<MCPResult> {
    const { claimId, status, ...updates } = input;

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_claim_status',
        claimId,
        status,
    });

    const existing = await prisma.insuranceClaim.findUnique({
        where: { id: claimId },
    });

    if (!existing) {
        return {
            success: false,
            error: `Claim not found: ${claimId}`,
            data: null,
        };
    }

    const now = new Date();
    const claim = await prisma.insuranceClaim.update({
        where: { id: claimId },
        data: {
            status,
            ...(updates.allowedAmount !== undefined && { allowedAmount: updates.allowedAmount }),
            ...(updates.paidAmount !== undefined && { paidAmount: updates.paidAmount }),
            ...(updates.adjustmentAmount !== undefined && { adjustmentAmount: updates.adjustmentAmount }),
            ...(updates.patientResponsibility !== undefined && { patientResponsibility: updates.patientResponsibility }),
            ...(updates.denialCode && { denialCode: updates.denialCode }),
            ...(updates.denialReason && { denialReason: updates.denialReason }),
            ...(updates.notes && { notes: updates.notes }),
            // Set timestamps based on status
            ...(status === 'APPROVED' || status === 'DENIED' ? { processedAt: now } : {}),
            ...(status === 'PAID' ? { paidAt: now } : {}),
            ...(status === 'APPEALED' ? { appealedAt: now, appealStatus: 'PENDING' } : {}),
        },
    });

    logger.info({
        event: 'claim_status_updated',
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        previousStatus: existing.status,
        newStatus: claim.status,
        userId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            claimId: claim.id,
            claimNumber: claim.claimNumber,
            status: claim.status,
            previousStatus: existing.status,
            financials: {
                billedAmount: claim.billedAmount,
                allowedAmount: claim.allowedAmount,
                paidAmount: claim.paidAmount,
                patientResponsibility: claim.patientResponsibility,
            },
            processedAt: claim.processedAt?.toISOString() || null,
            paidAt: claim.paidAt?.toISOString() || null,
            updatedAt: claim.updatedAt.toISOString(),
        },
    };
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const billingTools: MCPTool[] = [
    // Patient Insurance CRUD
    {
        name: 'get_patient_insurance',
        description: 'Get patient insurance records from database. Returns payer, plan, subscriber, benefits, copays, and verification status.',
        category: 'billing',
        requiredPermissions: ['billing:read'],
        inputSchema: GetPatientInsuranceSchema,
        handler: getPatientInsuranceHandler,
    },
    {
        name: 'create_patient_insurance',
        description: 'Add insurance coverage for a patient. Creates a new insurance record with payer, plan, and benefit details.',
        category: 'billing',
        requiredPermissions: ['billing:write'],
        inputSchema: CreatePatientInsuranceSchema,
        handler: createPatientInsuranceHandler,
    },
    {
        name: 'update_patient_insurance',
        description: 'Update patient insurance details including verification status, coverage dates, and benefit amounts.',
        category: 'billing',
        requiredPermissions: ['billing:write'],
        inputSchema: UpdatePatientInsuranceSchema,
        handler: updatePatientInsuranceHandler,
    },

    // Insurance Claims CRUD
    {
        name: 'submit_claim',
        description: 'Submit an insurance claim for a patient encounter. Stores claim with diagnosis codes, procedure codes, and billed amount.',
        category: 'billing',
        requiredPermissions: ['billing:write', 'claims:submit'],
        inputSchema: SubmitClaimSchema,
        handler: submitClaimHandler,
    },
    {
        name: 'get_claim',
        description: 'Get a specific insurance claim by ID or claim number. Returns full claim details including financials and status.',
        category: 'billing',
        requiredPermissions: ['billing:read'],
        inputSchema: GetClaimSchema,
        handler: getClaimHandler,
    },
    {
        name: 'list_claims',
        description: 'List insurance claims with filtering by patient, status, and date range. Supports pagination.',
        category: 'billing',
        requiredPermissions: ['billing:read'],
        inputSchema: ListClaimsSchema,
        handler: listClaimsHandler,
    },
    {
        name: 'update_claim_status',
        description: 'Update claim status and financials (approved, paid, denied). Records allowed amount, paid amount, and denial information.',
        category: 'billing',
        requiredPermissions: ['billing:write', 'claims:update'],
        inputSchema: UpdateClaimStatusSchema,
        handler: updateClaimStatusHandler,
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const BILLING_TOOL_COUNT = billingTools.length;
