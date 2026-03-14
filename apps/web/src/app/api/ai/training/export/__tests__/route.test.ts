import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/services/transcription-correction.service', () => ({
  transcriptionCorrectionService: {
    exportCorrectionsAsJSON: jest.fn(),
    exportCorrectionsAsCSV: jest.fn(),
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET } = require('../route');
const { transcriptionCorrectionService } = require('@/lib/services/transcription-correction.service');

const ctx = { user: { id: 'admin-1', firstName: 'Admin', lastName: 'User', role: 'ADMIN' } };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/ai/training/export', () => {
  it('exports corrections as JSON and returns file attachment', async () => {
    (transcriptionCorrectionService.exportCorrectionsAsJSON as jest.Mock).mockResolvedValue(
      JSON.stringify([{ id: 'c1', original: 'hola', corrected: 'hola mundo' }])
    );

    const url = 'http://localhost:3000/api/ai/training/export?startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T00:00:00.000Z&format=json';
    const req = new NextRequest(url);
    const res = await GET(req, ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
  });

  it('exports corrections as CSV when format=csv', async () => {
    (transcriptionCorrectionService.exportCorrectionsAsCSV as jest.Mock).mockResolvedValue(
      'id,original,corrected\nc1,hola,hola mundo'
    );

    const url = 'http://localhost:3000/api/ai/training/export?startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T00:00:00.000Z&format=csv';
    const req = new NextRequest(url);
    const res = await GET(req, ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/csv');
  });

  it('returns 400 for invalid query parameters', async () => {
    const url = 'http://localhost:3000/api/ai/training/export?startDate=not-a-date&endDate=2026-01-31T00:00:00.000Z';
    const req = new NextRequest(url);
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid query parameters/i);
  });

  it('returns 400 when start date is not before end date', async () => {
    const url = 'http://localhost:3000/api/ai/training/export?startDate=2026-01-31T00:00:00.000Z&endDate=2026-01-01T00:00:00.000Z';
    const req = new NextRequest(url);
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/start date must be before/i);
  });
});
