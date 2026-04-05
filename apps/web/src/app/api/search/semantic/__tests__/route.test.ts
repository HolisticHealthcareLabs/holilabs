import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/ai/embeddings', () => ({
  generateEmbedding: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    userBehaviorEvent: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((err: any) => {
    const { NextResponse } = require('next/server');
    if ((err instanceof Error ? err.message : String(err)).includes('vector')) {
      return NextResponse.json({ error: 'Vector search not available' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }),
}));

const { POST } = require('../route');
const { generateEmbedding } = require('@/lib/ai/embeddings');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { prisma } = require('@/lib/prisma');

const mockContext = { user: { id: 'doc-1', email: 'doc@test.com' } };

describe('POST /api/search/semantic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.userBehaviorEvent.create as jest.Mock).mockResolvedValue({});
  });

  it('returns 400 when query is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({ query: '   ', searchType: 'clinical_notes' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Query is required');
  });

  it('returns 403 when user lacks patient access', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({ query: 'diabetes', searchType: 'clinical_notes', patientId: 'patient-1' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('permission');
  });

  it('returns search results for clinical notes', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (generateEmbedding as jest.Mock).mockResolvedValue(new Array(1536).fill(0.1));
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { id: 'emb-1', sourceType: 'NOTE', sourceId: 'note-1', patientId: 'patient-1', contentPreview: 'Diabetes management...', distance: 0.1 },
    ]);

    const req = new NextRequest('http://localhost:3000/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({ query: 'diabetes management', searchType: 'clinical_notes' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results).toHaveLength(1);
    expect(data.meta.resultCount).toBe(1);
  });

  it('returns empty results when similarity below threshold', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (generateEmbedding as jest.Mock).mockResolvedValue(new Array(1536).fill(0.1));
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { id: 'emb-1', sourceType: 'NOTE', sourceId: 'note-1', patientId: 'patient-1', contentPreview: 'Unrelated content', distance: 10 },
    ]);

    const req = new NextRequest('http://localhost:3000/api/search/semantic', {
      method: 'POST',
      body: JSON.stringify({ query: 'hypertension', searchType: 'clinical_notes', threshold: 0.9 }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results).toHaveLength(0);
  });
});
