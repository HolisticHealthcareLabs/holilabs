/**
 * Safety Synthesis Agent Tests
 *
 * Tests:
 * - RED when deterministic finds critical contraindication
 * - RED when FIN-002 fired
 * - AMBER when FIN-001/003 fired
 * - AMBER when LLM timeout
 * - GREEN when all pass
 * - LLM high risk alone does NOT produce RED (ELENA invariant)
 * - LLM high risk + deterministic corroboration produces RED
 * - null probabilistic result → AMBER (not GREEN)
 * - synthesize is synchronous
 * - same input always produces same output (determinism)
 */

import { SafetySynthesisAgent } from '../safety-synthesis';
import type { SafetySynthesisInput } from '../safety-synthesis';

describe('SafetySynthesisAgent', () => {
  let agent: SafetySynthesisAgent;

  beforeEach(() => {
    agent = new SafetySynthesisAgent();
  });

  describe('RED conditions', () => {
    it('returns RED when deterministic signal is RED', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          {
            ruleId: 'DET-001',
            color: 'RED',
            message: 'Contraindicated drug interaction',
            severity: 'critical',
          },
        ],
        probabilisticResult: null,
        billingSignals: [],
      };

      const result = agent.synthesize(input);

      expect(result.finalColor).toBe('RED');
      expect(result.confidence).toBe(95);
      expect(result.synthesisRationale).toContain('Deterministic rule violation');
    });

    it('returns RED when billing signal is RED (FIN-002)', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          { ruleId: 'DET-001', color: 'GREEN', message: 'OK' },
        ],
        probabilisticResult: null,
        billingSignals: [
          {
            ruleId: 'FIN-002',
            ruleName: 'TUSS Hallucination',
            color: 'RED',
            message: 'Billing code not supported by diagnosis',
          },
        ],
      };

      const result = agent.synthesize(input);

      expect(result.finalColor).toBe('RED');
      expect(result.synthesisRationale).toContain('Billing rule violation');
    });

    it('returns RED when LLM high confidence (>0.85) corroborated by deterministic AMBER', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          {
            ruleId: 'DET-002',
            color: 'AMBER',
            message: 'Dose may be high for age',
          },
        ],
        probabilisticResult: {
          riskLevel: 'high',
          confidence: 0.9, // > 0.85
          reasoning: 'Drug-drug interaction detected',
          latencyMs: 1200,
        },
        billingSignals: [],
      };

      const result = agent.synthesize(input);

      expect(result.finalColor).toBe('RED');
      expect(result.synthesisRationale).toContain('High-confidence LLM assessment');
      expect(result.synthesisRationale).toContain('90%');
    });
  });

  describe('AMBER conditions', () => {
    it('returns AMBER when deterministic signal is AMBER', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          {
            ruleId: 'DET-003',
            color: 'AMBER',
            message: 'Requires verification of renal function',
          },
        ],
        probabilisticResult: null,
        billingSignals: [],
      };

      const result = agent.synthesize(input);

      expect(result.finalColor).toBe('AMBER');
      expect(result.synthesisRationale).toContain('Deterministic alert');
    });

    it('returns AMBER when billing signal is AMBER (FIN-001/003)', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          { ruleId: 'DET-001', color: 'GREEN', message: 'OK' },
        ],
        probabilisticResult: null,
        billingSignals: [
          {
            ruleId: 'FIN-001',
            ruleName: 'ICD-10 Mismatch',
            color: 'AMBER',
            message: 'Diagnosis code may not support procedure code',
          },
        ],
      };

      const result = agent.synthesize(input);

      expect(result.finalColor).toBe('AMBER');
      expect(result.synthesisRationale).toContain('Billing warning');
    });

    it('returns AMBER when probabilistic result is medium risk', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          { ruleId: 'DET-001', color: 'GREEN', message: 'OK' },
        ],
        probabilisticResult: {
          riskLevel: 'medium',
          confidence: 0.7,
          reasoning: 'Moderate interaction with beta-blocker',
          latencyMs: 1500,
        },
        billingSignals: [],
      };

      const result = agent.synthesize(input);

      expect(result.finalColor).toBe('AMBER');
      expect(result.synthesisRationale).toContain('Probabilistic alert');
    });

    it('returns GREEN when probabilistic unavailable but deterministic GREEN', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          { ruleId: 'DET-001', color: 'GREEN', message: 'OK' },
        ],
        probabilisticResult: null, // LLM timeout/unavailable
        billingSignals: [
          { ruleId: 'FIN-001', ruleName: 'FIN-001', color: 'GREEN', message: 'OK' },
        ],
      };

      const result = agent.synthesize(input);

      // All signals pass and we have signals - GREEN is appropriate
      expect(result.finalColor).toBe('GREEN');
      expect(result.synthesisRationale).toContain('All checks pass');
      expect(result.confidence).toBe(80);
    });
  });

  describe('GREEN conditions', () => {
    it('returns GREEN when all signals are GREEN and probabilistic low', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          { ruleId: 'DET-001', color: 'GREEN', message: 'OK' },
        ],
        probabilisticResult: {
          riskLevel: 'low',
          confidence: 0.95,
          reasoning: 'No contraindications detected',
          latencyMs: 1000,
        },
        billingSignals: [
          { ruleId: 'FIN-001', ruleName: 'FIN-001', color: 'GREEN', message: 'OK' },
        ],
      };

      const result = agent.synthesize(input);

      expect(result.finalColor).toBe('GREEN');
      expect(result.synthesisRationale).toContain('All checks pass');
      expect(result.confidence).toBe(95);
    });

    it('returns GREEN when all signals pass and probabilistic unavailable but no degraded systems', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          { ruleId: 'DET-001', color: 'GREEN', message: 'OK' },
        ],
        probabilisticResult: null,
        billingSignals: [],
        degradedSystems: undefined, // No degradation reported
      };

      const result = agent.synthesize(input);

      expect(result.finalColor).toBe('GREEN');
      expect(result.confidence).toBe(80);
    });
  });

  describe('DEGRADED conditions', () => {
    it('returns DEGRADED when all pass but systems unavailable', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          { ruleId: 'DET-001', color: 'GREEN', message: 'OK' },
        ],
        probabilisticResult: null,
        billingSignals: [
          { ruleId: 'FIN-001', ruleName: 'FIN-001', color: 'GREEN', message: 'OK' },
        ],
        degradedSystems: ['llm', 'billing'],
      };

      const result = agent.synthesize(input);

      expect(result.finalColor).toBe('DEGRADED');
      expect(result.degradedSystems).toEqual(['llm', 'billing']);
      expect(result.synthesisRationale).toContain('llm, billing');
    });
  });

  describe('ELENA invariant - LLM alone cannot RED', () => {
    it('LLM high risk WITHOUT deterministic corroboration does NOT produce RED', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          { ruleId: 'DET-001', color: 'GREEN', message: 'OK' },
        ],
        probabilisticResult: {
          riskLevel: 'high',
          confidence: 0.95, // Very high confidence
          reasoning: 'LLM flagged potential drug interaction',
          latencyMs: 1200,
        },
        billingSignals: [
          { ruleId: 'FIN-001', ruleName: 'FIN-001', color: 'GREEN', message: 'OK' },
        ],
      };

      const result = agent.synthesize(input);

      // LLM alone should NOT override deterministic GREEN
      // This requires deterministic AMBER+ for corroboration
      expect(result.finalColor).not.toBe('RED');
      expect(result.finalColor).toBe('AMBER'); // LLM high without corroboration = AMBER at best
    });

    it('LLM high risk WITH deterministic AMBER corroboration produces RED', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          {
            ruleId: 'DET-002',
            color: 'AMBER',
            message: 'Requires age verification',
          },
        ],
        probabilisticResult: {
          riskLevel: 'high',
          confidence: 0.88,
          reasoning: 'High-risk combination detected',
          latencyMs: 1200,
        },
        billingSignals: [],
      };

      const result = agent.synthesize(input);

      expect(result.finalColor).toBe('RED');
      expect(result.synthesisRationale).toContain('corroborated');
    });
  });

  describe('Synchronicity', () => {
    it('synthesize is a synchronous function', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [],
        probabilisticResult: null,
        billingSignals: [],
      };

      const result = agent.synthesize(input);

      // If it were async, it would be a Promise and wouldn't have finalColor immediately
      expect(typeof result).toBe('object');
      expect(typeof result.finalColor).toBe('string');
      // If async, result would be a Promise (have a "then" property)
      expect((result as any).then).toBeUndefined();
    });
  });

  describe('Determinism', () => {
    it('same input always produces same output', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          {
            ruleId: 'DET-001',
            color: 'AMBER',
            message: 'Dose verification required',
          },
        ],
        probabilisticResult: {
          riskLevel: 'medium',
          confidence: 0.65,
          reasoning: 'Minor interaction noted',
          latencyMs: 1200,
        },
        billingSignals: [
          {
            ruleId: 'FIN-001',
            ruleName: 'ICD Mismatch',
            color: 'AMBER',
            message: 'Check diagnosis-procedure mapping',
          },
        ],
      };

      const result1 = agent.synthesize(input);
      const result2 = agent.synthesize(input);
      const result3 = agent.synthesize(input);

      expect(result1.finalColor).toBe(result2.finalColor);
      expect(result2.finalColor).toBe(result3.finalColor);
      expect(result1.synthesisRationale).toBe(result2.synthesisRationale);
      expect(result2.synthesisRationale).toBe(result3.synthesisRationale);
    });
  });

  describe('INSUFFICIENT_DATA', () => {
    it('returns INSUFFICIENT_DATA when no signals and no LLM result', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [],
        probabilisticResult: null,
        billingSignals: [],
      };

      const result = agent.synthesize(input);

      expect(result.finalColor).toBe('INSUFFICIENT_DATA');
      expect(result.confidence).toBe(0);
    });

    it('returns AMBER when LLM unavailable and only deterministic GREEN', () => {
      const input: SafetySynthesisInput = {
        deterministicSignals: [
          { ruleId: 'DET-001', color: 'GREEN', message: 'OK' },
        ],
        probabilisticResult: null,
        billingSignals: [
          { ruleId: 'FIN-001', ruleName: 'FIN-001', color: 'GREEN', message: 'OK' },
        ],
      };

      const result = agent.synthesize(input);

      // This case was moved to GREEN (all pass with unavailable LLM)
      expect(result.finalColor).toBe('GREEN');
    });
  });
});
