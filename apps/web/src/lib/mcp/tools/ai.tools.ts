/**
 * AI MCP Tools - AI insights, feedback, and usage statistics
 *
 * These tools provide access to AI-generated insights, allow clinicians to
 * provide feedback on AI recommendations, and retrieve AI usage statistics.
 * Uses `any` types for Prisma results due to complex relation typing.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// SCHEMAS
// =============================================================================

const GetAIInsightsSchema = z.object({
    patientId: z.string().uuid().describe('The patient UUID to get AI insights for'),
    taskType: z.string().optional().describe('Filter by task type (e.g., "diagnosis-support", "clinical-notes")'),
    limit: z.number().int().min(1).max(50).default(10).describe('Maximum number of insights to return'),
    includeScores: z.boolean().default(true).describe('Include quality scores in response'),
});

const ProvideAIFeedbackSchema = z.object({
    assuranceEventId: z.string().describe('The assurance event ID to provide feedback on'),
    feedbackType: z.enum(['THUMBS_UP', 'THUMBS_DOWN', 'CORRECTION', 'COMMENT']).describe('Type of feedback'),
    feedbackValue: z.record(z.any()).describe('Structured feedback data (e.g., { "correctedDiagnosis": "...", "reason": "..." })'),
    feedbackSource: z.enum(['PHYSICIAN', 'NURSE', 'PHARMACIST', 'ADMIN', 'BILLING']).default('PHYSICIAN').describe('Source of the feedback for RLHF weighting'),
});

const GetAIUsageStatsSchema = z.object({
    clinicId: z.string().optional().describe('Filter by clinic ID (defaults to context clinic)'),
    startDate: z.string().optional().describe('Start date for stats period (ISO 8601)'),
    endDate: z.string().optional().describe('End date for stats period (ISO 8601)'),
    groupBy: z.enum(['day', 'week', 'month']).default('day').describe('How to group the statistics'),
});

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type GetAIInsightsInput = z.infer<typeof GetAIInsightsSchema>;
type ProvideAIFeedbackInput = z.infer<typeof ProvideAIFeedbackSchema>;
type GetAIUsageStatsInput = z.infer<typeof GetAIUsageStatsSchema>;

// =============================================================================
// TOOL: get_ai_insights
// =============================================================================

async function getAIInsightsHandler(
    input: GetAIInsightsInput,
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

        // Get AI interaction evaluations
        // Note: AIInteractionEvaluation doesn't have a direct patientId link,
        // so we query based on interactionId patterns or get all for the clinic
        const where: any = {};

        if (input.taskType) {
            where.taskType = input.taskType;
        }

        // Only get evaluations that haven't failed
        where.evaluationFailed = false;

        const evaluations: any[] = await prisma.aIInteractionEvaluation.findMany({
            where,
            take: input.limit,
            orderBy: { evaluatedAt: 'desc' },
            select: {
                id: true,
                interactionId: true,
                taskType: true,
                hallucinationScore: input.includeScores,
                completenessScore: input.includeScores,
                clinicalAccuracyScore: input.includeScores,
                flaggedIssues: true,
                reasoning: true,
                judgeModel: true,
                evaluatedAt: true,
            },
        });

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_ai_insights',
            patientId: input.patientId,
            resultCount: evaluations.length,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                patientId: input.patientId,
                insights: evaluations.map((eval_item: any) => ({
                    id: eval_item.id,
                    interactionId: eval_item.interactionId,
                    taskType: eval_item.taskType,
                    qualityScores: input.includeScores ? {
                        hallucination: eval_item.hallucinationScore,
                        completeness: eval_item.completenessScore,
                        clinicalAccuracy: eval_item.clinicalAccuracyScore,
                    } : undefined,
                    flaggedIssues: eval_item.flaggedIssues,
                    reasoning: eval_item.reasoning,
                    judgeModel: eval_item.judgeModel,
                    evaluatedAt: eval_item.evaluatedAt,
                })),
                totalCount: evaluations.length,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_ai_insights_error', error, input });
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Failed to get AI insights',
        };
    }
}

// =============================================================================
// TOOL: provide_ai_feedback
// =============================================================================

async function provideAIFeedbackHandler(
    input: ProvideAIFeedbackInput,
    context: MCPContext
): Promise<MCPResult> {
    try {
        // Verify assurance event exists
        const assuranceEvent = await prisma.assuranceEvent.findUnique({
            where: { id: input.assuranceEventId },
        });

        if (!assuranceEvent) {
            return {
                success: false,
                error: 'Assurance event not found',
                data: null,
            };
        }

        // Create the human feedback record
        const feedback: any = await prisma.humanFeedback.create({
            data: {
                assuranceEventId: input.assuranceEventId,
                feedbackType: input.feedbackType,
                feedbackValue: input.feedbackValue,
                feedbackSource: input.feedbackSource,
            },
        });

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'provide_ai_feedback',
            feedbackId: feedback.id,
            assuranceEventId: input.assuranceEventId,
            feedbackType: input.feedbackType,
            feedbackSource: input.feedbackSource,
            agentId: context.agentId,
            clinicianId: context.clinicianId,
        });

        return {
            success: true,
            data: {
                feedbackId: feedback.id,
                assuranceEventId: input.assuranceEventId,
                feedbackType: feedback.feedbackType,
                feedbackSource: feedback.feedbackSource,
                createdAt: feedback.createdAt,
                message: 'Feedback submitted successfully for RLHF training',
            },
        };
    } catch (error) {
        logger.error({ event: 'provide_ai_feedback_error', error, input });
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Failed to submit AI feedback',
        };
    }
}

// =============================================================================
// TOOL: get_ai_usage_stats
// =============================================================================

async function getAIUsageStatsHandler(
    input: GetAIUsageStatsInput,
    context: MCPContext
): Promise<MCPResult> {
    try {
        const clinicId = input.clinicId || context.clinicId;

        // Build date range
        const startDate = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = input.endDate ? new Date(input.endDate) : new Date();

        // Get evaluation counts and averages
        const evaluations = await prisma.aIInteractionEvaluation.findMany({
            where: {
                evaluatedAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                taskType: true,
                hallucinationScore: true,
                completenessScore: true,
                clinicalAccuracyScore: true,
                evaluationFailed: true,
                primaryModelCost: true,
                judgeModelCost: true,
                evaluatedAt: true,
            },
        });

        // Calculate aggregate statistics
        const totalInteractions = evaluations.length;
        const failedEvaluations = evaluations.filter(e => e.evaluationFailed).length;

        const successfulEvals = evaluations.filter(e => !e.evaluationFailed);

        // Calculate average scores
        const avgHallucination = successfulEvals.length > 0
            ? successfulEvals.reduce((sum, e) => sum + (e.hallucinationScore || 0), 0) / successfulEvals.length
            : null;
        const avgCompleteness = successfulEvals.length > 0
            ? successfulEvals.reduce((sum, e) => sum + (e.completenessScore || 0), 0) / successfulEvals.length
            : null;
        const avgClinicalAccuracy = successfulEvals.length > 0
            ? successfulEvals.reduce((sum, e) => sum + (e.clinicalAccuracyScore || 0), 0) / successfulEvals.length
            : null;

        // Calculate costs
        const totalPrimaryModelCost = evaluations.reduce((sum, e) => sum + (e.primaryModelCost || 0), 0);
        const totalJudgeModelCost = evaluations.reduce((sum, e) => sum + (e.judgeModelCost || 0), 0);

        // Group by task type
        const byTaskType: Record<string, number> = {};
        evaluations.forEach(e => {
            byTaskType[e.taskType] = (byTaskType[e.taskType] || 0) + 1;
        });

        // Get feedback counts
        const feedbackCount = await prisma.humanFeedback.count({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        logger.info({
            event: 'mcp_tool_executed',
            tool: 'get_ai_usage_stats',
            clinicId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalInteractions,
            agentId: context.agentId,
        });

        return {
            success: true,
            data: {
                period: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    groupBy: input.groupBy,
                },
                summary: {
                    totalInteractions,
                    successfulEvaluations: successfulEvals.length,
                    failedEvaluations,
                    humanFeedbackCount: feedbackCount,
                },
                qualityMetrics: {
                    averageHallucinationScore: avgHallucination,
                    averageCompletenessScore: avgCompleteness,
                    averageClinicalAccuracyScore: avgClinicalAccuracy,
                },
                costs: {
                    totalPrimaryModelCost,
                    totalJudgeModelCost,
                    totalCost: totalPrimaryModelCost + totalJudgeModelCost,
                },
                byTaskType,
            },
        };
    } catch (error) {
        logger.error({ event: 'get_ai_usage_stats_error', error, input });
        return {
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Failed to get AI usage stats',
        };
    }
}

// =============================================================================
// EXPORT: AI Tools
// =============================================================================

export const aiTools: MCPTool[] = [
    {
        name: 'get_ai_insights',
        description: 'Get AI-generated insights and evaluation scores for a patient. Returns quality metrics from LLM-as-Judge evaluations.',
        category: 'ai',
        inputSchema: GetAIInsightsSchema,
        requiredPermissions: ['patient:read', 'ai:read'],
        handler: getAIInsightsHandler,
    },
    {
        name: 'provide_ai_feedback',
        description: 'Submit feedback on AI recommendations for RLHF training. Supports thumbs up/down, corrections, and comments.',
        category: 'ai',
        inputSchema: ProvideAIFeedbackSchema,
        requiredPermissions: ['ai:write'],
        handler: provideAIFeedbackHandler,
    },
    {
        name: 'get_ai_usage_stats',
        description: 'Get AI usage statistics for the clinic including interaction counts, quality scores, and costs.',
        category: 'ai',
        inputSchema: GetAIUsageStatsSchema,
        requiredPermissions: ['ai:read', 'admin:read'],
        handler: getAIUsageStatsHandler,
    },
];

export const AI_TOOL_COUNT = aiTools.length;
