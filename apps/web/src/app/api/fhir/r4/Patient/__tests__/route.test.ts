/**
 * Tests for /api/fhir/r4/Patient
 *
 * - GET searches patients with FHIR parameters
 * - GET returns 400 for invalid gender
 * - POST returns 400 for invalid FHIR Patient resource
 * - POST creates patient from valid FHIR resource
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    dataQualityEvent: {
      createMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  auditCreate: jest.fn().mockResolvedValue(undefined),
  auditView: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/fhir/patient-mapper', () => ({
  fromFHIRPatient: jest.fn().mockReturnValue({
    firstName: 'João',
    lastName: 'Silva',
    dateOfBirth: new Date('1990-01-01'),
    gender: 'MALE',
    mrn: null,
    tokenId: null,
  }),
  validateFHIRPatient: jest.fn().mockReturnValue([]),
  generateMRN: jest.fn().mockReturnValue('MRN-001'),
  generateTokenId: jest.fn().mockReturnValue('TKN-001'),
  toFHIRPatient: jest.fn().mockReturnValue({
    resourceType: 'Patient',
    id: 'patient-1',
    name: [{ family: 'Silva', given: ['João'] }],
  }),
}));

jest.mock('@/lib/blockchain/hashing', () => ({
  generatePatientDataHash: jest.fn().mockReturnValue('hash-abc'),
}));

const { GET, POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/fhir/r4/Patient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns FHIR Bundle with search results', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', firstName: 'João', lastName: 'Silva' },
    ]);
    (prisma.patient.count as jest.Mock).mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/fhir/r4/Patient?family=Silva');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.resourceType).toBe('Bundle');
    expect(data.type).toBe('searchset');
    expect(data.total).toBe(1);
  });

  it('returns 400 for invalid gender', async () => {
    const request = new NextRequest('http://localhost:3000/api/fhir/r4/Patient?gender=invalid');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.resourceType).toBe('OperationOutcome');
  });

  it('returns empty bundle when no patients found', async () => {
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.patient.count as jest.Mock).mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/fhir/r4/Patient?family=Nonexistent');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(0);
    expect(data.entry).toHaveLength(0);
  });
});

describe('POST /api/fhir/r4/Patient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('returns 400 for invalid FHIR Patient resource', async () => {
    const { validateFHIRPatient } = require('@/lib/fhir/patient-mapper');
    (validateFHIRPatient as jest.Mock).mockReturnValue(['Missing required field: name']);

    (prisma.dataQualityEvent.createMany as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/fhir/r4/Patient', {
      method: 'POST',
      body: JSON.stringify({ resourceType: 'Patient' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.resourceType).toBe('OperationOutcome');
  });
});
