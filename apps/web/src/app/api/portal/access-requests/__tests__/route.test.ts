import { NextRequest } from 'next/server';

jest.mock('@/lib/api/patient-portal-middleware', () => ({
  createPatientPortalRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    notification: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  session: { userId: 'pu-1', patientId: 'patient-1', email: 'patient@test.com' },
  requestId: 'req-1',
};

describe('GET /api/portal/access-requests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns pending access requests', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'notif-1',
        metadata: {
          kind: 'DATA_ACCESS_REQUEST',
          requestId: 'req-abc',
          clinicianId: 'doc-1',
          clinicianName: 'Dr. Test',
          purpose: 'Consultation',
        },
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      },
      {
        id: 'notif-2',
        metadata: { kind: 'OTHER_TYPE' },
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      },
    ]);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/access-requests'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.accessRequests).toHaveLength(1);
    expect(data.data.accessRequests[0].requestId).toBe('req-abc');
    expect(data.data.accessRequests[0].clinicianName).toBe('Dr. Test');
  });

  it('returns empty list when no requests', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET(new NextRequest('http://localhost:3000/api/portal/access-requests'), mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.accessRequests).toEqual([]);
  });
});
