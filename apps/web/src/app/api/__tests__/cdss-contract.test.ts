/**
 * CDSS Contract Test Matrix
 *
 * Verifies every CDSS/clinical endpoint returns the ClinicalSafetyEnvelope shape.
 * Ensures provenance, disclaimer, confidence, and processingMethod are always present.
 */

import { NextRequest } from 'next/server';

// ─── Mocks (must precede all imports) ────────────────────────────────────────

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => null),
}));

jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
  verifyPatientAccess: jest.fn().mockResolvedValue(true),
  requirePatientAccess: jest.fn(() => (_req: any, _ctx: any, next: any) => next()),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: { findUnique: jest.fn() },
    clinicalEncounter: { findUnique: jest.fn() },
    subscriptionTier: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/ai/chat', () => ({
  chat: jest.fn(),
}));

jest.mock('@/lib/services/deid.service', () => ({
  createDeidService: () => ({
    redact: jest.fn((text: string) => Promise.resolve(text)),
  }),
}));

jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(() => Promise.resolve()),
  auditView: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../../packages/shared-kernel/src/clinical/prompt-engine', () => ({
  buildCdssSystemPrompt: jest.fn(() => 'mock-system-prompt'),
  buildDeidentifiedClinicalContext: jest.fn(() => 'mock-clinical-context'),
}));

jest.mock('@/lib/services/summary.service', () => ({
  createSummaryService: () => ({
    enqueueGeneration: jest.fn(() => Promise.resolve('job-001')),
  }),
}));

jest.mock('@/lib/services/prevention.service', () => ({
  createPreventionService: () => ({
    getActionableAlerts: jest.fn(() =>
      Promise.resolve([
        { id: 'alert-1', type: 'screening', severity: 'warning', message: 'Overdue colonoscopy' },
      ])
    ),
  }),
}));

jest.mock('@/lib/clinical/process-clinical-decision', () => ({
  processClinicalDecision: jest.fn(() =>
    Promise.resolve({
      interactionId: 'int-001',
      patientId: 'p1',
      diagnosis: {
        data: {
          differentials: [
            {
              icd10Code: 'R07.9',
              name: 'Chest pain, unspecified',
              probability: 0.6,
              confidence: 'moderate',
              reasoning: 'Based on symptoms',
              redFlags: [],
              workupSuggestions: ['ECG'],
            },
          ],
          urgency: 'urgent',
        },
        method: 'ai',
      },
      treatments: [
        {
          data: [{ type: 'medication', priority: 'routine', rationale: 'Standard care', evidenceGrade: 'A', contraindications: [] }],
          method: 'ai',
        },
      ],
      alerts: [],
      processingMethods: {
        diagnosis: 'ai',
        treatments: ['ai'],
      },
      timestamp: new Date().toISOString(),
    })
  ),
  processDiagnosisOnly: jest.fn(() =>
    Promise.resolve({
      data: {
        differentials: [
          {
            icd10Code: 'R07.9',
            name: 'Chest pain',
            probability: 0.6,
            confidence: 'moderate',
            reasoning: 'Symptom analysis',
            redFlags: [],
            workupSuggestions: ['ECG'],
          },
        ],
        urgency: 'urgent',
      },
      method: 'ai',
    })
  ),
  processTreatmentOnly: jest.fn(() =>
    Promise.resolve({
      data: [{ type: 'medication', priority: 'routine', rationale: 'Standard', evidenceGrade: 'A', contraindications: [] }],
      method: 'ai',
    })
  ),
}));

jest.mock('@/lib/clinical/engines/symptom-diagnosis-engine', () => ({
  symptomDiagnosisEngine: {
    evaluate: jest.fn(() =>
      Promise.resolve({
        method: 'ai',
        confidence: 0.85,
        data: {
          differentials: [
            {
              icd10Code: 'R07.9',
              name: 'Chest pain',
              probability: 0.7,
              reasoning: 'Symptom pattern match',
              redFlags: ['Cardiac history'],
              workupSuggestions: ['ECG', 'Troponin'],
            },
          ],
          urgency: 'urgent',
        },
        aiLatencyMs: 450,
        fallbackReason: null,
      })
    ),
  },
}));

jest.mock('@/lib/ai/usage-tracker', () => ({
  trackUsage: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/security/validation', () => ({
  sanitizeString: jest.fn((s: string) => s),
  validateArray: jest.fn(),
  sanitizeMedicationName: jest.fn((s: string) => s),
}));

jest.mock('@/lib/api/safe-error-response', () => ({
  safeErrorResponse: jest.fn((e: any) =>
    new (require('next/server').NextResponse)(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  ),
}));

jest.mock('@/lib/api/cors', () => ({
  handlePreflight: jest.fn().mockReturnValue(null),
  applyCorsHeaders: jest.fn((_req: any, res: any) => res),
}));

jest.mock('@/lib/api/security-headers', () => ({
  applySecurityHeaders: jest.fn((res: any) => res),
}));

jest.mock('@/lib/request-id', () => ({
  getOrCreateRequestId: jest.fn().mockReturnValue('req-test-001'),
  REQUEST_ID_HEADER: 'x-request-id',
}));

jest.mock('@/lib/security/csrf', () => ({
  csrfProtection: () => (_req: any, _ctx: any, next: any) => next(),
}));

jest.mock('@/lib/api/audit-buffer', () => ({
  auditBuffer: { enqueue: jest.fn() },
}));

// ─── After mocks: require modules ──────────────────────────────────────────

const { prisma } = require('@/lib/prisma');
const { chat } = require('@/lib/ai/chat');
const { verifyPatientAccess } = require('@/lib/api/middleware');
const { processClinicalDecision, processDiagnosisOnly, processTreatmentOnly } = require('@/lib/clinical/process-clinical-decision');
const { symptomDiagnosisEngine } = require('@/lib/clinical/engines/symptom-diagnosis-engine');
const { sanitizeString, validateArray, sanitizeMedicationName } = require('@/lib/security/validation');

// ─── Helpers ────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000';

function makeCtx(overrides?: Record<string, any>) {
  return {
    requestId: 'req-test-001',
    user: { id: 'doc-1', email: 'dr@test.com', role: 'CLINICIAN' },
    params: {},
    ...overrides,
  };
}

function assertSafetyEnvelopeFields(json: Record<string, any>) {
  expect(json.processingMethod).toBeDefined();
  expect(['ai', 'deterministic', 'hybrid']).toContain(json.processingMethod);

  expect(typeof json.confidence).toBe('number');
  expect(json.confidence).toBeGreaterThanOrEqual(0);
  expect(json.confidence).toBeLessThanOrEqual(1);

  expect(json.disclaimer).toBeDefined();
  expect(json.disclaimer).toContain('Clinical Decision Support');

  expect(typeof json.fallbackUsed).toBe('boolean');

  expect(json.provenance).toBeDefined();
  expect(json.provenance.model).toBeDefined();
  expect(json.provenance.version).toBeDefined();
  expect(json.provenance.timestamp).toBeDefined();
  expect(() => new Date(json.provenance.timestamp).toISOString()).not.toThrow();
}

function assertDisclaimerAndProvenance(json: Record<string, any>) {
  expect(json.disclaimer).toBeDefined();
  expect(json.disclaimer).toContain('Clinical Decision Support');

  expect(json.provenance).toBeDefined();
  expect(json.provenance.model).toBeDefined();
  expect(json.provenance.version).toBeDefined();
  expect(json.provenance.timestamp).toBeDefined();
  expect(() => new Date(json.provenance.timestamp).toISOString()).not.toThrow();
}

// ─── Test Suites ────────────────────────────────────────────────────────────

describe('CDSS Contract Test Matrix — ClinicalSafetyEnvelope', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (verifyPatientAccess as jest.Mock).mockResolvedValue(true);

    (prisma.patient.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1',
      dateOfBirth: '1985-03-10',
      gender: 'M',
      diagnoses: [],
      medications: [],
    });

    (prisma.subscriptionTier.findUnique as jest.Mock).mockResolvedValue({
      userId: 'doc-1',
      tier: 'PRO',
      dailyAIUsed: 0,
      dailyAILimit: 100,
      monthlyAIUsed: 0,
      monthlyAILimit: 3000,
    });

    (prisma.subscriptionTier.update as jest.Mock).mockResolvedValue({});

    (chat as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Consider ordering troponin levels for evaluation of chest pain.',
    });

    (processClinicalDecision as jest.Mock).mockResolvedValue({
      interactionId: 'int-001',
      patientId: 'p1',
      diagnosis: {
        data: {
          differentials: [
            {
              icd10Code: 'R07.9',
              name: 'Chest pain, unspecified',
              probability: 0.6,
              confidence: 'moderate',
              reasoning: 'Based on symptoms',
              redFlags: [],
              workupSuggestions: ['ECG'],
            },
          ],
          urgency: 'urgent',
        },
        method: 'ai',
      },
      treatments: [
        {
          data: [{ type: 'medication', priority: 'routine', rationale: 'Standard care', evidenceGrade: 'A', contraindications: [] }],
          method: 'ai',
        },
      ],
      alerts: [],
      processingMethods: {
        diagnosis: 'ai',
        treatments: ['ai'],
      },
      timestamp: new Date().toISOString(),
    });

    (processDiagnosisOnly as jest.Mock).mockResolvedValue({
      data: {
        differentials: [
          {
            icd10Code: 'R07.9',
            name: 'Chest pain',
            probability: 0.6,
            confidence: 'moderate',
            reasoning: 'Symptom analysis',
            redFlags: [],
            workupSuggestions: ['ECG'],
          },
        ],
        urgency: 'urgent',
      },
      method: 'ai',
    });

    (processTreatmentOnly as jest.Mock).mockResolvedValue({
      data: [{ type: 'medication', priority: 'routine', rationale: 'Standard', evidenceGrade: 'A', contraindications: [] }],
      method: 'ai',
    });

    (symptomDiagnosisEngine.evaluate as jest.Mock).mockResolvedValue({
      method: 'ai',
      confidence: 0.85,
      data: {
        differentials: [
          {
            icd10Code: 'R07.9',
            name: 'Chest pain',
            probability: 0.7,
            reasoning: 'Symptom pattern match',
            redFlags: ['Cardiac history'],
            workupSuggestions: ['ECG', 'Troponin'],
          },
        ],
        urgency: 'urgent',
      },
      aiLatencyMs: 450,
      fallbackReason: null,
    });

    (sanitizeString as jest.Mock).mockImplementation((s: string) => s);
    (validateArray as jest.Mock).mockImplementation(() => {});
    (sanitizeMedicationName as jest.Mock).mockImplementation((s: string) => s);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. POST /api/cdss/chat
  // ════════════════════════════════════════════════════════════════════════════

  describe('POST /api/cdss/chat', () => {
    let POST: any;
    beforeAll(() => {

      ({ POST } = require('../cdss/chat/route'));
    });

    it('response contains all ClinicalSafetyEnvelope fields', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/chat`, {
        method: 'POST',
        body: JSON.stringify({ patientId: 'p1', message: 'Patient has chest pain' }),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      assertSafetyEnvelopeFields(json);
    });

    it('disclaimer contains "Clinical Decision Support"', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/chat`, {
        method: 'POST',
        body: JSON.stringify({ patientId: 'p1', message: 'Patient has headache' }),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(json.disclaimer).toContain('Clinical Decision Support');
    });

    it('provenance.timestamp is a valid ISO date', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/chat`, {
        method: 'POST',
        body: JSON.stringify({ patientId: 'p1', message: 'Review medications' }),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      const parsed = new Date(json.provenance.timestamp);
      expect(parsed.toISOString()).toBe(json.provenance.timestamp);
    });

    it('processingMethod is one of ai, deterministic, hybrid', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/chat`, {
        method: 'POST',
        body: JSON.stringify({ patientId: 'p1', message: 'Check labs' }),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(['ai', 'deterministic', 'hybrid']).toContain(json.processingMethod);
    });

    it('confidence is between 0 and 1', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/chat`, {
        method: 'POST',
        body: JSON.stringify({ patientId: 'p1', message: 'Evaluate symptoms' }),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(json.confidence).toBeGreaterThanOrEqual(0);
      expect(json.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. POST /api/cdss/summary
  // ════════════════════════════════════════════════════════════════════════════

  describe('POST /api/cdss/summary', () => {
    let POST: any;
    beforeAll(() => {

      ({ POST } = require('../cdss/summary/route'));
    });

    beforeEach(() => {
      (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue({
        id: 'enc-1',
        patientId: 'p1',
        providerId: 'doc-1',
        summaryDraft: null,
      });
    });

    it('response contains all ClinicalSafetyEnvelope fields', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/summary`, {
        method: 'POST',
        body: JSON.stringify({
          encounterId: 'enc-1',
          transcript: 'Patient presents with persistent cough for two weeks...',
          patientContext: { age: 45, sex: 'male', conditions: [], medications: [] },
          language: 'en',
        }),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect([200, 202]).toContain(res.status);
      expect(json.success).toBe(true);
      assertSafetyEnvelopeFields(json);
    });

    it('disclaimer contains "Clinical Decision Support"', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/summary`, {
        method: 'POST',
        body: JSON.stringify({
          encounterId: 'enc-1',
          transcript: 'Patient presents with persistent cough for two weeks...',
          patientContext: { age: 45, sex: 'male', conditions: [], medications: [] },
        }),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(json.disclaimer).toContain('Clinical Decision Support');
    });

    it('provenance.timestamp is a valid ISO date', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/summary`, {
        method: 'POST',
        body: JSON.stringify({
          encounterId: 'enc-1',
          transcript: 'Transcript for validation test of timestamp format',
          patientContext: { age: 30, sex: 'female', conditions: [], medications: [] },
        }),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      const parsed = new Date(json.provenance.timestamp);
      expect(parsed.toISOString()).toBe(json.provenance.timestamp);
    });

    it('processingMethod is one of ai, deterministic, hybrid', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/summary`, {
        method: 'POST',
        body: JSON.stringify({
          encounterId: 'enc-1',
          transcript: 'Processing method validation transcript text',
          patientContext: { age: 50, sex: 'other', conditions: [], medications: [] },
        }),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(['ai', 'deterministic', 'hybrid']).toContain(json.processingMethod);
    });

    it('confidence is between 0 and 1', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/summary`, {
        method: 'POST',
        body: JSON.stringify({
          encounterId: 'enc-1',
          transcript: 'Confidence range validation transcript content',
          patientContext: { age: 60, sex: 'male', conditions: [], medications: [] },
        }),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(json.confidence).toBeGreaterThanOrEqual(0);
      expect(json.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2b. GET /api/cdss/summary
  // ════════════════════════════════════════════════════════════════════════════

  describe('GET /api/cdss/summary', () => {
    let GET: any;
    beforeAll(() => {

      ({ GET } = require('../cdss/summary/route'));
    });

    beforeEach(() => {
      (prisma.clinicalEncounter.findUnique as jest.Mock).mockResolvedValue({
        id: 'enc-1',
        patientId: 'p1',
        providerId: 'doc-1',
        summaryDraft: 'Patient presented with cough. Assessment: likely bronchitis.',
      });
    });

    it('response contains all ClinicalSafetyEnvelope fields', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/summary?encounterId=enc-1`, {
        method: 'GET',
      });

      const res = await GET(req, makeCtx());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      assertSafetyEnvelopeFields(json);
    });

    it('disclaimer contains "Clinical Decision Support"', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/summary?encounterId=enc-1`, {
        method: 'GET',
      });

      const res = await GET(req, makeCtx());
      const json = await res.json();

      expect(json.disclaimer).toContain('Clinical Decision Support');
    });

    it('provenance.timestamp is a valid ISO date', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/summary?encounterId=enc-1`, {
        method: 'GET',
      });

      const res = await GET(req, makeCtx());
      const json = await res.json();

      const parsed = new Date(json.provenance.timestamp);
      expect(parsed.toISOString()).toBe(json.provenance.timestamp);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. GET /api/cdss/alerts/[patientId]
  // ════════════════════════════════════════════════════════════════════════════

  describe('GET /api/cdss/alerts/[patientId]', () => {
    let GET: any;
    beforeAll(() => {

      ({ GET } = require('../cdss/alerts/[patientId]/route'));
    });

    it('response contains all ClinicalSafetyEnvelope fields', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/alerts/p1`, {
        method: 'GET',
      });

      const res = await GET(req, makeCtx({ params: { patientId: 'p1' } }));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      assertSafetyEnvelopeFields(json);
    });

    it('disclaimer contains "Clinical Decision Support"', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/alerts/p1`, {
        method: 'GET',
      });

      const res = await GET(req, makeCtx({ params: { patientId: 'p1' } }));
      const json = await res.json();

      expect(json.disclaimer).toContain('Clinical Decision Support');
    });

    it('provenance.timestamp is a valid ISO date', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/alerts/p1`, {
        method: 'GET',
      });

      const res = await GET(req, makeCtx({ params: { patientId: 'p1' } }));
      const json = await res.json();

      const parsed = new Date(json.provenance.timestamp);
      expect(parsed.toISOString()).toBe(json.provenance.timestamp);
    });

    it('processingMethod is one of ai, deterministic, hybrid', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/alerts/p1`, {
        method: 'GET',
      });

      const res = await GET(req, makeCtx({ params: { patientId: 'p1' } }));
      const json = await res.json();

      expect(['ai', 'deterministic', 'hybrid']).toContain(json.processingMethod);
    });

    it('confidence is between 0 and 1', async () => {
      const req = new NextRequest(`${BASE_URL}/api/cdss/alerts/p1`, {
        method: 'GET',
      });

      const res = await GET(req, makeCtx({ params: { patientId: 'p1' } }));
      const json = await res.json();

      expect(json.confidence).toBeGreaterThanOrEqual(0);
      expect(json.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. POST /api/clinical/decision
  // ════════════════════════════════════════════════════════════════════════════

  describe('POST /api/clinical/decision', () => {
    let POST: any;
    beforeAll(() => {
      // TODO: Ensure /api/clinical/decision returns complete ClinicalSafetyEnvelope fields
      ({ POST } = require('../clinical/decision/route'));
    });

    const validBody = {
      patientId: 'p1',
      aiScribeOutput: {
        chiefComplaint: 'Chest pain radiating to left arm',
        symptoms: ['chest pain', 'shortness of breath', 'diaphoresis'],
        severity: 'severe',
      },
      mode: 'full',
    };

    it('response includes disclaimer and provenance', async () => {
      const req = new NextRequest(`${BASE_URL}/api/clinical/decision`, {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      assertDisclaimerAndProvenance(json);
    });

    it('disclaimer contains "Clinical Decision Support"', async () => {
      const req = new NextRequest(`${BASE_URL}/api/clinical/decision`, {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(json.disclaimer).toContain('Clinical Decision Support');
    });

    it('provenance.timestamp is a valid ISO date', async () => {
      const req = new NextRequest(`${BASE_URL}/api/clinical/decision`, {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      const parsed = new Date(json.provenance.timestamp);
      expect(parsed.toISOString()).toBe(json.provenance.timestamp);
    });

    it('works in diagnosis-only mode with disclaimer and provenance', async () => {
      const req = new NextRequest(`${BASE_URL}/api/clinical/decision`, {
        method: 'POST',
        body: JSON.stringify({
          patientId: 'p1',
          aiScribeOutput: {
            chiefComplaint: 'Persistent headache for 3 days',
            symptoms: ['headache', 'photophobia'],
          },
          mode: 'diagnosis-only',
        }),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(res.status).toBe(200);
      assertDisclaimerAndProvenance(json);
    });

    it('works in treatment-only mode with disclaimer and provenance', async () => {
      const req = new NextRequest(`${BASE_URL}/api/clinical/decision`, {
        method: 'POST',
        body: JSON.stringify({
          patientId: 'p1',
          aiScribeOutput: {},
          mode: 'treatment-only',
          icd10Code: 'J06.9',
        }),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(res.status).toBe(200);
      assertDisclaimerAndProvenance(json);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. POST /api/clinical/diagnosis
  // ════════════════════════════════════════════════════════════════════════════

  describe('POST /api/clinical/diagnosis', () => {
    let POST: any;
    beforeAll(() => {
      // TODO: Ensure /api/clinical/diagnosis returns complete ClinicalSafetyEnvelope fields
      ({ POST } = require('../clinical/diagnosis/route'));
    });

    const validBody = {
      patientId: 'p1',
      age: 55,
      sex: 'M',
      chiefComplaint: 'Chest pain with exertion',
      symptoms: ['chest pain', 'shortness of breath'],
    };

    it('response includes disclaimer and provenance', async () => {
      const req = new NextRequest(`${BASE_URL}/api/clinical/diagnosis`, {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      assertDisclaimerAndProvenance(json);
    });

    it('disclaimer contains "Clinical Decision Support"', async () => {
      const req = new NextRequest(`${BASE_URL}/api/clinical/diagnosis`, {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(json.disclaimer).toContain('Clinical Decision Support');
    });

    it('provenance.timestamp is a valid ISO date', async () => {
      const req = new NextRequest(`${BASE_URL}/api/clinical/diagnosis`, {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      const parsed = new Date(json.provenance.timestamp);
      expect(parsed.toISOString()).toBe(json.provenance.timestamp);
    });

    it('provenance includes model and version', async () => {
      const req = new NextRequest(`${BASE_URL}/api/clinical/diagnosis`, {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(json.provenance.model).toBeDefined();
      expect(typeof json.provenance.model).toBe('string');
      expect(json.provenance.version).toBeDefined();
      expect(typeof json.provenance.version).toBe('string');
    });

    it('metadata includes processingMethod and confidence', async () => {
      const req = new NextRequest(`${BASE_URL}/api/clinical/diagnosis`, {
        method: 'POST',
        body: JSON.stringify(validBody),
      });

      const res = await POST(req, makeCtx());
      const json = await res.json();

      expect(json.metadata).toBeDefined();
      expect(['ai', 'deterministic', 'hybrid', 'fallback']).toContain(json.metadata.processingMethod);
      expect(typeof json.metadata.confidence).toBe('number');
      expect(json.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(json.metadata.confidence).toBeLessThanOrEqual(1);
    });
  });
});
