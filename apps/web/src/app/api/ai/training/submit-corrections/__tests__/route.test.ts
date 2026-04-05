import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }
}));

jest.mock('@/lib/services/transcription-correction.service', () => ({
  transcriptionCorrectionService: {
    createTrainingBatch: jest.fn(),
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { POST } = require('../route');
const { transcriptionCorrectionService } = require('@/lib/services/transcription-correction.service');

const ctx = { user: { id: 'admin-1', firstName: 'Admin', lastName: 'User', role: 'ADMIN' } };

const mockBatch = {
  corrections: [
    { id: 'c1', original: 'hipertensión', corrected: 'hipertensión arterial', context: { specialty: 'cardiology' } },
    { id: 'c2', original: 'diabetes', corrected: 'diabetes mellitus', context: { specialty: 'endocrinology' } },
  ],
  batchId: 'batch-001',
};

beforeEach(() => {
  jest.clearAllMocks();
  (transcriptionCorrectionService.createTrainingBatch as jest.Mock).mockResolvedValue(mockBatch);
});

describe('POST /api/ai/training/submit-corrections', () => {
  it('generates training batch for valid date range', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/training/submit-corrections', {
      method: 'POST',
      body: JSON.stringify({
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-31T00:00:00.000Z',
        language: 'es-MX',
      }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.metadata.totalCorrections).toBe(2);
  });

  it('returns 400 for invalid request parameters', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/training/submit-corrections', {
      method: 'POST',
      body: JSON.stringify({ startDate: 'not-a-date', endDate: '2026-01-31T00:00:00.000Z' }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid request parameters/i);
  });

  it('returns 400 when start date is not before end date', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/training/submit-corrections', {
      method: 'POST',
      body: JSON.stringify({
        startDate: '2026-01-31T00:00:00.000Z',
        endDate: '2026-01-01T00:00:00.000Z',
      }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/start date must be before/i);
  });

  it('returns 400 when date range exceeds 90 days', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/training/submit-corrections', {
      method: 'POST',
      body: JSON.stringify({
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2026-01-01T00:00:00.000Z',
      }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/90 days/i);
  });
});
