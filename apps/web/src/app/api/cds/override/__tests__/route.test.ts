/**
 * CDS Override API Tests
 */

import { NextRequest } from 'next/server';

// Mock middleware — pass-through
jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

// Mock override-handler
jest.mock('@/lib/clinical/safety/override-handler');
jest.mock('@/lib/clinical/safety/governance-events');
jest.mock('@/lib/api/safe-error-response');

const { POST, GET } = require('../route');
const { handleOverride, validateOverride, getAvailableReasonCodes } = require('@/lib/clinical/safety/override-handler');
const { getGovernanceMetadata } = require('@/lib/clinical/safety/governance-events');
const { safeErrorResponse } = require('@/lib/api/safe-error-response');

const REASON_CODES_FIXTURE = [
  { code: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE', label: 'Clinical Judgment - Palliative Care', description: 'desc', requiresCMOReview: true },
  { code: 'PATIENT_DECLINED_ALTERNATIVE', label: 'Patient Declined Alternative', description: 'desc', requiresCMOReview: true },
  { code: 'CONTRAINDICATION_UNAVOIDABLE', label: 'Contraindication Unavoidable', description: 'desc', requiresCMOReview: true },
  { code: 'TIME_CRITICAL_EMERGENCY', label: 'Time-Critical Emergency', description: 'desc', requiresCMOReview: true },
  { code: 'DOCUMENTED_TOLERANCE', label: 'Documented Prior Tolerance', description: 'desc', requiresCMOReview: false },
  { code: 'OTHER_DOCUMENTED', label: 'Other (Documented)', description: 'desc', requiresCMOReview: true },
];

describe('POST /api/cds/override', () => {
  const mockContext = {
    user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
    requestId: 'req-123',
  };

  beforeEach(() => {
    (validateOverride as jest.Mock).mockReturnValue({
      valid: true,
      errors: [],
      warnings: ['Override reason flagged for CMO review'],
    });

    (handleOverride as jest.Mock).mockReturnValue({
      eventId: 'override-1234',
      reasonCode: 'DOCUMENTED_TOLERANCE',
      governance: {
        actor: 'clinician-1',
        resource: 'patient-1',
        timestamp: '2026-03-01T00:00:00.000Z',
      },
    });

    (safeErrorResponse as jest.Mock).mockImplementation((error: any, opts: any) => {
      const { NextResponse } = require('next/server');
      return NextResponse.json(
        { error: opts?.userMessage ?? 'Internal server error' },
        { status: 500 }
      );
    });
  });

  it('should reject missing fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/override', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details.length).toBeGreaterThan(0);
  });

  it('should reject invalid severity enum', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/override', {
      method: 'POST',
      body: JSON.stringify({
        ruleId: 'DOAC-CrCl-001',
        severity: 'INVALID',
        reasonCode: 'DOCUMENTED_TOLERANCE',
        patientId: 'patient-1',
        notes: 'Prior safe use documented.',
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('should reject empty patientId', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/override', {
      method: 'POST',
      body: JSON.stringify({
        ruleId: 'DOAC-CrCl-001',
        severity: 'BLOCK',
        reasonCode: 'DOCUMENTED_TOLERANCE',
        patientId: '',
        notes: 'Prior safe use documented.',
      }),
    });

    const response = await POST(request, mockContext);
    expect(response.status).toBe(400);
  });

  it('should return eventId and governance on valid override', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/override', {
      method: 'POST',
      body: JSON.stringify({
        ruleId: 'DOAC-CrCl-Rivaroxaban-001',
        severity: 'BLOCK',
        reasonCode: 'DOCUMENTED_TOLERANCE',
        patientId: 'patient-1',
        notes: 'Patient has tolerated rivaroxaban safely for 2 years.',
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.eventId).toBe('override-1234');
    expect(data.reasonCode).toBe('DOCUMENTED_TOLERANCE');
    expect(data.governance).toBeDefined();
    expect(data.governance.actor).toBe('clinician-1');
    expect(handleOverride).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'DOAC-CrCl-Rivaroxaban-001',
        severity: 'BLOCK',
        reasonCode: 'DOCUMENTED_TOLERANCE',
        actor: 'clinician-1',
        patientId: 'patient-1',
      })
    );
  });

  it('should return 422 when override validation fails', async () => {
    (validateOverride as jest.Mock).mockReturnValue({
      valid: false,
      errors: ["reasonCode 'TIME_CRITICAL_EMERGENCY' requires documentation in notes field"],
      warnings: undefined,
    });

    const request = new NextRequest('http://localhost:3000/api/cds/override', {
      method: 'POST',
      body: JSON.stringify({
        ruleId: 'DOAC-CrCl-001',
        severity: 'BLOCK',
        reasonCode: 'TIME_CRITICAL_EMERGENCY',
        patientId: 'patient-1',
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toBe('Override validation failed');
    expect(data.details).toEqual(
      expect.arrayContaining([
        expect.stringContaining('requires documentation'),
      ])
    );
    expect(handleOverride).not.toHaveBeenCalled();
  });
});

describe('GET /api/cds/override', () => {
  const mockContext = {
    user: { id: 'nurse-1', email: 'nurse@holilabs.com', role: 'NURSE' },
    requestId: 'req-456',
  };

  beforeEach(() => {
    (getAvailableReasonCodes as jest.Mock).mockReturnValue(REASON_CODES_FIXTURE);
  });

  it('should return 6 reason codes', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/override');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reasonCodes).toHaveLength(6);
    expect(data.reasonCodes[0]).toHaveProperty('code');
    expect(data.reasonCodes[0]).toHaveProperty('label');
    expect(data.reasonCodes[0]).toHaveProperty('description');
    expect(data.reasonCodes[0]).toHaveProperty('requiresCMOReview');
  });

  it('should include DOCUMENTED_TOLERANCE code', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/override');
    const response = await GET(request, mockContext);
    const data = await response.json();

    const docTolerance = data.reasonCodes.find(
      (r: any) => r.code === 'DOCUMENTED_TOLERANCE'
    );
    expect(docTolerance).toBeDefined();
    expect(docTolerance.requiresCMOReview).toBe(false);
  });
});
