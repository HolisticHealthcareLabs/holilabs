/**
 * CDS Attestation Gate API Tests
 */

import { NextRequest } from 'next/server';

// Mock middleware — pass-through
jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/clinical/safety/attestation-gate');
jest.mock('@/lib/clinical/safety/governance-events');
jest.mock('@/lib/api/safe-error-response');

const { POST } = require('../route');
const { checkAttestation, checkLabFreshness, getFailingCriticalFields } = require('@/lib/clinical/safety/attestation-gate');
const { logAttestationRequired, getGovernanceMetadata } = require('@/lib/clinical/safety/governance-events');
const { safeErrorResponse } = require('@/lib/api/safe-error-response');

const GOVERNANCE_META = {
  actor: 'clinician-1',
  resource: 'patient-1',
  timestamp: '2026-03-01T00:00:00.000Z',
};

describe('POST /api/cds/attestation', () => {
  const mockContext = {
    user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
    requestId: 'req-123',
  };

  beforeEach(() => {
    // Default mocks — all data present, no attestation needed
    (checkAttestation as jest.Mock).mockReturnValue({
      required: false,
      message: 'All critical data is current and complete.',
      legalBasis: 'Patient data validation passed.',
    });

    (checkLabFreshness as jest.Mock).mockReturnValue({
      isStale: false,
      ageHours: 1,
      threshold: 72,
    });

    (getFailingCriticalFields as jest.Mock).mockReturnValue([]);

    (getGovernanceMetadata as jest.Mock).mockReturnValue(GOVERNANCE_META);

    (safeErrorResponse as jest.Mock).mockImplementation((error: any, opts: any) => {
      const { NextResponse } = require('next/server');
      return NextResponse.json(
        { error: opts?.userMessage ?? 'Internal server error' },
        { status: 500 }
      );
    });
  });

  it('should reject missing patientId', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/attestation', {
      method: 'POST',
      body: JSON.stringify({
        patient: { creatinineClearance: 50, weight: 70, age: 65 },
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('should reject missing patient object', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/attestation', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'p1' }),
    });

    const response = await POST(request, mockContext);
    expect(response.status).toBe(400);
  });

  it('should return attestationRequired: false when all data is present and fresh', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/attestation', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        medication: 'rivaroxaban',
        patient: {
          creatinineClearance: 50,
          weight: 70,
          age: 65,
          labTimestamp: new Date().toISOString(),
        },
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.attestationRequired).toBe(false);
    expect(data.failingCriticalFields).toHaveLength(0);
    expect(data.legalBasis).toBeDefined();
    expect(data.governance).toBeDefined();
    expect(data.governance.actor).toBe('clinician-1');
    expect(logAttestationRequired).not.toHaveBeenCalled();
  });

  it('should return attestationRequired: true when CrCl is missing', async () => {
    (checkAttestation as jest.Mock).mockReturnValue({
      required: true,
      reason: 'MISSING_WEIGHT',
      missingFields: ['Serum creatinine / CrCl'],
      message: 'Missing critical data: Serum creatinine / CrCl.',
      legalBasis: 'FDA 21 CFR Part 11 (Electronic Signatures)',
    });

    (getFailingCriticalFields as jest.Mock).mockReturnValue(['creatinineClearance']);

    const request = new NextRequest('http://localhost:3000/api/cds/attestation', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        medication: 'rivaroxaban',
        patient: {
          creatinineClearance: null,
          weight: 70,
          age: 65,
        },
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.attestationRequired).toBe(true);
    expect(data.missingFields).toContain('Serum creatinine / CrCl');
    expect(data.failingCriticalFields).toContain('creatinineClearance');
    expect(logAttestationRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: 'clinician-1',
        patientId: 'patient-1',
      })
    );
  });

  it('should return attestationRequired: true with STALE_RENAL_LABS for old labs', async () => {
    (checkAttestation as jest.Mock).mockReturnValue({
      required: true,
      reason: 'STALE_RENAL_LABS',
      staleSince: 96,
      threshold: 72,
      message: 'Renal function labs are stale (96 hours old).',
      legalBasis: 'Clinical Practice Guidelines',
    });

    (checkLabFreshness as jest.Mock).mockReturnValue({
      isStale: true,
      ageHours: 96,
      threshold: 72,
    });

    const request = new NextRequest('http://localhost:3000/api/cds/attestation', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        medication: 'rivaroxaban',
        patient: {
          creatinineClearance: 50,
          weight: 70,
          age: 65,
          labTimestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
        },
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.attestationRequired).toBe(true);
    expect(data.reason).toBe('STALE_RENAL_LABS');
    expect(data.labFreshness.isStale).toBe(true);
    expect(data.labFreshness.ageHours).toBe(96);
  });

  it('should include legalBasis and governance in all responses', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/attestation', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        patient: {
          creatinineClearance: 50,
          weight: 70,
          age: 65,
        },
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(data.legalBasis).toBeDefined();
    expect(typeof data.legalBasis).toBe('string');
    expect(data.governance).toBeDefined();
    expect(data.governance.actor).toBe('clinician-1');
  });
});
