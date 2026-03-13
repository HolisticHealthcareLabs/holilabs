/**
 * Tests for POST /api/consents/upgrade-version
 *
 * Validates consent version upgrade:
 * - Happy path → 200 with success message
 * - Missing patientId → 400
 * - Missing consentType → 400
 * - Upgrade failure → 500 with error message
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
  prisma: {},
}));

jest.mock('@/lib/consent/version-manager', () => ({
  checkConsentVersion: jest.fn(),
  upgradeConsentVersion: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  auditView: jest.fn(),
  auditCreate: jest.fn(),
}));

const { POST } = require('../route');
const { upgradeConsentVersion } = require('@/lib/consent/version-manager');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/consents/upgrade-version', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/consents/upgrade-version', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upgrades consent version successfully', async () => {
    (upgradeConsentVersion as jest.Mock).mockResolvedValue(undefined);

    const req = makeRequest({
      patientId: 'patient-1',
      consentType: 'GENERAL_CONSULTATION',
      signatureData: 'base64-sig',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Consent upgraded to latest version');
    expect(upgradeConsentVersion).toHaveBeenCalledWith(
      'patient-1',
      'GENERAL_CONSULTATION',
      'base64-sig'
    );
  });

  it('uses fallback signature when signatureData is omitted', async () => {
    (upgradeConsentVersion as jest.Mock).mockResolvedValue(undefined);

    const req = makeRequest({
      patientId: 'patient-1',
      consentType: 'GENERAL_CONSULTATION',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(upgradeConsentVersion).toHaveBeenCalledWith(
      'patient-1',
      'GENERAL_CONSULTATION',
      'PORTAL_VERSION_UPGRADE'
    );
  });

  it('returns 400 when patientId is missing', async () => {
    const req = makeRequest({ consentType: 'GENERAL_CONSULTATION' });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('patientId and consentType are required');
    expect(upgradeConsentVersion).not.toHaveBeenCalled();
  });

  it('returns 400 when consentType is missing', async () => {
    const req = makeRequest({ patientId: 'patient-1' });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('patientId and consentType are required');
  });

  it('returns 500 with error message on upgrade failure', async () => {
    (upgradeConsentVersion as jest.Mock).mockRejectedValue(
      new Error('Consent version 2.0 not found')
    );

    const req = makeRequest({
      patientId: 'patient-1',
      consentType: 'GENERAL_CONSULTATION',
    });
    const res = await POST(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Consent version 2.0 not found');
  });
});
