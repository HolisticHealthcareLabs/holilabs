import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    userBehaviorEvent: { create: jest.fn() },
  },
}));

jest.mock('@/lib/fhir/aggressive-pull', () => ({
  aggressivePullPatientData: jest.fn(),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockImplementation((_err, opts) =>
    new (require('next/server').NextResponse)(JSON.stringify({ error: opts?.userMessage }), { status: 500 }),
  ),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { aggressivePullPatientData } = require('@/lib/fhir/aggressive-pull');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

describe('POST /api/patients/[id]/fhir-pull', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('triggers FHIR pull successfully', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-1', firstName: 'John', lastName: 'Doe' });
    (aggressivePullPatientData as jest.Mock).mockResolvedValue({
      success: true,
      summary: { observations: 5, conditions: 2, medications: 1, procedures: 0 },
      errors: [],
      durationMs: 1200,
    });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/fhir-pull', {
      method: 'POST',
      body: JSON.stringify({ fhirPatientId: 'fhir-123' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.summary.observations).toBe(5);
  });

  it('returns 400 when fhirPatientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/fhir-pull', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('fhirPatientId');
  });

  it('returns 403 when access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/fhir-pull', {
      method: 'POST',
      body: JSON.stringify({ fhirPatientId: 'fhir-123' }),
    });
    const res = await POST(req, mockContext);

    expect(res.status).toBe(403);
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/fhir-pull', {
      method: 'POST',
      body: JSON.stringify({ fhirPatientId: 'fhir-123' }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
  });
});
