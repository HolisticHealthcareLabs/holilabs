/**
 * Review Queue Item API Tests
 *
 * Tests for PATCH /api/review-queue/[id]
 */

import { NextRequest } from 'next/server';
import { PATCH } from '../route';

// Mock review queue service
jest.mock('@/lib/services/review-queue.service', () => ({
  reviewQueueService: {
    updateReviewStatus: jest.fn(),
  },
}));

// Mock middleware
jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

const { reviewQueueService } = require('@/lib/services/review-queue.service');

describe('PATCH /api/review-queue/[id]', () => {
  const mockContext = {
    user: {
      id: 'clinician-1',
      email: 'dr.smith@holilabs.com',
      role: 'clinician',
    },
    params: {
      id: 'item-1',
    },
  };

  const mockUpdatedItem = {
    id: 'item-1',
    status: 'APPROVED',
    reviewedBy: 'clinician-1',
    reviewedAt: new Date(),
    wasCorrect: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update review status', async () => {
    reviewQueueService.updateReviewStatus.mockResolvedValue(mockUpdatedItem);

    const request = new NextRequest('http://localhost:3000/api/review-queue/item-1', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'APPROVED',
        wasCorrect: true,
      }),
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('APPROVED');
    expect(reviewQueueService.updateReviewStatus).toHaveBeenCalledWith(
      'item-1',
      'clinician-1',
      'APPROVED',
      expect.objectContaining({ wasCorrect: true })
    );
  });

  it('should validate status field', async () => {
    const request = new NextRequest('http://localhost:3000/api/review-queue/item-1', {
      method: 'PATCH',
      body: JSON.stringify({
        // Missing status
      }),
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required field: status');
  });

  it('should validate status values', async () => {
    const request = new NextRequest('http://localhost:3000/api/review-queue/item-1', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'INVALID_STATUS',
      }),
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid status');
    expect(data.validStatuses).toContain('APPROVED');
    expect(data.validStatuses).toContain('REJECTED');
  });

  it('should update to IN_REVIEW', async () => {
    reviewQueueService.updateReviewStatus.mockResolvedValue({
      ...mockUpdatedItem,
      status: 'IN_REVIEW',
    });

    const request = new NextRequest('http://localhost:3000/api/review-queue/item-1', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'IN_REVIEW',
      }),
    });

    await PATCH(request, mockContext);

    expect(reviewQueueService.updateReviewStatus).toHaveBeenCalledWith(
      'item-1',
      'clinician-1',
      'IN_REVIEW',
      expect.any(Object)
    );
  });

  it('should update to CORRECTED with corrections', async () => {
    const corrections = { subjective: 'Corrected text' };

    reviewQueueService.updateReviewStatus.mockResolvedValue({
      ...mockUpdatedItem,
      status: 'CORRECTED',
      corrections,
    });

    const request = new NextRequest('http://localhost:3000/api/review-queue/item-1', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'CORRECTED',
        corrections,
      }),
    });

    await PATCH(request, mockContext);

    expect(reviewQueueService.updateReviewStatus).toHaveBeenCalledWith(
      'item-1',
      'clinician-1',
      'CORRECTED',
      expect.objectContaining({ corrections })
    );
  });

  it('should update to REJECTED', async () => {
    reviewQueueService.updateReviewStatus.mockResolvedValue({
      ...mockUpdatedItem,
      status: 'REJECTED',
    });

    const request = new NextRequest('http://localhost:3000/api/review-queue/item-1', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'REJECTED',
      }),
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(data.data.status).toBe('REJECTED');
  });

  it('should include review notes when provided', async () => {
    reviewQueueService.updateReviewStatus.mockResolvedValue(mockUpdatedItem);

    const request = new NextRequest('http://localhost:3000/api/review-queue/item-1', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'APPROVED',
        reviewNotes: 'Reviewed and confirmed',
      }),
    });

    await PATCH(request, mockContext);

    expect(reviewQueueService.updateReviewStatus).toHaveBeenCalledWith(
      'item-1',
      'clinician-1',
      'APPROVED',
      expect.objectContaining({ reviewNotes: 'Reviewed and confirmed' })
    );
  });

  it('should handle errors gracefully', async () => {
    reviewQueueService.updateReviewStatus.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/review-queue/item-1', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'APPROVED',
      }),
    });

    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update review queue item');
  });
});
