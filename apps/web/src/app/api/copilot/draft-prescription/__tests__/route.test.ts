/**
 * Integration tests for POST /api/copilot/draft-prescription
 *
 * Validates the full AI Copilot → Safety-Check pipeline:
 * - GREEN: well-extracted prescription passes all guardrails
 * - RED (FIN-002): Gemini hallucinates a TUSS code → caught by deterministic rules
 * - Empty extraction: Gemini returns no medications → graceful 200
 * - Extractor throws: missing API key → 503
 * - Validation errors: missing required fields → 400
 */

// Mock middleware as pass-through
jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

// Mock extractor — we control what "Gemini" returns per test
jest.mock('@/lib/ai/prescription-extractor', () => ({
  extractMedicationsFromNote: jest.fn(),
}));

// Mock CDS engine (non-blocking in service)
jest.mock('@/lib/cds/engines/cds-engine', () => ({
  cdsEngine: {
    evaluate: jest.fn().mockImplementation(() =>
      Promise.resolve({ alerts: [], rulesEvaluated: 0, rulesFired: 0, processingTime: 0, timestamp: '', hookType: 'medication-prescribe', context: {} })
    ),
  },
}));

jest.mock('@/lib/cache/redis-client', () => ({
  getCacheClient: jest.fn(() => ({
    get: jest.fn().mockImplementation(() => Promise.resolve(null)),
    set: jest.fn(),
  })),
  generateCacheKey: jest.fn((...args: string[]) => args.join(':')),
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
  logError: jest.fn((e: any) => ({ message: String(e) })),
}));

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const { extractMedicationsFromNote } = require('@/lib/ai/prescription-extractor');
const { POST } = require('../route');

const MOCK_CONTEXT = {
  user: { id: 'dr-silva', email: 'dr.silva@holilabs.xyz', role: 'CLINICIAN' },
  requestId: 'test-req-001',
};

const VALID_TUSS_CODE = '1.01.01.01'; // exists in TUSS master data

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/copilot/draft-prescription', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const BASE_BODY = {
  patientId: 'patient-001',
  encounterId: 'enc-001',
  soapNote: 'Plan: start apixaban 5mg BID for atrial fibrillation (I48.0). Supply 30 tablets.',
  icd10Codes: ['I48.0'],
  payer: { maxQuantity: 30 },
  clinicalContext: {
    creatinineClearance: 60,
    weight: 75,
    age: 65,
    labTimestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
};

describe('POST /api/copilot/draft-prescription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Validation errors ────────────────────────────────────────────────────────

  test('400 when patientId missing', async () => {
    const req = makeRequest({ encounterId: 'enc-1', soapNote: 'note' });
    const res = await POST(req, MOCK_CONTEXT);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('patientId');
  });

  test('400 when encounterId missing', async () => {
    const req = makeRequest({ patientId: 'p1', soapNote: 'note' });
    const res = await POST(req, MOCK_CONTEXT);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('encounterId');
  });

  test('400 when soapNote missing', async () => {
    const req = makeRequest({ patientId: 'p1', encounterId: 'e1' });
    const res = await POST(req, MOCK_CONTEXT);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('soapNote');
  });

  test('400 when soapNote is empty string', async () => {
    const req = makeRequest({ patientId: 'p1', encounterId: 'e1', soapNote: '   ' });
    const res = await POST(req, MOCK_CONTEXT);
    expect(res.status).toBe(400);
  });

  // ── 503: extractor throws (missing API key) ──────────────────────────────────

  test('503 when extractor throws (missing GOOGLE_AI_API_KEY)', async () => {
    (extractMedicationsFromNote as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error('GOOGLE_AI_API_KEY is not configured'))
    );

    const req = makeRequest(BASE_BODY);
    const res = await POST(req, MOCK_CONTEXT);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('Extraction service unavailable');
  });

  // ── Empty extraction ─────────────────────────────────────────────────────────

  test('200 GREEN when Gemini extracts no medications', async () => {
    (extractMedicationsFromNote as jest.Mock).mockImplementation(() =>
      Promise.resolve({ medications: [], model: 'gemini-2.5-flash', extractionTimeMs: 50 })
    );

    const req = makeRequest(BASE_BODY);
    const res = await POST(req, MOCK_CONTEXT);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.extractedMedications).toHaveLength(0);
    expect(json.safetyCheck.color).toBe('GREEN');
    expect(json.safetyCheck.signal).toHaveLength(0);
    expect(json.extraction.medicationCount).toBe(0);
  });

  // ── GREEN pipeline ───────────────────────────────────────────────────────────

  test('200 GREEN: Gemini extracts apixaban with correct ICD-10 and valid TUSS', async () => {
    (extractMedicationsFromNote as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        medications: [{ name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 30, tussCode: VALID_TUSS_CODE }],
        model: 'gemini-2.5-flash',
        extractionTimeMs: 120,
      })
    );

    const req = makeRequest(BASE_BODY);
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.safetyCheck.color).toBe('GREEN');
    expect(json.safetyCheck.financialRisk.glosaRisk).toBe(false);
    expect(json.extractedMedications).toHaveLength(1);
    expect(json.extractedMedications[0].name).toBe('apixaban');
    expect(json.extraction.model).toBe('gemini-2.5-flash');
    expect(json.governance).toHaveProperty('legalBasis');
  });

  // ── RED: hallucinated TUSS code (FIN-002) ────────────────────────────────────

  test('200 RED (FIN-002): hallucinated TUSS code in SOAP note → deterministic rules catch it', async () => {
    // This is the core demo: Gemini hallucinates TUSS 00000000
    (extractMedicationsFromNote as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        medications: [{ name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 30, tussCode: '00000000' }],
        model: 'gemini-2.5-flash',
        extractionTimeMs: 95,
      })
    );

    const req = makeRequest(BASE_BODY);
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.safetyCheck.color).toBe('RED');
    expect(json.safetyCheck.financialRisk.glosaRisk).toBe(true);
    expect(json.safetyCheck.financialRisk.rulesFired).toContain('FIN-002');

    const fin002 = json.safetyCheck.signal.find((a: any) => a.ruleId === 'FIN-002');
    expect(fin002).toBeDefined();
    expect(fin002.summary).toContain('Invalid TUSS code');
    expect(fin002.severity).toBe('critical');

    // Extractor output is always returned even when blocked
    expect(json.extractedMedications[0].tussCode).toBe('00000000');
  });

  // ── AMBER: ICD-10 mismatch (FIN-001) ─────────────────────────────────────────

  test('200 AMBER (FIN-001): Gemini extracts apixaban but encounter is coded E11.9 (diabetes)', async () => {
    (extractMedicationsFromNote as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        medications: [{ name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 30, tussCode: VALID_TUSS_CODE }],
        model: 'gemini-2.5-flash',
        extractionTimeMs: 88,
      })
    );

    const req = makeRequest({ ...BASE_BODY, icd10Codes: ['E11.9'] }); // diabetes mismatch
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.safetyCheck.color).toBe('AMBER');
    expect(json.safetyCheck.financialRisk.rulesFired).toContain('FIN-001');

    const fin001 = json.safetyCheck.signal.find((a: any) => a.ruleId === 'FIN-001');
    expect(fin001).toBeDefined();
    expect(fin001.summary).toContain('Indication mismatch');
  });

  // ── AMBER: quantity limit (FIN-003) ──────────────────────────────────────────

  test('200 AMBER (FIN-003): Gemini extracts apixaban qty 60 > payer max 30', async () => {
    (extractMedicationsFromNote as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        medications: [{ name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 60, tussCode: VALID_TUSS_CODE }],
        model: 'gemini-2.5-flash',
        extractionTimeMs: 110,
      })
    );

    const req = makeRequest(BASE_BODY); // payer.maxQuantity = 30
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.safetyCheck.color).toBe('AMBER');
    expect(json.safetyCheck.financialRisk.rulesFired).toContain('FIN-003');

    const fin003 = json.safetyCheck.signal.find((a: any) => a.ruleId === 'FIN-003');
    expect(fin003).toBeDefined();
    expect(fin003.summary).toContain('Quantity exceeds reimbursable limit');
  });

  // ── Governance metadata ──────────────────────────────────────────────────────

  test('governance metadata is always present in response', async () => {
    (extractMedicationsFromNote as jest.Mock).mockImplementation(() =>
      Promise.resolve({ medications: [], model: 'gemini-2.5-flash', extractionTimeMs: 10 })
    );

    const req = makeRequest(BASE_BODY);
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(json.governance).toBeDefined();
    expect(json.governance.legalBasis).toContain('FDA 21 CFR Part 11');
    expect(json.governance.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // ── Extraction metadata ──────────────────────────────────────────────────────

  test('extraction metadata reflects model and timing from extractor', async () => {
    (extractMedicationsFromNote as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        medications: [{ name: 'metformin', dose: '500mg', frequency: 'BID' }],
        model: 'gemini-2.5-flash',
        extractionTimeMs: 250,
      })
    );

    const req = makeRequest({ ...BASE_BODY, icd10Codes: ['E11.9'] }); // metformin matches E11.9
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(json.extraction.model).toBe('gemini-2.5-flash');
    expect(json.extraction.extractionTimeMs).toBe(250);
    expect(json.extraction.medicationCount).toBe(1);
  });
});
