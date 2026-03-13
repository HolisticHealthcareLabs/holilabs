import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockValidate = jest.fn();
const mockParseADT = jest.fn();
jest.mock('@/lib/hl7/adt-parser', () => ({
  ADTParser: { validate: mockValidate },
  parseADT: mockParseADT,
}));

jest.mock('@/lib/blockchain/hashing', () => ({ generatePatientDataHash: jest.fn().mockReturnValue('hash-123') }));
jest.mock('@/lib/fhir/patient-mapper', () => ({ generateMRN: jest.fn().mockReturnValue('MRN-001'), generateTokenId: jest.fn().mockReturnValue('TKN-001') }));
jest.mock('@/lib/audit', () => ({ auditCreate: jest.fn(), auditUpdate: jest.fn() }));
jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn().mockImplementation((_err: any, opts: any) =>
    new (require('next/server').NextResponse)(
      JSON.stringify({ error: opts?.userMessage || 'Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  ),
}));

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/hl7/adt', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const mockContext = {
  user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' },
};

describe('POST /api/hl7/adt', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when message body is empty', async () => {
    const res = await POST(makeRequest({}), mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/content type|empty/i);
  });

  it('returns 400 when HL7 validation fails', async () => {
    mockValidate.mockReturnValue({ valid: false, errors: ['MSH missing'] });

    const req = new NextRequest('http://localhost:3000/api/hl7/adt', {
      method: 'POST',
      body: 'MSH|bad-message',
      headers: { 'Content-Type': 'text/plain' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/invalid hl7/i);
  });

  it('creates a new patient on ADT^A01 registration event (201)', async () => {
    mockValidate.mockReturnValue({ valid: true, errors: [] });
    mockParseADT.mockReturnValue({
      messageType: 'ADT',
      eventType: 'A01',
      messageControlId: 'MSG-001',
      sendingFacility: 'LAB-A',
      patient: {
        firstName: 'Maria',
        lastName: 'Silva',
        dateOfBirth: new Date('1990-01-15'),
        gender: 'F',
        email: 'maria@test.com',
        phone: null,
        address: null,
        city: null,
        state: null,
        postalCode: null,
        country: 'BR',
        cpf: '12345678900',
        externalMrn: 'EXT-001',
        externalPatientId: null,
      },
    });
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.patient.create as jest.Mock).mockResolvedValue({
      id: 'pat-new',
      firstName: 'Maria',
      lastName: 'Silva',
      mrn: 'MRN-001',
    });

    const req = new NextRequest('http://localhost:3000/api/hl7/adt', {
      method: 'POST',
      body: 'MSH|^~\\&|ADT|LAB-A|...',
      headers: { 'Content-Type': 'text/plain' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.action).toBe('created');
    expect(data.patientId).toBe('pat-new');
  });

  it('returns 409 when patient already exists and event is not update type', async () => {
    mockValidate.mockReturnValue({ valid: true, errors: [] });
    mockParseADT.mockReturnValue({
      messageType: 'ADT',
      eventType: 'A01',
      messageControlId: 'MSG-002',
      sendingFacility: 'LAB-A',
      patient: {
        firstName: 'Maria',
        lastName: 'Silva',
        dateOfBirth: new Date('1990-01-15'),
        gender: 'F',
        email: null, phone: null, address: null, city: null, state: null,
        postalCode: null, country: 'BR', cpf: null, externalMrn: null, externalPatientId: null,
      },
    });
    (prisma.patient.findFirst as jest.Mock).mockResolvedValue({
      id: 'pat-exist',
      firstName: 'Maria',
      lastName: 'Silva',
      mrn: 'MRN-OLD',
    });

    const req = new NextRequest('http://localhost:3000/api/hl7/adt', {
      method: 'POST',
      body: 'MSH|^~\\&|ADT|LAB-A|...',
      headers: { 'Content-Type': 'text/plain' },
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toMatch(/already exists/i);
  });
});
