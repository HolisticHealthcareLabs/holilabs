/**
 * Tests for /api/fhir/r4/Patient/[id]
 *
 * - GET returns FHIR Patient by ID
 * - GET returns 404 when patient not found
 * - GET returns 403 when access denied
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  auditView: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/fhir/patient-mapper', () => ({
  toFHIRPatient: jest.fn().mockReturnValue({
    resourceType: 'Patient',
    id: 'patient-1',
    name: [{ family: 'Silva', given: ['João'] }],
  }),
  validateFHIRPatient: jest.fn().mockReturnValue([]),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn(),
}));

const { GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

describe('GET /api/fhir/r4/Patient/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns FHIR Patient resource by ID', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      firstName: 'João',
      lastName: 'Silva',
      mrn: 'MRN-001',
    });

    const request = new NextRequest('http://localhost:3000/api/fhir/r4/Patient/patient-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resourceType).toBe('Patient');
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/fhir/r4/Patient/nonexistent');
    const response = await GET(request, { ...mockContext, params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.resourceType).toBe('OperationOutcome');
  });

  it('returns 403 when access denied', async () => {
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'patient-1',
      firstName: 'João',
      lastName: 'Silva',
    });
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/api/fhir/r4/Patient/patient-1');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.resourceType).toBe('OperationOutcome');
  });
});
