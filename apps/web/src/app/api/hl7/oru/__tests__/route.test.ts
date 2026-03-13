import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findFirst: jest.fn() },
    labResult: { create: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockValidateORU = jest.fn();
const mockParseORU = jest.fn();
jest.mock('@/lib/hl7/oru-parser', () => ({
  ORUParser: {
    validate: mockValidateORU,
    isAbnormalResult: jest.fn().mockReturnValue(false),
    isCriticalResult: jest.fn().mockReturnValue(false),
  },
  parseORU: mockParseORU,
}));

jest.mock('@/lib/audit', () => ({ auditCreate: jest.fn() }));
jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockImplementation((_err: any, opts: any) =>
    new (require('next/server').NextResponse)(
      JSON.stringify({ error: opts?.userMessage || 'Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  ),
}));
jest.mock('@prisma/client', () => ({ LabResultStatus: { FINAL: 'FINAL', PRELIMINARY: 'PRELIMINARY', CORRECTED: 'CORRECTED', CANCELLED: 'CANCELLED' } }));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' },
};

describe('POST /api/hl7/oru', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when HL7 message is empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/hl7/oru', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/content type|empty/i);
  });

  it('returns 400 when HL7 validation fails', async () => {
    mockValidateORU.mockReturnValue({ valid: false, errors: ['Missing OBR segment'] });

    const req = new NextRequest('http://localhost:3000/api/hl7/oru', {
      method: 'POST',
      body: 'MSH|bad-oru',
      headers: { 'Content-Type': 'text/plain' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/invalid hl7/i);
  });

  it('returns 404 when patient is not found', async () => {
    mockValidateORU.mockReturnValue({ valid: true, errors: [] });
    mockParseORU.mockReturnValue({
      messageType: 'ORU',
      eventType: 'R01',
      messageControlId: 'MSG-100',
      sendingFacility: 'LAB-X',
      timestamp: new Date(),
      patient: { externalMrn: 'UNKNOWN-MRN', patientId: null },
      orders: [],
    });
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/hl7/oru', {
      method: 'POST',
      body: 'MSH|^~\\&|ORU|LAB-X|...',
      headers: { 'Content-Type': 'text/plain' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toMatch(/patient not found/i);
  });

  it('creates lab results and returns 201', async () => {
    mockValidateORU.mockReturnValue({ valid: true, errors: [] });
    mockParseORU.mockReturnValue({
      messageType: 'ORU',
      eventType: 'R01',
      messageControlId: 'MSG-200',
      sendingFacility: 'LAB-X',
      timestamp: new Date(),
      patient: { externalMrn: 'MRN-001', patientId: null },
      orders: [{
        orderingProvider: 'Dr. Smith',
        requestedDateTime: new Date(),
        observationDateTime: new Date(),
        notes: [],
        results: [{
          observationId: 'OBS-1',
          observationName: 'Glucose',
          loincCode: '2345-7',
          value: '95',
          units: 'mg/dL',
          referenceRange: '70-100',
          resultStatus: 'F',
          observationDateTime: new Date(),
          abnormalFlags: [],
        }],
      }],
    });
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ id: 'pat-1', mrn: 'MRN-001' });
    (prisma.labResult.create as jest.Mock).mockResolvedValue({
      id: 'lr-1',
      testName: 'Glucose',
      testCode: '2345-7',
      status: 'FINAL',
      isAbnormal: false,
      isCritical: false,
    });

    const req = new NextRequest('http://localhost:3000/api/hl7/oru', {
      method: 'POST',
      body: 'MSH|^~\\&|ORU|LAB-X|...',
      headers: { 'Content-Type': 'text/plain' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.results).toHaveLength(1);
    expect(data.summary.totalResults).toBe(1);
  });
});
