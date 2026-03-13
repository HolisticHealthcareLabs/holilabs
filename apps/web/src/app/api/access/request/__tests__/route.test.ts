import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    notification: { create: jest.fn() },
  },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'doc@test.com' },
};

describe('POST /api/access/request', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates access request notifications for both parties', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'p-1',
      tokenId: 'TOKEN123',
      firstName: 'John',
      lastName: 'Doe',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'doc-1',
      firstName: 'Dr',
      lastName: 'Smith',
      role: 'PHYSICIAN',
    });
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'n-1' });

    const req = new NextRequest('http://localhost:3000/api/access/request', {
      method: 'POST',
      body: JSON.stringify({ patientTokenId: 'TOKEN123', purpose: 'Routine checkup' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.requestId).toBeDefined();
    expect(data.expiresAt).toBeDefined();
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
  });

  it('returns 400 for invalid payload', async () => {
    const req = new NextRequest('http://localhost:3000/api/access/request', {
      method: 'POST',
      body: JSON.stringify({ patientTokenId: '' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'doc-1', firstName: 'Dr', lastName: 'Smith' });

    const req = new NextRequest('http://localhost:3000/api/access/request', {
      method: 'POST',
      body: JSON.stringify({ patientTokenId: 'UNKNOWN_TOKEN' }),
    });

    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('Patient not found');
  });
});
