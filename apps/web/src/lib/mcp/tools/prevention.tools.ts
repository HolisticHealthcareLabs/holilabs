/**
 * MCP Prevention Tools
 *
 * Tools for prevention plan and screening management.
 * Supports the Prevention Hub feature with real-time detection and risk stratification.
 *
 * CRUD Operations:
 * - create_prevention_plan: Create a new prevention plan for a patient
 * - get_prevention_plan: Get a prevention plan by ID
 * - list_prevention_plans: List prevention plans with filters
 * - update_prevention_plan: Update prevention plan details
 *
 * Screening Operations:
 * - add_screening: Add a screening to a prevention plan
 * - complete_screening: Mark a screening as completed with results
 * - get_due_screenings: Get screenings due for a patient
 *
 * Task Operations:
 * - create_prevention_task: Create a preventive care reminder/task
 * - update_prevention_task: Update task status or details
 *
 * AI Operations:
 * - get_prevention_recommendations: Get AI-generated prevention recommendations
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPContext, MCPResult, MCPTool } from '../types';

// =============================================================================
// ENUMS MATCHING PRISMA SCHEMA
// =============================================================================

const PreventionPlanTypeEnum = z.enum([
    'CARDIOVASCULAR',
    'DIABETES',
    'HYPERTENSION',
    'OBESITY',
    'CANCER_SCREENING',
    'IMMUNIZATION',
    'GENERAL_WELLNESS',
    'COMPREHENSIVE',
]);

const PreventionPlanStatusEnum = z.enum([
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'DEACTIVATED',
    'ARCHIVED',
]);

const PreventiveCareTypeEnum = z.enum([
    'MAMMOGRAM',
    'COLONOSCOPY',
    'CERVICAL_CANCER',
    'PROSTATE_CANCER',
    'LUNG_CANCER',
    'SKIN_CANCER',
    'BLOOD_PRESSURE',
    'CHOLESTEROL',
    'DIABETES_SCREENING',
    'INFLUENZA',
    'COVID19',
    'PNEUMONIA',
    'SHINGLES',
    'TDAP',
    'HEPATITIS',
    'EYE_EXAM',
    'HEARING_TEST',
    'BONE_DENSITY',
    'DENTAL_CLEANING',
    'STI_SCREENING',
    'DEPRESSION_SCREENING',
    'OTHER',
]);

const PreventiveCareStatusEnum = z.enum([
    'DUE',
    'OVERDUE',
    'SCHEDULED',
    'COMPLETED',
    'NOT_INDICATED',
    'DECLINED',
    'DISMISSED',
]);

const PriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

// =============================================================================
// SCHEMAS
// =============================================================================

const CreatePreventionPlanSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    planName: z.string().describe('Plan name (e.g., "Cardiovascular Disease Prevention Plan")'),
    planType: PreventionPlanTypeEnum.describe('Type of prevention plan'),
    description: z.string().optional().describe('Detailed description of the plan'),
    goals: z.array(z.object({
        goal: z.string(),
        targetDate: z.string().optional(),
        status: z.string().default('pending'),
        category: z.string().optional(),
    })).describe('Array of goals with targets'),
    recommendations: z.array(z.object({
        title: z.string(),
        description: z.string(),
        priority: z.string().optional(),
        category: z.string().optional(),
    })).describe('Array of clinical recommendations'),
    guidelineSource: z.string().optional().describe('Source guideline (USPSTF, ADA, AHA, ACC)'),
    evidenceLevel: z.string().optional().describe('Evidence grade (A, B, C)'),
    lifestyleChanges: z.string().optional().describe('Recommended lifestyle modifications'),
    medicationChanges: z.string().optional().describe('Recommended medication changes'),
    screeningSchedule: z.any().optional().describe('Preventive screenings schedule'),
    followUpSchedule: z.any().optional().describe('Follow-up cadence'),
});

const GetPreventionPlanSchema = z.object({
    planId: z.string().describe('The prevention plan ID'),
    includeVersionHistory: z.boolean().default(false).describe('Include version history'),
    includeReminders: z.boolean().default(true).describe('Include associated reminders'),
});

const ListPreventionPlansSchema = z.object({
    patientId: z.string().optional().describe('Filter by patient ID'),
    planType: PreventionPlanTypeEnum.optional().describe('Filter by plan type'),
    status: PreventionPlanStatusEnum.optional().describe('Filter by status'),
    startDate: z.string().optional().describe('Plans created after this date (ISO 8601)'),
    endDate: z.string().optional().describe('Plans created before this date (ISO 8601)'),
    limit: z.number().min(1).max(100).default(20).describe('Maximum results'),
    offset: z.number().min(0).default(0).describe('Offset for pagination'),
});

const UpdatePreventionPlanSchema = z.object({
    planId: z.string().describe('The prevention plan ID to update'),
    planName: z.string().optional().describe('Updated plan name'),
    description: z.string().optional().describe('Updated description'),
    status: PreventionPlanStatusEnum.optional().describe('Updated status'),
    goals: z.array(z.object({
        goal: z.string(),
        targetDate: z.string().optional(),
        status: z.string(),
        category: z.string().optional(),
    })).optional().describe('Updated goals'),
    recommendations: z.array(z.object({
        title: z.string(),
        description: z.string(),
        priority: z.string().optional(),
        category: z.string().optional(),
    })).optional().describe('Updated recommendations'),
    lifestyleChanges: z.string().optional().describe('Updated lifestyle recommendations'),
    medicationChanges: z.string().optional().describe('Updated medication recommendations'),
    changeReason: z.string().optional().describe('Reason for the update (for audit)'),
});

const AddScreeningSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    preventionPlanId: z.string().optional().describe('Optional: Link to a prevention plan'),
    screeningType: z.string().describe('Type of screening (mammogram, colonoscopy, etc.)'),
    screeningCode: z.string().optional().describe('SNOMED or CPT code'),
    description: z.string().optional().describe('Screening description'),
    scheduledDate: z.string().describe('Scheduled date (ISO 8601)'),
    dueDate: z.string().optional().describe('Due date (ISO 8601)'),
    orderingProvider: z.string().optional().describe('Provider who ordered the screening'),
    facility: z.string().optional().describe('Facility where screening will be performed'),
    notes: z.string().optional().describe('Additional notes'),
});

const CompleteScreeningSchema = z.object({
    screeningId: z.string().describe('The screening outcome ID'),
    completedDate: z.string().describe('Completion date (ISO 8601)'),
    result: z.enum(['normal', 'abnormal', 'inconclusive', 'needs_followup']).describe('Screening result'),
    resultDetails: z.any().optional().describe('Detailed findings (JSON)'),
    resultDocumentId: z.string().optional().describe('Link to result document'),
    performedBy: z.string().optional().describe('Provider who performed the screening'),
    notes: z.string().optional().describe('Result notes'),
    followUpRecommended: z.boolean().default(false).describe('Whether follow-up is recommended'),
    followUpScheduledFor: z.string().optional().describe('Follow-up date if recommended'),
});

const GetDueScreeningsSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    includeOverdue: z.boolean().default(true).describe('Include overdue screenings'),
    screeningTypes: z.array(z.string()).optional().describe('Filter by specific screening types'),
    limit: z.number().min(1).max(100).default(20).describe('Maximum results'),
});

const CreatePreventionTaskSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    preventionPlanId: z.string().optional().describe('Optional: Link to a prevention plan'),
    screeningType: PreventiveCareTypeEnum.describe('Type of preventive care'),
    title: z.string().describe('Task title (e.g., "Mammogram Screening")'),
    description: z.string().optional().describe('Why this is recommended'),
    dueDate: z.string().describe('Due date (ISO 8601)'),
    priority: PriorityEnum.default('MEDIUM').describe('Task priority'),
    guidelineSource: z.string().optional().describe('Source guideline (USPSTF, ADA, etc.)'),
    evidenceLevel: z.string().optional().describe('Evidence grade'),
    recurringInterval: z.number().optional().describe('Months until next occurrence'),
    goalIndex: z.number().optional().describe('Index of goal in prevention plan'),
});

const UpdatePreventionTaskSchema = z.object({
    taskId: z.string().describe('The preventive care reminder ID'),
    status: PreventiveCareStatusEnum.optional().describe('Updated status'),
    dueDate: z.string().optional().describe('Updated due date'),
    priority: PriorityEnum.optional().describe('Updated priority'),
    resultNotes: z.string().optional().describe('Result notes if completed'),
    dismissalReason: z.string().optional().describe('Reason if dismissing'),
    nextDueDate: z.string().optional().describe('Next occurrence due date'),
});

const GetPreventionRecommendationsSchema = z.object({
    patientId: z.string().describe('The patient UUID'),
    includeRiskScores: z.boolean().default(true).describe('Include risk score calculations'),
    focusAreas: z.array(PreventionPlanTypeEnum).optional().describe('Focus on specific prevention areas'),
    useLatestGuidelines: z.boolean().default(true).describe('Use latest clinical guidelines'),
});

// =============================================================================
// HANDLERS
// =============================================================================

// CREATE PREVENTION PLAN
async function createPreventionPlanHandler(
    input: z.infer<typeof CreatePreventionPlanSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify patient exists
        const patient = await prisma.patient.findUnique({
            where: { id: input.patientId },
            select: { id: true, firstName: true, lastName: true },
        });

        if (!patient) {
            return { success: false, error: `Patient not found: ${input.patientId}`, data: null };
        }

        // Create prevention plan
        const plan = await prisma.preventionPlan.create({
            data: {
                patientId: input.patientId,
                planName: input.planName,
                planType: input.planType,
                description: input.description,
                goals: input.goals,
                recommendations: input.recommendations,
                guidelineSource: input.guidelineSource,
                evidenceLevel: input.evidenceLevel,
                lifestyleChanges: input.lifestyleChanges,
                medicationChanges: input.medicationChanges,
                screeningSchedule: input.screeningSchedule,
                followUpSchedule: input.followUpSchedule,
                status: 'ACTIVE',
                activatedAt: new Date(),
            },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        // Create initial version for audit trail
        await prisma.preventionPlanVersion.create({
            data: {
                planId: plan.id,
                version: 1,
                planData: {
                    planName: plan.planName,
                    planType: plan.planType,
                    description: plan.description,
                    goals: plan.goals,
                    recommendations: plan.recommendations,
                    guidelineSource: plan.guidelineSource,
                    evidenceLevel: plan.evidenceLevel,
                },
                changes: {},
                changedBy: context.clinicianId,
                changeReason: 'Initial plan creation',
            },
        });

        logger.info({
            event: 'prevention_plan_created',
            planId: plan.id,
            patientId: input.patientId,
            planType: input.planType,
            agentId: context.agentId,
            clinicianId: context.clinicianId,
        });

        return {
            success: true,
            data: {
                planId: plan.id,
                patientId: plan.patientId,
                patientName: `${plan.patient.firstName} ${plan.patient.lastName}`,
                planName: plan.planName,
                planType: plan.planType,
                status: plan.status,
                goalsCount: (plan.goals as any[])?.length || 0,
                recommendationsCount: (plan.recommendations as any[])?.length || 0,
                createdAt: plan.createdAt.toISOString(),
                message: 'Prevention plan created successfully',
            },
        };
    } catch (error) {
        logger.error({ event: 'create_prevention_plan_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create prevention plan',
            data: null,
        };
    }
}

// GET PREVENTION PLAN
async function getPreventionPlanHandler(
    input: z.infer<typeof GetPreventionPlanSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const plan = await prisma.preventionPlan.findUnique({
            where: { id: input.planId },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
                riskScores: input.includeReminders ? {
                    orderBy: { calculatedAt: 'desc' },
                    take: 5,
                } : false,
                reminders: input.includeReminders ? {
                    where: { status: { in: ['DUE', 'OVERDUE', 'SCHEDULED'] } },
                    orderBy: { dueDate: 'asc' },
                } : false,
                versions: input.includeVersionHistory ? {
                    orderBy: { version: 'desc' },
                    take: 10,
                } : false,
            },
        });

        if (!plan) {
            return { success: false, error: `Prevention plan not found: ${input.planId}`, data: null };
        }

        return {
            success: true,
            data: {
                planId: plan.id,
                patient: {
                    id: plan.patient.id,
                    name: `${plan.patient.firstName} ${plan.patient.lastName}`,
                },
                planName: plan.planName,
                planType: plan.planType,
                description: plan.description,
                status: plan.status,
                goals: plan.goals,
                recommendations: plan.recommendations,
                guidelineSource: plan.guidelineSource,
                evidenceLevel: plan.evidenceLevel,
                lifestyleChanges: plan.lifestyleChanges,
                medicationChanges: plan.medicationChanges,
                screeningSchedule: plan.screeningSchedule,
                followUpSchedule: plan.followUpSchedule,
                riskScores: plan.riskScores ? plan.riskScores.map(rs => ({
                    id: rs.id,
                    riskType: rs.riskType,
                    score: rs.score,
                    scorePercentage: rs.scorePercentage,
                    category: rs.category,
                    calculatedAt: rs.calculatedAt.toISOString(),
                })) : [],
                reminders: plan.reminders ? plan.reminders.map(r => ({
                    id: r.id,
                    screeningType: r.screeningType,
                    title: r.title,
                    status: r.status,
                    dueDate: r.dueDate.toISOString(),
                    priority: r.priority,
                })) : [],
                versionHistory: plan.versions ? plan.versions.map(v => ({
                    version: v.version,
                    changedBy: v.changedBy,
                    changeReason: v.changeReason,
                    createdAt: v.createdAt.toISOString(),
                })) : [],
                aiInsights: {
                    generatedBy: plan.aiGeneratedBy,
                    confidence: plan.aiConfidence,
                },
                activatedAt: plan.activatedAt.toISOString(),
                reviewedAt: plan.reviewedAt?.toISOString(),
                createdAt: plan.createdAt.toISOString(),
                updatedAt: plan.updatedAt.toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'get_prevention_plan_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get prevention plan',
            data: null,
        };
    }
}

// LIST PREVENTION PLANS
async function listPreventionPlansHandler(
    input: z.infer<typeof ListPreventionPlansSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const where: any = {};

        if (input.patientId) where.patientId = input.patientId;
        if (input.planType) where.planType = input.planType;
        if (input.status) where.status = input.status;

        if (input.startDate || input.endDate) {
            where.createdAt = {};
            if (input.startDate) where.createdAt.gte = new Date(input.startDate);
            if (input.endDate) where.createdAt.lte = new Date(input.endDate);
        }

        const [plans, total] = await Promise.all([
            prisma.preventionPlan.findMany({
                where,
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true } },
                    _count: {
                        select: {
                            reminders: true,
                            riskScores: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: input.limit,
                skip: input.offset,
            }),
            prisma.preventionPlan.count({ where }),
        ]);

        return {
            success: true,
            data: {
                plans: plans.map(plan => ({
                    planId: plan.id,
                    patientId: plan.patientId,
                    patientName: `${plan.patient.firstName} ${plan.patient.lastName}`,
                    planName: plan.planName,
                    planType: plan.planType,
                    status: plan.status,
                    goalsCount: (plan.goals as any[])?.length || 0,
                    remindersCount: plan._count.reminders,
                    riskScoresCount: plan._count.riskScores,
                    guidelineSource: plan.guidelineSource,
                    activatedAt: plan.activatedAt.toISOString(),
                    createdAt: plan.createdAt.toISOString(),
                })),
                pagination: {
                    total,
                    limit: input.limit,
                    offset: input.offset,
                    hasMore: input.offset + plans.length < total,
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'list_prevention_plans_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list prevention plans',
            data: null,
        };
    }
}

// UPDATE PREVENTION PLAN
async function updatePreventionPlanHandler(
    input: z.infer<typeof UpdatePreventionPlanSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Get existing plan
        const existing = await prisma.preventionPlan.findUnique({
            where: { id: input.planId },
            include: {
                versions: { orderBy: { version: 'desc' }, take: 1 },
            },
        });

        if (!existing) {
            return { success: false, error: `Prevention plan not found: ${input.planId}`, data: null };
        }

        // Build update data and track changes
        const updateData: any = {};
        const changes: any = {};

        if (input.planName !== undefined && input.planName !== existing.planName) {
            updateData.planName = input.planName;
            changes.planName = { old: existing.planName, new: input.planName };
        }
        if (input.description !== undefined && input.description !== existing.description) {
            updateData.description = input.description;
            changes.description = { old: existing.description, new: input.description };
        }
        if (input.status !== undefined && input.status !== existing.status) {
            updateData.status = input.status;
            changes.status = { old: existing.status, new: input.status };

            // Handle status-specific fields
            if (input.status === 'COMPLETED') {
                updateData.completedAt = new Date();
                updateData.completedBy = context.clinicianId;
            } else if (input.status === 'DEACTIVATED') {
                updateData.deactivatedAt = new Date();
                updateData.deactivatedBy = context.clinicianId;
            }
        }
        if (input.goals !== undefined) {
            updateData.goals = input.goals;
            changes.goals = { updated: true };
        }
        if (input.recommendations !== undefined) {
            updateData.recommendations = input.recommendations;
            changes.recommendations = { updated: true };
        }
        if (input.lifestyleChanges !== undefined) {
            updateData.lifestyleChanges = input.lifestyleChanges;
            changes.lifestyleChanges = { old: existing.lifestyleChanges, new: input.lifestyleChanges };
        }
        if (input.medicationChanges !== undefined) {
            updateData.medicationChanges = input.medicationChanges;
            changes.medicationChanges = { old: existing.medicationChanges, new: input.medicationChanges };
        }

        if (Object.keys(updateData).length === 0) {
            return { success: false, error: 'No update fields provided', data: null };
        }

        // Update plan and create version in transaction
        const [plan] = await prisma.$transaction([
            prisma.preventionPlan.update({
                where: { id: input.planId },
                data: {
                    ...updateData,
                    reviewedAt: new Date(),
                    reviewedBy: context.clinicianId,
                },
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            prisma.preventionPlanVersion.create({
                data: {
                    planId: input.planId,
                    version: (existing.versions[0]?.version || 0) + 1,
                    planData: {
                        ...existing,
                        ...updateData,
                    },
                    changes,
                    changedBy: context.clinicianId,
                    changeReason: input.changeReason || 'Plan updated',
                },
            }),
        ]);

        logger.info({
            event: 'prevention_plan_updated',
            planId: input.planId,
            updatedFields: Object.keys(changes),
            agentId: context.agentId,
            clinicianId: context.clinicianId,
        });

        return {
            success: true,
            data: {
                planId: plan.id,
                patientName: `${plan.patient.firstName} ${plan.patient.lastName}`,
                planName: plan.planName,
                status: plan.status,
                updatedFields: Object.keys(changes),
                updatedAt: plan.updatedAt.toISOString(),
                message: 'Prevention plan updated successfully',
            },
        };
    } catch (error) {
        logger.error({ event: 'update_prevention_plan_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update prevention plan',
            data: null,
        };
    }
}

// ADD SCREENING
async function addScreeningHandler(
    input: z.infer<typeof AddScreeningSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify patient exists
        const patient = await prisma.patient.findUnique({
            where: { id: input.patientId },
            select: { id: true, firstName: true, lastName: true },
        });

        if (!patient) {
            return { success: false, error: `Patient not found: ${input.patientId}`, data: null };
        }

        // Create screening outcome record
        const screening = await prisma.screeningOutcome.create({
            data: {
                patientId: input.patientId,
                screeningType: input.screeningType,
                screeningCode: input.screeningCode,
                description: input.description,
                scheduledDate: new Date(input.scheduledDate),
                dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
                orderingProvider: input.orderingProvider || context.clinicianId,
                facility: input.facility,
                notes: input.notes,
                followUpPlanId: input.preventionPlanId,
            },
        });

        logger.info({
            event: 'screening_added',
            screeningId: screening.id,
            patientId: input.patientId,
            screeningType: input.screeningType,
            agentId: context.agentId,
            clinicianId: context.clinicianId,
        });

        return {
            success: true,
            data: {
                screeningId: screening.id,
                patientId: screening.patientId,
                patientName: `${patient.firstName} ${patient.lastName}`,
                screeningType: screening.screeningType,
                screeningCode: screening.screeningCode,
                scheduledDate: screening.scheduledDate.toISOString(),
                dueDate: screening.dueDate?.toISOString(),
                preventionPlanId: input.preventionPlanId,
                createdAt: screening.createdAt.toISOString(),
                message: 'Screening scheduled successfully',
            },
        };
    } catch (error) {
        logger.error({ event: 'add_screening_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add screening',
            data: null,
        };
    }
}

// COMPLETE SCREENING
async function completeScreeningHandler(
    input: z.infer<typeof CompleteScreeningSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify screening exists
        const existing = await prisma.screeningOutcome.findUnique({
            where: { id: input.screeningId },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        if (!existing) {
            return { success: false, error: `Screening not found: ${input.screeningId}`, data: null };
        }

        if (existing.completedDate) {
            return { success: false, error: 'Screening already completed', data: null };
        }

        // Update screening with results
        const screening = await prisma.screeningOutcome.update({
            where: { id: input.screeningId },
            data: {
                completedDate: new Date(input.completedDate),
                result: input.result,
                resultDetails: input.resultDetails,
                resultDocumentId: input.resultDocumentId,
                performedBy: input.performedBy || context.clinicianId,
                notes: input.notes,
                followUpRecommended: input.followUpRecommended,
                followUpScheduledFor: input.followUpScheduledFor ? new Date(input.followUpScheduledFor) : undefined,
            },
        });

        logger.info({
            event: 'screening_completed',
            screeningId: input.screeningId,
            patientId: existing.patientId,
            result: input.result,
            followUpRecommended: input.followUpRecommended,
            agentId: context.agentId,
            clinicianId: context.clinicianId,
        });

        return {
            success: true,
            data: {
                screeningId: screening.id,
                patientId: screening.patientId,
                patientName: `${existing.patient.firstName} ${existing.patient.lastName}`,
                screeningType: screening.screeningType,
                completedDate: screening.completedDate?.toISOString(),
                result: screening.result,
                followUpRecommended: screening.followUpRecommended,
                followUpScheduledFor: screening.followUpScheduledFor?.toISOString(),
                updatedAt: screening.updatedAt.toISOString(),
                message: 'Screening completed successfully',
            },
        };
    } catch (error) {
        logger.error({ event: 'complete_screening_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to complete screening',
            data: null,
        };
    }
}

// GET DUE SCREENINGS
async function getDueScreeningsHandler(
    input: z.infer<typeof GetDueScreeningsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const now = new Date();

        // Build where conditions
        const where: any = {
            patientId: input.patientId,
            completedDate: null,
            patientDeclined: false,
        };

        if (input.includeOverdue) {
            where.OR = [
                { dueDate: { lte: now } },
                { scheduledDate: { lte: now } },
            ];
        } else {
            where.dueDate = { lte: now };
            where.scheduledDate = { gte: now };
        }

        if (input.screeningTypes && input.screeningTypes.length > 0) {
            where.screeningType = { in: input.screeningTypes };
        }

        const screenings = await prisma.screeningOutcome.findMany({
            where,
            orderBy: [
                { dueDate: 'asc' },
                { scheduledDate: 'asc' },
            ],
            take: input.limit,
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        // Also get preventive care reminders that are due
        const reminders = await prisma.preventiveCareReminder.findMany({
            where: {
                patientId: input.patientId,
                status: { in: input.includeOverdue ? ['DUE', 'OVERDUE'] : ['DUE'] },
            },
            orderBy: { dueDate: 'asc' },
            take: input.limit,
        });

        const overdueCount = screenings.filter(s =>
            s.dueDate && s.dueDate < now
        ).length;

        return {
            success: true,
            data: {
                patientId: input.patientId,
                screenings: screenings.map(s => ({
                    screeningId: s.id,
                    screeningType: s.screeningType,
                    screeningCode: s.screeningCode,
                    description: s.description,
                    scheduledDate: s.scheduledDate.toISOString(),
                    dueDate: s.dueDate?.toISOString(),
                    isOverdue: s.dueDate ? s.dueDate < now : false,
                    facility: s.facility,
                    remindersSent: s.remindersSent,
                })),
                reminders: reminders.map(r => ({
                    reminderId: r.id,
                    screeningType: r.screeningType,
                    title: r.title,
                    status: r.status,
                    dueDate: r.dueDate.toISOString(),
                    priority: r.priority,
                    guidelineSource: r.guidelineSource,
                })),
                summary: {
                    totalDue: screenings.length + reminders.length,
                    overdueCount,
                    scheduledCount: screenings.filter(s => s.scheduledDate && s.scheduledDate >= now).length,
                },
            },
        };
    } catch (error) {
        logger.error({ event: 'get_due_screenings_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get due screenings',
            data: null,
        };
    }
}

// CREATE PREVENTION TASK
async function createPreventionTaskHandler(
    input: z.infer<typeof CreatePreventionTaskSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify patient exists
        const patient = await prisma.patient.findUnique({
            where: { id: input.patientId },
            select: { id: true, firstName: true, lastName: true },
        });

        if (!patient) {
            return { success: false, error: `Patient not found: ${input.patientId}`, data: null };
        }

        // Create preventive care reminder
        // Note: screeningType must match PreventiveCareType enum from Prisma
        const task = await prisma.preventiveCareReminder.create({
            data: {
                patientId: input.patientId,
                preventionPlanId: input.preventionPlanId,
                screeningType: input.screeningType as any, // Cast to Prisma enum type
                title: input.title,
                description: input.description,
                recommendedBy: new Date(),
                dueDate: new Date(input.dueDate),
                priority: input.priority as any, // Cast to Prisma Priority enum
                guidelineSource: input.guidelineSource,
                evidenceLevel: input.evidenceLevel,
                status: 'DUE',
                recurringInterval: input.recurringInterval,
                goalIndex: input.goalIndex,
            },
        });

        logger.info({
            event: 'prevention_task_created',
            taskId: task.id,
            patientId: input.patientId,
            screeningType: input.screeningType,
            agentId: context.agentId,
            clinicianId: context.clinicianId,
        });

        return {
            success: true,
            data: {
                taskId: task.id,
                patientId: task.patientId,
                patientName: `${patient.firstName} ${patient.lastName}`,
                screeningType: task.screeningType,
                title: task.title,
                status: task.status,
                dueDate: task.dueDate.toISOString(),
                priority: task.priority,
                preventionPlanId: task.preventionPlanId,
                createdAt: task.createdAt.toISOString(),
                message: 'Prevention task created successfully',
            },
        };
    } catch (error) {
        logger.error({ event: 'create_prevention_task_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create prevention task',
            data: null,
        };
    }
}

// UPDATE PREVENTION TASK
async function updatePreventionTaskHandler(
    input: z.infer<typeof UpdatePreventionTaskSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify task exists
        const existing = await prisma.preventiveCareReminder.findUnique({
            where: { id: input.taskId },
            include: {
                patient: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        if (!existing) {
            return { success: false, error: `Prevention task not found: ${input.taskId}`, data: null };
        }

        // Build update data
        const updateData: any = {};

        if (input.status !== undefined) {
            updateData.status = input.status;

            if (input.status === 'COMPLETED') {
                updateData.completedAt = new Date();
                updateData.completedBy = context.clinicianId;
            } else if (input.status === 'DISMISSED') {
                updateData.dismissedAt = new Date();
                updateData.dismissedBy = context.clinicianId;
            }
        }
        if (input.dueDate !== undefined) updateData.dueDate = new Date(input.dueDate);
        if (input.priority !== undefined) updateData.priority = input.priority;
        if (input.resultNotes !== undefined) updateData.resultNotes = input.resultNotes;
        if (input.dismissalReason !== undefined) updateData.dismissalReason = input.dismissalReason;
        if (input.nextDueDate !== undefined) updateData.nextDueDate = new Date(input.nextDueDate);

        if (Object.keys(updateData).length === 0) {
            return { success: false, error: 'No update fields provided', data: null };
        }

        const task = await prisma.preventiveCareReminder.update({
            where: { id: input.taskId },
            data: updateData,
        });

        logger.info({
            event: 'prevention_task_updated',
            taskId: input.taskId,
            patientId: existing.patientId,
            updatedFields: Object.keys(updateData),
            agentId: context.agentId,
            clinicianId: context.clinicianId,
        });

        return {
            success: true,
            data: {
                taskId: task.id,
                patientId: task.patientId,
                patientName: `${existing.patient.firstName} ${existing.patient.lastName}`,
                screeningType: task.screeningType,
                title: task.title,
                status: task.status,
                dueDate: task.dueDate.toISOString(),
                priority: task.priority,
                completedAt: task.completedAt?.toISOString(),
                nextDueDate: task.nextDueDate?.toISOString(),
                updatedAt: task.updatedAt.toISOString(),
                message: 'Prevention task updated successfully',
            },
        };
    } catch (error) {
        logger.error({ event: 'update_prevention_task_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update prevention task',
            data: null,
        };
    }
}

// GET PREVENTION RECOMMENDATIONS
async function getPreventionRecommendationsHandler(
    input: z.infer<typeof GetPreventionRecommendationsSchema>,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Get patient with health data
        const patient = await prisma.patient.findUnique({
            where: { id: input.patientId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                dateOfBirth: true,
                gender: true,
                // Prevention-related health metrics (from Patient model)
                tobaccoUse: true,
                tobaccoType: true,
                tobaccoPackYears: true,
                alcoholUse: true,
                alcoholDrinksPerWeek: true,
                physicalActivityMinutesWeek: true,
                bmi: true,
                bmiCategory: true,
                cvdRiskScore: true,
                cvdRiskCategory: true,
                diabetesRiskScore: true,
                diabetesRiskCategory: true,
                prediabetesDetected: true,
                // Screening dates
                lastMammogram: true,
                lastColonoscopy: true,
                lastPapSmear: true,
                lastProstateScreening: true,
                lastCholesterolTest: true,
                lastHbA1c: true,
                lastFastingGlucose: true,
                lastBloodPressureCheck: true,
                lastPhysicalExam: true,
                // Active prevention plans
                preventionPlans: {
                    where: { status: 'ACTIVE' },
                    select: { id: true, planType: true, planName: true },
                },
                // Recent risk scores
                riskScores: input.includeRiskScores ? {
                    orderBy: { calculatedAt: 'desc' },
                    take: 5,
                } : false,
            },
        });

        if (!patient) {
            return { success: false, error: `Patient not found: ${input.patientId}`, data: null };
        }

        // Calculate age
        const age = patient.dateOfBirth
            ? Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null;

        // Generate recommendations based on patient data and guidelines
        const recommendations: Array<{
            category: string;
            recommendation: string;
            guidelineSource: string;
            evidenceLevel: string;
            priority: string;
            reasoning: string;
        }> = [];

        // USPSTF-based recommendations
        const isFemale = patient.gender?.toLowerCase() === 'female' || patient.gender?.toLowerCase() === 'f';

        if (isFemale && age && age >= 50 && age <= 74) {
            const lastMammogramMonths = patient.lastMammogram
                ? Math.floor((Date.now() - patient.lastMammogram.getTime()) / (30 * 24 * 60 * 60 * 1000))
                : null;

            if (!lastMammogramMonths || lastMammogramMonths >= 24) {
                recommendations.push({
                    category: 'CANCER_SCREENING',
                    recommendation: 'Schedule mammogram screening',
                    guidelineSource: 'USPSTF',
                    evidenceLevel: 'B',
                    priority: 'HIGH',
                    reasoning: `Women age 50-74 should have biennial mammogram. ${lastMammogramMonths ? `Last screening ${lastMammogramMonths} months ago.` : 'No screening on record.'}`,
                });
            }
        }

        if (age && age >= 45 && age <= 75) {
            const lastColonoscopyYears = patient.lastColonoscopy
                ? Math.floor((Date.now() - patient.lastColonoscopy.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                : null;

            if (!lastColonoscopyYears || lastColonoscopyYears >= 10) {
                recommendations.push({
                    category: 'CANCER_SCREENING',
                    recommendation: 'Schedule colorectal cancer screening',
                    guidelineSource: 'USPSTF',
                    evidenceLevel: 'A',
                    priority: 'HIGH',
                    reasoning: `Adults 45-75 should be screened for colorectal cancer. ${lastColonoscopyYears ? `Last screening ${lastColonoscopyYears} years ago.` : 'No screening on record.'}`,
                });
            }
        }

        // Cardiovascular and diabetes risk assessment
        if (age && age >= 40 && age <= 75) {
            // Use stored risk scores if available
            if (patient.prediabetesDetected || (patient.diabetesRiskScore && patient.diabetesRiskScore >= 12)) {
                recommendations.push({
                    category: 'DIABETES',
                    recommendation: 'Diabetes prevention lifestyle intervention',
                    guidelineSource: 'ADA',
                    evidenceLevel: 'A',
                    priority: patient.prediabetesDetected ? 'URGENT' : 'HIGH',
                    reasoning: `${patient.prediabetesDetected ? 'Prediabetes detected' : `FINDRISC score of ${patient.diabetesRiskScore}`}. Lifestyle intervention recommended.`,
                });
            }

            // CVD risk-based recommendations
            if (patient.cvdRiskScore && patient.cvdRiskScore >= 7.5) {
                recommendations.push({
                    category: 'CARDIOVASCULAR',
                    recommendation: patient.cvdRiskScore >= 20
                        ? 'High-intensity statin therapy recommended'
                        : 'Consider moderate-intensity statin therapy',
                    guidelineSource: 'AHA/ACC',
                    evidenceLevel: 'A',
                    priority: patient.cvdRiskScore >= 20 ? 'URGENT' : 'HIGH',
                    reasoning: `10-year ASCVD risk of ${patient.cvdRiskScore.toFixed(1)}% (${patient.cvdRiskCategory || 'elevated'}). Statin therapy may be beneficial.`,
                });
            }

            if (patient.bmi && patient.bmi >= 30) {
                recommendations.push({
                    category: 'OBESITY',
                    recommendation: 'Weight management intervention',
                    guidelineSource: 'USPSTF',
                    evidenceLevel: 'B',
                    priority: 'MEDIUM',
                    reasoning: `BMI of ${patient.bmi.toFixed(1)} indicates obesity (${patient.bmiCategory || 'Obese'}). Behavioral interventions recommended.`,
                });
            }
        }

        // Tobacco cessation
        if (patient.tobaccoUse) {
            recommendations.push({
                category: 'GENERAL_WELLNESS',
                recommendation: 'Offer tobacco cessation intervention',
                guidelineSource: 'USPSTF',
                evidenceLevel: 'A',
                priority: 'HIGH',
                reasoning: `Patient uses tobacco${patient.tobaccoType ? ` (${patient.tobaccoType})` : ''}${patient.tobaccoPackYears ? ` with ${patient.tobaccoPackYears} pack-years` : ''}. Cessation intervention recommended.`,
            });

            // Lung cancer screening for heavy smokers
            if (age && age >= 50 && age <= 80 && patient.tobaccoPackYears && patient.tobaccoPackYears >= 20) {
                recommendations.push({
                    category: 'CANCER_SCREENING',
                    recommendation: 'Annual low-dose CT lung cancer screening',
                    guidelineSource: 'USPSTF',
                    evidenceLevel: 'B',
                    priority: 'HIGH',
                    reasoning: `Patient has ${patient.tobaccoPackYears} pack-years smoking history. Annual LDCT recommended for ages 50-80 with >= 20 pack-years.`,
                });
            }
        }

        // Filter by focus areas if specified
        const filteredRecommendations = input.focusAreas && input.focusAreas.length > 0
            ? recommendations.filter(r => input.focusAreas!.includes(r.category as any))
            : recommendations;

        logger.info({
            event: 'prevention_recommendations_generated',
            patientId: input.patientId,
            recommendationsCount: filteredRecommendations.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                patientId: patient.id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                demographics: {
                    age,
                    gender: patient.gender,
                },
                healthMetrics: {
                    bmi: patient.bmi,
                    bmiCategory: patient.bmiCategory,
                    cvdRiskScore: patient.cvdRiskScore,
                    cvdRiskCategory: patient.cvdRiskCategory,
                    diabetesRiskScore: patient.diabetesRiskScore,
                    diabetesRiskCategory: patient.diabetesRiskCategory,
                    prediabetesDetected: patient.prediabetesDetected,
                    tobaccoUse: patient.tobaccoUse,
                    tobaccoType: patient.tobaccoType,
                    tobaccoPackYears: patient.tobaccoPackYears,
                    alcoholUse: patient.alcoholUse,
                    alcoholDrinksPerWeek: patient.alcoholDrinksPerWeek,
                    physicalActivityMinutesWeek: patient.physicalActivityMinutesWeek,
                },
                screeningHistory: {
                    lastMammogram: patient.lastMammogram?.toISOString(),
                    lastColonoscopy: patient.lastColonoscopy?.toISOString(),
                    lastPapSmear: patient.lastPapSmear?.toISOString(),
                    lastProstateScreening: patient.lastProstateScreening?.toISOString(),
                    lastCholesterolTest: patient.lastCholesterolTest?.toISOString(),
                    lastHbA1c: patient.lastHbA1c?.toISOString(),
                    lastBloodPressureCheck: patient.lastBloodPressureCheck?.toISOString(),
                },
                activePlans: patient.preventionPlans,
                riskScores: patient.riskScores ? patient.riskScores.map(rs => ({
                    riskType: rs.riskType,
                    score: rs.score,
                    scorePercentage: rs.scorePercentage,
                    category: rs.category,
                    calculatedAt: rs.calculatedAt.toISOString(),
                })) : [],
                recommendations: filteredRecommendations.sort((a, b) => {
                    const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                    return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) -
                           (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
                }),
                guidelinesSources: ['USPSTF', 'ADA', 'AHA/ACC'],
                generatedAt: new Date().toISOString(),
            },
        };
    } catch (error) {
        logger.error({ event: 'get_prevention_recommendations_error', error, input });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get prevention recommendations',
            data: null,
        };
    }
}

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const preventionTools: MCPTool[] = [
    // CRUD Operations
    {
        name: 'create_prevention_plan',
        description: 'Create a new prevention plan for a patient. Includes goals, recommendations, and evidence-based guidelines.',
        category: 'prevention',
        inputSchema: CreatePreventionPlanSchema,
        requiredPermissions: ['patient:read', 'patient:write', 'prevention:write'],
        handler: createPreventionPlanHandler,
        examples: [
            {
                description: 'Create a cardiovascular disease prevention plan',
                input: {
                    patientId: 'patient-123',
                    planName: 'ASCVD Risk Reduction Plan',
                    planType: 'CARDIOVASCULAR',
                    goals: [
                        { goal: 'Reduce LDL cholesterol to < 100 mg/dL', targetDate: '2025-06-01', status: 'pending' },
                        { goal: 'Maintain blood pressure < 130/80 mmHg', status: 'pending' },
                    ],
                    recommendations: [
                        { title: 'Statin therapy', description: 'High-intensity statin for LDL reduction', priority: 'HIGH' },
                        { title: 'Lifestyle modification', description: 'Mediterranean diet and 150 min/week exercise', priority: 'HIGH' },
                    ],
                    guidelineSource: 'ACC/AHA 2019',
                    evidenceLevel: 'A',
                },
                expectedOutput: 'Returns the created prevention plan with ID and status',
            },
        ],
    },
    {
        name: 'get_prevention_plan',
        description: 'Get detailed information about a prevention plan including goals, recommendations, risk scores, and reminders.',
        category: 'prevention',
        inputSchema: GetPreventionPlanSchema,
        requiredPermissions: ['patient:read', 'prevention:read'],
        handler: getPreventionPlanHandler,
    },
    {
        name: 'list_prevention_plans',
        description: 'List prevention plans with optional filters by patient, type, status, and date range.',
        category: 'prevention',
        inputSchema: ListPreventionPlansSchema,
        requiredPermissions: ['patient:read', 'prevention:read'],
        handler: listPreventionPlansHandler,
    },
    {
        name: 'update_prevention_plan',
        description: 'Update a prevention plan. Changes are versioned for HIPAA audit compliance.',
        category: 'prevention',
        inputSchema: UpdatePreventionPlanSchema,
        requiredPermissions: ['patient:read', 'patient:write', 'prevention:write'],
        handler: updatePreventionPlanHandler,
    },

    // Screening Operations
    {
        name: 'add_screening',
        description: 'Schedule a screening for a patient. Can optionally link to a prevention plan.',
        category: 'prevention',
        inputSchema: AddScreeningSchema,
        requiredPermissions: ['patient:read', 'patient:write', 'prevention:write'],
        handler: addScreeningHandler,
        examples: [
            {
                description: 'Schedule a mammogram screening',
                input: {
                    patientId: 'patient-123',
                    screeningType: 'mammogram',
                    scheduledDate: '2025-03-15T09:00:00Z',
                    dueDate: '2025-03-31T23:59:59Z',
                    facility: 'Imaging Center Downtown',
                    notes: 'Annual mammogram - patient age 52',
                },
                expectedOutput: 'Returns the created screening with ID and schedule details',
            },
        ],
    },
    {
        name: 'complete_screening',
        description: 'Record screening completion with results. Can indicate if follow-up is needed.',
        category: 'prevention',
        inputSchema: CompleteScreeningSchema,
        requiredPermissions: ['patient:read', 'patient:write', 'prevention:write'],
        handler: completeScreeningHandler,
    },
    {
        name: 'get_due_screenings',
        description: 'Get screenings that are due or overdue for a patient. Includes both ScreeningOutcome and PreventiveCareReminder records.',
        category: 'prevention',
        inputSchema: GetDueScreeningsSchema,
        requiredPermissions: ['patient:read', 'prevention:read'],
        handler: getDueScreeningsHandler,
    },

    // Task Operations
    {
        name: 'create_prevention_task',
        description: 'Create a preventive care reminder/task for a patient. Can be linked to a prevention plan goal.',
        category: 'prevention',
        inputSchema: CreatePreventionTaskSchema,
        requiredPermissions: ['patient:read', 'patient:write', 'prevention:write'],
        handler: createPreventionTaskHandler,
    },
    {
        name: 'update_prevention_task',
        description: 'Update a preventive care task status, due date, or record completion/dismissal.',
        category: 'prevention',
        inputSchema: UpdatePreventionTaskSchema,
        requiredPermissions: ['patient:read', 'patient:write', 'prevention:write'],
        handler: updatePreventionTaskHandler,
    },

    // AI Operations
    {
        name: 'get_prevention_recommendations',
        description: 'Get AI-generated prevention recommendations based on patient health data and clinical guidelines (USPSTF, ADA, AHA/ACC).',
        category: 'prevention',
        inputSchema: GetPreventionRecommendationsSchema,
        requiredPermissions: ['patient:read', 'prevention:read', 'ai:read'],
        handler: getPreventionRecommendationsHandler,
        examples: [
            {
                description: 'Get comprehensive prevention recommendations for a patient',
                input: {
                    patientId: 'patient-123',
                    includeRiskScores: true,
                    useLatestGuidelines: true,
                },
                expectedOutput: 'Returns prioritized recommendations with guideline sources and evidence levels',
            },
        ],
    },
];

// =============================================================================
// EXPORTS
// =============================================================================

export const PREVENTION_TOOL_COUNT = preventionTools.length;
