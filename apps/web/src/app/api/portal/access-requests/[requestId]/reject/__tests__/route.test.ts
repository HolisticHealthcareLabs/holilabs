import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@test.com' },
  params: { requestId: 'req-abc' },
  requestId: 'req-1',
};

describe('POST /api/portal/access-requests/[requestId]/reject', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects access request and notifies clinician', async () => {
    (prisma.notification.findFirst as jest.Mock).mockResolvedValue({
      id: 'notif-1',
      metadata: {
        kind: 'DATA_ACCESS_REQUEST',
        requestId: 'req-abc',
        clinicianId: 'doc-1',
      },
    });
    (prisma.notification.update as jest.Mock).mockResolvedValue({});
    (prisma.notification.create as jest.Mock).mockResolvedValue({});

    const res = await POST(new NextRequest('http://localhost:3000/api/portal/access-requests/req-abc/reject', { method: 'POST' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notif-1' },
        data: expect.objectContaining({ isRead: true }),
      })
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipientId: 'doc-1',
          type: 'SYSTEM_ALERT',
          metadata: expect.objectContaining({ kind: 'DATA_ACCESS_REJECTED' }),
        }),
      })
    );
  });

  it('returns 404 when request not found', async () => {
    (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await POST(new NextRequest('http://localhost:3000/api/portal/access-requests/req-abc/reject', { method: 'POST' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('still succeeds when clinicianId is missing', async () => {
    (prisma.notification.findFirst as jest.Mock).mockResolvedValue({
      id: 'notif-1',
      metadata: {
        kind: 'DATA_ACCESS_REQUEST',
        requestId: 'req-abc',
      },
    });
    (prisma.notification.update as jest.Mock).mockResolvedValue({});

    const res = await POST(new NextRequest('http://localhost:3000/api/portal/access-requests/req-abc/reject', { method: 'POST' }), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
