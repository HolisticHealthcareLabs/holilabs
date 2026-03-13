/**
 * Tests for POST /api/demo/evaluate
 *
 * - POST evaluates a valid demo scenario and returns CDS alerts
 * - POST returns 400 for an unknown scenarioId
 * - POST returns 400 when scenarioId is missing
 * - POST merges DOAC evaluator alerts for the doac-safety scenario
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/api/middleware', () => ({
  createPublicRoute: (handler: any) => handler,
}));

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/cds/engines/cds-engine', () => ({
  CDSEngine: {
    getInstance: jest.fn(() => ({
      evaluate: jest.fn().mockResolvedValue({
        alerts: [
          {
            id: 'alert-1',
            ruleId: 'rule-drug-interaction',
            summary: 'Drug interaction detected',
            detail: 'Metformin + Ibuprofen interaction',
            severity: 'warning',
            category: 'drug_interaction',
            indicator: 'warning',
            source: { label: 'CDS Engine' },
            timestamp: new Date().toISOString(),
          },
        ],
        rulesFired: 1,
        rulesEvaluated: 5,
        processingTimeMs: 20,
      }),
    })),
  },
}));

jest.mock('@/lib/clinical/safety/doac-evaluator', () => ({
  evaluateDOACRule: jest.fn(() => ({
    ruleId: 'doac-renal-v1',
    severity: 'ATTESTATION_REQUIRED',
    rationale: 'Missing creatinine clearance',
    detailedRationale: 'eGFR or CrCl required before prescribing DOAC',
    citationUrl: 'https://www.escardio.org',
  })),
}));

jest.mock('@/lib/demo/demo-scenarios', () => ({
  SCENARIO_IDS: ['drug-interaction', 'doac-safety', 'normal-patient'],
  DEMO_SCENARIOS: {
    'drug-interaction': {
      id: 'drug-interaction',
      name: 'Drug Interaction Demo',
      trafficLight: 'RED',
      context: {
        context: { vitalSigns: {}, demographics: { age: 65 } },
      },
    },
    'doac-safety': {
      id: 'doac-safety',
      name: 'DOAC Safety Demo',
      trafficLight: 'RED',
      context: {
        context: { vitalSigns: { weight: 75 }, demographics: { age: 72 } },
      },
    },
    'normal-patient': {
      id: 'normal-patient',
      name: 'Normal Patient Demo',
      trafficLight: 'GREEN',
      context: {
        context: { vitalSigns: {}, demographics: { age: 35 } },
      },
    },
  },
}));

const { POST } = require('../route');

describe('POST /api/demo/evaluate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('evaluates a valid demo scenario and returns CDS alerts', async () => {
    const request = new NextRequest('http://localhost:3000/api/demo/evaluate', {
      method: 'POST',
      body: JSON.stringify({ scenarioId: 'drug-interaction' }),
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.alerts).toBeInstanceOf(Array);
    expect(data.scenario.id).toBe('drug-interaction');
    expect(data.scenario.trafficLight).toBe('RED');
  });

  it('returns 400 for an unknown scenarioId', async () => {
    const request = new NextRequest('http://localhost:3000/api/demo/evaluate', {
      method: 'POST',
      body: JSON.stringify({ scenarioId: 'unknown-scenario-xyz' }),
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.2' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unknown scenario');
  });

  it('returns 400 when scenarioId is missing from request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/demo/evaluate', {
      method: 'POST',
      body: JSON.stringify({ other: 'field' }),
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.3' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('scenarioId');
  });

  it('merges DOAC evaluator alert for the doac-safety scenario', async () => {
    const request = new NextRequest('http://localhost:3000/api/demo/evaluate', {
      method: 'POST',
      body: JSON.stringify({ scenarioId: 'doac-safety' }),
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.4' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    const doacAlert = data.data.alerts.find((a: any) => a.ruleId === 'doac-renal-v1');
    expect(doacAlert).toBeDefined();
    expect(doacAlert.severity).toBe('critical');
  });
});
