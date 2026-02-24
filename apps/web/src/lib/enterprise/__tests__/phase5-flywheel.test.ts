/**
 * Phase 5: Flywheel Tests — Blue Ocean
 *
 * 35 tests across 5 suites:
 *   - Data Flywheel (FLY-001 to FLY-005)
 *   - Usage Metering (METER-001 to METER-005)
 *   - TUSS Expansion (TUSS-P5-001 to TUSS-P5-009)
 *   - Webhook Dispatch (WH-001 to WH-009)
 *   - Outcome Linking (OUT-001 to OUT-007)
 */

// =============================================================================
// MOCKS
// =============================================================================

jest.mock('@/lib/env', () => ({
  env: {
    PHARMA_PARTNER_KEY: 'test-key-1234567890abcdef',
  },
}));

// Mock fetch for webhook tests
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import {
  calculateCompositeRisk,
  type PatientRiskInput,
  type OverrideHistoryInput,
} from '@/services/risk-calculator.service';
import {
  exportForEnterprise,
} from '@/services/enterprise-export.service';
import { dataFlywheelService } from '@/services/data-flywheel.service';
import { enterpriseUsageMeter } from '../usage-meter';
import { webhookDispatcher } from '../webhook-dispatcher';
import { outcomeTrackerService } from '@/services/outcome-tracker.service';
import { getAllCodes, getActuarialWeight } from '@/lib/finance/tuss-lookup';

// =============================================================================
// HELPERS
// =============================================================================

const MOCK_PATIENT: PatientRiskInput = {
  cvdRiskScore: 45,
  diabetesRiskScore: 18,
  lastBloodPressureCheck: new Date(Date.now() - 30 * 86400000),
  lastCholesterolTest: null,
  lastHbA1c: new Date(Date.now() - 400 * 86400000),
  lastPhysicalExam: new Date(Date.now() - 100 * 86400000),
  tobaccoUse: true,
  tobaccoPackYears: 15,
  alcoholUse: false,
  alcoholDrinksPerWeek: null,
  physicalActivityMinutesWeek: 40,
  bmi: 31,
  ageYears: 67,
};

const MOCK_OVERRIDES: OverrideHistoryInput = {
  totalOverrides: 4,
  hardBlockOverrides: 2,
  totalRulesEvaluated: 27,
};

// =============================================================================
// SUITE 1: Data Flywheel
// =============================================================================

describe('Data Flywheel', () => {
  beforeEach(() => {
    dataFlywheelService.clearStore();
    webhookDispatcher.clearAll();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  it('FLY-001: ingest persists an assessment entry', async () => {
    const entry = await dataFlywheelService.ingest({
      trafficLightResult: { color: 'YELLOW', signals: [{ id: 's1' }] },
      patientRiskInput: MOCK_PATIENT,
      overrideHistory: MOCK_OVERRIDES,
      patientId: 'patient-1',
      organizationId: 'org-1',
      tussCodes: ['1.01.01.01'],
    });

    expect(entry.id).toMatch(/^fly-/);
    expect(entry.anonymizedPatientId).toMatch(/^anon-/);
    expect(entry.trafficLightColor).toBe('YELLOW');
    expect(entry.signalCount).toBe(1);
    expect(entry.compositeRiskScore).toBeGreaterThan(0);
    expect(entry.riskTier).toBeDefined();
    expect(entry.createdAt).toBeDefined();
  });

  it('FLY-002: getAllAssessments returns all persisted entries', async () => {
    await dataFlywheelService.ingest({
      trafficLightResult: { color: 'GREEN', signals: [] },
      patientRiskInput: MOCK_PATIENT,
      overrideHistory: MOCK_OVERRIDES,
      patientId: 'p1',
      organizationId: 'org-1',
    });
    await dataFlywheelService.ingest({
      trafficLightResult: { color: 'RED', signals: [{ id: 's1' }, { id: 's2' }] },
      patientRiskInput: MOCK_PATIENT,
      overrideHistory: MOCK_OVERRIDES,
      patientId: 'p2',
      organizationId: 'org-1',
    });

    expect(dataFlywheelService.getAllAssessments()).toHaveLength(2);
  });

  it('FLY-003: getStats returns correct tier distribution', async () => {
    // Ingest patients with different risk profiles
    const lowRisk: PatientRiskInput = {
      ...MOCK_PATIENT,
      cvdRiskScore: 5,
      diabetesRiskScore: 3,
      tobaccoUse: false,
      bmi: 22,
      ageYears: 28,
    };
    await dataFlywheelService.ingest({
      trafficLightResult: { color: 'GREEN', signals: [] },
      patientRiskInput: lowRisk,
      overrideHistory: { totalOverrides: 0, hardBlockOverrides: 0, totalRulesEvaluated: 10 },
      patientId: 'low-1',
      organizationId: 'org-1',
    });
    await dataFlywheelService.ingest({
      trafficLightResult: { color: 'YELLOW', signals: [{ id: 's1' }] },
      patientRiskInput: MOCK_PATIENT,
      overrideHistory: MOCK_OVERRIDES,
      patientId: 'high-1',
      organizationId: 'org-1',
    });

    const stats = dataFlywheelService.getStats();
    expect(stats.totalAssessments).toBe(2);
    expect(stats.latestAt).toBeDefined();
    expect(Object.values(stats.byTier).reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('FLY-004: clearStore empties the store', async () => {
    await dataFlywheelService.ingest({
      trafficLightResult: { color: 'GREEN', signals: [] },
      patientRiskInput: MOCK_PATIENT,
      overrideHistory: MOCK_OVERRIDES,
      patientId: 'p1',
      organizationId: 'org-1',
    });
    expect(dataFlywheelService.getAllAssessments()).toHaveLength(1);

    dataFlywheelService.clearStore();
    expect(dataFlywheelService.getAllAssessments()).toHaveLength(0);
  });

  it('FLY-005: ingest dispatches RISK_THRESHOLD_CROSSED for HIGH/CRITICAL patients', async () => {
    // Register a webhook subscription
    webhookDispatcher.register({
      apiKeyHash: 'test',
      url: 'https://example.com/webhook',
      events: ['RISK_THRESHOLD_CROSSED', 'ASSESSMENT_COMPLETED'],
    });

    // High-risk patient
    const highRisk: PatientRiskInput = {
      ...MOCK_PATIENT,
      cvdRiskScore: 88,
      diabetesRiskScore: 24,
      tobaccoUse: true,
      tobaccoPackYears: 40,
      alcoholUse: true,
      alcoholDrinksPerWeek: 21,
      physicalActivityMinutesWeek: 0,
      bmi: 42,
      ageYears: 74,
      lastBloodPressureCheck: null,
      lastCholesterolTest: null,
      lastHbA1c: null,
      lastPhysicalExam: null,
    };

    await dataFlywheelService.ingest({
      trafficLightResult: { color: 'RED', signals: [{ id: 's1' }] },
      patientRiskInput: highRisk,
      overrideHistory: { totalOverrides: 9, hardBlockOverrides: 5, totalRulesEvaluated: 27 },
      patientId: 'critical-1',
      organizationId: 'org-1',
    });

    // Wait for async webhook dispatch
    await new Promise((r) => setTimeout(r, 50));

    // Should have dispatched at least ASSESSMENT_COMPLETED + RISK_THRESHOLD_CROSSED
    expect(mockFetch).toHaveBeenCalled();
    const calls = mockFetch.mock.calls;
    const bodies = calls.map((c: unknown[]) => JSON.parse(c[1] && typeof c[1] === 'object' && 'body' in (c[1] as Record<string, unknown>) ? (c[1] as Record<string, unknown>).body as string : '{}'));
    const eventTypes = bodies.map((b: Record<string, unknown>) => b.eventType);
    expect(eventTypes).toContain('ASSESSMENT_COMPLETED');
    expect(eventTypes).toContain('RISK_THRESHOLD_CROSSED');
  });
});

// =============================================================================
// SUITE 2: Usage Metering
// =============================================================================

describe('Usage Metering', () => {
  beforeEach(() => {
    enterpriseUsageMeter.clearStore();
  });

  it('METER-001: logUsage creates an entry with auto-generated ID', () => {
    const entry = enterpriseUsageMeter.logUsage({
      endpoint: '/api/enterprise/risk-assessment',
      apiKeyHash: 'test-key',
      timestamp: new Date().toISOString(),
      responseTimeMs: 120,
      patientCount: 1,
      statusCode: 200,
      method: 'POST',
    });

    expect(entry.id).toMatch(/^usage-/);
    expect(entry.endpoint).toBe('/api/enterprise/risk-assessment');
  });

  it('METER-002: getUsageSummary aggregates correctly', () => {
    for (let i = 0; i < 5; i++) {
      enterpriseUsageMeter.logUsage({
        endpoint: '/api/enterprise/risk-assessment',
        apiKeyHash: 'key-A',
        timestamp: new Date().toISOString(),
        responseTimeMs: 100 + i * 10,
        patientCount: 1,
        statusCode: 200,
        method: 'POST',
      });
    }
    enterpriseUsageMeter.logUsage({
      endpoint: '/api/enterprise/bulk-assessment',
      apiKeyHash: 'key-A',
      timestamp: new Date().toISOString(),
      responseTimeMs: 500,
      patientCount: 20,
      statusCode: 200,
      method: 'POST',
    });

    const summary = enterpriseUsageMeter.getUsageSummary('key-A');
    expect(summary.totalRequests).toBe(6);
    expect(summary.totalPatientAssessments).toBe(25);
    expect(summary.avgResponseTimeMs).toBeGreaterThan(0);
    expect(summary.byEndpoint['/api/enterprise/risk-assessment']).toBe(5);
    expect(summary.byEndpoint['/api/enterprise/bulk-assessment']).toBe(1);
  });

  it('METER-003: getUsageSummary filters by apiKeyHash', () => {
    enterpriseUsageMeter.logUsage({
      endpoint: '/api/enterprise/risk-assessment',
      apiKeyHash: 'key-A',
      timestamp: new Date().toISOString(),
      responseTimeMs: 100,
      patientCount: 1,
      statusCode: 200,
      method: 'POST',
    });
    enterpriseUsageMeter.logUsage({
      endpoint: '/api/enterprise/risk-assessment',
      apiKeyHash: 'key-B',
      timestamp: new Date().toISOString(),
      responseTimeMs: 100,
      patientCount: 1,
      statusCode: 200,
      method: 'POST',
    });

    expect(enterpriseUsageMeter.getUsageSummary('key-A').totalRequests).toBe(1);
    expect(enterpriseUsageMeter.getUsageSummary('key-B').totalRequests).toBe(1);
  });

  it('METER-004: getUsageTrend buckets by day', () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    enterpriseUsageMeter.logUsage({
      endpoint: '/api/enterprise/risk-assessment',
      apiKeyHash: 'key-A',
      timestamp: today,
      responseTimeMs: 100,
      patientCount: 1,
      statusCode: 200,
      method: 'POST',
    });
    enterpriseUsageMeter.logUsage({
      endpoint: '/api/enterprise/risk-assessment',
      apiKeyHash: 'key-A',
      timestamp: yesterday,
      responseTimeMs: 150,
      patientCount: 1,
      statusCode: 200,
      method: 'POST',
    });

    const trend = enterpriseUsageMeter.getUsageTrend('key-A', 'day');
    expect(trend.length).toBe(2);
    expect(trend[0].requests).toBe(1);
    expect(trend[1].requests).toBe(1);
  });

  it('METER-005: clearStore resets everything', () => {
    enterpriseUsageMeter.logUsage({
      endpoint: '/test',
      apiKeyHash: 'key-A',
      timestamp: new Date().toISOString(),
      responseTimeMs: 100,
      patientCount: 1,
      statusCode: 200,
      method: 'POST',
    });
    expect(enterpriseUsageMeter.getAllUsage()).toHaveLength(1);

    enterpriseUsageMeter.clearStore();
    expect(enterpriseUsageMeter.getAllUsage()).toHaveLength(0);
  });
});

// =============================================================================
// SUITE 3: TUSS Expansion (Phase 5)
// =============================================================================

describe('TUSS Expansion (Phase 5)', () => {
  const allCodes = getAllCodes();

  it('TUSS-P5-001: catalog has at least 100 codes', () => {
    expect(allCodes.length).toBeGreaterThanOrEqual(100);
  });

  it('TUSS-P5-002: includes PREVENTIVE category', () => {
    const preventive = allCodes.filter((c) => c.category === 'PREVENTIVE');
    expect(preventive.length).toBeGreaterThanOrEqual(10);
  });

  it('TUSS-P5-003: includes REHABILITATION category', () => {
    const rehab = allCodes.filter((c) => c.category === 'REHABILITATION');
    expect(rehab.length).toBeGreaterThanOrEqual(10);
  });

  it('TUSS-P5-004: includes MENTAL_HEALTH category', () => {
    const mentalHealth = allCodes.filter((c) => c.category === 'MENTAL_HEALTH');
    expect(mentalHealth.length).toBeGreaterThanOrEqual(10);
  });

  it('TUSS-P5-005: all new codes have valid actuarialWeight', () => {
    for (const code of allCodes) {
      expect(code.actuarialWeight).toBeGreaterThanOrEqual(0);
      expect(code.actuarialWeight).toBeLessThanOrEqual(1);
    }
  });

  it('TUSS-P5-006: all new codes have dual-currency rates', () => {
    for (const code of allCodes) {
      expect(code.baseRateBOB).toBeGreaterThan(0);
      expect(code.baseRateBRL).toBeGreaterThan(0);
    }
  });

  it('TUSS-P5-007: preventive codes have low actuarial weights (< 0.20)', () => {
    const preventive = allCodes.filter((c) => c.category === 'PREVENTIVE');
    const avgWeight = preventive.reduce((s, c) => s + c.actuarialWeight, 0) / preventive.length;
    expect(avgWeight).toBeLessThan(0.20);
  });

  it('TUSS-P5-008: genetic testing codes exist in extra DIAGNOSTIC', () => {
    const brca = getActuarialWeight('2.02.01.01');
    const pharmacogenomic = getActuarialWeight('2.02.01.02');
    expect(brca).toBeGreaterThan(0);
    expect(pharmacogenomic).toBeGreaterThan(0);
  });

  it('TUSS-P5-009: PET-CT has high actuarial weight (>= 0.80)', () => {
    const petCt = getActuarialWeight('2.02.03.01');
    expect(petCt).toBeGreaterThanOrEqual(0.80);
  });
});

// =============================================================================
// SUITE 4: Webhook Dispatch
// =============================================================================

describe('Webhook Dispatch', () => {
  beforeEach(() => {
    webhookDispatcher.clearAll();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  it('WH-001: register creates a subscription with secret', () => {
    const sub = webhookDispatcher.register({
      apiKeyHash: 'key-A',
      url: 'https://example.com/hook',
      events: ['ASSESSMENT_COMPLETED'],
    });

    expect(sub.id).toMatch(/^wh-/);
    expect(sub.secret).toBeDefined();
    expect(sub.secret.length).toBe(64); // 32 bytes hex
    expect(sub.isActive).toBe(true);
  });

  it('WH-002: listSubscriptions masks secrets', () => {
    webhookDispatcher.register({
      apiKeyHash: 'key-A',
      url: 'https://example.com/hook',
      events: ['ASSESSMENT_COMPLETED'],
    });

    const list = webhookDispatcher.listSubscriptions('key-A');
    expect(list).toHaveLength(1);
    expect(list[0].secret).toContain('...');
    expect(list[0].secret.length).toBeLessThan(64);
  });

  it('WH-003: listSubscriptions only returns own subscriptions', () => {
    webhookDispatcher.register({
      apiKeyHash: 'key-A',
      url: 'https://a.com/hook',
      events: ['ASSESSMENT_COMPLETED'],
    });
    webhookDispatcher.register({
      apiKeyHash: 'key-B',
      url: 'https://b.com/hook',
      events: ['ASSESSMENT_COMPLETED'],
    });

    expect(webhookDispatcher.listSubscriptions('key-A')).toHaveLength(1);
    expect(webhookDispatcher.listSubscriptions('key-B')).toHaveLength(1);
  });

  it('WH-004: deleteSubscription removes it', () => {
    const sub = webhookDispatcher.register({
      apiKeyHash: 'key-A',
      url: 'https://example.com/hook',
      events: ['ASSESSMENT_COMPLETED'],
    });

    expect(webhookDispatcher.deleteSubscription(sub.id, 'key-A')).toBe(true);
    expect(webhookDispatcher.listSubscriptions('key-A')).toHaveLength(0);
  });

  it('WH-005: deleteSubscription rejects wrong apiKeyHash', () => {
    const sub = webhookDispatcher.register({
      apiKeyHash: 'key-A',
      url: 'https://example.com/hook',
      events: ['ASSESSMENT_COMPLETED'],
    });

    expect(webhookDispatcher.deleteSubscription(sub.id, 'key-B')).toBe(false);
    expect(webhookDispatcher.listSubscriptions('key-A')).toHaveLength(1);
  });

  it('WH-006: dispatch sends to matching subscribers', async () => {
    webhookDispatcher.register({
      apiKeyHash: 'key-A',
      url: 'https://example.com/hook',
      events: ['ASSESSMENT_COMPLETED'],
    });
    webhookDispatcher.register({
      apiKeyHash: 'key-B',
      url: 'https://other.com/hook',
      events: ['RISK_THRESHOLD_CROSSED'],
    });

    await webhookDispatcher.dispatch('ASSESSMENT_COMPLETED', { score: 75 });

    // Only the first subscriber should receive the webhook
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://example.com/hook');
  });

  it('WH-007: dispatch includes X-Webhook-Signature header', async () => {
    webhookDispatcher.register({
      apiKeyHash: 'key-A',
      url: 'https://example.com/hook',
      events: ['ASSESSMENT_COMPLETED'],
    });

    await webhookDispatcher.dispatch('ASSESSMENT_COMPLETED', { test: true });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['X-Webhook-Signature']).toBeDefined();
    expect(headers['X-Webhook-Signature'].length).toBeGreaterThan(0);
  });

  it('WH-008: signPayload produces consistent HMAC', () => {
    const sig1 = webhookDispatcher.signPayload('hello', 'secret');
    const sig2 = webhookDispatcher.signPayload('hello', 'secret');
    const sig3 = webhookDispatcher.signPayload('hello', 'different-secret');

    expect(sig1).toBe(sig2); // deterministic
    expect(sig1).not.toBe(sig3); // different secret
  });

  it('WH-009: getDeliveryLogs tracks delivery attempts', async () => {
    const sub = webhookDispatcher.register({
      apiKeyHash: 'key-A',
      url: 'https://example.com/hook',
      events: ['ASSESSMENT_COMPLETED'],
    });

    await webhookDispatcher.dispatch('ASSESSMENT_COMPLETED', { test: true });

    const logs = webhookDispatcher.getDeliveryLogs(sub.id);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].subscriptionId).toBe(sub.id);
    expect(logs[0].success).toBe(true);
  });
});

// =============================================================================
// SUITE 5: Outcome Linking
// =============================================================================

describe('Outcome Linking', () => {
  beforeEach(() => {
    outcomeTrackerService.clearStore();
  });

  it('OUT-001: recordOutcome creates a record with auto-generated ID', () => {
    const record = outcomeTrackerService.recordOutcome({
      anonymizedPatientId: 'anon-1234-5678',
      outcomeType: 'READMISSION',
      recordedBy: 'test',
    });

    expect(record.id).toMatch(/^outcome-/);
    expect(record.outcomeType).toBe('READMISSION');
    expect(record.anonymizedPatientId).toBe('anon-1234-5678');
    expect(record.recordedAt).toBeDefined();
  });

  it('OUT-002: getPatientOutcomes filters by anonymizedPatientId', () => {
    outcomeTrackerService.recordOutcome({
      anonymizedPatientId: 'anon-A',
      outcomeType: 'RESOLVED',
      recordedBy: 'test',
    });
    outcomeTrackerService.recordOutcome({
      anonymizedPatientId: 'anon-B',
      outcomeType: 'COMPLICATION',
      recordedBy: 'test',
    });
    outcomeTrackerService.recordOutcome({
      anonymizedPatientId: 'anon-A',
      outcomeType: 'ADVERSE_EVENT',
      recordedBy: 'test',
    });

    expect(outcomeTrackerService.getPatientOutcomes('anon-A')).toHaveLength(2);
    expect(outcomeTrackerService.getPatientOutcomes('anon-B')).toHaveLength(1);
  });

  it('OUT-003: recordOutcome supports linked override IDs', () => {
    const record = outcomeTrackerService.recordOutcome({
      anonymizedPatientId: 'anon-A',
      outcomeType: 'ADVERSE_EVENT',
      linkedOverrideIds: ['override-1', 'override-2'],
      recordedBy: 'test',
    });

    expect(record.linkedOverrideIds).toEqual(['override-1', 'override-2']);
  });

  it('OUT-004: getOverrideOutcomeCorrelation returns empty stats when no outcomes', () => {
    const stats = outcomeTrackerService.getOverrideOutcomeCorrelation();
    expect(stats.totalOutcomes).toBe(0);
    expect(stats.correlationConfidence).toBe(0);
  });

  it('OUT-005: getOverrideOutcomeCorrelation computes rates correctly', () => {
    // 3 outcomes: 1 adverse event, 1 readmission, 1 resolved
    outcomeTrackerService.recordOutcome({
      anonymizedPatientId: 'anon-A',
      outcomeType: 'ADVERSE_EVENT',
      linkedOverrideIds: ['override-1'],
      recordedBy: 'test',
    });
    outcomeTrackerService.recordOutcome({
      anonymizedPatientId: 'anon-B',
      outcomeType: 'READMISSION',
      recordedBy: 'test',
    });
    outcomeTrackerService.recordOutcome({
      anonymizedPatientId: 'anon-C',
      outcomeType: 'RESOLVED',
      recordedBy: 'test',
    });

    const stats = outcomeTrackerService.getOverrideOutcomeCorrelation();
    expect(stats.totalOutcomes).toBe(3);
    expect(stats.adverseEventRate).toBeCloseTo(1 / 3, 2);
    expect(stats.readmissionRate).toBeCloseTo(1 / 3, 2);
    expect(stats.resolvedRate).toBeCloseTo(1 / 3, 2);
    expect(stats.overridesWithAdverseOutcome).toBe(1); // anon-A had override + adverse
  });

  it('OUT-006: correlationConfidence scales with sample size', () => {
    // Add 30 outcomes to hit max confidence
    for (let i = 0; i < 30; i++) {
      outcomeTrackerService.recordOutcome({
        anonymizedPatientId: `anon-${i}`,
        outcomeType: 'RESOLVED',
        recordedBy: 'test',
      });
    }

    const stats = outcomeTrackerService.getOverrideOutcomeCorrelation();
    expect(stats.correlationConfidence).toBe(1);
  });

  it('OUT-007: clearStore empties everything', () => {
    outcomeTrackerService.recordOutcome({
      anonymizedPatientId: 'anon-A',
      outcomeType: 'RESOLVED',
      recordedBy: 'test',
    });
    expect(outcomeTrackerService.getAllOutcomes()).toHaveLength(1);

    outcomeTrackerService.clearStore();
    expect(outcomeTrackerService.getAllOutcomes()).toHaveLength(0);
  });
});
