/**
 * LLM-as-Judge Quality Pipeline
 *
 * Law 6 Compliance: Every AI interaction must be graded asynchronously.
 * Uses a cheaper, faster model (Gemini Flash) to evaluate the primary model's output.
 *
 * The Check: "Is every AI interaction logged with quality scores in the database?"
 *
 * Usage:
 *   // Fire-and-forget evaluation (doesn't block main flow)
 *   scheduleEvaluation({
 *     taskType: 'diagnosis-support',
 *     input: patientSymptoms,
 *     output: aiDiagnosis,
 *   }, interactionId);
 *
 *   // Or wrap AI calls with automatic evaluation
 *   const result = await withEvaluation('diagnosis-support')(
 *     () => aiToJSON(prompt, schema),
 *     inputData,
 *     schema
 *   );
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { aiToJSON, type BridgeOptions } from '@/lib/ai/bridge';
import logger from '@/lib/logger';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Flagged issue from evaluation */
export interface FlaggedIssue {
  type: 'hallucination' | 'missing_field' | 'clinical_error' | 'formatting';
  description: string;
  severity: 'critical' | 'major' | 'minor';
}

/** Result of AI evaluation */
export interface AIEvaluation {
  hallucinationScore: number;       // 0 = no hallucination, 1 = complete fabrication
  completenessScore: number;        // 0 = nothing relevant, 1 = fully complete
  clinicalAccuracyScore: number;    // 0 = clinically wrong, 1 = clinically accurate
  reasoning: string;
  flaggedIssues: FlaggedIssue[];
}

/** Context for evaluation */
export interface EvaluationContext {
  taskType: string;
  input: unknown;
  output: unknown;
  goldStandardCriteria?: string[];
}

// ═══════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════

const flaggedIssueSchema = z.object({
  type: z.enum(['hallucination', 'missing_field', 'clinical_error', 'formatting']),
  description: z.string(),
  severity: z.enum(['critical', 'major', 'minor']),
});

const evaluationSchema = z.object({
  hallucinationScore: z.number().min(0).max(1),
  completenessScore: z.number().min(0).max(1),
  clinicalAccuracyScore: z.number().min(0).max(1),
  reasoning: z.string(),
  flaggedIssues: z.array(flaggedIssueSchema),
});

// ═══════════════════════════════════════════════════════════════
// JUDGE PROMPTS
// ═══════════════════════════════════════════════════════════════

/**
 * Build evaluation prompt for the judge model
 */
function buildJudgePrompt(context: EvaluationContext): string {
  const { taskType, input, output, goldStandardCriteria } = context;

  const criteriaSection = goldStandardCriteria && goldStandardCriteria.length > 0
    ? `
GOLD STANDARD CRITERIA (must be met for high accuracy):
${goldStandardCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}
`
    : '';

  return `You are a clinical AI quality evaluator. Your job is to grade AI outputs for accuracy and safety.

TASK TYPE: ${taskType}

INPUT PROVIDED TO AI:
${JSON.stringify(input, null, 2)}

AI OUTPUT TO EVALUATE:
${JSON.stringify(output, null, 2)}
${criteriaSection}
EVALUATION INSTRUCTIONS:

1. **hallucinationScore** (0-1):
   - 0.0 = All information directly derived from or supported by the input
   - 0.3 = Minor embellishments but core facts correct
   - 0.6 = Some fabricated details not in input
   - 1.0 = Significant fabrication of clinical information

2. **completenessScore** (0-1):
   - 0.0 = Missing all relevant information from input
   - 0.5 = Captured about half of relevant details
   - 0.8 = Captured most important information with minor gaps
   - 1.0 = Comprehensive capture of all relevant information

3. **clinicalAccuracyScore** (0-1):
   - 0.0 = Clinically dangerous or completely wrong
   - 0.5 = Partially correct but with significant errors
   - 0.8 = Mostly accurate with minor issues
   - 1.0 = Clinically accurate and appropriate

4. **flaggedIssues**: List specific problems found. Types:
   - "hallucination": Information not in input
   - "missing_field": Required information not captured
   - "clinical_error": Medically incorrect content
   - "formatting": Structure/format issues

   Severity:
   - "critical": Could cause patient harm
   - "major": Significant error requiring correction
   - "minor": Small issue, not dangerous

5. **reasoning**: Brief explanation of your evaluation (2-3 sentences)

BE STRICT. Clinical AI must meet the highest standards. If in doubt, flag the issue.

Return your evaluation as a JSON object matching this schema exactly:
{
  "hallucinationScore": number,
  "completenessScore": number,
  "clinicalAccuracyScore": number,
  "reasoning": "string",
  "flaggedIssues": [
    { "type": "string", "description": "string", "severity": "string" }
  ]
}`;
}

// ═══════════════════════════════════════════════════════════════
// EVALUATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate AI output using the judge model.
 * This is the core evaluation function.
 *
 * @param context Evaluation context with input, output, and criteria
 * @param interactionId Unique ID linking to original AI call
 */
export async function evaluateAIOutput(
  context: EvaluationContext,
  interactionId: string
): Promise<AIEvaluation | null> {
  const startTime = Date.now();

  logger.info({
    event: 'llm_judge_start',
    interactionId,
    taskType: context.taskType,
  });

  try {
    const prompt = buildJudgePrompt(context);

    // Use summarization task which routes to Gemini (cheap, fast)
    const bridgeOptions: BridgeOptions = {
      task: 'summarization',      // Routes to Gemini Flash
      temperature: 0,              // Deterministic evaluation
      deidentify: false,           // Already processed data
      maxRetries: 1,               // One retry max
    };

    const evaluation = await aiToJSON(prompt, evaluationSchema, bridgeOptions);

    const latencyMs = Date.now() - startTime;

    // Log to database
    await prisma.aIInteractionEvaluation.create({
      data: {
        interactionId,
        taskType: context.taskType,
        hallucinationScore: evaluation.hallucinationScore,
        completenessScore: evaluation.completenessScore,
        clinicalAccuracyScore: evaluation.clinicalAccuracyScore,
        flaggedIssues: evaluation.flaggedIssues,
        reasoning: evaluation.reasoning,
        judgeModel: 'gemini-flash',
        judgeLatencyMs: latencyMs,
        evaluatedAt: new Date(),
      },
    });

    logger.info({
      event: 'llm_judge_complete',
      interactionId,
      taskType: context.taskType,
      hallucinationScore: evaluation.hallucinationScore,
      completenessScore: evaluation.completenessScore,
      clinicalAccuracyScore: evaluation.clinicalAccuracyScore,
      issueCount: evaluation.flaggedIssues.length,
      latencyMs,
    });

    // Alert on critical issues
    const criticalIssues = evaluation.flaggedIssues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      await alertClinicalTeam(interactionId, context.taskType, criticalIssues);
    }

    return evaluation;

  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({
      event: 'llm_judge_failed',
      interactionId,
      taskType: context.taskType,
      error: errorMessage,
      latencyMs,
    });

    // Log failure to database (don't block main flow)
    try {
      await prisma.aIInteractionEvaluation.create({
        data: {
          interactionId,
          taskType: context.taskType,
          evaluationFailed: true,
          failureReason: errorMessage,
          judgeLatencyMs: latencyMs,
          evaluatedAt: new Date(),
        },
      });
    } catch (dbError) {
      logger.error({
        event: 'llm_judge_db_log_failed',
        interactionId,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    return null;
  }
}

/**
 * Schedule evaluation asynchronously (fire-and-forget).
 * This is the recommended way to call evaluations to avoid blocking.
 */
export function scheduleEvaluation(
  context: EvaluationContext,
  interactionId: string
): void {
  // Use setImmediate to run evaluation after current event loop
  setImmediate(() => {
    evaluateAIOutput(context, interactionId).catch((error) => {
      logger.error({
        event: 'llm_judge_scheduled_failed',
        interactionId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// ALERTING
// ═══════════════════════════════════════════════════════════════

/**
 * Alert clinical team about critical AI quality issues
 */
async function alertClinicalTeam(
  interactionId: string,
  taskType: string,
  criticalIssues: FlaggedIssue[]
): Promise<void> {
  logger.warn({
    event: 'llm_judge_critical_alert',
    interactionId,
    taskType,
    issueCount: criticalIssues.length,
    issues: criticalIssues.map(i => i.description),
  });

  try {
    // Find admin users to notify
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      take: 5, // Limit to avoid spamming
      select: { id: true },
    });

    // Create notifications for each admin
    await Promise.all(
      admins.map((admin) =>
        prisma.notification.create({
          data: {
            recipientId: admin.id,
            recipientType: 'CLINICIAN',
            type: 'SECURITY_ALERT',
            priority: 'HIGH',
            title: 'Critical AI Quality Issue Detected',
            message: `Interaction ${interactionId} (${taskType}): ${criticalIssues.map(i => i.description).join('; ')}`,
            resourceType: 'AIInteractionEvaluation',
            resourceId: interactionId,
          },
        })
      )
    );
  } catch (error) {
    logger.error({
      event: 'llm_judge_alert_failed',
      interactionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// WRAPPER FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Wrap AI calls with automatic quality evaluation.
 *
 * Returns a function that:
 * 1. Executes the AI call
 * 2. Schedules async evaluation (doesn't block return)
 * 3. Returns result immediately
 *
 * @param taskType Task type for categorization
 * @param goldStandardCriteria Optional criteria for evaluation
 *
 * @example
 * const evaluatedDiagnosis = withEvaluation('diagnosis-support', [
 *   'All ICD-10 codes must be valid',
 *   'Red flags must be clinically appropriate',
 * ]);
 *
 * const result = await evaluatedDiagnosis(
 *   () => aiToJSON(prompt, schema),
 *   inputData,
 *   schema
 * );
 */
export function withEvaluation<T>(
  taskType: string,
  goldStandardCriteria?: string[]
) {
  return async function (
    aiCall: () => Promise<T>,
    input: unknown
  ): Promise<{ data: T; interactionId: string }> {
    const interactionId = generateInteractionId();

    // Execute AI call
    const result = await aiCall();

    // Schedule async evaluation (fire-and-forget)
    scheduleEvaluation(
      {
        taskType,
        input,
        output: result,
        goldStandardCriteria,
      },
      interactionId
    );

    return { data: result, interactionId };
  };
}

// ═══════════════════════════════════════════════════════════════
// QUALITY METRICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get quality metrics for a time period
 */
export async function getQualityMetrics(
  startDate: Date,
  endDate: Date,
  taskType?: string
): Promise<QualityMetrics> {
  const where = {
    evaluatedAt: {
      gte: startDate,
      lte: endDate,
    },
    evaluationFailed: false,
    ...(taskType && { taskType }),
  };

  const evaluations = await prisma.aIInteractionEvaluation.findMany({
    where,
    select: {
      hallucinationScore: true,
      completenessScore: true,
      clinicalAccuracyScore: true,
      flaggedIssues: true,
      taskType: true,
    },
  });

  const count = evaluations.length;
  if (count === 0) {
    return {
      period: { start: startDate, end: endDate },
      taskType: taskType || 'all',
      totalEvaluations: 0,
      avgHallucinationScore: null,
      avgCompletenessScore: null,
      avgClinicalAccuracyScore: null,
      criticalIssueCount: 0,
      majorIssueCount: 0,
      minorIssueCount: 0,
    };
  }

  // Calculate averages
  let hallucinationSum = 0;
  let completenessSum = 0;
  let accuracySum = 0;
  let criticalCount = 0;
  let majorCount = 0;
  let minorCount = 0;

  for (const eval_ of evaluations) {
    hallucinationSum += eval_.hallucinationScore ?? 0;
    completenessSum += eval_.completenessScore ?? 0;
    accuracySum += eval_.clinicalAccuracyScore ?? 0;

    const issues = (eval_.flaggedIssues as unknown as FlaggedIssue[]) || [];
    for (const issue of issues) {
      if (issue.severity === 'critical') criticalCount++;
      else if (issue.severity === 'major') majorCount++;
      else minorCount++;
    }
  }

  return {
    period: { start: startDate, end: endDate },
    taskType: taskType || 'all',
    totalEvaluations: count,
    avgHallucinationScore: hallucinationSum / count,
    avgCompletenessScore: completenessSum / count,
    avgClinicalAccuracyScore: accuracySum / count,
    criticalIssueCount: criticalCount,
    majorIssueCount: majorCount,
    minorIssueCount: minorCount,
  };
}

export interface QualityMetrics {
  period: { start: Date; end: Date };
  taskType: string;
  totalEvaluations: number;
  avgHallucinationScore: number | null;
  avgCompletenessScore: number | null;
  avgClinicalAccuracyScore: number | null;
  criticalIssueCount: number;
  majorIssueCount: number;
  minorIssueCount: number;
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Generate unique interaction ID for tracing
 */
function generateInteractionId(): string {
  return `ai_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Generate interaction ID (exported for external use)
 */
export { generateInteractionId };
