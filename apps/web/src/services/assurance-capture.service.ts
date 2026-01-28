/**
 * Assurance Capture Service
 *
 * Captures AI/Rules recommendations vs Human decisions for RLHF training.
 * This is the core data capture layer for the Clinical Assurance Platform pivot.
 *
 * Key responsibilities:
 * 1. Capture AI recommendations with full input context (for model replay)
 * 2. Record human decisions (may differ from AI)
 * 3. Link outcomes for ground truth (glosas, readmissions, etc.)
 * 4. De-identify patient IDs for LGPD compliance
 *
 * LGPD Article 20 Compliance:
 * - All patient IDs are hashed before storage
 * - Override reasons are captured for explainability
 * - Data can be used for model training without exposing PHI
 *
 * @module services/assurance-capture
 */

import { prisma } from '@/lib/prisma';
import { hashPatientId, hashData } from '@/lib/hash';
import type {
  AssuranceEventType,
  FeedbackType,
  FeedbackSource,
  OutcomeType,
  MatchMethod,
} from '@prisma/client';
import logger from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input for capturing an AI/Rules recommendation event
 */
export interface AssuranceEventInput {
  patientId: string;
  encounterId?: string;
  eventType: AssuranceEventType;
  clinicId: string;

  /**
   * CRITICAL: Raw input context for model training replay
   * This captures the state BEFORE AI evaluation ran.
   * Without this, we cannot replay the scenario for model training.
   *
   * @example
   * {
   *   rawText: "Prescribing Amoxicillin 500mg",
   *   tissCode: "10101012",
   *   domState: { ... },  // Screen state at trigger time (for Sidecar)
   *   formFields: { medication: "Amoxicillin", dose: "500mg" }
   * }
   */
  inputContextSnapshot: {
    rawText?: string;
    tissCode?: string;
    domState?: Record<string, unknown>;
    formFields?: Record<string, string>;
    vitalSigns?: Record<string, number>;
    chiefComplaint?: string;
    symptoms?: string[];
    [key: string]: unknown;
  };

  /**
   * The AI/Rules recommendation
   */
  aiRecommendation: Record<string, unknown>;
  aiConfidence?: number;
  aiProvider?: string;
  aiLatencyMs?: number;

  /**
   * Optional: Link to specific rule version for regression tracking
   */
  ruleVersionId?: string;
}

/**
 * Input for recording a human decision
 */
export interface HumanDecisionInput {
  decision: Record<string, unknown>;
  override: boolean;
  reason?: string;
}

/**
 * Input for linking an outcome to an event
 */
export interface OutcomeInput {
  type: OutcomeType;
  value: Record<string, unknown>;
  date: Date;
  glosa?: {
    code: string;
    amount: number;
    recovered?: boolean;
    appealStrategy?: string;
  };
  matchScore?: number;
  matchMethod?: MatchMethod;
  insurerProtocol?: string;
}

/**
 * Input for human feedback
 */
export interface FeedbackInput {
  type: FeedbackType;
  value: Record<string, unknown>;
  source: FeedbackSource;
}

/**
 * Result of capturing an assurance event
 */
export interface CaptureResult {
  eventId: string;
  patientIdHash: string;
  inputHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class AssuranceCaptureService {
  /**
   * Capture an AI/Rules recommendation event
   *
   * This is called when the system generates a recommendation.
   * The human decision will be recorded separately when they act.
   *
   * @param input - The event data including inputContextSnapshot
   * @returns Event ID and hashes for tracking
   *
   * @example
   * ```typescript
   * const result = await assuranceCaptureService.captureAIEvent({
   *   patientId: 'patient-123',
   *   eventType: 'DIAGNOSIS',
   *   clinicId: 'clinic-456',
   *   inputContextSnapshot: {
   *     chiefComplaint: 'chest pain',
   *     symptoms: ['shortness of breath', 'sweating'],
   *   },
   *   aiRecommendation: {
   *     differentials: [{ icd10: 'I21.9', probability: 0.75 }],
   *     urgency: 'emergent',
   *   },
   *   aiConfidence: 0.85,
   *   aiProvider: 'claude',
   *   aiLatencyMs: 1250,
   * });
   * ```
   */
  async captureAIEvent(input: AssuranceEventInput): Promise<CaptureResult> {
    const patientIdHash = hashPatientId(input.patientId);
    const inputHash = hashData(input.inputContextSnapshot);

    try {
      const event = await prisma.assuranceEvent.create({
        data: {
          patientIdHash,
          encounterId: input.encounterId,
          eventType: input.eventType,
          inputContextSnapshot: input.inputContextSnapshot,
          aiRecommendation: input.aiRecommendation,
          aiConfidence: input.aiConfidence,
          aiProvider: input.aiProvider,
          aiLatencyMs: input.aiLatencyMs,
          ruleVersionId: input.ruleVersionId,
          clinicId: input.clinicId,
        },
      });

      logger.info({
        event: 'assurance_event_captured',
        eventId: event.id,
        eventType: input.eventType,
        patientIdHash,
        clinicId: input.clinicId,
        aiProvider: input.aiProvider,
        aiLatencyMs: input.aiLatencyMs,
      });

      return {
        eventId: event.id,
        patientIdHash,
        inputHash,
      };
    } catch (error) {
      logger.error({
        event: 'assurance_event_capture_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        eventType: input.eventType,
        clinicId: input.clinicId,
      });
      throw error;
    }
  }

  /**
   * Record the human decision for an existing event
   *
   * This is called when the human makes their decision,
   * which may or may not match the AI recommendation.
   *
   * @param eventId - The assurance event ID
   * @param decision - The human's decision data
   *
   * @example
   * ```typescript
   * await assuranceCaptureService.recordHumanDecision('event-123', {
   *   decision: { icd10: 'I21.0', confirmed: true },
   *   override: false,
   * });
   *
   * // With override
   * await assuranceCaptureService.recordHumanDecision('event-456', {
   *   decision: { icd10: 'J06.9' },
   *   override: true,
   *   reason: 'Patient history indicates viral infection, not cardiac',
   * });
   * ```
   */
  async recordHumanDecision(eventId: string, decision: HumanDecisionInput): Promise<void> {
    try {
      await prisma.assuranceEvent.update({
        where: { id: eventId },
        data: {
          humanDecision: decision.decision,
          humanOverride: decision.override,
          overrideReason: decision.reason,
          decidedAt: new Date(),
        },
      });

      logger.info({
        event: 'human_decision_recorded',
        eventId,
        override: decision.override,
        hasReason: !!decision.reason,
      });
    } catch (error) {
      logger.error({
        event: 'human_decision_record_failed',
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Link an outcome to an assurance event for ground truth
   *
   * This is typically called asynchronously when outcomes are known,
   * such as when a glosa is received or a patient is readmitted.
   *
   * @param eventId - The assurance event ID
   * @param outcome - The outcome data
   *
   * @example
   * ```typescript
   * // Glosa outcome (billing denial)
   * await assuranceCaptureService.linkOutcome('event-123', {
   *   type: 'GLOSA',
   *   value: { denialReason: 'Procedure not covered', insurerId: 'UNIMED-SP' },
   *   date: new Date('2024-02-15'),
   *   glosa: {
   *     code: '001.01',
   *     amount: 450.00,
   *     recovered: false,
   *   },
   *   matchScore: 0.98,
   *   matchMethod: 'FUZZY',
   *   insurerProtocol: 'TISS-2024-001234',
   * });
   * ```
   */
  async linkOutcome(eventId: string, outcome: OutcomeInput): Promise<void> {
    try {
      await prisma.outcomeGroundTruth.create({
        data: {
          assuranceEventId: eventId,
          outcomeType: outcome.type,
          outcomeValue: outcome.value,
          outcomeDate: outcome.date,
          glosaCode: outcome.glosa?.code,
          glosaAmount: outcome.glosa?.amount,
          glosaRecovered: outcome.glosa?.recovered,
          appealStrategy: outcome.glosa?.appealStrategy,
          matchScore: outcome.matchScore,
          matchMethod: outcome.matchMethod,
          insurerProtocol: outcome.insurerProtocol,
        },
      });

      logger.info({
        event: 'outcome_linked',
        eventId,
        outcomeType: outcome.type,
        hasGlosa: !!outcome.glosa,
        matchScore: outcome.matchScore,
      });
    } catch (error) {
      logger.error({
        event: 'outcome_link_failed',
        eventId,
        outcomeType: outcome.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Add human feedback to an assurance event
   *
   * Feedback can be provided at any time after the event is created.
   * Multiple feedback entries can be added to the same event.
   *
   * @param eventId - The assurance event ID
   * @param feedback - The feedback data
   *
   * @example
   * ```typescript
   * await assuranceCaptureService.addFeedback('event-123', {
   *   type: 'CORRECTION',
   *   value: {
   *     field: 'diagnosis',
   *     original: 'J06.9',
   *     corrected: 'J18.9',
   *     reason: 'X-ray confirmed pneumonia',
   *   },
   *   source: 'PHYSICIAN',
   * });
   * ```
   */
  async addFeedback(eventId: string, feedback: FeedbackInput): Promise<void> {
    try {
      await prisma.humanFeedback.create({
        data: {
          assuranceEventId: eventId,
          feedbackType: feedback.type,
          feedbackValue: feedback.value,
          feedbackSource: feedback.source,
        },
      });

      logger.info({
        event: 'feedback_added',
        eventId,
        feedbackType: feedback.type,
        feedbackSource: feedback.source,
      });
    } catch (error) {
      logger.error({
        event: 'feedback_add_failed',
        eventId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get an assurance event by ID with all related data
   *
   * @param eventId - The assurance event ID
   * @returns The event with feedback and outcome
   */
  async getEvent(eventId: string) {
    return prisma.assuranceEvent.findUnique({
      where: { id: eventId },
      include: {
        feedback: true,
        outcome: true,
        ruleVersion: true,
      },
    });
  }

  /**
   * Get events that need human decision (pending)
   *
   * @param clinicId - Filter by clinic
   * @param limit - Max number of events to return
   */
  async getPendingEvents(clinicId: string, limit: number = 50) {
    return prisma.assuranceEvent.findMany({
      where: {
        clinicId,
        decidedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get events where human overrode AI recommendation
   *
   * These are the most valuable for RLHF training - they represent
   * cases where the AI was wrong or the human had additional context.
   *
   * @param clinicId - Filter by clinic
   * @param startDate - Start of date range
   * @param endDate - End of date range
   */
  async getOverrideEvents(
    clinicId: string,
    startDate: Date,
    endDate: Date = new Date()
  ) {
    return prisma.assuranceEvent.findMany({
      where: {
        clinicId,
        humanOverride: true,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        feedback: true,
        outcome: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get events that resulted in glosas (billing denials)
   *
   * These are critical for improving the billing rules engine.
   *
   * @param clinicId - Filter by clinic
   * @param startDate - Start of date range
   */
  async getGlosaEvents(clinicId: string, startDate: Date) {
    return prisma.assuranceEvent.findMany({
      where: {
        clinicId,
        eventType: 'BILLING',
        createdAt: { gte: startDate },
        outcome: {
          outcomeType: { in: ['GLOSA', 'APPEAL_WON', 'APPEAL_LOST'] },
        },
      },
      include: {
        outcome: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Calculate conflict rate (AI vs Human disagreement)
   *
   * This metric indicates how often humans override AI recommendations.
   * High conflict rates may indicate:
   * - AI needs retraining on specific scenarios
   * - Rules are too strict/loose
   * - Domain-specific knowledge gaps
   *
   * @param clinicId - Filter by clinic
   * @param eventType - Filter by event type
   * @param days - Number of days to look back
   */
  async calculateConflictRate(
    clinicId: string,
    eventType?: AssuranceEventType,
    days: number = 30
  ): Promise<{ total: number; overrides: number; rate: number }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [total, overrides] = await Promise.all([
      prisma.assuranceEvent.count({
        where: {
          clinicId,
          eventType,
          createdAt: { gte: startDate },
          decidedAt: { not: null },
        },
      }),
      prisma.assuranceEvent.count({
        where: {
          clinicId,
          eventType,
          createdAt: { gte: startDate },
          humanOverride: true,
        },
      }),
    ]);

    return {
      total,
      overrides,
      rate: total > 0 ? overrides / total : 0,
    };
  }
}

// Singleton export
export const assuranceCaptureService = new AssuranceCaptureService();
