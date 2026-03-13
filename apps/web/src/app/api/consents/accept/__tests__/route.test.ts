/**
 * Tests for POST /api/consents/accept
 *
 * Validates consent acceptance flow:
 * - Happy path → 200 with consent records
 * - Validation error → 400 (missing/empty consents array)
 * - Patient not found → 404
 * - Duplicate consent → returns existing record
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
    patientUser: {
      findUnique: jest.fn(),
    },
    consent: {
      findUnique: jest.fn(),
      create: jest.fn(),
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

const { POST } = require('../route');
const { prisma } = require('@/lib/prisma');
const { verifyPatientAccess } = require('@/lib/api/middleware');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const MOCK_CONSENT_SUBMISSION = {
  type: 'GENERAL_CONSULTATION',
  title: 'General Consultation Consent',
  version: '1.0',
  signatureData: 'base64-signature-data',
  signedAt: '2025-01-15T10:00:00.000Z',
};

const MOCK_PATIENT_USER = {
  id: 'pu-1',
  email: 'dr@holilabs.com',
  patient: {
    id: 'patient-1',
    firstName: 'Jane',
    lastName: 'Doe',
  },
};

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/consents/accept', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/consents/accept', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
  });

  it('accepts consents and returns records', async () => {
    const mockCreated = {
      id: 'consent-1',
      type: 'GENERAL_CONSULTATION',
      title: 'General Consultation Consent',
      version: '1.0',
      signedAt: new Date('2025-01-15T10:00:00.000Z'),
    };

    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(MOCK_PATIENT_USER);
    (prisma.consent.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.consent.create as jest.Mock).mockResolvedValue(mockCreated);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const req = makeRequest({ consents: [MOCK_CONSENT_SUBMISSION] });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.consents).toHaveLength(1);
    expect(data.consents[0].id).toBe('consent-1');
    expect(prisma.consent.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('returns 400 for missing consents array', async () => {
    const req = makeRequest({});
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid consent data');
    expect(prisma.patientUser.findUnique).not.toHaveBeenCalled();
  });

  it('returns 400 for empty consents array', async () => {
    const req = makeRequest({ consents: [] });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid consent data');
  });

  it('returns 404 when patient record not found', async () => {
    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(null);

    const req = makeRequest({ consents: [MOCK_CONSENT_SUBMISSION] });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Patient record not found');
  });

  it('returns existing consent if duplicate hash', async () => {
    const existing = {
      id: 'consent-existing',
      type: 'GENERAL_CONSULTATION',
      title: 'General Consultation Consent',
      version: '1.0',
      signedAt: new Date('2025-01-15T10:00:00.000Z'),
    };

    (prisma.patientUser.findUnique as jest.Mock).mockResolvedValue(MOCK_PATIENT_USER);
    (prisma.consent.findUnique as jest.Mock).mockResolvedValue(existing);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

    const req = makeRequest({ consents: [MOCK_CONSENT_SUBMISSION] });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.consents[0].id).toBe('consent-existing');
    expect(prisma.consent.create).not.toHaveBeenCalled();
  });
});
