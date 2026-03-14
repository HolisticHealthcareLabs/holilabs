import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/services/transcription-correction.service', () => ({
  transcriptionCorrectionService: {
    generateCustomVocabulary: jest.fn(),
  },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET } = require('../route');
const { transcriptionCorrectionService } = require('@/lib/services/transcription-correction.service');

const ctx = { user: { id: 'admin-1', firstName: 'Admin', lastName: 'User', role: 'ADMIN' } };

const mockVocabulary = ['hipertensión', 'bradicardia', 'glucemia', 'creatinina'];

beforeEach(() => {
  jest.clearAllMocks();
  (transcriptionCorrectionService.generateCustomVocabulary as jest.Mock).mockResolvedValue(mockVocabulary);
});

describe('GET /api/ai/training/vocabulary', () => {
  it('returns vocabulary as JSON with metadata', async () => {
    const url = 'http://localhost:3000/api/ai/training/vocabulary?startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T00:00:00.000Z&format=json&minFrequency=1';
    const req = new NextRequest(url);
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.vocabulary).toHaveLength(4);
    expect(json.data.metadata.totalTerms).toBe(4);
  });

  it('returns vocabulary as plain text file when format=text', async () => {
    const url = 'http://localhost:3000/api/ai/training/vocabulary?startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T00:00:00.000Z&format=text&minFrequency=1';
    const req = new NextRequest(url);
    const res = await GET(req, ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    const text = await res.text();
    expect(text).toContain('hipertensión');
  });

  it('returns 400 for invalid query parameters', async () => {
    const url = 'http://localhost:3000/api/ai/training/vocabulary?startDate=bad&endDate=2026-01-31T00:00:00.000Z';
    const req = new NextRequest(url);
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/invalid query parameters/i);
  });

  it('returns 400 when start date is not before end date', async () => {
    const url = 'http://localhost:3000/api/ai/training/vocabulary?startDate=2026-02-01T00:00:00.000Z&endDate=2026-01-01T00:00:00.000Z&minFrequency=1';
    const req = new NextRequest(url);
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/start date must be before/i);
  });
});
