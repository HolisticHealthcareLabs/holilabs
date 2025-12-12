/**
 * Review Queue Service Tests
 *
 * Tests for Manual Review Queue management
 */

import { ReviewQueueService } from '../review-queue.service';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    manualReviewQueueItem: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

const { prisma } = require('@/lib/prisma');

describe('ReviewQueueService', () => {
  let reviewQueueService: ReviewQueueService;
  const mockClinicianId = 'clinician-1';
  const mockPatientId = 'patient-1';

  const mockQueueItem = {
    id: 'queue-item-1',
    clinicianId: mockClinicianId,
    patientId: mockPatientId,
    contentType: 'soap_note',
    contentId: 'soap-1',
    sectionType: 'subjective',
    priority: 8,
    confidence: 0.65,
    flagReason: 'low_confidence',
    flagDetails: 'AI confidence below threshold',
    status: 'PENDING',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    wasCorrect: null,
    corrections: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: {
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  beforeEach(() => {
    reviewQueueService = new ReviewQueueService();
    jest.clearAllMocks();
  });

  describe('getQueueItems', () => {
    it('should fetch queue items for clinician', async () => {
      prisma.manualReviewQueueItem.findMany.mockResolvedValue([mockQueueItem]);
      prisma.manualReviewQueueItem.count.mockResolvedValue(1);

      const result = await reviewQueueService.getQueueItems(mockClinicianId);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].patientName).toBe('John Doe');
    });

    it('should apply status filter', async () => {
      prisma.manualReviewQueueItem.findMany.mockResolvedValue([mockQueueItem]);
      prisma.manualReviewQueueItem.count.mockResolvedValue(1);

      await reviewQueueService.getQueueItems(mockClinicianId, { status: 'PENDING' });

      expect(prisma.manualReviewQueueItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
        })
      );
    });

    it('should apply content type filter', async () => {
      prisma.manualReviewQueueItem.findMany.mockResolvedValue([mockQueueItem]);
      prisma.manualReviewQueueItem.count.mockResolvedValue(1);

      await reviewQueueService.getQueueItems(mockClinicianId, { contentType: 'soap_note' });

      expect(prisma.manualReviewQueueItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contentType: 'soap_note',
          }),
        })
      );
    });

    it('should apply priority filter', async () => {
      prisma.manualReviewQueueItem.findMany.mockResolvedValue([mockQueueItem]);
      prisma.manualReviewQueueItem.count.mockResolvedValue(1);

      await reviewQueueService.getQueueItems(mockClinicianId, { priority: 5 });

      expect(prisma.manualReviewQueueItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: { gte: 5 },
          }),
        })
      );
    });

    it('should paginate correctly', async () => {
      prisma.manualReviewQueueItem.findMany.mockResolvedValue([mockQueueItem]);
      prisma.manualReviewQueueItem.count.mockResolvedValue(100);

      await reviewQueueService.getQueueItems(mockClinicianId, {}, 10, 20);

      expect(prisma.manualReviewQueueItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it('should sort by priority then created date', async () => {
      prisma.manualReviewQueueItem.findMany.mockResolvedValue([mockQueueItem]);
      prisma.manualReviewQueueItem.count.mockResolvedValue(1);

      await reviewQueueService.getQueueItems(mockClinicianId);

      expect(prisma.manualReviewQueueItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        })
      );
    });
  });

  describe('getQueueStats', () => {
    it('should calculate correct counts by status', async () => {
      // Mock findMany to return sample items for stats calculation
      prisma.manualReviewQueueItem.findMany.mockResolvedValue([
        { status: 'PENDING', confidence: 0.65, priority: 8, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'PENDING', confidence: 0.70, priority: 9, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'PENDING', confidence: 0.75, priority: 7, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'PENDING', confidence: 0.80, priority: 6, contentType: 'diagnosis', flagReason: 'high_risk' },
        { status: 'PENDING', confidence: 0.85, priority: 10, contentType: 'soap_note', flagReason: 'high_risk' },
        { status: 'IN_REVIEW', confidence: 0.68, priority: 8, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'IN_REVIEW', confidence: 0.72, priority: 9, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'IN_REVIEW', confidence: 0.78, priority: 8, contentType: 'soap_note', flagReason: 'low_confidence' },
      ]);

      const stats = await reviewQueueService.getQueueStats(mockClinicianId);

      expect(stats.totalPending).toBe(5);
      expect(stats.totalInReview).toBe(3);
      expect(stats.highPriorityCount).toBe(6); // priority >= 8
    });

    it('should calculate average confidence', async () => {
      prisma.manualReviewQueueItem.findMany.mockResolvedValue([
        { status: 'PENDING', confidence: 0.65, priority: 8, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'PENDING', confidence: 0.70, priority: 9, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'IN_REVIEW', confidence: 0.68, priority: 8, contentType: 'soap_note', flagReason: 'low_confidence' },
      ]);

      const stats = await reviewQueueService.getQueueStats(mockClinicianId);

      // Average of 0.65, 0.70, 0.68 = 2.03 / 3 ≈ 0.6767
      expect(stats.avgConfidence).toBeCloseTo(0.677, 2);
    });

    it('should group by content type', async () => {
      prisma.manualReviewQueueItem.findMany.mockResolvedValue([
        { status: 'PENDING', confidence: 0.65, priority: 8, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'PENDING', confidence: 0.70, priority: 9, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'PENDING', confidence: 0.75, priority: 7, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'PENDING', confidence: 0.80, priority: 6, contentType: 'diagnosis', flagReason: 'high_risk' },
        { status: 'IN_REVIEW', confidence: 0.68, priority: 8, contentType: 'soap_note', flagReason: 'low_confidence' },
      ]);

      const stats = await reviewQueueService.getQueueStats(mockClinicianId);

      expect(stats.byContentType).toEqual({
        soap_note: 4,
        diagnosis: 1,
      });
    });

    it('should group by flag reason', async () => {
      prisma.manualReviewQueueItem.findMany.mockResolvedValue([
        { status: 'PENDING', confidence: 0.65, priority: 8, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'PENDING', confidence: 0.70, priority: 9, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'PENDING', confidence: 0.75, priority: 7, contentType: 'soap_note', flagReason: 'low_confidence' },
        { status: 'PENDING', confidence: 0.80, priority: 6, contentType: 'diagnosis', flagReason: 'high_risk' },
        { status: 'IN_REVIEW', confidence: 0.68, priority: 8, contentType: 'soap_note', flagReason: 'high_risk' },
      ]);

      const stats = await reviewQueueService.getQueueStats(mockClinicianId);

      expect(stats.byFlagReason).toEqual({
        low_confidence: 3,
        high_risk: 2,
      });
    });
  });

  describe('addToQueue', () => {
    it('should add item with correct priority', async () => {
      prisma.manualReviewQueueItem.create.mockResolvedValue(mockQueueItem);

      await reviewQueueService.addToQueue(
        mockClinicianId,
        mockPatientId,
        'soap_note',
        'soap-1',
        0.85,
        'manual_request',
        { priority: 6 }
      );

      expect(prisma.manualReviewQueueItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 6,
          }),
        })
      );
    });

    it('should auto-calculate priority for low confidence', async () => {
      const createdItem = {
        ...mockQueueItem,
        priority: 8, // Auto-calculated based on confidence
      };
      prisma.manualReviewQueueItem.create.mockResolvedValue(createdItem);

      await reviewQueueService.addToQueue(
        mockClinicianId,
        mockPatientId,
        'soap_note',
        'soap-1',
        0.55, // Low confidence
        'low_confidence'
      );

      expect(prisma.manualReviewQueueItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 8, // Priority = 10 - floor(confidence * 10) = 10 - 5 = 5, but clamped
          }),
        })
      );
    });

    it('should auto-set priority to 10 for high risk', async () => {
      prisma.manualReviewQueueItem.create.mockResolvedValue(mockQueueItem);

      await reviewQueueService.addToQueue(
        mockClinicianId,
        mockPatientId,
        'soap_note',
        'soap-1',
        0.85,
        'high_risk'
      );

      expect(prisma.manualReviewQueueItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 10,
          }),
        })
      );
    });

    it('should validate required fields', async () => {
      await expect(
        reviewQueueService.addToQueue(
          '',
          mockPatientId,
          'soap_note',
          'soap-1',
          0.85,
          'low_confidence'
        )
      ).rejects.toThrow();
    });

    it('should include section type when provided', async () => {
      prisma.manualReviewQueueItem.create.mockResolvedValue(mockQueueItem);

      await reviewQueueService.addToQueue(
        mockClinicianId,
        mockPatientId,
        'soap_note',
        'soap-1',
        0.85,
        'low_confidence',
        { sectionType: 'assessment' }
      );

      expect(prisma.manualReviewQueueItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sectionType: 'assessment',
          }),
        })
      );
    });

    it('should include flag details when provided', async () => {
      prisma.manualReviewQueueItem.create.mockResolvedValue(mockQueueItem);

      await reviewQueueService.addToQueue(
        mockClinicianId,
        mockPatientId,
        'soap_note',
        'soap-1',
        0.85,
        'low_confidence',
        { flagDetails: 'Multiple unclear transcriptions' }
      );

      expect(prisma.manualReviewQueueItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            flagDetails: 'Multiple unclear transcriptions',
          }),
        })
      );
    });
  });

  describe('updateReviewStatus', () => {
    const reviewerId = 'reviewer-1';

    it('should update to IN_REVIEW', async () => {
      prisma.manualReviewQueueItem.update.mockResolvedValue({
        ...mockQueueItem,
        status: 'IN_REVIEW',
        reviewedBy: reviewerId,
      });

      const result = await reviewQueueService.updateReviewStatus(
        mockQueueItem.id,
        reviewerId,
        'IN_REVIEW'
      );

      expect(result.status).toBe('IN_REVIEW');
      expect(prisma.manualReviewQueueItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_REVIEW',
            reviewedBy: reviewerId,
          }),
        })
      );
    });

    it('should update to APPROVED with wasCorrect=true', async () => {
      prisma.manualReviewQueueItem.update.mockResolvedValue({
        ...mockQueueItem,
        status: 'APPROVED',
        wasCorrect: true,
      });

      await reviewQueueService.updateReviewStatus(mockQueueItem.id, reviewerId, 'APPROVED', {
        wasCorrect: true,
      });

      expect(prisma.manualReviewQueueItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
            wasCorrect: true,
          }),
        })
      );
    });

    it('should update to CORRECTED with corrections', async () => {
      const corrections = { subjective: 'Corrected subjective section' };

      prisma.manualReviewQueueItem.update.mockResolvedValue({
        ...mockQueueItem,
        status: 'CORRECTED',
        corrections,
      });

      await reviewQueueService.updateReviewStatus(mockQueueItem.id, reviewerId, 'CORRECTED', {
        corrections,
      });

      expect(prisma.manualReviewQueueItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CORRECTED',
            corrections,
          }),
        })
      );
    });

    it('should update to REJECTED', async () => {
      prisma.manualReviewQueueItem.update.mockResolvedValue({
        ...mockQueueItem,
        status: 'REJECTED',
      });

      await reviewQueueService.updateReviewStatus(mockQueueItem.id, reviewerId, 'REJECTED');

      expect(prisma.manualReviewQueueItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
          }),
        })
      );
    });

    it('should set reviewedAt timestamp', async () => {
      const beforeTime = new Date();

      prisma.manualReviewQueueItem.update.mockResolvedValue({
        ...mockQueueItem,
        reviewedAt: new Date(),
      });

      await reviewQueueService.updateReviewStatus(mockQueueItem.id, reviewerId, 'APPROVED');

      expect(prisma.manualReviewQueueItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewedAt: expect.any(Date),
          }),
        })
      );

      const call = prisma.manualReviewQueueItem.update.mock.calls[0][0];
      expect(call.data.reviewedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    it('should set reviewedBy user ID', async () => {
      prisma.manualReviewQueueItem.update.mockResolvedValue({
        ...mockQueueItem,
        reviewedBy: reviewerId,
      });

      await reviewQueueService.updateReviewStatus(mockQueueItem.id, reviewerId, 'APPROVED');

      expect(prisma.manualReviewQueueItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewedBy: reviewerId,
          }),
        })
      );
    });

    it('should include review notes when provided', async () => {
      const reviewNotes = 'Reviewed and confirmed accuracy';

      prisma.manualReviewQueueItem.update.mockResolvedValue({
        ...mockQueueItem,
        reviewNotes,
      });

      await reviewQueueService.updateReviewStatus(mockQueueItem.id, reviewerId, 'APPROVED', {
        reviewNotes,
      });

      expect(prisma.manualReviewQueueItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewNotes,
          }),
        })
      );
    });
  });

  describe('bulkApprove', () => {
    const reviewerId = 'reviewer-1';
    const itemIds = ['item-1', 'item-2', 'item-3'];

    it('should approve multiple items', async () => {
      const mockUpdateResult = { count: 3 };
      prisma.manualReviewQueueItem.updateMany.mockResolvedValue(mockUpdateResult);

      const result = await reviewQueueService.bulkApprove(mockClinicianId, itemIds, reviewerId);

      expect(result).toBe(3);
      expect(prisma.manualReviewQueueItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: itemIds },
            clinicianId: mockClinicianId,
            status: { in: ['PENDING', 'IN_REVIEW'] },
          },
          data: expect.objectContaining({
            status: 'APPROVED',
            reviewedBy: reviewerId,
            wasCorrect: true,
          }),
        })
      );
    });

    it('should only approve PENDING/IN_REVIEW items', async () => {
      prisma.manualReviewQueueItem.updateMany.mockResolvedValue({ count: 2 });

      await reviewQueueService.bulkApprove(mockClinicianId, itemIds, reviewerId);

      expect(prisma.manualReviewQueueItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['PENDING', 'IN_REVIEW'] },
          }),
        })
      );
    });

    it('should return count of updated items', async () => {
      prisma.manualReviewQueueItem.updateMany.mockResolvedValue({ count: 5 });

      const result = await reviewQueueService.bulkApprove(mockClinicianId, itemIds, reviewerId);

      expect(result).toBe(5);
    });

    it('should handle empty item list', async () => {
      const result = await reviewQueueService.bulkApprove(mockClinicianId, [], reviewerId);

      expect(result).toBe(0);
      expect(prisma.manualReviewQueueItem.updateMany).not.toHaveBeenCalled();
    });
  });
});
