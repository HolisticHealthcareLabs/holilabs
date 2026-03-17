/**
 * Pipeline Orchestrator
 *
 * Coordinates clinical evaluation pipeline:
 * 1. Stage 1 (serial): ContextAgent.gather()
 * 2. Stage 2 (parallel): DeterministicValidator + ProbabilisticValidator + BillingAgent
 * 3. Stage 3 (sync): SafetySynthesisAgent.synthesize()
 * 4. Stage 4 (async, non-blocking): RLHF capture
 *
 * @module sidecar/agents/pipeline-orchestrator
 */

import { ContextAgent, type ContextAgentInput, type ContextAgentOutput } from './context-agent';
import { SafetySynthesisAgent, type SafetySynthesisInput, type SafetySynthesisOutput } from './safety-synthesis';
import { BillingAgent, type BillingAgentInput, type BillingAgentOutput } from './billing-agent';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PipelineInput {
  patientId: string;
  encounterId?: string;
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
  edgeNodeUrl?: string;
  sessionId?: string;
  rlhfEnabled?: boolean;
}

export interface StageLatencies {
  stage1Context: number;
  stage2Deterministic?: number;
  stage2Probabilistic?: number;
  stage2Billing: number;
  stage3Synthesis: number;
  stage4RLHF?: number;
}

export interface PipelineOutput {
  context: ContextAgentOutput;
  safety: SafetySynthesisOutput;
  billing: BillingAgentOutput;
  rlhfId?: string;
  pipelineLatencyMs: number;
  stageLatencies: StageLatencies;
  success: boolean;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK TYPES FOR DETERMINISTIC/PROBABILISTIC (will be replaced by real instances)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DeterministicValidatorMock {
  validate(medications: any[], diagnosis?: any): { signals: Array<{ ruleId: string; color: 'RED' | 'AMBER' | 'GREEN'; message: string }> };
}

export interface ProbabilisticValidatorMock {
  assess(context: any): Promise<{ riskLevel: 'low' | 'medium' | 'high'; confidence: number; reasoning: string; latencyMs: number } | null>;
}

export interface RLHFCollectorMock {
  recordFeedback(feedback: any): string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE ORCHESTRATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class PipelineOrchestrator {
  private contextAgent: ContextAgent;
  private synthesisAgent: SafetySynthesisAgent;
  private billingAgent: BillingAgent;
  private deterministicValidator?: DeterministicValidatorMock;
  private probabilisticValidator?: ProbabilisticValidatorMock;
  private rlhfCollector?: RLHFCollectorMock;

  constructor(options?: {
    contextAgent?: ContextAgent;
    synthesisAgent?: SafetySynthesisAgent;
    billingAgent?: BillingAgent;
    deterministicValidator?: DeterministicValidatorMock;
    probabilisticValidator?: ProbabilisticValidatorMock;
    rlhfCollector?: RLHFCollectorMock;
  }) {
    this.contextAgent = options?.contextAgent || new ContextAgent();
    this.synthesisAgent = options?.synthesisAgent || new SafetySynthesisAgent();
    this.billingAgent = options?.billingAgent || new BillingAgent();
    this.deterministicValidator = options?.deterministicValidator;
    this.probabilisticValidator = options?.probabilisticValidator;
    this.rlhfCollector = options?.rlhfCollector;
  }

  /**
   * Execute full clinical evaluation pipeline
   */
  async execute(input: PipelineInput): Promise<PipelineOutput> {
    const pipelineStart = Date.now();
    const stageLatencies: StageLatencies = {} as any;

    try {
      // ───────────────────────────────────────────────────────────────────────
      // STAGE 1 (Serial): Gather patient context
      // ───────────────────────────────────────────────────────────────────────

      const stage1Start = Date.now();
      const contextOutput = await this.contextAgent.gather({
        patientId: input.patientId,
        encounterId: input.encounterId,
        edgeNodeUrl: input.edgeNodeUrl,
        sessionId: input.sessionId,
      });
      stageLatencies.stage1Context = Date.now() - stage1Start;

      // ───────────────────────────────────────────────────────────────────────
      // STAGE 2 (Parallel): Deterministic, Probabilistic, Billing evaluation
      // ───────────────────────────────────────────────────────────────────────

      const stage2Start = Date.now();

      const [
        deterministicResult,
        probabilisticResult,
        billingOutput,
      ] = await Promise.all([
        this.runDeterministicValidator(input),
        this.runProbabilisticValidator(input, contextOutput),
        this.runBillingAgent(input),
      ]);

      stageLatencies.stage2Deterministic = deterministicResult?.latencyMs;
      stageLatencies.stage2Probabilistic = probabilisticResult?.latencyMs;
      stageLatencies.stage2Billing = billingOutput.latencyMs;

      // ───────────────────────────────────────────────────────────────────────
      // STAGE 3 (Sync): Synthesize to final color
      // ───────────────────────────────────────────────────────────────────────

      const stage3Start = Date.now();

      const synthesisInput: SafetySynthesisInput = {
        deterministicSignals: deterministicResult?.signals || [],
        probabilisticResult: probabilisticResult || null,
        billingSignals: billingOutput.alerts.map(a => ({
          ruleId: a.ruleId,
          ruleName: a.ruleName,
          color: a.color,
          message: a.message,
          glosaAmount: a.glosaAmount,
        })),
        degradedSystems: this.identifyDegradedSystems(
          probabilisticResult,
          billingOutput
        ),
      };

      const safetyOutput = this.synthesisAgent.synthesize(synthesisInput);
      stageLatencies.stage3Synthesis = Date.now() - stage3Start;

      // ───────────────────────────────────────────────────────────────────────
      // STAGE 4 (Async, non-blocking): RLHF capture
      // ───────────────────────────────────────────────────────────────────────

      let rlhfId: string | undefined;
      const stage4Start = Date.now();

      if (input.rlhfEnabled && this.rlhfCollector) {
        try {
          rlhfId = await this.captureRLHFNonBlocking(
            input,
            contextOutput,
            safetyOutput,
            probabilisticResult
          );
        } catch (error) {
          // RLHF failure must not block pipeline return
          console.warn('[PipelineOrchestrator] RLHF capture failed (non-blocking):', error);
        }
      }

      stageLatencies.stage4RLHF = Date.now() - stage4Start;

      return {
        context: contextOutput,
        safety: safetyOutput,
        billing: billingOutput,
        rlhfId,
        pipelineLatencyMs: Date.now() - pipelineStart,
        stageLatencies,
        success: true,
      };
    } catch (error) {
      console.error('[PipelineOrchestrator] execute() failed:', error);
      return {
        context: {
          mergedState: { patientId: input.patientId },
          extractedFields: {},
          reconciliationAlerts: [],
          latencyMs: Date.now() - pipelineStart,
          sourceCount: 0,
        },
        safety: {
          finalColor: 'INSUFFICIENT_DATA',
          signals: [],
          confidence: 0,
          synthesisRationale: 'Pipeline execution failed',
        },
        billing: {
          glosaRisk: { probability: 0 },
          rulesFired: [],
          alerts: [],
          latencyMs: 0,
        },
        pipelineLatencyMs: Date.now() - pipelineStart,
        stageLatencies,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private async runDeterministicValidator(input: PipelineInput): Promise<{
    signals: Array<{ ruleId: string; color: 'RED' | 'AMBER' | 'GREEN'; message: string }>;
    latencyMs: number;
  } | null> {
    if (!this.deterministicValidator) {
      return null;
    }

    try {
      const start = Date.now();
      const result = this.deterministicValidator.validate(
        input.medications,
        input.diagnosis
      );
      return {
        signals: result.signals || [],
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      console.warn('[PipelineOrchestrator] Deterministic validation failed:', error);
      return null;
    }
  }

  private async runProbabilisticValidator(
    input: PipelineInput,
    context: ContextAgentOutput
  ): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;
    reasoning: string;
    latencyMs: number;
  } | null> {
    if (!this.probabilisticValidator) {
      return null;
    }

    try {
      const start = Date.now();
      const clinicalContext = {
        medication: input.medications[0],
        icd10Codes: input.diagnosis?.icd10Code ? [input.diagnosis.icd10Code] : [],
        diagnosis: input.diagnosis?.description,
        patientAge: context.mergedState.demographics?.age,
        patientWeight: context.mergedState.demographics?.weight,
        allergies: context.mergedState.knownAllergies,
        currentMedications: context.mergedState.currentMedications?.map(m => m.name),
      };

      const result = await this.probabilisticValidator.assess(clinicalContext);
      if (!result) {
        return null;
      }

      return {
        ...result,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      console.warn('[PipelineOrchestrator] Probabilistic validation failed:', error);
      return null;
    }
  }

  private async runBillingAgent(input: PipelineInput): Promise<BillingAgentOutput> {
    try {
      return await this.billingAgent.evaluate({
        patientId: input.patientId,
        medications: input.medications,
        diagnosis: input.diagnosis,
        edgeNodeUrl: input.edgeNodeUrl,
        sessionId: input.sessionId,
      });
    } catch (error) {
      console.warn('[PipelineOrchestrator] Billing evaluation failed:', error);
      return {
        glosaRisk: { probability: 0 },
        rulesFired: [],
        alerts: [],
        latencyMs: 0,
      };
    }
  }

  private identifyDegradedSystems(
    probabilisticResult: any,
    billingOutput: BillingAgentOutput
  ): string[] {
    const degraded: string[] = [];

    // LLM unavailable if probabilistic result is null
    if (probabilisticResult === null) {
      degraded.push('llm');
    }

    // Billing unavailable if latency is too high or errors occurred
    if (billingOutput.latencyMs > 5000) {
      degraded.push('billing');
    }

    return degraded;
  }

  private async captureRLHFNonBlocking(
    input: PipelineInput,
    context: ContextAgentOutput,
    safety: SafetySynthesisOutput,
    probabilisticResult: any
  ): Promise<string> {
    if (!this.rlhfCollector) {
      return '';
    }

    const feedback = {
      patient: {
        ageRange: 'adult',
        weightRange: 'normal',
      },
      medication: {
        genericName: input.medications[0]?.name || 'unknown',
        drugClass: 'general',
      },
      encounter: {
        encounterType: 'outpatient',
      },
      llmRiskLevel: probabilisticResult?.riskLevel || 'low',
      llmConfidence: (probabilisticResult?.confidence || 0) * 100,
      llmReasoning: probabilisticResult?.reasoning || 'Not assessed',
      llmLatencyMs: probabilisticResult?.latencyMs || 0,
      doctorAction: 'confirmed' as const,
    };

    return this.rlhfCollector.recordFeedback(feedback);
  }
}
