import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    aIContentFeedback: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
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

describe('POST /api/ai/feedback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates feedback record with edit distance', async () => {
    (prisma.aIContentFeedback.create as jest.Mock).mockResolvedValue({
      id: 'fb-1',
      isCorrect: false,
      editDistance: 5,
    });

    const req = new NextRequest('http://localhost:3000/api/ai/feedback', {
      method: 'POST',
      body: JSON.stringify({
        contentType: 'soap_note',
        contentId: 'note-1',
        isCorrect: false,
        originalText: 'Patient has flu',
        editedText: 'Patient has cold',
      }),
    });
    const res = await POST(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.feedback.id).toBe('fb-1');
  });

  it('returns 400 when required fields missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/feedback', {
      method: 'POST',
      body: JSON.stringify({ contentType: 'soap_note' }),
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(400);
  });

  it('returns 400 when isCorrect is not boolean', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/feedback', {
      method: 'POST',
      body: JSON.stringify({
        contentType: 'soap_note',
        contentId: 'note-1',
        isCorrect: 'yes',
        originalText: 'test',
      }),
    });
    const res = await POST(req, ctx);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/ai/feedback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns feedback items with summary statistics', async () => {
    (prisma.aIContentFeedback.findMany as jest.Mock).mockResolvedValue([
      { id: 'fb-1', isCorrect: true, editDistance: null, aiConfidence: 0.9, clinician: { id: 'doc-1' }, createdAt: new Date() },
      { id: 'fb-2', isCorrect: false, editDistance: 8, aiConfidence: 0.6, clinician: { id: 'doc-1' }, createdAt: new Date() },
    ]);

    const req = new NextRequest('http://localhost:3000/api/ai/feedback?contentType=soap_note');
    const res = await GET(req, ctx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary.totalFeedback).toBe(2);
    expect(json.summary.correctCount).toBe(1);
    expect(json.summary.accuracyRate).toBe(0.5);
  });
});
