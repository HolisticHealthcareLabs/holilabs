/**
 * TISS Reconciliation Service
 *
 * Handles the critical task of matching insurer TISS XML returns
 * to our internal AssuranceEvents for ground truth linking.
 *
 * THE PROBLEM:
 * TISS XML returns from insurers do NOT contain our internal IDs.
 * Insurers only know their protocols, not our AssuranceEventIds.
 * We need fuzzy matching to link outcomes to events.
 *
 * MATCHING STRATEGY:
 * 1. Ingest TISS XML (XML -> JSON) from insurer glosa reports
 * 2. Fuzzy Match against AssuranceEvent where:
 *    - patientIdHash == incoming_patient_hash
 *    - ABS(eventTimestamp - billingTimestamp) < 24_hours
 *    - inputContext.procedureCode == xml.procedureCode
 * 3. If Match Score > 0.95, auto-link OutcomeGroundTruth
 * 4. If Match Score < 0.95, queue for manual reconciliation
 *
 * EXPECTED INITIAL MATCH RATE: ~40%
 * This will improve as we tune the matching algorithm.
 *
 * @module services/tiss-reconciliation
 */

import { prisma } from '@/lib/prisma';
import { hashPatientId } from '@/lib/hash';
import type { MatchMethod, OutcomeType } from '@prisma/client';
import logger from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parsed TISS XML record (Brazilian billing standard)
 */
export interface TissRecord {
  // Insurer identifiers
  insurerProtocol: string;       // Insurer's protocol number
  insurerId: string;             // Insurer code (e.g., "UNIMED-SP")

  // Patient identifiers (used for hashing)
  patientCpf?: string;           // Brazilian CPF
  patientName?: string;          // Fallback for hashing
  patientBirthDate?: string;     // For additional matching

  // Procedure details
  tissCode: string;              // TISS procedure code
  tissDescription?: string;      // Procedure description
  procedureDate: Date;           // When procedure was performed
  billingDate: Date;             // When billing was submitted

  // Glosa details (if denied)
  isGlosa: boolean;
  glosaCode?: string;            // Brazilian denial code
  glosaReason?: string;          // Denial reason
  billedAmount: number;          // R$ amount billed
  glosaAmount?: number;          // R$ amount denied
  paidAmount?: number;           // R$ amount paid

  // Raw data for debugging
  rawXml?: string;
}

/**
 * Candidate match from our database
 */
export interface MatchCandidate {
  eventId: string;
  patientIdHash: string;
  eventType: string;
  createdAt: Date;
  inputContext: Record<string, unknown>;
  matchScore: number;
  matchReasons: string[];
}

/**
 * Result of reconciliation attempt
 */
export interface ReconciliationResult {
  tissProtocol: string;
  status: 'matched' | 'pending_review' | 'no_candidates';
  matchScore?: number;
  matchMethod?: MatchMethod;
  eventId?: string;
  candidates?: MatchCandidate[];
}

/**
 * Pending reconciliation record
 */
export interface PendingReconciliation {
  id: string;
  tissRecord: TissRecord;
  candidates: MatchCandidate[];
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class TissReconciliationService {
  /**
   * Time window for matching events (24 hours in milliseconds)
   */
  private readonly MATCH_WINDOW_MS = 24 * 60 * 60 * 1000;

  /**
   * Threshold for auto-linking (0.95 = 95% confidence)
   */
  private readonly AUTO_LINK_THRESHOLD = 0.95;

  /**
   * Minimum score to consider a candidate (0.5 = 50%)
   */
  private readonly MIN_CANDIDATE_THRESHOLD = 0.5;

  /**
   * Process a batch of TISS records from insurer XML
   *
   * @param records - Parsed TISS records
   * @returns Results for each record
   */
  async processBatch(records: TissRecord[]): Promise<ReconciliationResult[]> {
    const results: ReconciliationResult[] = [];

    for (const record of records) {
      try {
        const result = await this.reconcileSingle(record);
        results.push(result);
      } catch (error) {
        logger.error({
          event: 'tiss_reconciliation_error',
          tissProtocol: record.insurerProtocol,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        results.push({
          tissProtocol: record.insurerProtocol,
          status: 'no_candidates',
        });
      }
    }

    const matched = results.filter((r) => r.status === 'matched').length;
    const pending = results.filter((r) => r.status === 'pending_review').length;
    const noMatch = results.filter((r) => r.status === 'no_candidates').length;

    logger.info({
      event: 'tiss_batch_complete',
      total: records.length,
      matched,
      pendingReview: pending,
      noMatch,
      matchRate: records.length > 0 ? matched / records.length : 0,
    });

    return results;
  }

  /**
   * Reconcile a single TISS record to an AssuranceEvent
   *
   * @param record - The TISS record to reconcile
   * @returns Reconciliation result
   */
  async reconcileSingle(record: TissRecord): Promise<ReconciliationResult> {
    // 1. Generate patient hash from available identifiers
    const patientIdHash = this.generatePatientHash(record);
    if (!patientIdHash) {
      return {
        tissProtocol: record.insurerProtocol,
        status: 'no_candidates',
      };
    }

    // 2. Find candidate events within time window
    const candidates = await this.findCandidates(record, patientIdHash);

    if (candidates.length === 0) {
      return {
        tissProtocol: record.insurerProtocol,
        status: 'no_candidates',
      };
    }

    // 3. Score and rank candidates
    const scoredCandidates = this.scoreCandidates(candidates, record);
    const bestMatch = scoredCandidates[0];

    // 4. Auto-link if high confidence, otherwise queue for review
    if (bestMatch.matchScore >= this.AUTO_LINK_THRESHOLD) {
      await this.linkOutcome(bestMatch.eventId, record, bestMatch.matchScore, 'FUZZY');

      logger.info({
        event: 'tiss_auto_linked',
        tissProtocol: record.insurerProtocol,
        eventId: bestMatch.eventId,
        matchScore: bestMatch.matchScore,
      });

      return {
        tissProtocol: record.insurerProtocol,
        status: 'matched',
        matchScore: bestMatch.matchScore,
        matchMethod: 'FUZZY',
        eventId: bestMatch.eventId,
      };
    }

    // Queue for manual review
    await this.queueForReview(record, scoredCandidates);

    return {
      tissProtocol: record.insurerProtocol,
      status: 'pending_review',
      matchScore: bestMatch.matchScore,
      candidates: scoredCandidates,
    };
  }

  /**
   * Generate patient hash from TISS record
   *
   * Priority: CPF > Name+BirthDate
   */
  private generatePatientHash(record: TissRecord): string | null {
    if (record.patientCpf) {
      return hashPatientId(record.patientCpf);
    }

    if (record.patientName && record.patientBirthDate) {
      // Normalize name: lowercase, remove accents, trim
      const normalizedName = record.patientName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      return hashPatientId(`${normalizedName}:${record.patientBirthDate}`);
    }

    logger.warn({
      event: 'tiss_no_patient_id',
      tissProtocol: record.insurerProtocol,
    });

    return null;
  }

  /**
   * Find candidate AssuranceEvents within matching criteria
   */
  private async findCandidates(
    record: TissRecord,
    patientIdHash: string
  ): Promise<MatchCandidate[]> {
    // Search window: 24 hours before and after procedure date
    const windowStart = new Date(record.procedureDate.getTime() - this.MATCH_WINDOW_MS);
    const windowEnd = new Date(record.procedureDate.getTime() + this.MATCH_WINDOW_MS);

    const events = await prisma.assuranceEvent.findMany({
      where: {
        patientIdHash,
        eventType: 'BILLING',
        createdAt: {
          gte: windowStart,
          lte: windowEnd,
        },
        // Don't match events that already have outcomes
        outcome: null,
      },
      select: {
        id: true,
        patientIdHash: true,
        eventType: true,
        createdAt: true,
        inputContextSnapshot: true,
      },
    });

    return events.map((event) => ({
      eventId: event.id,
      patientIdHash: event.patientIdHash,
      eventType: event.eventType,
      createdAt: event.createdAt,
      inputContext: event.inputContextSnapshot as Record<string, unknown>,
      matchScore: 0,
      matchReasons: [],
    }));
  }

  /**
   * Score candidates based on matching criteria
   *
   * Scoring weights:
   * - Patient hash match: 40 points (mandatory)
   * - TISS code match: 30 points
   * - Time proximity: 20 points (closer = higher)
   * - Additional context: 10 points
   */
  private scoreCandidates(
    candidates: MatchCandidate[],
    record: TissRecord
  ): MatchCandidate[] {
    const scored = candidates.map((candidate) => {
      let score = 0;
      const reasons: string[] = [];

      // Patient hash already matched (40 points baseline)
      score += 40;
      reasons.push('patient_hash_match');

      // TISS code match (30 points)
      const candidateTissCode = candidate.inputContext?.tissCode as string;
      if (candidateTissCode === record.tissCode) {
        score += 30;
        reasons.push('tiss_code_exact');
      } else if (candidateTissCode?.startsWith(record.tissCode.substring(0, 4))) {
        // Partial match (same category)
        score += 15;
        reasons.push('tiss_code_partial');
      }

      // Time proximity (20 points max)
      const timeDiff = Math.abs(
        candidate.createdAt.getTime() - record.procedureDate.getTime()
      );
      const timeScore = Math.max(0, 20 - (timeDiff / this.MATCH_WINDOW_MS) * 20);
      score += timeScore;
      if (timeScore > 10) {
        reasons.push('time_proximity_close');
      }

      // Additional context matches (10 points)
      const contextAmount = candidate.inputContext?.billedAmount as number;
      if (contextAmount && Math.abs(contextAmount - record.billedAmount) < 1) {
        score += 10;
        reasons.push('amount_match');
      }

      return {
        ...candidate,
        matchScore: score / 100, // Normalize to 0-1
        matchReasons: reasons,
      };
    });

    // Sort by score descending
    return scored
      .filter((c) => c.matchScore >= this.MIN_CANDIDATE_THRESHOLD)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Link outcome to AssuranceEvent
   */
  private async linkOutcome(
    eventId: string,
    record: TissRecord,
    matchScore: number,
    matchMethod: MatchMethod
  ): Promise<void> {
    const outcomeType: OutcomeType = record.isGlosa ? 'GLOSA' : 'SUCCESS';

    await prisma.outcomeGroundTruth.create({
      data: {
        assuranceEventId: eventId,
        outcomeType,
        outcomeValue: {
          tissCode: record.tissCode,
          insurerId: record.insurerId,
          billedAmount: record.billedAmount,
          paidAmount: record.paidAmount,
          glosaReason: record.glosaReason,
        },
        outcomeDate: record.billingDate,
        glosaCode: record.glosaCode,
        glosaAmount: record.glosaAmount,
        matchScore,
        matchMethod,
        insurerProtocol: record.insurerProtocol,
      },
    });
  }

  /**
   * Queue unresolved matches for manual review
   *
   * Stores in a simple JSON structure for now.
   * In production, this would go to a proper queue/table.
   */
  private async queueForReview(
    record: TissRecord,
    candidates: MatchCandidate[]
  ): Promise<void> {
    // For now, just log. In production, this would:
    // 1. Store in a pending_reconciliations table
    // 2. Trigger notification to billing team
    // 3. Show in admin dashboard

    logger.info({
      event: 'tiss_queued_for_review',
      tissProtocol: record.insurerProtocol,
      tissCode: record.tissCode,
      candidateCount: candidates.length,
      topCandidateScore: candidates[0]?.matchScore,
    });
  }

  /**
   * Manually link a TISS record to an AssuranceEvent
   *
   * Called when a human reviews and confirms a match.
   *
   * @param tissProtocol - The insurer protocol number
   * @param eventId - The AssuranceEvent to link to
   * @param record - The original TISS record
   */
  async manualLink(
    tissProtocol: string,
    eventId: string,
    record: TissRecord
  ): Promise<void> {
    await this.linkOutcome(eventId, record, 1.0, 'MANUAL');

    logger.info({
      event: 'tiss_manual_linked',
      tissProtocol,
      eventId,
    });
  }

  /**
   * Get reconciliation statistics
   */
  async getStats(
    clinicId: string,
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<{
    totalOutcomes: number;
    byMatchMethod: Record<string, number>;
    averageMatchScore: number;
    glosaRecoveryRate: number;
  }> {
    const outcomes = await prisma.outcomeGroundTruth.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        assuranceEvent: {
          clinicId,
        },
      },
      select: {
        matchMethod: true,
        matchScore: true,
        glosaRecovered: true,
        outcomeType: true,
      },
    });

    const byMatchMethod: Record<string, number> = {};
    let totalScore = 0;
    let scoreCount = 0;
    let glosas = 0;
    let recoveredGlosas = 0;

    for (const outcome of outcomes) {
      const method = outcome.matchMethod || 'UNKNOWN';
      byMatchMethod[method] = (byMatchMethod[method] || 0) + 1;

      if (outcome.matchScore) {
        totalScore += outcome.matchScore;
        scoreCount++;
      }

      if (outcome.outcomeType === 'GLOSA' || outcome.outcomeType === 'APPEAL_WON') {
        glosas++;
        if (outcome.glosaRecovered) {
          recoveredGlosas++;
        }
      }
    }

    return {
      totalOutcomes: outcomes.length,
      byMatchMethod,
      averageMatchScore: scoreCount > 0 ? totalScore / scoreCount : 0,
      glosaRecoveryRate: glosas > 0 ? recoveredGlosas / glosas : 0,
    };
  }
}

// Singleton export
export const tissReconciliationService = new TissReconciliationService();
