import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { create: jest.fn(), update: jest.fn() },
    consent: { create: jest.fn() },
  },
}));

jest.mock('@/lib/security/encryption', () => ({
  encryptPHIWithVersion: jest.fn().mockResolvedValue('enc-value'),
}));

jest.mock('@/lib/security/audit-chain', () => ({
  createChainedAuditEntry: jest.fn().mockResolvedValue({ id: 'audit-1' }),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  params: { id: 'patient-1' },
  requestId: 'req-1',
};

const validBody = {
  intakeData: { demographics: { firstName: 'John', lastName: 'Doe' } },
  consents: ['GENERAL_CONSULTATION', 'PRIVACY_POLICY'],
  signOffNotes: 'Patient reviewed and approved',
  clinicianSignature: 'Dr. Smith',
};

describe('POST /api/patients/[id]/intake', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates existing patient and records consents', async () => {
    (prisma.patient.update as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (prisma.consent.create as jest.Mock).mockResolvedValue({ id: 'consent-1' });

    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/intake', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.consentCount).toBe(2);
  });

  it('returns 400 when JSON body is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/intake', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid JSON');
  });

  it('returns 422 when demographics missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/intake', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, intakeData: {} }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error).toContain('demographics');
  });

  it('returns 422 for unrecognised consent type', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/patient-1/intake', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, consents: ['INVALID_TYPE'] }),
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.error).toContain('Unrecognised consent');
  });
});
