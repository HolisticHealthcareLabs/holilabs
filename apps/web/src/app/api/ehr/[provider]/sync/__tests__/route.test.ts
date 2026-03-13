import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findFirst: jest.fn() },
    labResult: { findFirst: jest.fn(), create: jest.fn() },
    diagnosis: { findFirst: jest.fn(), create: jest.fn() },
    medication: { findFirst: jest.fn(), create: jest.fn() },
    allergy: { findFirst: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

jest.mock('@/lib/ehr', () => ({
  getSmartSessionForUser: jest.fn(),
  fetchFhirResource: jest.fn(),
  EhrApiError: class EhrApiError extends Error {
    statusCode: number;
    fhirOperationOutcome: any;
    constructor(msg: string, code: number) {
      super(msg);
      this.statusCode = code;
      this.fhirOperationOutcome = null;
    }
  },
}));

jest.mock('@/lib/fhir/resource-mappers', () => ({
  fromFHIRObservation: jest.fn(),
  fromFHIRCondition: jest.fn(),
  fromFHIRMedicationStatement: jest.fn(),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { getSmartSessionForUser, fetchFhirResource } = require('@/lib/ehr');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/ehr/epic/sync', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/ehr/[provider]/sync', () => {
  beforeEach(() => jest.clearAllMocks());

  it('syncs patient data from EHR provider (200)', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'local-pat-1',
      assignedClinicianId: 'clinician-1',
    });

    (getSmartSessionForUser as jest.Mock).mockResolvedValue({
      id: 'session-1',
      patientFhirId: 'fhir-pat-1',
    });

    (fetchFhirResource as jest.Mock).mockResolvedValue({ entry: [] });

    const res = await POST(
      makeRequest({ localPatientId: 'local-pat-1' }),
      { params: { provider: 'epic' }, ...mockContext }
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.providerId).toBe('epic');
    expect(data.data.localPatientId).toBe('local-pat-1');
  });

  it('returns 400 for invalid provider', async () => {
    const res = await POST(
      makeRequest({ localPatientId: 'local-pat-1' }),
      { params: { provider: 'invalidehr' }, ...mockContext }
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/invalid provider/i);
  });

  it('returns 400 when localPatientId is missing', async () => {
    const res = await POST(
      makeRequest({}),
      { params: { provider: 'epic' }, ...mockContext }
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/localPatientId/i);
  });

  it('returns 404 when patient not found or access denied', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await POST(
      makeRequest({ localPatientId: 'nonexistent' }),
      { params: { provider: 'epic' }, ...mockContext }
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/not found/i);
  });

  it('returns 400 when no EHR session exists', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'local-pat-1',
      assignedClinicianId: 'clinician-1',
    });
    (getSmartSessionForUser as jest.Mock).mockResolvedValue(null);

    const res = await POST(
      makeRequest({ localPatientId: 'local-pat-1' }),
      { params: { provider: 'epic' }, ...mockContext }
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/not connected/i);
  });
});
