import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    devicePairing: { create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST, GET, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const USER_ID = 'user-1';
const mockContext = { user: { id: USER_ID } };

const validQrPayload = {
  sessionId: 'session-abc',
  userId: USER_ID,
  deviceId: 'device-xyz',
  deviceType: 'MOBILE_IOS' as const,
  pairingCode: '123456',
  expiresAt: Date.now() + 60000, // 1 minute from now
};

describe('POST /api/qr/pair', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pairs a device successfully', async () => {
    (prisma.devicePairing.create as jest.Mock).mockResolvedValue({ id: 'pairing-1' });

    const req = new NextRequest('http://localhost:3000/api/qr/pair', {
      method: 'POST',
      body: JSON.stringify({ qrPayload: validQrPayload }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.deviceId).toBe('device-xyz');
    expect(data.sessionToken).toBeDefined();
  });

  it('returns 400 when QR code has expired', async () => {
    const expiredPayload = { ...validQrPayload, expiresAt: Date.now() - 1000 };
    const req = new NextRequest('http://localhost:3000/api/qr/pair', {
      method: 'POST',
      body: JSON.stringify({ qrPayload: expiredPayload }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('QR code has expired');
  });

  it('returns 403 when userId in payload does not match authenticated user', async () => {
    const mismatchedPayload = { ...validQrPayload, userId: 'other-user' };
    const req = new NextRequest('http://localhost:3000/api/qr/pair', {
      method: 'POST',
      body: JSON.stringify({ qrPayload: mismatchedPayload }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('User mismatch');
  });

  it('returns 400 for invalid QR payload (missing deviceId)', async () => {
    const req = new NextRequest('http://localhost:3000/api/qr/pair', {
      method: 'POST',
      body: JSON.stringify({ qrPayload: { sessionId: 'session-abc' } }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid QR payload');
  });
});

describe('GET /api/qr/pair', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paired devices for the user', async () => {
    (prisma.devicePairing.findMany as jest.Mock).mockResolvedValue([
      { id: 'pairing-1', deviceId: 'device-xyz', deviceType: 'MOBILE_IOS', deviceName: 'iPhone', lastSeenAt: null, expiresAt: new Date(Date.now() + 86400000), createdAt: new Date() },
    ]);

    const req = new NextRequest('http://localhost:3000/api/qr/pair');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.devices).toHaveLength(1);
  });
});

describe('DELETE /api/qr/pair', () => {
  beforeEach(() => jest.clearAllMocks());

  it('unpairs a device', async () => {
    (prisma.devicePairing.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    const req = new NextRequest('http://localhost:3000/api/qr/pair?deviceId=device-xyz', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Device unpaired successfully');
  });

  it('returns 400 when deviceId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/qr/pair', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Device ID required');
  });
});
