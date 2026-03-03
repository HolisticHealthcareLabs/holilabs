/**
 * Tests for POST /api/prescriptions/safety-check
 *
 * Validates unified clinical + financial safety pre-check:
 * - GREEN: valid prescription passes
 * - RED (FIN-002): invalid TUSS code detected
 * - AMBER (FIN-001): ICD-10 mismatch
 * - AMBER (FIN-003): quantity exceeds payer limit
 * - RED (DOAC): CrCl < 15 → BLOCK
 * - AMBER (ATT): stale labs > 72h
 * - Governance metadata present on every call
 */

// Mock middleware as pass-through (bypass CSRF, auth, rate limiting)
jest.mock('@/lib/api/middleware', () => ({
  createProtectedRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createLogger: jest.fn(() => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() })),
  logError: jest.fn((e: any) => ({ message: String(e) })),
}));

jest.mock('@/lib/cds/engines/cds-engine', () => ({
  cdsEngine: {
    evaluate: jest.fn().mockImplementation(() =>
      Promise.resolve({
        alerts: [],
        rulesEvaluated: 0,
        rulesFired: 0,
        processingTime: 0,
        timestamp: '',
        hookType: 'medication-prescribe',
        context: {},
      })
    ),
  },
}));

// Mock cache (used by CDS engine)
jest.mock('@/lib/cache/redis-client', () => ({
  getCacheClient: jest.fn(() => ({
    get: jest.fn().mockImplementation(() => Promise.resolve(null)),
    set: jest.fn(),
  })),
  generateCacheKey: jest.fn((...args: string[]) => args.join(':')),
}));

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const { POST } = require('../route');

const MOCK_CONTEXT = {
  user: { id: 'clinician-1', email: 'dr@test.com', role: 'CLINICIAN' },
  requestId: 'req-test-001',
};

const VALID_TUSS_CODE = '1.01.01.01'; // Exists in TUSS master data

const VALID_APIXABAN_BODY = {
  patientId: 'patient-001',
  medications: [
    { name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 30, tussCode: VALID_TUSS_CODE },
  ],
  encounter: { icd10Codes: ['I48.0'] },
  payer: { maxQuantity: 30 },
  context: {
    creatinineClearance: 60,
    weight: 75,
    age: 65,
    labTimestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1h old
  },
};

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/prescriptions/safety-check', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/prescriptions/safety-check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── VALIDATION ERRORS ────────────────────────────────────────────────────

  test('returns 400 when patientId is missing', async () => {
    const req = makeRequest({ medications: [{ name: 'apixaban' }] });
    const res = await POST(req, MOCK_CONTEXT);
    expect(res.status).toBe(400);
  });

  test('returns 400 when medications is empty', async () => {
    const req = makeRequest({ patientId: 'p1', medications: [] });
    const res = await POST(req, MOCK_CONTEXT);
    expect(res.status).toBe(400);
  });

  // ── GREEN ────────────────────────────────────────────────────────────────

  test('GREEN: Apixaban with correct ICD-10 (I48.0), valid TUSS, quantity 30', async () => {
    const req = makeRequest(VALID_APIXABAN_BODY);
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.color).toBe('GREEN');
    expect(json.financialRisk.glosaRisk).toBe(false);
    expect(json.financialRisk.rulesFired).toHaveLength(0);
    expect(json.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(json.governance).toHaveProperty('legalBasis');
    expect(json.governance).toHaveProperty('timestamp');
  });

  // ── RED (FIN-002) ────────────────────────────────────────────────────────

  test('RED (FIN-002): invalid TUSS code → glosaRisk=true, color=RED', async () => {
    const req = makeRequest({
      ...VALID_APIXABAN_BODY,
      medications: [
        { name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 30, tussCode: '00000000' },
      ],
    });
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.color).toBe('RED');
    expect(json.financialRisk.glosaRisk).toBe(true);
    expect(json.financialRisk.rulesFired).toContain('FIN-002');
    const fin002 = json.signal.find((a: any) => a.ruleId === 'FIN-002');
    expect(fin002).toBeDefined();
    expect(fin002.summary).toContain('Invalid TUSS code');
  });

  // ── AMBER (FIN-001) ──────────────────────────────────────────────────────

  test('AMBER (FIN-001): Apixaban with diabetes ICD-10 (E11.9) → indication mismatch', async () => {
    const req = makeRequest({
      ...VALID_APIXABAN_BODY,
      medications: [
        { name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 30, tussCode: VALID_TUSS_CODE },
      ],
      encounter: { icd10Codes: ['E11.9'] },
    });
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.color).toBe('AMBER');
    expect(json.financialRisk.glosaRisk).toBe(true);
    expect(json.financialRisk.rulesFired).toContain('FIN-001');
    const fin001 = json.signal.find((a: any) => a.ruleId === 'FIN-001');
    expect(fin001).toBeDefined();
    expect(fin001.summary).toContain('Indication mismatch');
  });

  // ── AMBER (FIN-003) ──────────────────────────────────────────────────────

  test('AMBER (FIN-003): Apixaban quantity 60 > payer max 30 → quantity exceeded', async () => {
    const req = makeRequest({
      ...VALID_APIXABAN_BODY,
      medications: [
        { name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 60, tussCode: VALID_TUSS_CODE },
      ],
    });
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.color).toBe('AMBER');
    expect(json.financialRisk.rulesFired).toContain('FIN-003');
    const fin003 = json.signal.find((a: any) => a.ruleId === 'FIN-003');
    expect(fin003).toBeDefined();
    expect(fin003.summary).toContain('Quantity exceeds reimbursable limit');
  });

  // ── RED (DOAC) ───────────────────────────────────────────────────────────

  test('RED (DOAC): CrCl < 15 → BLOCK signal for apixaban', async () => {
    const req = makeRequest({
      ...VALID_APIXABAN_BODY,
      context: {
        creatinineClearance: 10,
        weight: 75,
        age: 65,
        labTimestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    });
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.color).toBe('RED');
    const blockAlert = json.signal.find(
      (a: any) => a.severity === 'critical' && a.ruleId?.includes('CrCl')
    );
    expect(blockAlert).toBeDefined();
  });

  // ── AMBER (ATT) ──────────────────────────────────────────────────────────

  test('AMBER (ATT): stale labs > 72h → attestation required', async () => {
    const req = makeRequest({
      ...VALID_APIXABAN_BODY,
      medications: [
        { name: 'apixaban', dose: '5mg', frequency: 'BID', quantity: 30, tussCode: VALID_TUSS_CODE },
      ],
      context: {
        creatinineClearance: 60,
        weight: 75,
        age: 65,
        labTimestamp: new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString(), // 80h old
      },
    });
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.color).toBe('AMBER');
    expect(json.attestationRequired).toBe(true);
  });

  // ── GOVERNANCE ───────────────────────────────────────────────────────────

  test('governance metadata is always present in response', async () => {
    const req = makeRequest(VALID_APIXABAN_BODY);
    const res = await POST(req, MOCK_CONTEXT);
    const json = await res.json();

    expect(json.governance).toBeDefined();
    expect(json.governance.legalBasis).toContain('FDA 21 CFR Part 11');
    expect(json.governance.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
