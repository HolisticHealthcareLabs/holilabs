/**
 * Billing Agent
 *
 * Evaluates prescription for billing compliance issues via EdgeNodeClient.
 * Calls POST /api/prescriptions/safety-check on the web server.
 *
 * @module sidecar/agents/billing-agent
 */


// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BillingAgentInput {
  patientId: string;
  medications: Array<{
    name: string;
    dose?: string;
    frequency?: string;
    rxNormCode?: string;
  }>;
  diagnosis?: {
    icd10Code: string;
    description?: string;
  };
  procedureCode?: string;
  edgeNodeUrl?: string;
  sessionId?: string;
}

export interface BillingRule {
  ruleId: string;
  ruleName: string;
  severity: 'critical' | 'major' | 'minor';
  fired: boolean;
  message?: string;
}

export interface BillingAgentOutput {
  glosaRisk: {
    probability: number; // 0-1
    estimatedAmount?: number;
    currency?: string;
  };
  rulesFired: BillingRule[];
  alerts: Array<{
    ruleId: string;
    ruleName: string;
    color: 'RED' | 'AMBER' | 'GREEN';
    message: string;
    glosaAmount?: number;
  }>;
  tussValidation?: {
    isValid: boolean;
    format?: string;
    message?: string;
  };
  latencyMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BILLING AGENT CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class BillingAgent {
  private edgeNodeUrl: string;
  private sessionId: string;

  constructor(edgeNodeUrl = 'http://localhost:3001', sessionId = '') {
    this.edgeNodeUrl = edgeNodeUrl;
    this.sessionId = sessionId || `bil-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Evaluate prescription for billing compliance
   */
  async evaluate(input: BillingAgentInput): Promise<BillingAgentOutput> {
    const startTime = Date.now();
    const edgeNodeUrl = input.edgeNodeUrl || this.edgeNodeUrl;

    try {
      const response = await fetch(`${edgeNodeUrl}/api/prescriptions/safety-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': this.sessionId,
        },
        body: JSON.stringify({
          patientId: input.patientId,
          medications: input.medications,
          context: {
            diagnosis: input.diagnosis,
            procedureCode: input.procedureCode,
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.warn('[BillingAgent] evaluate returned non-OK status:', response.status);
        // Return default (no billing alerts on error)
        return this.createDefaultOutput(Date.now() - startTime);
      }

      const data = (await response.json()) as any;

      // Map safety-check response to billing signals
      const alerts = this.mapResponseToAlerts(data);
      const rulesFired = this.extractRulesFired(data);
      const glosaRisk = this.calculateGlosaRisk(data, alerts);

      return {
        glosaRisk,
        rulesFired,
        alerts,
        tussValidation: {
          isValid: !alerts.some(a => a.ruleId === 'FIN-002'),
          format: 'TUSS-1.01.01.01',
        },
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      console.warn('[BillingAgent] evaluate failed:', error);
      return this.createDefaultOutput(Date.now() - startTime);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private mapResponseToAlerts(
    data: any
  ): Array<{
    ruleId: string;
    ruleName: string;
    color: 'RED' | 'AMBER' | 'GREEN';
    message: string;
    glosaAmount?: number;
  }> {
    const alerts: Array<{
      ruleId: string;
      ruleName: string;
      color: 'RED' | 'AMBER' | 'GREEN';
      message: string;
      glosaAmount?: number;
    }> = [];

    // data.signal contains TrafficLightSignal[] from the web API
    if (Array.isArray(data.signal)) {
      for (const signal of data.signal) {
        // Only include billing-related signals
        if (
          signal.ruleId &&
          (signal.ruleId.startsWith('FIN-') || signal.category === 'BILLING')
        ) {
          const colorMap: Record<string, 'RED' | 'AMBER' | 'GREEN'> = {
            RED: 'RED',
            YELLOW: 'AMBER',
            GREEN: 'GREEN',
          };

          alerts.push({
            ruleId: signal.ruleId,
            ruleName: signal.ruleName || signal.ruleId,
            color: colorMap[signal.color] || 'GREEN',
            message: signal.message || '',
            glosaAmount: signal.estimatedGlosaRisk?.estimatedAmount,
          });
        }
      }
    }

    return alerts;
  }

  private extractRulesFired(data: any): BillingRule[] {
    const rules: BillingRule[] = [];

    // Map detected billing alerts to rule objects
    if (Array.isArray(data.signal)) {
      for (const signal of data.signal) {
        if (
          signal.ruleId &&
          (signal.ruleId.startsWith('FIN-') || signal.category === 'BILLING')
        ) {
          const severity =
            signal.color === 'RED'
              ? 'critical'
              : signal.color === 'YELLOW'
                ? 'major'
                : 'minor';

          rules.push({
            ruleId: signal.ruleId,
            ruleName: signal.ruleName || signal.ruleId,
            severity: severity as 'critical' | 'major' | 'minor',
            fired: true,
            message: signal.message,
          });
        }
      }
    }

    return rules;
  }

  private calculateGlosaRisk(
    data: any,
    alerts: Array<{ ruleId: string; glosaAmount?: number }>
  ): { probability: number; estimatedAmount?: number; currency?: string } {
    let totalRisk = 0;
    let probability = 0;

    // Sum glosa risks from all alerts
    for (const alert of alerts) {
      if (alert.glosaAmount) {
        totalRisk += alert.glosaAmount;
      }
    }

    // Estimate probability based on number of RED billing alerts
    const redCount = alerts.filter(a => a.ruleId.startsWith('FIN-002')).length;
    probability = Math.min(1, redCount * 0.5); // FIN-002 (hallucination) = 50% glosa risk each

    // Fallback to data.totalGlosaRisk if available
    if (data.totalGlosaRisk) {
      probability = data.totalGlosaRisk.probability || probability;
      totalRisk = data.totalGlosaRisk.totalAmountAtRisk || totalRisk;
    }

    return {
      probability,
      estimatedAmount: totalRisk > 0 ? totalRisk : undefined,
      currency: 'BRL',
    };
  }

  private createDefaultOutput(latencyMs: number): BillingAgentOutput {
    return {
      glosaRisk: {
        probability: 0,
        currency: 'BRL',
      },
      rulesFired: [],
      alerts: [],
      tussValidation: {
        isValid: true,
        format: 'TUSS-1.01.01.01',
      },
      latencyMs,
    };
  }
}
