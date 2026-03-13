/**
 * Tests for POST/GET /api/consents/with-witness
 *
 * POST: Create consent with witness signature
 * - Happy path → 200 with consent record
 * - Missing required fields → 400
 * - Patient not found → 404
 *
 * GET: Retrieve witnessed consent
 * - Happy path → 200 with consent details
 * - Missing consentId → 400
 * - Consent not found → 404
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  createPublicRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(),
    },
    consent: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

const { POST, GET } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const MOCK_PATIENT = {
  id: 'patient-1',
  firstName: 'Jane',
  lastName: 'Doe',
};

function makePostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/consents/with-witness', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/consents/with-witness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('creates witnessed consent successfully', async () => {
    const mockConsent = {
      id: 'consent-w1',
      type: 'SURGICAL_PROCEDURE',
      witnessName: 'Dr. Smith',
      signedAt: new Date(),
      consentHash: 'abc123hash',
    };

    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(MOCK_PATIENT);
    (prisma.consent.create as jest.Mock).mockResolvedValue(mockConsent);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const req = makePostRequest({
      patientId: 'patient-1',
      consentType: 'SURGICAL_PROCEDURE',
      patientSignature: 'sig-patient-base64',
      witnessName: 'Dr. Smith',
      witnessSignature: 'sig-witness-base64',
      witnessRelationship: 'Attending Physician',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.consent.id).toBe('consent-w1');
    expect(data.consent.witnessName).toBe('Dr. Smith');
    expect(prisma.consent.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('returns 400 for missing required fields', async () => {
    const req = makePostRequest({
      patientId: 'patient-1',
      consentType: 'SURGICAL_PROCEDURE',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('patientSignature');
    expect(data.error).toContain('witnessName');
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makePostRequest({
      patientId: 'nonexistent',
      consentType: 'SURGICAL_PROCEDURE',
      patientSignature: 'sig-patient',
      witnessName: 'Dr. Smith',
      witnessSignature: 'sig-witness',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Patient not found');
  });

  it('returns 400 when patientId is missing', async () => {
    const req = makePostRequest({
      consentType: 'SURGICAL_PROCEDURE',
      patientSignature: 'sig-patient',
      witnessName: 'Dr. Smith',
      witnessSignature: 'sig-witness',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
  });
});

describe('GET /api/consents/with-witness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns witnessed consent details', async () => {
    const mockConsent = {
      id: 'consent-w1',
      type: 'SURGICAL_PROCEDURE',
      title: 'Surgical Procedure Consent (Witnessed)',
      content: 'Consent for: Surgical Procedure...',
      version: '1.0',
      signatureData: 'sig-patient-base64',
      witnessName: 'Dr. Smith',
      witnessSignature: 'sig-witness-base64',
      signedAt: new Date('2025-01-15'),
      consentHash: 'abc123hash',
      patient: {
        firstName: 'Jane',
        lastName: 'Doe',
      },
    };

    (prisma.consent.findUnique as jest.Mock).mockResolvedValue(mockConsent);

    const req = new NextRequest(
      'http://localhost:3000/api/consents/with-witness?consentId=consent-w1'
    );
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.consent.id).toBe('consent-w1');
    expect(data.consent.patientName).toBe('Jane Doe');
    expect(data.consent.witnessName).toBe('Dr. Smith');
    expect(data.consent.consentHash).toBe('abc123hash');
  });

  it('returns 400 when consentId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/consents/with-witness');
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('consentId required');
    expect(prisma.consent.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when consent not found', async () => {
    (prisma.consent.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/consents/with-witness?consentId=nonexistent'
    );
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Consent not found');
  });
});
