import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => {
  const db = {
    assuranceEvent: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    humanFeedback: {
      create: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
  };
  return { prisma: db };
});

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: (error: any, opts: any) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: opts.userMessage }, { status: 500 });
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const db = prisma as any;

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com', role: 'PHYSICIAN' },
};

describe('POST /api/assurance/feedback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records clinician feedback on an AI recommendation', async () => {
    (db.assuranceEvent.findUnique as jest.Mock).mockResolvedValue({ id: 'ev-1' });
    (db.humanFeedback.create as jest.Mock).mockResolvedValue({
      id: 'fb-1',
      feedbackType: 'THUMBS_UP',
      feedbackSource: 'PHYSICIAN',
    });

    const req = new NextRequest('http://localhost:3000/api/assurance/feedback', {
      method: 'POST',
      body: JSON.stringify({
        assuranceEventId: 'ev-1',
        feedbackType: 'THUMBS_UP',
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.feedbackType).toBe('THUMBS_UP');
  });

  it('returns 400 for invalid feedback type', async () => {
    const req = new NextRequest('http://localhost:3000/api/assurance/feedback', {
      method: 'POST',
      body: JSON.stringify({
        assuranceEventId: 'ev-1',
        feedbackType: 'INVALID',
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Validation');
  });

  it('returns 404 when assurance event not found', async () => {
    (db.assuranceEvent.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/assurance/feedback', {
      method: 'POST',
      body: JSON.stringify({
        assuranceEventId: 'ev-missing',
        feedbackType: 'THUMBS_DOWN',
      }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });
});

describe('GET /api/assurance/feedback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns feedback aggregation for dashboard', async () => {
    (db.humanFeedback.groupBy as jest.Mock)
      .mockResolvedValueOnce([{ feedbackType: 'THUMBS_UP', _count: { id: 5 } }])
      .mockResolvedValueOnce([{ feedbackSource: 'PHYSICIAN', _count: { id: 5 } }]);
    (db.humanFeedback.count as jest.Mock).mockResolvedValue(5);
    (db.assuranceEvent.count as jest.Mock)
      .mockResolvedValueOnce(1)   // overrides
      .mockResolvedValueOnce(9);  // accepts

    const req = new NextRequest('http://localhost:3000/api/assurance/feedback?period=7d');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.total).toBe(5);
    expect(data.data.acceptRate).toBe(90);
  });

  it('defaults to 7d period', async () => {
    (db.humanFeedback.groupBy as jest.Mock).mockResolvedValue([]);
    (db.humanFeedback.count as jest.Mock).mockResolvedValue(0);
    (db.assuranceEvent.count as jest.Mock).mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/assurance/feedback');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.period).toBe('7d');
  });

  it('returns 500 on aggregation failure', async () => {
    (db.humanFeedback.groupBy as jest.Mock).mockRejectedValue(new Error('Aggregation failed'));

    const req = new NextRequest('http://localhost:3000/api/assurance/feedback');
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
