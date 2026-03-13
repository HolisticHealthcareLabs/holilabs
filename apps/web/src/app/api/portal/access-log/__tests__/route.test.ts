import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/auth/patient-session', () => ({
  getPatientSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: { findMany: jest.fn(), count: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { GET } = require('../route');
const { getPatientSession } = require('@/lib/auth/patient-session');
const { prisma } = require('@/lib/prisma');

const mockSession = { userId: 'pu-1', patientId: 'patient-1', email: 'p@test.com' };

const mockLog = {
  id: 'log-1',
  timestamp: new Date(),
  userId: 'doc-1',
  action: 'READ',
  resource: 'Patient',
  resourceId: 'patient-1',
  ipAddress: '127.0.0.1',
  details: {},
};

describe('GET /api/portal/access-log', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated access logs for authenticated patient', async () => {
    (getPatientSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([mockLog]);
    (prisma.auditLog.count as jest.Mock).mockResolvedValue(1);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      firstName: 'Dr',
      lastName: 'Test',
      role: 'CLINICIAN',
      specialty: 'GP',
    });

    const req = new NextRequest('http://localhost:3000/api/portal/access-log?patientId=patient-1');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].accessedBy).toBe('Dr Test');
    expect(data.pagination.total).toBe(1);
  });

  it('returns 401 when no session', async () => {
    (getPatientSession as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/portal/access-log?patientId=patient-1');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when patientId does not match session', async () => {
    (getPatientSession as jest.Mock).mockResolvedValue(mockSession);

    const req = new NextRequest('http://localhost:3000/api/portal/access-log?patientId=other-patient');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toMatch(/Forbidden/);
  });

  it('returns 400 when patientId is missing', async () => {
    (getPatientSession as jest.Mock).mockResolvedValue(mockSession);

    const req = new NextRequest('http://localhost:3000/api/portal/access-log');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/patientId required/);
  });
});
