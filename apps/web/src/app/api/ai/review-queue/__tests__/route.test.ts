/**
 * Tests for GET/POST/PATCH /api/ai/review-queue
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    manualReviewQueueItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  ),
}));

const { POST, GET, PATCH } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockQueueItem = {
  id: 'queue-1',
  contentType: 'SCRIBE_NOTE',
  contentId: 'note-1',
  sectionType: 'DIAGNOSIS',
  patientId: 'patient-1',
  clinicianId: 'clinician-1',
  priority: 5,
  confidence: 0.7,
  flagReason: 'LOW_CONFIDENCE',
  flagDetails: null,
  status: 'PENDING',
  patient: { id: 'patient-1', firstName: 'Maria', lastName: 'Silva', mrn: 'MRN-001' },
  clinician: { id: 'clinician-1', firstName: 'Dr', lastName: 'Test' },
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
  wasCorrect: null,
  corrections: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/ai/review-queue', () => {
  it('returns 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/review-queue', {
      method: 'POST',
      body: JSON.stringify({ contentType: 'SCRIBE_NOTE' }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/missing required fields/i);
  });

  it('returns 409 when item is already in queue', async () => {
    (prisma.manualReviewQueueItem.findFirst as jest.Mock).mockResolvedValue(mockQueueItem);

    const request = new NextRequest('http://localhost:3000/api/ai/review-queue', {
      method: 'POST',
      body: JSON.stringify({
        contentType: 'SCRIBE_NOTE',
        contentId: 'note-1',
        patientId: 'patient-1',
        clinicianId: 'clinician-1',
        flagReason: 'LOW_CONFIDENCE',
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.queueItemId).toBe('queue-1');
  });

  it('creates queue item with valid payload', async () => {
    (prisma.manualReviewQueueItem.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.manualReviewQueueItem.create as jest.Mock).mockResolvedValue(mockQueueItem);

    const request = new NextRequest('http://localhost:3000/api/ai/review-queue', {
      method: 'POST',
      body: JSON.stringify({
        contentType: 'SCRIBE_NOTE',
        contentId: 'note-1',
        patientId: 'patient-1',
        clinicianId: 'clinician-1',
        flagReason: 'LOW_CONFIDENCE',
      }),
    });
    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.queueItem.id).toBe('queue-1');
  });
});

describe('GET /api/ai/review-queue', () => {
  it('returns queue items with stats', async () => {
    (prisma.manualReviewQueueItem.findMany as jest.Mock).mockResolvedValue([mockQueueItem]);

    const request = new NextRequest('http://localhost:3000/api/ai/review-queue');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.stats).toHaveProperty('pending');
  });

  it('passes status filter when provided', async () => {
    (prisma.manualReviewQueueItem.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/ai/review-queue?status=PENDING');
    await GET(request, mockContext);

    const call = (prisma.manualReviewQueueItem.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.status).toBe('PENDING');
  });
});

describe('PATCH /api/ai/review-queue', () => {
  it('returns 400 when required fields are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/review-queue', {
      method: 'PATCH',
      body: JSON.stringify({ queueItemId: 'queue-1' }),
    });
    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/missing required fields/i);
  });

  it('updates queue item status', async () => {
    (prisma.manualReviewQueueItem.update as jest.Mock).mockResolvedValue({
      ...mockQueueItem,
      status: 'APPROVED',
      reviewedBy: 'clinician-1',
      reviewedAt: new Date(),
    });

    const request = new NextRequest('http://localhost:3000/api/ai/review-queue', {
      method: 'PATCH',
      body: JSON.stringify({ queueItemId: 'queue-1', status: 'APPROVED', wasCorrect: true }),
    });
    const response = await PATCH(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.queueItem.status).toBe('APPROVED');
  });
});
