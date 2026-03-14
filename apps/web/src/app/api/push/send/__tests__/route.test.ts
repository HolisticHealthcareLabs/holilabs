import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((err: any) =>
    require('next/server').NextResponse.json({ error: 'Internal error' }, { status: 500 })
  ),
}));

// Prisma is dynamically imported in push/send route
jest.mock('@/lib/prisma', () => ({
  prisma: {
    pushSubscription: { findMany: jest.fn(), update: jest.fn() },
  },
}));

const originalEnv = { ...process.env };

describe('POST /api/push/send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns 503 when VAPID keys are not configured', async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    const { POST } = require('../route');
    const req = new NextRequest('http://localhost:3000/api/push/send', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', body: 'Test notification' }),
    });
    const res = await POST(req, { user: { id: 'user-1' } });
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toBe('Push notifications not configured');
  });

  it('returns 400 for invalid notification schema (missing title)', async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'mock-public-key';
    process.env.VAPID_PRIVATE_KEY = 'mock-private-key';

    const { POST } = require('../route');
    const req = new NextRequest('http://localhost:3000/api/push/send', {
      method: 'POST',
      body: JSON.stringify({ body: 'No title provided' }),
    });
    const res = await POST(req, { user: { id: 'user-1' } });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid notification data');
  });

  it('returns 404 when no push subscriptions found', async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'mock-public-key';
    process.env.VAPID_PRIVATE_KEY = 'mock-private-key';

    const webpush = require('web-push');
    webpush.setVapidDetails.mockImplementation(() => {});

    const { prisma } = require('@/lib/prisma');
    (prisma.pushSubscription.findMany as jest.Mock).mockResolvedValue([]);

    const { POST } = require('../route');
    const req = new NextRequest('http://localhost:3000/api/push/send', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1', title: 'Test', body: 'Test notification' }),
    });
    const res = await POST(req, { user: { id: 'user-1' } });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('No push subscriptions');
  });

  it('sends push notifications to active subscriptions', async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'mock-public-key';
    process.env.VAPID_PRIVATE_KEY = 'mock-private-key';

    const webpush = require('web-push');
    webpush.setVapidDetails.mockImplementation(() => {});
    webpush.sendNotification.mockResolvedValue({ statusCode: 201 });

    const { prisma } = require('@/lib/prisma');
    (prisma.pushSubscription.findMany as jest.Mock).mockResolvedValue([
      { id: 'sub-1', endpoint: 'https://push.example.com/sub1', keys: { p256dh: 'key1', auth: 'auth1' } },
    ]);
    (prisma.pushSubscription.update as jest.Mock).mockResolvedValue({});

    const { POST } = require('../route');
    const req = new NextRequest('http://localhost:3000/api/push/send', {
      method: 'POST',
      body: JSON.stringify({ userId: 'user-1', title: 'Appointment Reminder', body: 'Your appointment is tomorrow' }),
    });
    const res = await POST(req, { user: { id: 'user-1' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.stats.successful).toBe(1);
  });
});
