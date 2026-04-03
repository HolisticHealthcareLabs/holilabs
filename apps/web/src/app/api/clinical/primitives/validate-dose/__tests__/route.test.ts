/**
 * Tests for POST /api/clinical/primitives/validate-dose
 *
 * - POST returns safe for a valid metformin dose within range
 * - POST returns dangerous for a dose exceeding maximum
 * - POST returns 400 for schema validation failure (missing required fields)
 * - POST returns unknown status for unrecognized medication
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

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/clinical/content-registry', () => ({
  ensureRegistryInitialized: jest.fn(),
}));

jest.mock('@/lib/clinical/governance-policy', () => ({
  getActiveContentBundle: jest.fn(),
  getRuntimeContentStatus: jest.fn(),
}));

jest.mock('@/lib/clinical/lab-decision-rules', () => ({
  assessRenalDataQuality: jest.fn(),
}));

jest.mock('@/config/clinical-rules', () => ({
  DOAC_MEDICATION_ALIASES: {
    apixaban: ['apixaban', 'eliquis'],
    rivaroxaban: ['rivaroxaban', 'xarelto'],
    dabigatran: ['dabigatran', 'pradaxa'],
    edoxaban: ['edoxaban', 'savaysa'],
  },
  DOAC_RENAL_POLICY: {
    rulesetVersion: 'doac-renal-v1',
    maxAgeHours: 48,
  },
}));

const { POST } = require('../route');
const { getActiveContentBundle, getRuntimeContentStatus } = require('@/lib/clinical/governance-policy');
const { assessRenalDataQuality } = require('@/lib/clinical/lab-decision-rules');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

describe('POST /api/clinical/primitives/validate-dose', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getActiveContentBundle as jest.Mock).mockReturnValue({
      contentBundleVersion: '1.0.0',
      contentChecksum: 'abc123',
      protocolVersion: '1.0.0',
      signoffStatus: 'SIGNED_OFF',
      lifecycleState: 'ACTIVE',
    });
    (getRuntimeContentStatus as jest.Mock).mockReturnValue('ACTIVE_SIGNED_OFF');
    (assessRenalDataQuality as jest.Mock).mockReturnValue({
      isMissingCriticalInput: false,
      isStale: false,
      rationale: [],
    });
  });

  it('returns safe status for a valid metformin dose within range', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/validate-dose',
      {
        method: 'POST',
        body: JSON.stringify({
          medication: 'metformin',
          dose: 1000,
          unit: 'mg',
          frequency: 'twice daily',
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('safe');
    expect(data.data.isValid).toBe(true);
    expect(data.metadata.method).toBe('deterministic');
  });

  it('returns dangerous status for a dose exceeding metformin maximum', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/validate-dose',
      {
        method: 'POST',
        body: JSON.stringify({
          medication: 'metformin',
          dose: 5000,
          unit: 'mg',
          frequency: 'twice daily',
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe('dangerous');
    expect(data.data.isValid).toBe(false);
    expect(data.data.issues.some((i: any) => i.type === 'dose_too_high')).toBe(true);
  });

  it('returns 400 for schema validation failure', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/validate-dose',
      {
        method: 'POST',
        body: JSON.stringify({ medication: 'metformin', dose: -100, unit: 'mg', frequency: 'daily' }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns unknown status for an unrecognized medication', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/clinical/primitives/validate-dose',
      {
        method: 'POST',
        body: JSON.stringify({
          medication: 'zylofenate-xyz',
          dose: 50,
          unit: 'mg',
          frequency: 'once daily',
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe('unknown');
    expect(data.data.issues[0].type).toBe('unknown_medication');
  });
});
