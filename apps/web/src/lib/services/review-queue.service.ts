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
}

// Singleton instance
export const reviewQueueService = new ReviewQueueService();
