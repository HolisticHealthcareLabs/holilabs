import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pushSubscription: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'p@test.com' },
  requestId: 'req-1',
};

const validSubscription = {
  subscription: {
    endpoint: 'https://push.example.com/subscriber/abc123',
    expirationTime: null,
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlTiESgx74rrIHbn1N',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
  },
};

describe('POST /api/portal/notifications/subscribe', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates new push subscription', async () => {
    (prisma.pushSubscription.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.pushSubscription.create as jest.Mock).mockResolvedValue({ id: 'sub-1', ...validSubscription.subscription });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/portal/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(validSubscription),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.subscriptionId).toBe('sub-1');
    expect(data.message).toContain('created');
  });

  it('updates existing push subscription when endpoint already registered', async () => {
    (prisma.pushSubscription.findUnique as jest.Mock).mockResolvedValue({ id: 'sub-existing' });
    (prisma.pushSubscription.update as jest.Mock).mockResolvedValue({ id: 'sub-existing' });

    const req = new NextRequest('http://localhost:3000/api/portal/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(validSubscription),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('updated');
    expect(prisma.pushSubscription.update).toHaveBeenCalled();
  });

  it('returns 400 for invalid subscription data', async () => {
    const req = new NextRequest('http://localhost:3000/api/portal/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription: { endpoint: 'not-a-url', keys: {} } }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid subscription data');
  });

  it('returns 400 when subscription body is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/portal/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
  });
});
