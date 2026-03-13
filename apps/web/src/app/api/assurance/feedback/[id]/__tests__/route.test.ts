import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    humanFeedback: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET, PUT, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = (id: string) => ({
  user: { id: 'doc-1', email: 'doc@test.com' },
  params: { id },
});

describe('GET /api/assurance/feedback/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns feedback details', async () => {
    (prisma.humanFeedback.findUnique as jest.Mock).mockResolvedValue({
      id: 'fb-1',
      feedbackType: 'THUMBS_UP',
      assuranceEvent: { id: 'ev-1', eventType: 'DIAGNOSIS' },
    });

    const req = new NextRequest('http://localhost:3000/api/assurance/feedback/fb-1');
    const res = await GET(req, mockContext('fb-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.feedbackType).toBe('THUMBS_UP');
  });

  it('returns 404 when feedback not found', async () => {
    (prisma.humanFeedback.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/assurance/feedback/fb-missing');
    const res = await GET(req, mockContext('fb-missing'));

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/assurance/feedback/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates feedback fields', async () => {
    (prisma.humanFeedback.findUnique as jest.Mock).mockResolvedValue({ id: 'fb-1' });
    (prisma.humanFeedback.update as jest.Mock).mockResolvedValue({
      id: 'fb-1',
      feedbackType: 'CORRECTION',
    });

    const req = new NextRequest('http://localhost:3000/api/assurance/feedback/fb-1', {
      method: 'PUT',
      body: JSON.stringify({ feedbackType: 'CORRECTION' }),
    });

    const res = await PUT(req, mockContext('fb-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.feedbackType).toBe('CORRECTION');
  });

  it('returns 404 when feedback not found for update', async () => {
    (prisma.humanFeedback.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/assurance/feedback/fb-missing', {
      method: 'PUT',
      body: JSON.stringify({ feedbackType: 'THUMBS_DOWN' }),
    });

    const res = await PUT(req, mockContext('fb-missing'));

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid update payload', async () => {
    const req = new NextRequest('http://localhost:3000/api/assurance/feedback/fb-1', {
      method: 'PUT',
      body: JSON.stringify({ feedbackType: 'INVALID_TYPE' }),
    });

    const res = await PUT(req, mockContext('fb-1'));

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/assurance/feedback/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes feedback', async () => {
    (prisma.humanFeedback.findUnique as jest.Mock).mockResolvedValue({
      id: 'fb-1',
      assuranceEventId: 'ev-1',
    });
    (prisma.humanFeedback.delete as jest.Mock).mockResolvedValue(undefined);

    const req = new NextRequest('http://localhost:3000/api/assurance/feedback/fb-1', { method: 'DELETE' });
    const res = await DELETE(req, mockContext('fb-1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted');
  });

  it('returns 404 when feedback not found for deletion', async () => {
    (prisma.humanFeedback.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/assurance/feedback/fb-missing', { method: 'DELETE' });
    const res = await DELETE(req, mockContext('fb-missing'));

    expect(res.status).toBe(404);
  });
});
