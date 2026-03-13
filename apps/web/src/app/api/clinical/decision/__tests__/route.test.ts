/**
 * Tests for POST /api/clinical/decision and GET /api/clinical/decision
 *
 * - POST returns full clinical decision for valid patient
 * - POST returns 400 for missing patientId
 * - POST returns 403 when patient access denied
 * - GET returns service capabilities
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

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/clinical/process-clinical-decision', () => ({
  processClinicalDecision: jest.fn(),
  processDiagnosisOnly: jest.fn(),
  processTreatmentOnly: jest.fn(),
}));

jest.mock('@/lib/clinical/safety-envelope', () => ({
  CLINICAL_DISCLAIMER: 'This is a clinical decision support tool only.',
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((err) =>
    require('next/server').NextResponse.json({ success: false, error: 'error' }, { status: 500 })
  ),
}));

const { verifyPatientAccess } = require('@/lib/api/middleware');
const { prisma } = require('@/lib/prisma');
const { processClinicalDecision, processDiagnosisOnly, processTreatmentOnly } = require('@/lib/clinical/process-clinical-decision');
const { POST, GET } = require('../route');

const mockContext = {
  user: { id: 'clinician-1', email: 'dr@holilabs.com', role: 'CLINICIAN' },
  requestId: 'req-1',
};

const mockDecisionResult = {
  interactionId: 'interaction-123',
  patientId: 'patient-1',
  diagnosis: {
    data: {
      differentials: [
        { icd10Code: 'J00', name: 'Common cold', probability: 0.7, confidence: 'high', reasoning: 'Symptoms match', redFlags: [], workupSuggestions: [] },
      ],
      urgency: 'routine',
    },
  },
  treatments: [{ data: [{ type: 'medication', priority: 'first-line', rationale: 'Standard', evidenceGrade: 'A', contraindications: [] }] }],
  alerts: [],
  processingMethods: { diagnosis: 'fallback', treatments: ['fallback'] },
  timestamp: new Date().toISOString(),
};

describe('POST /api/clinical/decision', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ id: 'patient-1' });
    (processClinicalDecision as jest.Mock).mockResolvedValue(mockDecisionResult);
  });

  it('returns full clinical decision for valid patient', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/decision', {
      method: 'POST',
      body: JSON.stringify({
        patientId: 'patient-1',
        aiScribeOutput: { chiefComplaint: 'Cough', symptoms: ['cough', 'fever'] },
        mode: 'full',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.disclaimer).toBeDefined();
  });

  it('returns 400 for missing patientId', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/decision', {
      method: 'POST',
      body: JSON.stringify({ aiScribeOutput: {} }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Validation error');
  });

  it('returns 403 when patient access is denied', async () => {
    (verifyPatientAccess as jest.Mock).mockResolvedValue(false);
    const request = new NextRequest('http://localhost:3000/api/clinical/decision', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'patient-other', aiScribeOutput: {} }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('returns 404 when patient not found', async () => {
    (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);
    const request = new NextRequest('http://localhost:3000/api/clinical/decision', {
      method: 'POST',
      body: JSON.stringify({ patientId: 'nonexistent', aiScribeOutput: {} }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});

describe('GET /api/clinical/decision', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns service capabilities', async () => {
    const request = new NextRequest('http://localhost:3000/api/clinical/decision');
    const response = await GET(request, mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.service).toBe('Clinical Intelligence API');
    expect(data.capabilities).toBeDefined();
    expect(data.health).toBe('ok');
  });
});
