/**
 * Review Queue API Tests
 *
 * Tests for GET /api/review-queue and POST /api/review-queue
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock review queue service
jest.mock('@/lib/services/review-queue.service', () => ({
  reviewQueueService: {
    getQueueItems: jest.fn(),
    getQueueStats: jest.fn(),
    addToQueue: jest.fn(),
  },
}));

// Mock middleware
jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

const { reviewQueueService } = require('@/lib/services/review-queue.service');

describe('GET /api/review-queue', () => {
  const mockContext = {
    user: {
      id: 'clinician-1',
      email: 'dr.smith@holilabs.com',
    },
  };

  const mockItems = [
    {
      id: 'item-1',
      contentType: 'soap_note',
      contentId: 'soap-1',
      priority: 8,
      confidence: 0.65,
      patientId: 'patient-1',
      patientName: 'John Doe',
      status: 'PENDING',
    },
  ];

  const mockStats = {
    totalPending: 5,
    totalInReview: 2,
    highPriorityCount: 3,
    avgConfidence: 0.72,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch queue items with filters', async () => {
    reviewQueueService.getQueueItems.mockResolvedValue({
      items: mockItems,
      total: 1,
    });
    reviewQueueService.getQueueStats.mockResolvedValue(mockStats);

    const request = new NextRequest(
      'http://localhost:3000/api/review-queue?status=PENDING&limit=10'
    );
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.items).toHaveLength(1);
    expect(reviewQueueService.getQueueItems).toHaveBeenCalledWith(
      mockContext.user.id,
      expect.objectContaining({ status: 'PENDING' }),
      10,
      0
    );
  });

  it('should include stats in response', async () => {
    reviewQueueService.getQueueItems.mockResolvedValue({
      items: mockItems,
      total: 1,
    });
    reviewQueueService.getQueueStats.mockResolvedValue(mockStats);

    const request = new NextRequest('http://localhost:3000/api/review-queue');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(data.data.stats).toEqual(mockStats);
  });

  it('should paginate correctly', async () => {
    reviewQueueService.getQueueItems.mockResolvedValue({
      items: mockItems,
      total: 100,
    });
    reviewQueueService.getQueueStats.mockResolvedValue(mockStats);

    const request = new NextRequest(
      'http://localhost:3000/api/review-queue?limit=10&offset=20'
    );
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(data.data.pagination).toEqual({
      limit: 10,
      offset: 20,
      hasMore: true,
    });
  });

  it('should apply content type filter', async () => {
    reviewQueueService.getQueueItems.mockResolvedValue({
      items: mockItems,
      total: 1,
    });
    reviewQueueService.getQueueStats.mockResolvedValue(mockStats);

    const request = new NextRequest(
      'http://localhost:3000/api/review-queue?contentType=soap_note'
    );
    await GET(request, mockContext);

    expect(reviewQueueService.getQueueItems).toHaveBeenCalledWith(
      mockContext.user.id,
      expect.objectContaining({ contentType: 'soap_note' }),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('should apply priority filter', async () => {
    reviewQueueService.getQueueItems.mockResolvedValue({
      items: mockItems,
      total: 1,
    });
    reviewQueueService.getQueueStats.mockResolvedValue(mockStats);

    const request = new NextRequest('http://localhost:3000/api/review-queue?priority=7');
    await GET(request, mockContext);

    expect(reviewQueueService.getQueueItems).toHaveBeenCalledWith(
      mockContext.user.id,
      expect.objectContaining({ priority: 7 }),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('should handle errors gracefully', async () => {
    reviewQueueService.getQueueItems.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/review-queue');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch review queue');
  });
});

describe('POST /api/review-queue', () => {
  const mockContext = {
    user: {
      id: 'clinician-1',
      email: 'dr.smith@holilabs.com',
    },
  };

  const mockItem = {
    id: 'item-1',
    clinicianId: mockContext.user.id,
    patientId: 'patient-1',
    contentType: 'soap_note',
    contentId: 'soap-1',
    priority: 8,
    confidence: 0.65,
    flagReason: 'low_confidence',
    status: 'PENDING',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add item to queue', async () => {
    reviewQueueService.addToQueue.mockResolvedValue(mockItem);

    const request = new NextRequest('http://localhost:3000/api/review-queue', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        contentType: 'soap_note',
        contentId: 'soap-1',
        confidence: 0.65,
        flagReason: 'low_confidence',
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe('item-1');
    expect(reviewQueueService.addToQueue).toHaveBeenCalledWith(
      mockContext.user.id,
      'patient-1',
      'soap_note',
      'soap-1',
      0.65,
      'low_confidence',
      expect.any(Object)
    );
  });

  it('should validate required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/review-queue', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        // Missing contentType, contentId, confidence, flagReason
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('should include optional section type', async () => {
    reviewQueueService.addToQueue.mockResolvedValue(mockItem);

    const request = new NextRequest('http://localhost:3000/api/review-queue', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        contentType: 'soap_note',
        contentId: 'soap-1',
        confidence: 0.65,
        flagReason: 'low_confidence',
        sectionType: 'assessment',
      }),
    });

    await POST(request, mockContext);

    expect(reviewQueueService.addToQueue).toHaveBeenCalledWith(
      mockContext.user.id,
      'patient-1',
      'soap_note',
      'soap-1',
      0.65,
      'low_confidence',
      expect.objectContaining({ sectionType: 'assessment' })
    );
  });

  it('should handle errors gracefully', async () => {
    reviewQueueService.addToQueue.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/review-queue', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        contentType: 'soap_note',
        contentId: 'soap-1',
        confidence: 0.65,
        flagReason: 'low_confidence',
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to add to review queue');
  });
});
