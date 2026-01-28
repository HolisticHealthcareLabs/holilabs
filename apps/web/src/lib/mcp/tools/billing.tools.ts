/**
 * MCP Billing Tools
 *
 * REFACTORED: Decomposed into pure primitives per agent-native architecture audit.
 * Business logic (benefit calculations, cost splits) removed - agent orchestrates.
 *
 * Primitives:
 * - get_raw_insurance_data: Returns raw payer and plan data without calculations
 * - get_procedure_fees: Returns raw procedure costs without insurance split
 * - get_patient_insurance_info: Returns patient's insurance record
 *
 * Legacy (deprecated):
 * - verify_insurance: Still available but marked deprecated
 * - get_cost_estimate: Still available but marked deprecated
 *
 * Tools for AI agents to manage billing and claims:
 * - Submit claims
 * - Check claim status
 * - Verify insurance
 * - Get cost estimates
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// =============================================================================
// PRIMITIVE SCHEMAS
// =============================================================================

const GetRawInsuranceDataSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    serviceDate: z.string().optional().describe('Date of service (ISO 8601)'),
});

const GetProcedureFeesSchema = z.object({
    procedureCodes: z.array(z.string()).describe('CPT codes for procedures'),
    facilityType: z.enum(['HOSPITAL', 'OUTPATIENT', 'OFFICE']).optional().describe('Facility type for fee lookup'),
});

const GetPatientInsuranceInfoSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
});

// =============================================================================
// PRIMITIVE HANDLERS
// =============================================================================

// PRIMITIVE: get_raw_insurance_data
// Returns raw payer/plan data without benefit calculations
async function getRawInsuranceDataHandler(input: any, context: { userId: string }) {
    const { patientId, serviceDate } = input;

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_raw_insurance_data',
        patientId,
        serviceDate,
    });

    // Return raw insurance data - no calculations
    return {
        success: true,
        data: {
            patientId,
            asOfDate: serviceDate || new Date().toISOString(),
            payer: {
                payerId: 'EHI001',
                payerName: 'Example Health Insurance',
                payerType: 'COMMERCIAL',
            },
            plan: {
                planId: 'PLN-PPO-2025',
                planName: 'PPO Standard',
                planType: 'PPO',
                effectiveDate: '2025-01-01',
                terminationDate: null,
            },
            subscriber: {
                memberId: 'MEM-12345',
                groupNumber: 'GRP-67890',
                relationshipToPatient: 'SELF',
            },
            coverageDetails: {
                inNetworkDeductible: 1500,
                outOfNetworkDeductible: 3000,
                inNetworkOopMax: 6000,
                outOfNetworkOopMax: 12000,
                coinsurancePercent: 20,
            },
            copays: {
                primaryCare: 25,
                specialist: 50,
                urgentCare: 75,
                emergencyRoom: 250,
                genericRx: 10,
                brandRx: 35,
            },
            priorAuthServices: [
                'Advanced imaging (MRI, CT, PET)',
                'Specialty medications',
                'Durable medical equipment',
                'Inpatient admissions',
            ],
        },
    };
}

// PRIMITIVE: get_procedure_fees
// Returns raw procedure costs without insurance calculations
async function getProcedureFeesHandler(input: any, context: { userId: string }) {
    const { procedureCodes, facilityType } = input;

    // Mock fee schedule - in production would query actual fee schedule
    const fees = procedureCodes.map((code: string, index: number) => {
        const baseFee = 150 + (index * 75);
        return {
            cptCode: code,
            description: `Procedure ${code}`,
            facilityFee: facilityType === 'HOSPITAL' ? baseFee * 1.5 : baseFee,
            professionalFee: baseFee * 0.6,
            medicareRate: baseFee * 0.8,
            facilityType: facilityType || 'OFFICE',
        };
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_procedure_fees',
        procedureCount: procedureCodes.length,
        facilityType,
    });

    // Return raw fee data - no totals, no insurance split
    return {
        success: true,
        data: {
            procedureCodes,
            facilityType: facilityType || 'OFFICE',
            fees,
        },
    };
}

// PRIMITIVE: get_patient_insurance_info
// Returns patient's insurance record details
async function getPatientInsuranceInfoHandler(input: any, context: { userId: string }) {
    const { patientId } = input;

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_patient_insurance_info',
        patientId,
    });

    // Return raw insurance record
    return {
        success: true,
        data: {
            patientId,
            hasInsurance: true,
            primaryInsurance: {
                payerId: 'EHI001',
                payerName: 'Example Health Insurance',
                memberId: 'MEM-12345',
                groupNumber: 'GRP-67890',
                planType: 'PPO',
                effectiveDate: '2025-01-01',
                isActive: true,
            },
            secondaryInsurance: null,
            selfPay: false,
            lastVerified: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
    };
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const billingTools = [
    // ==========================================================================
    // PRIMITIVE TOOLS (Agent-native architecture)
    // ==========================================================================
    {
        name: 'get_raw_insurance_data',
        description: 'Get raw insurance payer, plan, and coverage data for a patient. No benefit calculations - returns raw data for agent to use.',
        inputSchema: GetRawInsuranceDataSchema,
        handler: getRawInsuranceDataHandler,
    },
    {
        name: 'get_procedure_fees',
        description: 'Get raw procedure fees from fee schedule. No insurance split calculations - returns base fees for agent to calculate.',
        inputSchema: GetProcedureFeesSchema,
        handler: getProcedureFeesHandler,
    },
    {
        name: 'get_patient_insurance_info',
        description: 'Get patient insurance record info (payer, member ID, plan type). Raw data only.',
        inputSchema: GetPatientInsuranceInfoSchema,
        handler: getPatientInsuranceInfoHandler,
    },
    // ==========================================================================
    // CLAIM TOOLS (Not deprecated - already primitive)
    // ==========================================================================
    {
        name: 'submit_claim',
        description: 'Submit an insurance claim for a patient encounter',
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            encounterId: z.string().describe('The encounter/visit ID'),
            diagnosisCodes: z.array(z.string()).describe('ICD-10 diagnosis codes'),
            procedureCodes: z.array(z.string()).describe('CPT/HCPCS procedure codes'),
            serviceDate: z.string().describe('Date of service (ISO 8601)'),
            placeOfService: z.string().default('11').describe('CMS place of service code'),
            modifiers: z.array(z.string()).optional().describe('CPT modifiers'),
        }),
        handler: async (input: any, context: { userId: string; clinicId: string }) => {
            const claimId = `CLM-${Date.now().toString(36).toUpperCase()}`;

            logger.info({
                event: 'claim_submitted_by_agent',
                claimId,
                patientId: input.patientId,
                encounterId: input.encounterId,
                diagnosisCodes: input.diagnosisCodes,
                procedureCodes: input.procedureCodes,
                userId: context.userId,
            });

            return {
                success: true,
                data: {
                    claimId,
                    patientId: input.patientId,
                    encounterId: input.encounterId,
                    status: 'SUBMITTED',
                    submittedAt: new Date().toISOString(),
                    diagnosisCodes: input.diagnosisCodes,
                    procedureCodes: input.procedureCodes,
                    estimatedProcessingDays: 14,
                },
            };
        },
    },

    {
        name: 'get_claim_status',
        description: 'Check the status of submitted insurance claims',
        inputSchema: z.object({
            claimId: z.string().optional().describe('Specific claim ID'),
            patientId: z.string().optional().describe('Get all claims for patient'),
            status: z.enum(['SUBMITTED', 'PENDING', 'APPROVED', 'DENIED', 'APPEALED']).optional(),
            startDate: z.string().optional(),
            limit: z.number().default(10),
        }),
        handler: async (input: any, context: { userId: string }) => {
            // Mock claim data
            const claims = [
                {
                    claimId: 'CLM-DEMO1',
                    encounterId: 'ENC-001',
                    status: 'APPROVED',
                    submittedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                    processedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    billedAmount: 450.00,
                    approvedAmount: 380.00,
                    patientResponsibility: 70.00,
                },
                {
                    claimId: 'CLM-DEMO2',
                    encounterId: 'ENC-002',
                    status: 'PENDING',
                    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    billedAmount: 1250.00,
                },
            ];

            let filtered = claims;
            if (input.status) {
                filtered = claims.filter(c => c.status === input.status);
            }

            return {
                success: true,
                data: {
                    claims: filtered.slice(0, input.limit),
                    count: filtered.length,
                },
            };
        },
    },

    // ==========================================================================
    // LEGACY TOOLS (Deprecated - use primitives)
    // ==========================================================================
    {
        name: 'verify_insurance',
        description: '[DEPRECATED: Use get_raw_insurance_data] Verify insurance with embedded benefit calculations.',
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            serviceDate: z.string().optional().describe('Date of service for eligibility check'),
            serviceType: z.enum(['MEDICAL', 'MENTAL_HEALTH', 'DENTAL', 'VISION', 'PHARMACY']).default('MEDICAL'),
        }),
        deprecated: true,
        alternatives: ['get_raw_insurance_data', 'get_patient_insurance_info'],
        handler: async (input: any, context: { userId: string }) => {
            logger.warn({
                event: 'deprecated_tool_called',
                tool: 'verify_insurance',
                message: 'Use get_raw_insurance_data primitive instead',
            });

            // Mock insurance verification
            return {
                success: true,
                data: {
                    patientId: input.patientId,
                    verified: true,
                    verifiedAt: new Date().toISOString(),
                    payer: {
                        name: 'Example Health Insurance',
                        payerId: 'EHI001',
                        planType: 'PPO',
                    },
                    eligibility: {
                        active: true,
                        effectiveDate: '2025-01-01',
                        terminationDate: null,
                    },
                    benefits: {
                        deductible: { individual: 1500, family: 3000, met: 750 },
                        outOfPocketMax: { individual: 6000, family: 12000, met: 1200 },
                        copay: { primaryCare: 25, specialist: 50, emergencyRoom: 250 },
                        coinsurance: 20,
                    },
                    priorAuthRequired: ['Advanced imaging', 'Specialty medications', 'DME'],
                },
            };
        },
    },

    {
        name: 'get_cost_estimate',
        description: '[DEPRECATED: Use get_procedure_fees + get_raw_insurance_data] Get cost estimate with embedded 80/20 split calculation.',
        inputSchema: z.object({
            patientId: z.string().describe('The patient UUID'),
            procedureCodes: z.array(z.string()).describe('CPT codes for procedures'),
            diagnosisCodes: z.array(z.string()).optional().describe('ICD-10 codes'),
            includeInsurance: z.boolean().default(true).describe('Calculate with insurance'),
        }),
        deprecated: true,
        alternatives: ['get_procedure_fees', 'get_raw_insurance_data'],
        handler: async (input: any, context: { userId: string }) => {
            logger.warn({
                event: 'deprecated_tool_called',
                tool: 'get_cost_estimate',
                message: 'Use get_procedure_fees + get_raw_insurance_data primitives instead',
            });

            // Mock cost estimate
            const procedures = input.procedureCodes.map((code: string, index: number) => ({
                code,
                description: `Procedure ${code}`,
                facilityFee: 200 + (index * 100),
                professionalFee: 150 + (index * 50),
            }));

            const totalCharge = procedures.reduce(
                (sum: number, p: any) => sum + p.facilityFee + p.professionalFee,
                0
            );

            const insuranceEstimate = input.includeInsurance ? {
                coveredAmount: totalCharge * 0.8,
                patientResponsibility: totalCharge * 0.2,
                appliedToDeductible: Math.min(totalCharge * 0.2, 750),
            } : null;

            return {
                success: true,
                data: {
                    patientId: input.patientId,
                    procedures,
                    totalCharge,
                    insuranceEstimate,
                    disclaimer: 'This is an estimate only. Actual costs may vary based on services provided.',
                    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                },
            };
        },
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const BILLING_TOOL_COUNT = billingTools.length;
