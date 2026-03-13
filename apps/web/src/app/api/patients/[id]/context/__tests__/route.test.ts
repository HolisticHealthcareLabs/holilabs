import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    userBehaviorEvent: { create: jest.fn() },
    accessReasonAggregate: { upsert: jest.fn() },
  },
}));

jest.mock('@/lib/cache/patient-context-cache', () => ({
  getCachedPatientFullContext: jest.fn(),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

const { GET } = require('../route');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { getCachedPatientFullContext } = require('@/lib/cache/patient-context-cache');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

describe('GET /api/patients/[id]/context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns patient context with valid access reason', async () => {
    const mockData = { patient: { id: 'patient-1' }, vitals: [] };
    (getCachedPatientFullContext as jest.Mock).mockResolvedValue(mockData);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/context?accessReason=DIRECT_PATIENT_CARE',
    );
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.patient.id).toBe('patient-1');
  });

  it('returns 400 when access reason is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/context');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Access reason');
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/context?accessReason=DIRECT_PATIENT_CARE',
    );
    const res = await GET(req, mockContext);

    expect(res.status).toBe(403);
  });

  it('returns 404 when patient not found', async () => {
    (getCachedPatientFullContext as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient-1/context?accessReason=DIRECT_PATIENT_CARE',
    );
    const res = await GET(req, mockContext);

    expect(res.status).toBe(404);
  });
});
