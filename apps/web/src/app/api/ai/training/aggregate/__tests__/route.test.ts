/**
 * Tests for POST /api/ai/training/aggregate
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

jest.mock('@/lib/jobs/correction-aggregation', () => ({
  aggregateDailyCorrections: jest.fn(),
  aggregateCorrectionsRange: jest.fn(),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  ),
}));

const { POST } = require('../route');
const {
  aggregateDailyCorrections,
  aggregateCorrectionsRange,
} = require('@/lib/jobs/correction-aggregation');

const adminContext = {
  user: { id: 'admin-1', email: 'admin@holilabs.com', role: 'ADMIN' },
  requestId: 'req-1',
};

const doctorContext = {
  user: { id: 'doctor-1', email: 'dr@holilabs.com', role: 'DOCTOR' },
  requestId: 'req-2',
};

const nurseContext = {
  user: { id: 'nurse-1', email: 'nurse@holilabs.com', role: 'NURSE' },
  requestId: 'req-3',
};

const mockResult = {
  processed: true,
  results: { total: 50, aggregated: 45, failed: 5 },
};

beforeEach(() => {
  jest.clearAllMocks();
  (aggregateDailyCorrections as jest.Mock).mockResolvedValue(mockResult);
  (aggregateCorrectionsRange as jest.Mock).mockResolvedValue(mockResult);
});

describe('POST /api/ai/training/aggregate', () => {
  it('returns 403 when user is not DOCTOR or ADMIN', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/training/aggregate', {
      method: 'POST',
      body: JSON.stringify({ type: 'daily' }),
    });
    const response = await POST(request, nurseContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toMatch(/insufficient permissions/i);
  });

  it('runs daily aggregation by default', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/training/aggregate', {
      method: 'POST',
      body: JSON.stringify({ type: 'daily' }),
    });
    const response = await POST(request, adminContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(aggregateDailyCorrections).toHaveBeenCalled();
  });

  it('returns 400 when range aggregation is missing start/end dates', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/training/aggregate', {
      method: 'POST',
      body: JSON.stringify({ type: 'range' }),
    });
    const response = await POST(request, adminContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/startDate.*endDate|endDate.*startDate/i);
  });

  it('runs range aggregation with valid dates', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/training/aggregate', {
      method: 'POST',
      body: JSON.stringify({
        type: 'range',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T23:59:59.000Z',
      }),
    });
    const response = await POST(request, doctorContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(aggregateCorrectionsRange).toHaveBeenCalled();
  });
});
