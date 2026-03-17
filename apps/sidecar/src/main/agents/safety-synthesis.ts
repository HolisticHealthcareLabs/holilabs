/**
 * Safety Synthesis Agent
 *
 * Pure synchronous function that synthesizes clinical signals into a 5-state
 * traffic light color (RED, AMBER, GREEN, INSUFFICIENT_DATA, DEGRADED).
 *
 * No async, no I/O, no LLM calls — deterministic output.
 *
 * @module sidecar/agents/safety-synthesis
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TrafficLightColor = 'RED' | 'AMBER' | 'GREEN' | 'INSUFFICIENT_DATA' | 'DEGRADED';

export interface DeterministicSignal {
  ruleId: string;
  color: 'RED' | 'AMBER' | 'GREEN';
  message: string;
  severity?: 'critical' | 'major' | 'minor';
}

export interface ProbabilisticResult {
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  reasoning: string;
  latencyMs: number;
}

export interface BillingSignal {
  ruleId: string;
  ruleName: string;
  color: 'RED' | 'AMBER' | 'GREEN';
  message: string;
  glosaAmount?: number;
}

export interface SafetySynthesisInput {
  // Deterministic signals (e.g., from DeterministicValidator)
  deterministicSignals: DeterministicSignal[];

  // Probabilistic result (e.g., from ProbabilisticValidator)
  probabilisticResult: ProbabilisticResult | null;

  // Billing signals (e.g., from BillingAgent)
  billingSignals: BillingSignal[];

  // Availability state
  degradedSystems?: string[]; // e.g., ['llm', 'billing']
}

export interface SafetySynthesisOutput {
  finalColor: TrafficLightColor;
  signals: Array<DeterministicSignal | BillingSignal | { ruleId: string; color: string; message: string; source: string }>;
  confidence: number; // 0-100
  synthesisRationale: string;
  degradedSystems?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFETY SYNTHESIS AGENT CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class SafetySynthesisAgent {
  /**
   * Synthesize clinical signals into 5-state traffic light.
   *
   * Pure synchronous function — same input always produces same output.
   * No async, no I/O, no LLM calls.
   *
   * Logic:
   * 1. RED if:
   *    - Any deterministic RED, OR
   *    - Any billing RED (FIN-002), OR
   *    - (Probabilistic high confidence > 0.85 AND corroborated by deterministic AMBER+)
   *
   * 2. AMBER if:
   *    - Any deterministic AMBER, OR
   *    - Any billing AMBER (FIN-001/003), OR
   *    - Probabilistic timeout/unavailable (null result) with deterministic GREEN, OR
   *    - Probabilistic AMBER risk
   *
   * 3. GREEN if:
   *    - All deterministic GREEN, AND
   *    - No billing RED/AMBER, AND
   *    - (Probabilistic available and low risk, OR unavailable but no degraded systems)
   *
   * 4. INSUFFICIENT_DATA if:
   *    - Missing critical context (no deterministic signals, no patient data)
   *
   * 5. DEGRADED if:
   *    - Deterministic GREEN + Probabilistic or billing unavailable (degradedSystems listed)
   */
  synthesize(input: SafetySynthesisInput): SafetySynthesisOutput {
    const allSignals = [...input.deterministicSignals, ...input.billingSignals];

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Check for RED conditions (highest priority veto)
    // ─────────────────────────────────────────────────────────────────────────

    // RED: Any deterministic RED
    const deterministicRED = input.deterministicSignals.find(s => s.color === 'RED');
    if (deterministicRED) {
      return {
        finalColor: 'RED',
        signals: allSignals,
        confidence: 95,
        synthesisRationale: `Deterministic rule violation: ${deterministicRED.message}`,
      };
    }

    // RED: Any billing RED (FIN-002 hallucination)
    const billingRED = input.billingSignals.find(s => s.color === 'RED');
    if (billingRED) {
      return {
        finalColor: 'RED',
        signals: allSignals,
        confidence: 90,
        synthesisRationale: `Billing rule violation: ${billingRED.message}`,
      };
    }

    // RED: Probabilistic high confidence (>0.85) corroborated by deterministic warnings
    if (
      input.probabilisticResult &&
      input.probabilisticResult.riskLevel === 'high' &&
      input.probabilisticResult.confidence > 0.85 &&
      input.deterministicSignals.some(s => s.color === 'AMBER' || s.color === 'RED')
    ) {
      return {
        finalColor: 'RED',
        signals: allSignals,
        confidence: Math.floor(input.probabilisticResult.confidence * 100),
        synthesisRationale: `High-confidence LLM assessment (${input.probabilisticResult.confidence * 100}%) corroborated by clinical rules: ${input.probabilisticResult.reasoning}`,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Check for AMBER conditions
    // ─────────────────────────────────────────────────────────────────────────

    // AMBER: Any deterministic AMBER
    const deterministicAMBER = input.deterministicSignals.find(s => s.color === 'AMBER');
    if (deterministicAMBER) {
      return {
        finalColor: 'AMBER',
        signals: allSignals,
        confidence: 85,
        synthesisRationale: `Deterministic alert: ${deterministicAMBER.message}`,
      };
    }

    // AMBER: Any billing AMBER (FIN-001/003)
    const billingAMBER = input.billingSignals.find(s => s.color === 'AMBER');
    if (billingAMBER) {
      return {
        finalColor: 'AMBER',
        signals: allSignals,
        confidence: 80,
        synthesisRationale: `Billing warning: ${billingAMBER.message}`,
      };
    }

    // AMBER: Probabilistic available but AMBER risk
    if (
      input.probabilisticResult &&
      input.probabilisticResult.riskLevel === 'medium'
    ) {
      return {
        finalColor: 'AMBER',
        signals: allSignals,
        confidence: Math.floor(input.probabilisticResult.confidence * 100),
        synthesisRationale: `Probabilistic alert: ${input.probabilisticResult.reasoning}`,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Check for DEGRADED (all pass but systems down)
    // ─────────────────────────────────────────────────────────────────────────

    if (
      input.deterministicSignals.every(s => s.color === 'GREEN') &&
      input.billingSignals.every(s => s.color === 'GREEN') &&
      input.degradedSystems &&
      input.degradedSystems.length > 0
    ) {
      return {
        finalColor: 'DEGRADED',
        signals: allSignals,
        confidence: 75,
        synthesisRationale: `Deterministic checks pass. Degraded systems: ${input.degradedSystems.join(', ')}`,
        degradedSystems: input.degradedSystems,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Check for GREEN (all pass, and we have at least some signals)
    // ─────────────────────────────────────────────────────────────────────────

    if (
      (input.deterministicSignals.length > 0 || input.billingSignals.length > 0) &&
      input.deterministicSignals.every(s => s.color === 'GREEN') &&
      input.billingSignals.every(s => s.color === 'GREEN') &&
      (input.probabilisticResult === null ||
        input.probabilisticResult.riskLevel === 'low')
    ) {
      const llmStatus = input.probabilisticResult
        ? `LLM confirmed low risk (${input.probabilisticResult.confidence * 100}%)`
        : 'LLM unavailable; deterministic rules pass';

      return {
        finalColor: 'GREEN',
        signals: allSignals,
        confidence: input.probabilisticResult
          ? Math.floor(input.probabilisticResult.confidence * 100)
          : 80,
        synthesisRationale: `All checks pass. ${llmStatus}`,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Fallback: AMBER if probabilistic high without corroboration but deterministic GREEN
    // ─────────────────────────────────────────────────────────────────────────

    if (
      input.probabilisticResult &&
      input.probabilisticResult.riskLevel === 'high' &&
      input.deterministicSignals.every(s => s.color === 'GREEN') &&
      input.billingSignals.every(s => s.color === 'GREEN')
    ) {
      return {
        finalColor: 'AMBER',
        signals: allSignals,
        confidence: Math.floor(input.probabilisticResult.confidence * 100),
        synthesisRationale: `LLM high-risk assessment (${input.probabilisticResult.confidence * 100}%) but not corroborated by deterministic rules. Requires review.`,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Default: INSUFFICIENT_DATA
    // ─────────────────────────────────────────────────────────────────────────

    return {
      finalColor: 'INSUFFICIENT_DATA',
      signals: allSignals,
      confidence: 0,
      synthesisRationale: 'Unable to determine safety status from available signals. Check required context.',
    };
  }
}
