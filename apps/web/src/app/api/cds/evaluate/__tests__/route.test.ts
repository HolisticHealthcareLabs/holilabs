/**
 * CDS Evaluation API Tests
 */

import { NextRequest } from 'next/server';

// Mock middleware — pass-through
jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid-1234') }));
jest.mock('@/lib/clinical/safety/doac-evaluator');
jest.mock('@/lib/cds/engines/cds-engine');
jest.mock('@/lib/clinical/safety/governance-events');
jest.mock('@/lib/api/safe-error-response');

const { POST, GET } = require('../route');
const { cdsEngine } = require('@/lib/cds/engines/cds-engine');
const { evaluateDOACRule } = require('@/lib/clinical/safety/doac-evaluator');
const {
  logDOACEvaluation,
  logAttestationRequired,
  logPatientDataAccess,
  getGovernanceMetadata,
} = require('@/lib/clinical/safety/governance-events');
const { v4: uuidv4 } = require('uuid');
const { safeErrorResponse } = require('@/lib/api/safe-error-response');

const GOVERNANCE_META = {
  actor: 'clinician-1',
  resource: 'patient-1',
  timestamp: '2026-03-01T00:00:00.000Z',
};

const emptyEngineResult = {
  timestamp: new Date().toISOString(),
  hookType: 'medication-prescribe',
  context: { patientId: 'patient-1', userId: 'clinician-1' },
  alerts: [],
  rulesEvaluated: 5,
  rulesFired: 0,
  processingTime: 12,
};

describe('POST /api/cds/evaluate', () => {
  const mockContext = {
    user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
    requestId: 'req-789',
  };

  beforeEach(() => {
    (cdsEngine.evaluate as jest.Mock).mockResolvedValue(emptyEngineResult);
    (cdsEngine.getRules as jest.Mock).mockReturnValue([]);
    (getGovernanceMetadata as jest.Mock).mockReturnValue(GOVERNANCE_META);

    // Default DOAC evaluator — PASS
    (evaluateDOACRule as jest.Mock).mockReturnValue({
      medication: 'rivaroxaban',
      severity: 'PASS',
      rationale: 'Safe for this patient.',
      ruleId: 'DOAC-Rivaroxaban-PASS',
      citationUrl: 'https://doi.org/10.1093/eurheartj/ehae177',
    });

    (safeErrorResponse as jest.Mock).mockImplementation((error: any, opts: any) => {
      const { NextResponse } = require('next/server');
      return NextResponse.json(
        { error: opts?.userMessage ?? 'Internal server error' },
        { status: 500 }
      );
    });
  });

  // --- Validation ---

  it('should reject missing patientId', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        hookType: 'patient-view',
        context: { patientId: 'p1' },
      }),
    });

    const response = await POST(request, mockContext);
    expect(response.status).toBe(400);
  });

  it('should reject invalid hookType', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        hookType: 'invalid-hook',
        context: { patientId: 'patient-1' },
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  // --- DOAC Evaluation ---

  it('should return BLOCK alert for rivaroxaban with CrCl < 15', async () => {
    (evaluateDOACRule as jest.Mock).mockReturnValue({
      medication: 'rivaroxaban',
      severity: 'BLOCK',
      rationale: 'CrCl 10 ml/min is below absolute minimum of 15 ml/min. Rivaroxaban is contraindicated.',
      ruleId: 'DOAC-CrCl-Rivaroxaban-001',
      citationUrl: 'https://doi.org/10.1093/eurheartj/ehae177',
    });

    const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        hookType: 'medication-prescribe',
        context: {
          patientId: 'patient-1',
          medications: [
            { id: '1', name: 'Rivaroxaban', genericName: 'rivaroxaban', status: 'active' },
          ],
          labResults: [
            {
              id: 'lab-1',
              testName: 'Creatinine Clearance',
              value: 10,
              effectiveDate: new Date().toISOString(),
              status: 'final',
            },
          ],
          vitalSigns: { weight: 70 },
          demographics: { age: 72, gender: 'male', birthDate: '1954-01-01' },
        },
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    const blockAlert = data.data.alerts.find(
      (a: any) => a.severity === 'critical' && a.ruleId?.includes('Rivaroxaban')
    );
    expect(blockAlert).toBeDefined();
    expect(blockAlert.summary).toContain('CONTRAINDICATED');

    expect(logDOACEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        medication: 'rivaroxaban',
        severity: 'BLOCK',
      })
    );
  });

  it('should return ATTESTATION_REQUIRED for stale labs', async () => {
    (evaluateDOACRule as jest.Mock).mockReturnValue({
      medication: 'rivaroxaban',
      severity: 'ATTESTATION_REQUIRED',
      rationale: 'Renal function labs are stale (96 hours old).',
      ruleId: 'DOAC-STALE-RIVAROXABAN',
      citationUrl: 'https://doi.org/10.1093/eurheartj/ehae177',
      staleSince: 96,
    });

    const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        hookType: 'medication-prescribe',
        context: {
          patientId: 'patient-1',
          medications: [
            { id: '1', name: 'Rivaroxaban', genericName: 'rivaroxaban', status: 'active' },
          ],
          labResults: [
            {
              id: 'lab-1',
              testName: 'CrCl',
              value: 50,
              effectiveDate: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
              status: 'final',
            },
          ],
          vitalSigns: { weight: 70 },
          demographics: { age: 65, gender: 'male', birthDate: '1961-01-01' },
        },
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);

    const attestAlert = data.data.alerts.find(
      (a: any) => a.summary?.includes('Attestation')
    );
    expect(attestAlert).toBeDefined();
    expect(logAttestationRequired).toHaveBeenCalled();
  });

  // --- Graceful CDS engine degradation ---

  it('should still return DOAC results when CDS engine fails', async () => {
    (cdsEngine.evaluate as jest.Mock).mockRejectedValue(new Error('Redis connection refused'));

    (evaluateDOACRule as jest.Mock).mockReturnValue({
      medication: 'rivaroxaban',
      severity: 'BLOCK',
      rationale: 'CrCl 10 ml/min is below absolute minimum.',
      ruleId: 'DOAC-CrCl-Rivaroxaban-001',
      citationUrl: 'https://doi.org/10.1093/eurheartj/ehae177',
    });

    const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        hookType: 'medication-prescribe',
        context: {
          patientId: 'patient-1',
          medications: [
            { id: '1', name: 'Rivaroxaban', genericName: 'rivaroxaban', status: 'active' },
          ],
          labResults: [
            {
              id: 'lab-1',
              testName: 'Creatinine Clearance',
              value: 10,
              effectiveDate: new Date().toISOString(),
              status: 'final',
            },
          ],
          vitalSigns: { weight: 70 },
          demographics: { age: 72, gender: 'male', birthDate: '1954-01-01' },
        },
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.warnings).toContain(
      'CDS engine unavailable — DOAC safety evaluation still active'
    );
    expect(data.data.alerts.length).toBeGreaterThan(0);
    expect(data.data.alerts[0].ruleId).toContain('Rivaroxaban');
  });

  // --- Non-DOAC medication ---

  it('should not produce DOAC alerts for non-DOAC medications', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        hookType: 'medication-prescribe',
        context: {
          patientId: 'patient-1',
          medications: [
            { id: '1', name: 'Metformin', genericName: 'metformin', status: 'active' },
          ],
          demographics: { age: 55, gender: 'female', birthDate: '1971-01-01' },
        },
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    const doacAlerts = data.data.alerts.filter(
      (a: any) => a.source?.label === 'Cortex DOAC Safety'
    );
    expect(doacAlerts).toHaveLength(0);
    expect(evaluateDOACRule).not.toHaveBeenCalled();
  });

  // --- Governance events ---

  it('should log PATIENT_DATA_ACCESS on every evaluation', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        hookType: 'patient-view',
        context: {
          patientId: 'patient-1',
          demographics: { age: 40, gender: 'male', birthDate: '1986-01-01' },
        },
      }),
    });

    await POST(request, mockContext);

    expect(logPatientDataAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: 'clinician-1',
        patientId: 'patient-1',
        purpose: 'CDS evaluation (patient-view)',
      })
    );
  });

  it('should include governance metadata in response', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/evaluate', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        hookType: 'patient-view',
        context: { patientId: 'patient-1' },
      }),
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(data.data.governance).toBeDefined();
    expect(data.data.governance.actor).toBe('clinician-1');
  });
});

describe('GET /api/cds/evaluate', () => {
  const mockContext = {
    user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
    requestId: 'req-abc',
  };

  beforeEach(() => {
    (cdsEngine.getRules as jest.Mock).mockReturnValue([]);
  });

  it('should return API documentation', async () => {
    const request = new NextRequest('http://localhost:3000/api/cds/evaluate');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.service).toBe('CDS Evaluation API');
    expect(data.version).toBe('2.0.0');
    expect(data.compliance).toContain('CDS Hooks 2.0');
    expect(data.doacMedications).toEqual(['rivaroxaban', 'apixaban', 'edoxaban', 'dabigatran']);
  });

  it('should handle CDS engine failure gracefully in GET', async () => {
    (cdsEngine.getRules as jest.Mock).mockImplementation(() => {
      throw new Error('Engine initialization failed');
    });

    const request = new NextRequest('http://localhost:3000/api/cds/evaluate');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.currentRules).toEqual([]);
  });
});
