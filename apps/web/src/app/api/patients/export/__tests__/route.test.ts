import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  compose: jest.fn().mockImplementation((...fns: any[]) => fns[fns.length - 1]),
}));

jest.mock('@/lib/api/export-rate-limit', () => ({
  exportRateLimit: jest.fn().mockReturnValue((_req: any, _ctx: any, next: any) => next()),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findMany: jest.fn() },
  },
}));

jest.mock('@/lib/audit/deid-audit', () => ({
  logDeIDOperation: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@holi/deid', () => ({
  checkKAnonymity: jest.fn().mockReturnValue({ isAnonymous: true }),
  applyKAnonymity: jest.fn().mockImplementation((data: any) => data),
  dpCount: jest.fn().mockImplementation((n: number) => n),
  dpHistogram: jest.fn().mockImplementation((hist: any) => hist),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockPatients = [
  { id: 'p1', tokenId: 'TK-1', ageBand: '30-39', region: 'SP', gender: 'M', isPalliativeCare: false, hasSpecialNeeds: false, createdAt: new Date() },
  { id: 'p2', tokenId: 'TK-2', ageBand: '40-49', region: 'RJ', gender: 'F', isPalliativeCare: false, hasSpecialNeeds: false, createdAt: new Date() },
];

describe('POST /api/patients/export', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exports de-identified patient data as JSON', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue(mockPatients);

    const req = new NextRequest('http://localhost:3000/api/patients/export', {
      method: 'POST',
      body: JSON.stringify({ format: 'JSON', accessReason: 'Quality improvement audit of patient cohort' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.metadata.recordCount).toBe(2);
  });

  it('returns 404 when no patients match filters', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/patients/export', {
      method: 'POST',
      body: JSON.stringify({ format: 'JSON', accessReason: 'Quality improvement audit of patient cohort' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('NO_DATA');
  });

  it('returns 400 for invalid validation schema', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/export', {
      method: 'POST',
      body: JSON.stringify({ format: 'INVALID', accessReason: 'x' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('VALIDATION_ERROR');
  });

  it('blocks bulk export without supervisor approval', async () => {
    const largePatientList = Array.from({ length: 150 }, (_, i) => ({
      id: `p${i}`, tokenId: `TK-${i}`, ageBand: '30-39', region: 'SP', gender: 'M',
      isPalliativeCare: false, hasSpecialNeeds: false, createdAt: new Date(),
    }));
    (prisma.patient.findMany as jest.Mock).mockResolvedValue(largePatientList);

    const req = new NextRequest('http://localhost:3000/api/patients/export', {
      method: 'POST',
      body: JSON.stringify({ format: 'JSON', accessReason: 'Quality improvement audit of patient cohort' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('SUPERVISOR_APPROVAL_REQUIRED');
  });
});
