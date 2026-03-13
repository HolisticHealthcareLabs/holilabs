/**
 * Tests for GET /api/ai/training/metrics
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

jest.mock('@/lib/services/transcription-correction.service', () => ({
  transcriptionCorrectionService: {
    getAnalytics: jest.fn(),
    generateCustomVocabulary: jest.fn(),
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  ),
}));

const { GET } = require('../route');
const { transcriptionCorrectionService } = require('@/lib/services/transcription-correction.service');

const mockContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
  requestId: 'req-1',
};

const mockAnalytics = {
  totalCorrections: 100,
  improvementTrend: [
    { date: '2025-01-01', errorRate: 0.15 },
    { date: '2025-01-15', errorRate: 0.10 },
    { date: '2025-01-31', errorRate: 0.08 },
  ],
  topErrors: [],
  correctionsBySection: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  (transcriptionCorrectionService.getAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);
  (transcriptionCorrectionService.generateCustomVocabulary as jest.Mock).mockResolvedValue(['hemoglobina', 'glucosa']);
});

describe('GET /api/ai/training/metrics', () => {
  it('returns 400 when startDate is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/ai/training/metrics?endDate=2025-01-31T23:59:59.000Z'
    );
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/invalid query parameters/i);
  });

  it('returns 400 when endDate is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/ai/training/metrics?startDate=2025-01-01T00:00:00.000Z'
    );
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/invalid query parameters/i);
  });

  it('returns metrics for valid date range', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/ai/training/metrics?startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.000Z&includeVocabulary=false'
    );
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.analytics.totalCorrections).toBe(100);
    expect(data.data.derivedMetrics).toHaveProperty('improvementPercentage');
    expect(data.data.derivedMetrics.trendDirection).toBe('improving');
  });

  it('includes custom vocabulary when includeVocabulary=true', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/ai/training/metrics?startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.000Z&includeVocabulary=true'
    );
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(transcriptionCorrectionService.generateCustomVocabulary).toHaveBeenCalled();
    expect(data.data.customVocabulary).toBeDefined();
    expect(data.data.customVocabulary.count).toBe(2);
  });
});
