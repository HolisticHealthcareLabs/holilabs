import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    aISentenceConfidence: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn() }
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((_err: any, opts: any) =>
    new (require('next/server').NextResponse)(
      JSON.stringify({ error: opts?.userMessage || 'Error' }),
      { status: 500 }
    )
  ),
}));

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const ctx = { user: { id: 'doc-1' } };

describe('POST /api/ai/confidence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores confidence scores and returns count', async () => {
    (prisma.aISentenceConfidence.create as jest.Mock)
      .mockResolvedValueOnce({ id: 'c1', needsReview: false })
      .mockResolvedValueOnce({ id: 'c2', needsReview: true });

    const req = new NextRequest('http://localhost:3000/api/ai/confidence', {
      method: 'POST',
      body: JSON.stringify({
        contentType: 'soap_note',
        contentId: 'note-1',
        sentences: [
          { index: 0, text: 'Patient presents with...', confidence: 0.9 },
          { index: 1, text: 'Diagnosis uncertain...', confidence: 0.5 },
        ],
      }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.stored).toBe(2);
    expect(json.needsReview).toBe(1);
  });

  it('returns 400 when required fields missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/confidence', {
      method: 'POST',
      body: JSON.stringify({ contentType: 'soap_note' }),
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/ai/confidence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns confidence scores with summary stats', async () => {
    (prisma.aISentenceConfidence.findMany as jest.Mock).mockResolvedValue([
      { id: 'c1', sentenceIndex: 0, sentenceText: 'Test', confidence: 0.9, needsReview: false, reviewed: false },
      { id: 'c2', sentenceIndex: 1, sentenceText: 'Test2', confidence: 0.6, needsReview: true, reviewed: false },
    ]);

    const req = new NextRequest(
      'http://localhost:3000/api/ai/confidence?contentType=soap_note&contentId=note-1'
    );
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary.totalSentences).toBe(2);
    expect(json.summary.needsReviewCount).toBe(1);
  });

  it('returns 400 when query params missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/confidence');
    const res = await GET(req, ctx);

    expect(res.status).toBe(400);
  });
});
