import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pushSubscription: { upsert: jest.fn(), updateMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((err: any) =>
    require('next/server').NextResponse.json({ error: 'Internal error' }, { status: 500 })
  ),
}));

const { POST, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'user-1', email: 'user@test.com' },
};

const mockSubscription = {
  endpoint: 'https://push.example.com/subscription123',
  keys: { p256dh: 'p256dhkey', auth: 'authkey' },
  expirationTime: null,
};

describe('POST /api/push/subscribe', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves push subscription successfully', async () => {
    (prisma.pushSubscription.upsert as jest.Mock).mockResolvedValue({ id: 'sub-1' });

    const req = new NextRequest('http://localhost:3000/api/push/subscribe', {
      method: 'POST',
      headers: { 'user-agent': 'Chrome on Windows' },
      body: JSON.stringify(mockSubscription),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Push subscription saved successfully');
    expect(data.data.id).toBe('sub-1');
  });

  it('returns 400 for invalid subscription (missing endpoint)', async () => {
    const req = new NextRequest('http://localhost:3000/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ keys: { p256dh: 'key', auth: 'auth' } }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid subscription data');
  });

  it('returns 400 for invalid endpoint URL', async () => {
    const req = new NextRequest('http://localhost:3000/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: 'not-a-url', keys: { p256dh: 'key', auth: 'auth' } }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid subscription data');
  });
});

describe('DELETE /api/push/subscribe', () => {
  beforeEach(() => jest.clearAllMocks());

  it('removes push subscription', async () => {
    (prisma.pushSubscription.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const req = new NextRequest('http://localhost:3000/api/push/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint: 'https://push.example.com/subscription123' }),
    });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Push subscription removed successfully');
  });

  it('returns 400 when endpoint is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/push/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({}),
    });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Endpoint is required');
  });
});
