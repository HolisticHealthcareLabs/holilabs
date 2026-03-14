import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    devicePairing: { findFirst: jest.fn(), findMany: jest.fn() },
    devicePermission: { deleteMany: jest.fn(), createMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/qr/types', () => ({}));

const { POST, GET, PUT, DELETE } = require('../route');
const { prisma } = require('@/lib/prisma');

const USER_ID = 'user-1';
const mockContext = { user: { id: USER_ID } };

const mockDevicePairing = {
  id: 'pairing-1',
  deviceId: 'device-xyz',
  userId: USER_ID,
  isActive: true,
  permissions: [{ permission: 'READ_PATIENT_DATA' }],
};

describe('POST /api/qr/permissions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('grants permissions to a device', async () => {
    (prisma.devicePairing.findFirst as jest.Mock).mockResolvedValue(mockDevicePairing);
    (prisma.devicePermission.deleteMany as jest.Mock).mockResolvedValue({});
    (prisma.devicePermission.createMany as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/qr/permissions', {
      method: 'POST',
      body: JSON.stringify({ deviceId: 'device-xyz', permissions: ['READ_PATIENT_DATA', 'VIEW_TRANSCRIPT'] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.permissions).toContain('READ_PATIENT_DATA');
  });

  it('returns 400 for invalid permissions', async () => {
    const req = new NextRequest('http://localhost:3000/api/qr/permissions', {
      method: 'POST',
      body: JSON.stringify({ deviceId: 'device-xyz', permissions: ['INVALID_PERM'] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid permissions');
  });

  it('returns 404 when device not found', async () => {
    (prisma.devicePairing.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/qr/permissions', {
      method: 'POST',
      body: JSON.stringify({ deviceId: 'missing', permissions: ['READ_PATIENT_DATA'] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Device not found or not paired');
  });

  it('returns 400 for invalid request body', async () => {
    const req = new NextRequest('http://localhost:3000/api/qr/permissions', {
      method: 'POST',
      body: JSON.stringify({ permissions: ['READ_PATIENT_DATA'] }), // missing deviceId
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
  });
});

describe('GET /api/qr/permissions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns permissions for a specific device', async () => {
    (prisma.devicePairing.findFirst as jest.Mock).mockResolvedValue({
      ...mockDevicePairing,
      permissions: [{ permission: 'READ_PATIENT_DATA' }],
    });

    const req = new NextRequest('http://localhost:3000/api/qr/permissions?deviceId=device-xyz');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.permissions).toContain('READ_PATIENT_DATA');
  });

  it('returns all devices permissions when no deviceId specified', async () => {
    (prisma.devicePairing.findMany as jest.Mock).mockResolvedValue([
      { deviceId: 'device-xyz', deviceType: 'MOBILE_IOS', deviceName: 'iPhone', permissions: [{ permission: 'READ_PATIENT_DATA' }] },
    ]);

    const req = new NextRequest('http://localhost:3000/api/qr/permissions');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.devices).toHaveLength(1);
  });
});

describe('DELETE /api/qr/permissions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('revokes all permissions for a device', async () => {
    (prisma.devicePairing.findFirst as jest.Mock).mockResolvedValue(mockDevicePairing);
    (prisma.devicePermission.deleteMany as jest.Mock).mockResolvedValue({});

    const req = new NextRequest('http://localhost:3000/api/qr/permissions?deviceId=device-xyz', {
      method: 'DELETE',
    });
    const res = await DELETE(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Permissions revoked successfully');
  });
});
