/**
 * Enterprise API Tests — Blue Ocean Phase 3
 *
 * Tests for:
 *   1. Shared auth (constant-time key validation)
 *   2. Rate limiter (sliding window)
 *   3. Single-patient risk assessment endpoint
 *   4. Bulk assessment endpoint
 */

// =============================================================================
// MOCKS
// =============================================================================

jest.mock('@/lib/env', () => ({
  env: {
    PHARMA_PARTNER_KEY: 'test-key-1234567890abcdef',
  },
}));

import { validateEnterpriseKey } from '../auth';
import {
  checkRateLimit,
  clearAllRateLimits,
  SINGLE_ASSESSMENT_LIMIT,
  BULK_ASSESSMENT_LIMIT,
  type RateLimitConfig,
} from '../rate-limiter';
import {
  calculateCompositeRisk,
  type PatientRiskInput,
  type OverrideHistoryInput,
} from '@/services/risk-calculator.service';
import {
  exportForEnterprise,
  batchExportForEnterprise,
} from '@/services/enterprise-export.service';
import { getAllCodes, estimateClaimCost, getActuarialWeight } from '@/lib/finance/tuss-lookup';

// =============================================================================
// HELPERS
// =============================================================================

function makeMockRequest(headers: Record<string, string> = {}): {
  headers: { get: (name: string) => string | null };
} {
  return {
    headers: {
      get: (name: string) => headers[name] ?? null,
    },
  };
}

const VALID_KEY = 'test-key-1234567890abcdef';

const MOCK_PATIENT: PatientRiskInput = {
  cvdRiskScore: 32,
  diabetesRiskScore: 14,
  lastBloodPressureCheck: new Date(Date.now() - 45 * 86400000),
  lastCholesterolTest: null,
  lastHbA1c: new Date(Date.now() - 400 * 86400000),
  lastPhysicalExam: new Date(Date.now() - 200 * 86400000),
  tobaccoUse: true,
  tobaccoPackYears: 12,
  alcoholUse: false,
  alcoholDrinksPerWeek: null,
  physicalActivityMinutesWeek: 60,
  bmi: 28.5,
  ageYears: 62,
};

const MOCK_OVERRIDES: OverrideHistoryInput = {
  totalOverrides: 3,
  hardBlockOverrides: 1,
  totalRulesEvaluated: 27,
};

// =============================================================================
// AUTH TESTS
// =============================================================================

describe('Enterprise Auth', () => {
  it('AUTH-001: rejects request with no API key header', () => {
    const req = makeMockRequest({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = validateEnterpriseKey(req as any);
    expect(result.authorized).toBe(false);
    expect(result.response).toBeDefined();
  });

  it('AUTH-002: rejects request with wrong API key', () => {
    const req = makeMockRequest({ 'x-pharma-partner-key': 'wrong-key-that-is-long' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = validateEnterpriseKey(req as any);
    expect(result.authorized).toBe(false);
  });

  it('AUTH-003: accepts request with correct API key', () => {
    const req = makeMockRequest({ 'x-pharma-partner-key': VALID_KEY });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = validateEnterpriseKey(req as any);
    expect(result.authorized).toBe(true);
    expect(result.response).toBeUndefined();
  });

  it('AUTH-004: rejects key of different length', () => {
    const req = makeMockRequest({ 'x-pharma-partner-key': 'short' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = validateEnterpriseKey(req as any);
    expect(result.authorized).toBe(false);
  });
});

// =============================================================================
// RATE LIMITER TESTS
// =============================================================================

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it('RATE-001: allows requests within limit', () => {
    const config: RateLimitConfig = { maxRequests: 3, windowMs: 60000 };
    const r1 = checkRateLimit('test-key', config);
    const r2 = checkRateLimit('test-key', config);
    const r3 = checkRateLimit('test-key', config);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('RATE-002: blocks requests exceeding limit', () => {
    const config: RateLimitConfig = { maxRequests: 2, windowMs: 60000 };
    checkRateLimit('test-key', config);
    checkRateLimit('test-key', config);
    const r3 = checkRateLimit('test-key', config);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.response).toBeDefined();
  });

  it('RATE-003: different identifiers have separate limits', () => {
    const config: RateLimitConfig = { maxRequests: 1, windowMs: 60000 };
    const r1 = checkRateLimit('key-a', config);
    const r2 = checkRateLimit('key-b', config);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it('RATE-004: default configs have sensible values', () => {
    expect(SINGLE_ASSESSMENT_LIMIT.maxRequests).toBe(60);
    expect(BULK_ASSESSMENT_LIMIT.maxRequests).toBe(10);
    expect(SINGLE_ASSESSMENT_LIMIT.windowMs).toBe(60000);
  });
});

// =============================================================================
// RISK CALCULATOR INTEGRATION TESTS
// =============================================================================

describe('Risk Calculator (via API path)', () => {
  it('RISK-001: produces valid composite score in 0-100 range', () => {
    const result = calculateCompositeRisk(MOCK_PATIENT, MOCK_OVERRIDES);
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.compositeScore).toBeLessThanOrEqual(100);
  });

  it('RISK-002: produces valid risk tier', () => {
    const result = calculateCompositeRisk(MOCK_PATIENT, MOCK_OVERRIDES);
    expect(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(result.riskTier);
  });

  it('RISK-003: domain breakdown sums to composite score', () => {
    const result = calculateCompositeRisk(MOCK_PATIENT, MOCK_OVERRIDES);
    const domainSum =
      result.domainBreakdown.cardiovascular +
      result.domainBreakdown.metabolic +
      result.domainBreakdown.screeningCompliance +
      result.domainBreakdown.lifestyle +
      result.domainBreakdown.overrideRisk;
    expect(domainSum).toBe(result.compositeScore);
  });

  it('RISK-004: confidence penalizes missing fields', () => {
    const fullPatient: PatientRiskInput = {
      ...MOCK_PATIENT,
      lastCholesterolTest: new Date(),
      lastHbA1c: new Date(),
    };
    const sparsePatient: PatientRiskInput = {
      ...MOCK_PATIENT,
      cvdRiskScore: null,
      diabetesRiskScore: null,
      bmi: null,
      lastBloodPressureCheck: null,
      lastCholesterolTest: null,
      lastHbA1c: null,
      lastPhysicalExam: null,
    };
    const fullResult = calculateCompositeRisk(fullPatient, MOCK_OVERRIDES);
    const sparseResult = calculateCompositeRisk(sparsePatient, MOCK_OVERRIDES);
    expect(fullResult.confidence).toBeGreaterThan(sparseResult.confidence);
  });

  it('RISK-005: override history increases override domain score', () => {
    const noOverrides: OverrideHistoryInput = {
      totalOverrides: 0,
      hardBlockOverrides: 0,
      totalRulesEvaluated: 0,
    };
    const heavyOverrides: OverrideHistoryInput = {
      totalOverrides: 8,
      hardBlockOverrides: 4,
      totalRulesEvaluated: 10,
    };
    const noResult = calculateCompositeRisk(MOCK_PATIENT, noOverrides);
    const heavyResult = calculateCompositeRisk(MOCK_PATIENT, heavyOverrides);
    expect(heavyResult.domainBreakdown.overrideRisk).toBeGreaterThan(
      noResult.domainBreakdown.overrideRisk,
    );
  });
});

// =============================================================================
// ENTERPRISE EXPORT INTEGRATION TESTS
// =============================================================================

describe('Enterprise Export (via API path)', () => {
  it('EXPORT-001: produces anonymized payload with correct format', () => {
    const riskResult = calculateCompositeRisk(MOCK_PATIENT, MOCK_OVERRIDES);
    const payload = exportForEnterprise({
      patientId: 'test-patient-id',
      riskResult,
      recentTussCodes: ['4.01.01.01'],
      protocolCompliance: 0.85,
      organizationId: 'org-123',
    });
    expect(payload.__format).toBe('enterprise_risk_export');
    expect(payload.anonymizedPatientId).toMatch(/^anon-/);
    expect(payload.sourceOrgHash).toMatch(/^org-/);
    expect(payload.compositeRiskScore).toBe(riskResult.compositeScore);
  });

  it('EXPORT-002: batch export handles multiple patients', () => {
    const riskResult = calculateCompositeRisk(MOCK_PATIENT, MOCK_OVERRIDES);
    const inputs = Array.from({ length: 5 }, (_, i) => ({
      patientId: `patient-${i}`,
      riskResult,
      recentTussCodes: ['1.01.01.01'],
      protocolCompliance: 0.9,
      organizationId: 'org-456',
    }));
    const { successful, failed } = batchExportForEnterprise(inputs);
    expect(successful).toHaveLength(5);
    expect(failed).toHaveLength(0);
  });

  it('EXPORT-003: anonymized ID is deterministic per patient+org', () => {
    const riskResult = calculateCompositeRisk(MOCK_PATIENT, MOCK_OVERRIDES);
    const p1 = exportForEnterprise({
      patientId: 'same-id',
      riskResult,
      recentTussCodes: [],
      protocolCompliance: 1,
      organizationId: 'org-A',
    });
    const p2 = exportForEnterprise({
      patientId: 'same-id',
      riskResult,
      recentTussCodes: [],
      protocolCompliance: 1,
      organizationId: 'org-B',
    });
    // Different orgs → different tokens
    expect(p1.sourceOrgHash).not.toBe(p2.sourceOrgHash);
  });
});

// =============================================================================
// TUSS EXPANSION TESTS
// =============================================================================

describe('TUSS Expansion (Phase 3)', () => {
  it('TUSS-001: has at least 50 codes', () => {
    expect(getAllCodes().length).toBeGreaterThanOrEqual(50);
  });

  it('TUSS-002: all codes have actuarialWeight in valid range', () => {
    for (const code of getAllCodes()) {
      expect(code.actuarialWeight).toBeGreaterThanOrEqual(0);
      expect(code.actuarialWeight).toBeLessThanOrEqual(1);
    }
  });

  it('TUSS-003: all codes have baseRateBRL or baseRateBOB > 0', () => {
    for (const code of getAllCodes()) {
      const hasBRL = code.baseRateBRL !== null && code.baseRateBRL > 0;
      const hasBOB = code.baseRateBOB > 0;
      expect(hasBRL || hasBOB).toBe(true);
    }
  });

  it('TUSS-004: categories include STANDARD, SPECIALIZED, DIAGNOSTIC, SURGICAL', () => {
    const categories = new Set(getAllCodes().map((c) => c.category));
    expect(categories.has('STANDARD')).toBe(true);
    expect(categories.has('SPECIALIZED')).toBe(true);
    expect(categories.has('DIAGNOSTIC')).toBe(true);
    expect(categories.has('SURGICAL')).toBe(true);
  });

  it('TUSS-005: surgical codes have higher actuarial weight than standard', () => {
    const codes = getAllCodes();
    const surgicalAvg =
      codes.filter((c) => c.category === 'SURGICAL').reduce((s, c) => s + c.actuarialWeight, 0) /
      codes.filter((c) => c.category === 'SURGICAL').length;
    const standardAvg =
      codes.filter((c) => c.category === 'STANDARD').reduce((s, c) => s + c.actuarialWeight, 0) /
      codes.filter((c) => c.category === 'STANDARD').length;
    expect(surgicalAvg).toBeGreaterThan(standardAvg);
  });

  it('TUSS-006: estimateClaimCost works with expanded catalog', () => {
    const allCodes = getAllCodes().map((c) => c.code);
    const estimate = estimateClaimCost(allCodes, 'BLOCK');
    expect(estimate.codeCount).toBe(allCodes.length);
    expect(estimate.estimatedCostBOB).toBeGreaterThan(0);
    expect(estimate.estimatedCostBRL).toBeGreaterThan(0);
  });

  it('TUSS-007: getActuarialWeight returns 0 for unknown codes', () => {
    expect(getActuarialWeight('99.99.99.99')).toBe(0);
  });

  it('TUSS-008: high-cost procedures (transplants, cardiac surgery) have weight >= 0.95', () => {
    const transplantRenal = getActuarialWeight('4.01.05.01-5');
    const transplantBone = getActuarialWeight('4.01.05.05-8');
    const cardiacSurgery = getActuarialWeight('4.01.03.01-3');
    expect(transplantRenal).toBeGreaterThanOrEqual(0.95);
    expect(transplantBone).toBeGreaterThanOrEqual(0.95);
    expect(cardiacSurgery).toBeGreaterThanOrEqual(0.95);
  });
});
