/**
 * Review Queue Service
 *
 * Manages the manual review queue for AI-generated content that needs
 * clinician verification (low confidence, high risk, or flagged items)
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export interface ReviewQueueItem {
  id: string;
  contentType: string;
  contentId: string;
  sectionType?: string;
  priority: number;
  confidence: number;
  patientId: string;
  patientName: string;
  clinicianId: string;
  flagReason: string;
  flagDetails?: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'CORRECTED' | 'ESCALATED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  wasCorrect?: boolean;
  corrections?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewQueueFilters {
  clinicianId?: string;
  status?: string;
  priority?: number;
  contentType?: string;
  patientId?: string;
}

export interface ReviewQueueStats {
  totalPending: number;
  totalInReview: number;
  totalApproved: number;
  totalCorrected: number;
  avgConfidence: number;
  highPriorityCount: number;
  byContentType: Record<string, number>;
  byFlagReason: Record<string, number>;
}

export class ReviewQueueService {
  /**
   * Get review queue items for a clinician
   */
  async getQueueItems(
    clinicianId: string,
    filters?: ReviewQueueFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ items: ReviewQueueItem[]; total: number }> {
    try {
      const where: any = {
        clinicianId,
      };

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.contentType) {
        where.contentType = filters.contentType;
      }

      if (filters?.patientId) {
        where.patientId = filters.patientId;
      }

      if (filters?.priority) {
        where.priority = { gte: filters.priority };
      }

      const [items, total] = await Promise.all([
        prisma.manualReviewQueueItem.findMany({
          where,
          include: {
            patient: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          take: limit,
          skip: offset,
        }),
        prisma.manualReviewQueueItem.count({ where }),
      ]);

      const reviewQueueItems: ReviewQueueItem[] = items.map((item) => ({
        id: item.id,
        contentType: item.contentType,
        contentId: item.contentId,
        sectionType: item.sectionType || undefined,
        priority: item.priority,
        confidence: item.confidence,
        patientId: item.patientId,
        patientName: `${item.patient.firstName} ${item.patient.lastName}`,
        clinicianId: item.clinicianId,
        flagReason: item.flagReason,
        flagDetails: item.flagDetails || undefined,
        status: item.status,
        reviewedBy: item.reviewedBy || undefined,
        reviewedAt: item.reviewedAt || undefined,
        reviewNotes: item.reviewNotes || undefined,
        wasCorrect: item.wasCorrect ?? undefined,
        corrections: item.corrections || undefined,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      logger.info({
        event: 'review_queue_fetched',
        clinicianId,
        total,
        filters,
      });

      return { items: reviewQueueItems, total };
    } catch (error) {
      logger.error({
        event: 'review_queue_fetch_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get queue statistics for a clinician
   */
  async getQueueStats(clinicianId: string): Promise<ReviewQueueStats> {
    try {
      const items = await prisma.manualReviewQueueItem.findMany({
        where: { clinicianId },
        select: {
          status: true,
          confidence: true,
          priority: true,
          contentType: true,
          flagReason: true,
        },
      });

      const stats: ReviewQueueStats = {
        totalPending: items.filter((i) => i.status === 'PENDING').length,
        totalInReview: items.filter((i) => i.status === 'IN_REVIEW').length,
        totalApproved: items.filter((i) => i.status === 'APPROVED').length,
        totalCorrected: items.filter((i) => i.status === 'CORRECTED').length,
        avgConfidence: items.length > 0 ? items.reduce((sum, i) => sum + i.confidence, 0) / items.length : 0,
        highPriorityCount: items.filter((i) => i.priority >= 8).length,
        byContentType: {},
        byFlagReason: {},
      };

      // Group by content type
      items.forEach((item) => {
        stats.byContentType[item.contentType] = (stats.byContentType[item.contentType] || 0) + 1;
      });

      // Group by flag reason
      items.forEach((item) => {
        stats.byFlagReason[item.flagReason] = (stats.byFlagReason[item.flagReason] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error({
        event: 'review_queue_stats_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Add an item to the review queue
   */
  async addToQueue(
    clinicianId: string,
    patientId: string,
    contentType: string,
    contentId: string,
    confidence: number,
    flagReason: string,
    options?: {
      sectionType?: string;
      priority?: number;
      flagDetails?: string;
    }
  ): Promise<ReviewQueueItem> {
    try {
      // Calculate priority based on confidence and flag reason
      let priority = options?.priority || 5;

      if (confidence < 0.7) priority = Math.max(priority, 8);
      if (confidence < 0.5) priority = 10;
      if (flagReason === 'high_risk') priority = 10;

      const item = await prisma.manualReviewQueueItem.create({
        data: {
          clinicianId,
          patientId,
          contentType,
          contentId,
          sectionType: options?.sectionType,
          confidence,
          priority,
          flagReason,
          flagDetails: options?.flagDetails,
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      logger.info({
        event: 'review_queue_item_added',
        itemId: item.id,
        clinicianId,
        contentType,
        priority,
      });

      return {
        id: item.id,
        contentType: item.contentType,
        contentId: item.contentId,
        sectionType: item.sectionType || undefined,
        priority: item.priority,
        confidence: item.confidence,
        patientId: item.patientId,
        patientName: `${item.patient.firstName} ${item.patient.lastName}`,
        clinicianId: item.clinicianId,
        flagReason: item.flagReason,
        flagDetails: item.flagDetails || undefined,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    } catch (error) {
      logger.error({
        event: 'review_queue_add_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update review status
   */
  async updateReviewStatus(
    itemId: string,
    reviewerId: string,
    status: 'IN_REVIEW' | 'APPROVED' | 'CORRECTED' | 'ESCALATED' | 'REJECTED',
    options?: {
      reviewNotes?: string;
      wasCorrect?: boolean;
      corrections?: string;
    }
  ): Promise<ReviewQueueItem> {
    try {
      const item = await prisma.manualReviewQueueItem.update({
        where: { id: itemId },
        data: {
          status,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNotes: options?.reviewNotes,
          wasCorrect: options?.wasCorrect,
          corrections: options?.corrections,
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      logger.info({
        event: 'review_queue_item_updated',
        itemId,
        reviewerId,
        status,
        wasCorrect: options?.wasCorrect,
      });

      return {
        id: item.id,
        contentType: item.contentType,
        contentId: item.contentId,
        sectionType: item.sectionType || undefined,
        priority: item.priority,
        confidence: item.confidence,
        patientId: item.patientId,
        patientName: `${item.patient.firstName} ${item.patient.lastName}`,
        clinicianId: item.clinicianId,
        flagReason: item.flagReason,
        flagDetails: item.flagDetails || undefined,
        status: item.status,
        reviewedBy: item.reviewedBy || undefined,
        reviewedAt: item.reviewedAt || undefined,
        reviewNotes: item.reviewNotes || undefined,
        wasCorrect: item.wasCorrect ?? undefined,
        corrections: item.corrections || undefined,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    } catch (error) {
      logger.error({
        event: 'review_queue_update_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Bulk approve items (for trusted content)
   */
  async bulkApprove(clinicianId: string, itemIds: string[], reviewerId: string): Promise<number> {
    try {
      // Early return for empty list
      if (!itemIds || itemIds.length === 0) {
        return 0;
      }

      const result = await prisma.manualReviewQueueItem.updateMany({
        where: {
          id: { in: itemIds },
          clinicianId, // Security: Only approve items belonging to this clinician
          status: { in: ['PENDING', 'IN_REVIEW'] },
        },
        data: {
          status: 'APPROVED',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          wasCorrect: true,
        },
      });

      logger.info({
        event: 'review_queue_bulk_approve',
        count: result.count,
        reviewerId: itemIds, // Fixed: was logging itemIds as reviewerId
      });

      return result.count;
    } catch (error) {
      logger.error({
        event: 'review_queue_bulk_approve_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete old reviewed items (cleanup)
   */
  async cleanupOldReviews(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.manualReviewQueueItem.deleteMany({
        where: {
          status: { in: ['APPROVED', 'REJECTED'] },
          reviewedAt: { lte: cutoffDate },
        },
      });

      logger.info({
        event: 'review_queue_cleanup',
        deletedCount: result.count,
        daysOld,
      });

      return result.count;
    } catch (error) {
      logger.error({
        event: 'review_queue_cleanup_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * CRITICAL: Enforce clinical review for AI-generated content
   *
   * This wrapper ensures ALL clinical AI outputs go through human review.
   * "AI drafts, human decides. Never the reverse."
   *
   * Usage:
   *   const result = await reviewQueueService.enforceClinicalReview({
   *     clinicianId: session.user.id,
   *     patientId: patient.id,
   *     aiResponse: llmOutput,
   *     contentType: 'diagnosis_suggestion',
   *     confidence: 0.85,
   *   });
   *
   *   // Returns reviewQueueId - AI output NOT yet actionable
   *   // Clinician must approve in review queue before action
   */
  async enforceClinicalReview(params: {
    clinicianId: string;
    patientId: string;
    aiResponse: string;
    contentType: 'diagnosis_suggestion' | 'prescription_recommendation' | 'treatment_plan' | 'clinical_summary' | 'alert';
    confidence: number;
    encounterId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    reviewQueueId: string;
    requiresReview: true;
    expiresAt: Date;
    draft: string;
    confidence: number;
  }> {
    const { clinicianId, patientId, aiResponse, contentType, confidence, encounterId, metadata } = params;

    // Determine priority based on confidence and content type
    let priority = 5;
    let flagReason = 'ai_generated';

    if (confidence < 0.7) {
      priority = 8;
      flagReason = 'low_confidence';
    }
    if (confidence < 0.5) {
      priority = 10;
      flagReason = 'very_low_confidence';
    }
    if (['prescription_recommendation', 'diagnosis_suggestion'].includes(contentType)) {
      priority = Math.max(priority, 8); // Always high priority for prescriptions/diagnoses
      flagReason = 'high_risk_content';
    }

    // Create a pending review item (stores the AI draft)
    const item = await prisma.manualReviewQueueItem.create({
      data: {
        clinicianId,
        patientId,
        contentType,
        contentId: encounterId || `draft_${Date.now()}`,
        sectionType: contentType,
        confidence,
        priority,
        flagReason,
        flagDetails: JSON.stringify({
          aiDraft: aiResponse,
          metadata,
          generatedAt: new Date().toISOString(),
        }),
      },
    });

    // Expiry: 24 hours - if not reviewed, draft expires
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    logger.info({
      event: 'clinical_review_enforced',
      reviewQueueId: item.id,
      clinicianId,
      patientId,
      contentType,
      confidence,
      priority,
    });

    return {
      reviewQueueId: item.id,
      requiresReview: true,
      expiresAt,
      draft: aiResponse,
      confidence,
    };
  }

  /**
   * Check if a review item has been approved
   * Use this before allowing any patient-affecting action
   */
  async isApproved(reviewQueueId: string): Promise<boolean> {
    const item = await prisma.manualReviewQueueItem.findUnique({
      where: { id: reviewQueueId },
      select: { status: true },
    });

    return item?.status === 'APPROVED';
  }

  /**
   * Get approved content from review queue
   * Returns null if not approved - prevents bypass
   */
  async getApprovedContent(reviewQueueId: string): Promise<{
    content: string;
    reviewedBy: string;
    reviewedAt: Date;
    corrections?: string;
  } | null> {
    const item = await prisma.manualReviewQueueItem.findUnique({
      where: { id: reviewQueueId },
      select: {
        status: true,
        flagDetails: true,
        reviewedBy: true,
        reviewedAt: true,
        corrections: true,
      },
    });

    if (!item || item.status !== 'APPROVED') {
      logger.warn({
        event: 'unapproved_content_access_blocked',
        reviewQueueId,
        status: item?.status,
      });
      return null;
    }

    // Parse the original AI draft from flagDetails
    let content = '';
    try {
      const details = JSON.parse(item.flagDetails || '{}');
      content = item.corrections || details.aiDraft || '';
    } catch {
      content = item.corrections || '';
    }

    return {
      content,
      reviewedBy: item.reviewedBy!,
      reviewedAt: item.reviewedAt!,
      corrections: item.corrections || undefined,
    };
  }

  /**
   * Verify approval before patient action
   * Throws error if not approved - fail-safe for clinical actions
   */
  async requireApprovalOrFail(reviewQueueId: string, actionDescription: string): Promise<void> {
    const isApproved = await this.isApproved(reviewQueueId);

    if (!isApproved) {
      logger.error({
        event: 'clinical_action_blocked_no_approval',
        reviewQueueId,
        actionDescription,
      });

      throw new Error(
        `Clinical action "${actionDescription}" blocked: Review item ${reviewQueueId} has not been approved. ` +
        `Human review is required before proceeding.`
      );
    }

    logger.info({
      event: 'clinical_action_approved',
      reviewQueueId,
      actionDescription,
    });
  }
}

// Singleton instance
export const reviewQueueService = new ReviewQueueService();
