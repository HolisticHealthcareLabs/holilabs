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
    medicationAdministration: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/mar/schedule-generator', () => ({
  getMinutesLate: jest.fn().mockReturnValue(0),
  getDoseStatus: jest.fn().mockReturnValue('ON_TIME'),
}));

jest.mock('@/lib/audit', () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockReturnValue(
    new (require('next/server').NextResponse)(JSON.stringify({ error: 'Error' }), { status: 500 })
  ),
}));

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'nurse-1', email: 'nurse@holilabs.com', role: 'NURSE' },
  params: {},
};

const mockAdministration = {
  id: 'adm-1',
  medicationId: 'med-1',
  patientId: 'pat-1',
  status: 'GIVEN',
  medication: { id: 'med-1', name: 'Metformin' },
  patient: { id: 'pat-1', firstName: 'Ana', lastName: 'Lima', mrn: 'MRN001' },
};

describe('POST /api/mar/administer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.medicationAdministration.create as jest.Mock).mockResolvedValue(mockAdministration);
  });

  it('records a medication administration successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/mar/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicationId: 'med-1',
        patientId: 'pat-1',
        scheduledTime: new Date().toISOString(),
        status: 'GIVEN',
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.administration.status).toBe('GIVEN');
  });

  it('returns 400 when required fields are missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/mar/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicationId: 'med-1' }), // missing patientId, scheduledTime, status
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('includes administration message in response', async () => {
    const req = new NextRequest('http://localhost:3000/api/mar/administer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicationId: 'med-1',
        patientId: 'pat-1',
        scheduledTime: new Date().toISOString(),
        status: 'GIVEN',
      }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(data.message).toContain('Metformin');
  });
});

describe('GET /api/mar/administer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.medicationAdministration.findMany as jest.Mock).mockResolvedValue([mockAdministration]);
  });

  it('returns administration records for a patient', async () => {
    const req = new NextRequest('http://localhost:3000/api/mar/administer?patientId=pat-1');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.count).toBe(1);
    expect(data.summary.given).toBe(1);
  });

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/mar/administer');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Patient ID');
  });
});
