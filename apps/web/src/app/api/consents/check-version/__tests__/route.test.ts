/**
 * Tests for GET /api/consents/check-version
 *
 * Validates consent version checking:
 * - Happy path → 200 with version check result
 * - Missing patientId → 400
 * - Missing consentType → 400
 * - Internal error → 500
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

const { GET } = require('../route');
const { checkConsentVersion } = require('@/lib/consent/version-manager');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('GET /api/consents/check-version', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns version check result for valid params', async () => {
    const versionResult = {
      needsUpgrade: true,
      currentVersion: '1.0',
      latestVersion: '2.0',
      changes: ['Added telehealth consent clause'],
    };
    (checkConsentVersion as jest.Mock).mockResolvedValue(versionResult);

    const req = new NextRequest(
      'http://localhost:3000/api/consents/check-version?patientId=patient-1&consentType=GENERAL_CONSULTATION'
    );
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.needsUpgrade).toBe(true);
    expect(data.currentVersion).toBe('1.0');
    expect(data.latestVersion).toBe('2.0');
    expect(checkConsentVersion).toHaveBeenCalledWith('patient-1', 'GENERAL_CONSULTATION');
  });

  it('returns 400 when patientId is missing', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/consents/check-version?consentType=GENERAL_CONSULTATION'
    );
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('patientId and consentType are required');
    expect(checkConsentVersion).not.toHaveBeenCalled();
  });

  it('returns 400 when consentType is missing', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/consents/check-version?patientId=patient-1'
    );
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('patientId and consentType are required');
  });

  it('returns 500 when version check fails', async () => {
    (checkConsentVersion as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest(
      'http://localhost:3000/api/consents/check-version?patientId=patient-1&consentType=GENERAL_CONSULTATION'
    );
    const res = await GET(req, mockContext);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to check consent version');
  });
});
