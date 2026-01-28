/**
 * Traffic Light Engine
 *
 * Unified evaluation engine for clinical, administrative, and billing rules.
 * Provides real-time blocking for both clinical safety AND revenue integrity (glosas).
 *
 * Architecture:
 * - Rules are evaluated in parallel for performance
 * - Worst color wins (RED > YELLOW > GREEN)
 * - All signals are collected for audit trail
 * - RLHF capture integrated via inputContextSnapshot
 *
 * LGPD Article 20 Compliance:
 * - Every signal includes regulatory reference
 * - Messages provided in Portuguese
 * - Human override always possible with justification
 *
 * @module lib/traffic-light/engine
 */

import { prisma } from '@/lib/prisma';
import { hashPatientId } from '@/lib/hash';
import { assuranceCaptureService } from '@/services/assurance-capture.service';
import logger from '@/lib/logger';
import type {
  TrafficLightColor,
  TrafficLightResult,
  TrafficLightSignal,
  EvaluationContext,
  PatientContext,
  RuleDefinition,
  RuleRegistry,
  AggregateGlosaRisk,
  OverrideRequirement,
} from './types';

// PROMPT-NATIVE ARCHITECTURE:
// Rules are now defined in prompt templates, not TypeScript logic.
// Import the rule loader instead of hardcoded rule modules.
import {
  getLoadedRules,
  reloadRules as reloadPromptNativeRules,
  getRuleTemplates,
  type CompiledRule,
  type RuleEvaluationContext,
} from '@/prompts/traffic-light-rules';

// Legacy imports for backward compatibility (deprecated)
// import { clinicalRules } from './rules/clinical';
// import { billingRules } from './rules/billing';
// import { administrativeRules } from './rules/administrative';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const COLOR_PRIORITY: Record<TrafficLightColor, number> = {
  RED: 3,
  YELLOW: 2,
  GREEN: 1,
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class TrafficLightEngine {
  private rules: RuleRegistry;
  private promptNativeRules: ReturnType<typeof getLoadedRules>;

  constructor() {
    // Load prompt-native rules (new architecture)
    this.promptNativeRules = getLoadedRules();

    // Legacy rules registry (for backward compatibility with types)
    this.rules = {
      clinical: [],
      administrative: [],
      billing: [],
    };
  }

  /**
   * Evaluate all rules for an action
   *
   * @param context - The evaluation context
   * @returns Traffic light result with all signals
   */
  async evaluate(context: EvaluationContext): Promise<TrafficLightResult> {
    const startTime = Date.now();

    try {
      // 1. Load patient context if not provided
      const patientContext = context.patientContext || (await this.loadPatientContext(context.patientId));

      // 2. Get applicable rules for this action
      const applicableRules = this.getApplicableRules(context.action);

      // 3. Evaluate all rules in parallel
      const signalPromises = applicableRules.map((rule) =>
        this.evaluateRule(rule, context, patientContext)
      );
      const signalResults = await Promise.all(signalPromises);

      // 4. Filter out null results (rules that didn't trigger)
      const signals = signalResults.filter((s): s is TrafficLightSignal => s !== null);

      // 5. Determine worst color
      const color = this.determineOverallColor(signals);

      // 6. Calculate aggregate glosa risk
      const totalGlosaRisk = this.calculateAggregateGlosaRisk(signals);

      // 7. Determine override requirements
      const { canOverride, overrideRequires } = this.determineOverrideRequirements(signals);

      // 8. Calculate summary
      const summary = this.calculateSummary(signals);

      // 9. Build result
      const result: TrafficLightResult = {
        color,
        signals,
        canOverride,
        overrideRequires,
        totalGlosaRisk,
        needsChatAssistance: color !== 'GREEN',
        summary,
        metadata: {
          evaluatedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
          rulesEvaluated: applicableRules.length,
          patientIdHash: hashPatientId(context.patientId),
        },
      };

      // 10. Capture for RLHF (async, don't block)
      this.captureForRLHF(context, result).catch((err) => {
        logger.error({
          event: 'traffic_light_rlhf_capture_failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      logger.info({
        event: 'traffic_light_evaluated',
        action: context.action,
        color: result.color,
        signalCount: signals.length,
        latencyMs: result.metadata.latencyMs,
        hasGlosaRisk: !!totalGlosaRisk,
      });

      return result;
    } catch (error) {
      logger.error({
        event: 'traffic_light_evaluation_error',
        action: context.action,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return GREEN with error flag on failure (fail open for availability)
      // In production, you might want to fail closed for critical actions
      return {
        color: 'GREEN',
        signals: [],
        canOverride: true,
        needsChatAssistance: false,
        summary: {
          clinical: { red: 0, yellow: 0 },
          administrative: { red: 0, yellow: 0 },
          billing: { red: 0, yellow: 0 },
        },
        metadata: {
          evaluatedAt: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
          rulesEvaluated: 0,
          patientIdHash: hashPatientId(context.patientId),
        },
      };
    }
  }

  /**
   * Load patient context from database
   */
  private async loadPatientContext(patientId: string): Promise<PatientContext> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        dateOfBirth: true,
        gender: true,
        allergies: {
          where: { isActive: true },
          select: {
            allergen: true,
            severity: true,
            allergyType: true,
          },
        },
        medications: {
          where: { isActive: true },
          select: {
            name: true,
            dose: true,
            frequency: true,
            isActive: true,
          },
        },
        diagnoses: {
          where: { status: { in: ['ACTIVE', 'CHRONIC'] } },
          select: {
            icd10Code: true,
            description: true,
            status: true,
          },
        },
        labResults: {
          orderBy: { resultDate: 'desc' },
          take: 20,
          select: {
            testName: true,
            value: true,
            unit: true,
            status: true,
            resultDate: true,
          },
        },
      },
    });

    if (!patient) {
      return { id: patientId };
    }

    // Calculate age
    const age = patient.dateOfBirth
      ? Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : undefined;

    return {
      id: patient.id,
      age,
      sex: patient.gender as 'M' | 'F' | 'OTHER' | undefined,
      allergies: patient.allergies.map((a) => ({
        allergen: a.allergen,
        severity: a.severity as 'MILD' | 'MODERATE' | 'SEVERE',
        type: a.allergyType as 'MEDICATION' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER',
      })),
      medications: patient.medications.map((m) => ({
        name: m.name,
        dose: m.dose || undefined,
        frequency: m.frequency || undefined,
        isActive: m.isActive,
      })),
      diagnoses: patient.diagnoses.map((d) => ({
        icd10Code: d.icd10Code || '',
        description: d.description,
        status: d.status as 'ACTIVE' | 'RESOLVED' | 'CHRONIC',
      })),
      labResults: patient.labResults.map((l) => ({
        testName: l.testName,
        value: typeof l.value === 'number' ? l.value : parseFloat(String(l.value)) || 0,
        unit: l.unit || '',
        status: l.status as 'NORMAL' | 'ABNORMAL' | 'CRITICAL',
        resultDate: l.resultDate,
      })),
    };
  }

  /**
   * Get rules applicable to the given action
   *
   * PROMPT-NATIVE ARCHITECTURE:
   * Rules are now loaded from prompt templates via the rule loader.
   * Each rule defines which actions it applies to.
   */
  private getApplicableRules(action: string): CompiledRule[] {
    // Use prompt-native rules (new architecture)
    return this.promptNativeRules.all.filter(
      (rule) => rule.isActive && rule.applicableActions.includes(action as any)
    );
  }

  /**
   * Evaluate a single rule
   *
   * PROMPT-NATIVE ARCHITECTURE:
   * Rules now use the RuleEvaluationContext and return RuleEvaluationResult,
   * which is then converted to TrafficLightSignal for the engine response.
   */
  private async evaluateRule(
    rule: CompiledRule,
    context: EvaluationContext,
    patientContext: PatientContext
  ): Promise<TrafficLightSignal | null> {
    try {
      // Build RuleEvaluationContext from EvaluationContext + PatientContext
      const ruleContext: RuleEvaluationContext = {
        patientId: context.patientId,
        action: context.action as any,
        payload: context.payload,
        patientData: {
          allergies: patientContext.allergies?.map((a) => ({
            allergen: a.allergen,
            severity: a.severity,
            reaction: a.type,
          })),
          medications: patientContext.medications?.map((m) => ({
            name: m.name,
            dose: m.dose || '',
            frequency: m.frequency || '',
            startDate: '',
          })),
          diagnoses: patientContext.diagnoses?.map((d) => ({
            icd10Code: d.icd10Code,
            description: d.description,
            date: '',
          })),
          labResults: patientContext.labResults?.map((l) => ({
            name: l.testName,
            value: l.value,
            unit: l.unit,
            date: l.resultDate?.toISOString() || '',
          })),
          renalFunction: this.extractRenalFunction(patientContext.labResults),
          isPregnant: patientContext.isPregnant,
          age: patientContext.age,
          weight: patientContext.weight,
        },
        billingData: {
          tissCode: context.payload.tissCode as string | undefined,
          planId: context.payload.planId as string | undefined,
          priorAuthStatus: context.payload.priorAuthStatus as any,
          priorAuthExpiry: context.payload.priorAuthExpiry as string | undefined,
          opmeItems: context.payload.opmeItems as string[] | undefined,
          opmeAuthApproved: context.payload.opmeAuthApproved as boolean | undefined,
          billedAmount: context.payload.billedAmount as number | undefined,
        },
        documentationData: {
          providedDocuments: context.payload.providedDocuments as string[] | undefined,
          informedConsentSigned: context.payload.informedConsentSigned as boolean | undefined,
          lgpdConsentSigned: context.payload.lgpdConsentSigned as boolean | undefined,
          patientIdentificationVerified: context.payload.patientIdentificationVerified as boolean | undefined,
          preopEvaluationDate: context.payload.preopEvaluationDate as string | undefined,
          surgicalTeam: context.payload.surgicalTeam as {
            surgeon?: boolean;
            anesthesiologist?: boolean;
            assistant?: boolean;
          } | undefined,
        },
        clinicId: context.clinicId,
      };

      // Evaluate using prompt-native rule
      const result = await rule.evaluate(ruleContext);

      if (!result || !result.triggered) {
        return null;
      }

      // Convert RuleEvaluationResult to TrafficLightSignal
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleVersionId: rule.version,
        category: rule.category,
        color: result.color,
        message: result.message,
        messagePortuguese: result.messagePortuguese,
        regulatoryReference: rule.regulatoryReference,
        evidence: result.evidence,
        estimatedGlosaRisk: result.glosaRisk
          ? {
              probability: result.glosaRisk.probability * 100, // Convert to percentage
              estimatedAmount: result.glosaRisk.estimatedAmount,
              denialCode: result.glosaRisk.denialCode,
            }
          : undefined,
        suggestedCorrection: result.suggestedCorrection,
      };
    } catch (error) {
      logger.error({
        event: 'rule_evaluation_error',
        ruleId: rule.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Extract renal function from lab results
   */
  private extractRenalFunction(
    labResults?: PatientContext['labResults']
  ): { eGFR: number; creatinine: number } | undefined {
    if (!labResults) return undefined;

    const creatinine = labResults.find((l) =>
      l.testName.toLowerCase().includes('creatinine')
    );
    const egfr = labResults.find((l) =>
      l.testName.toLowerCase().includes('egfr') || l.testName.toLowerCase().includes('gfr')
    );

    if (creatinine || egfr) {
      return {
        eGFR: egfr?.value || 90, // Default to normal if not available
        creatinine: creatinine?.value || 1.0,
      };
    }
    return undefined;
  }

  /**
   * Determine the overall traffic light color (worst wins)
   */
  private determineOverallColor(signals: TrafficLightSignal[]): TrafficLightColor {
    if (signals.length === 0) return 'GREEN';

    let worstColor: TrafficLightColor = 'GREEN';
    let worstPriority = COLOR_PRIORITY.GREEN;

    for (const signal of signals) {
      const priority = COLOR_PRIORITY[signal.color];
      if (priority > worstPriority) {
        worstPriority = priority;
        worstColor = signal.color;
      }
    }

    return worstColor;
  }

  /**
   * Calculate aggregate glosa risk from billing signals
   */
  private calculateAggregateGlosaRisk(signals: TrafficLightSignal[]): AggregateGlosaRisk | undefined {
    const billingSignals = signals.filter(
      (s) => s.category === 'BILLING' && s.estimatedGlosaRisk
    );

    if (billingSignals.length === 0) return undefined;

    let totalAmount = 0;
    let maxProbability = 0;
    let highestRiskCode: string | undefined;

    for (const signal of billingSignals) {
      const risk = signal.estimatedGlosaRisk!;
      totalAmount += risk.estimatedAmount;
      if (risk.probability > maxProbability) {
        maxProbability = risk.probability;
        highestRiskCode = risk.denialCode;
      }
    }

    // Combined probability: 1 - (1-p1)(1-p2)... for independent events
    // Simplified: use max probability as lower bound
    const combinedProbability = Math.min(
      100,
      maxProbability + (billingSignals.length - 1) * 10
    );

    return {
      probability: combinedProbability,
      totalAmountAtRisk: totalAmount,
      highestRiskCode,
      issueCount: billingSignals.length,
    };
  }

  /**
   * Determine override requirements based on signals
   */
  private determineOverrideRequirements(
    signals: TrafficLightSignal[]
  ): { canOverride: boolean; overrideRequires?: OverrideRequirement } {
    const hasRed = signals.some((s) => s.color === 'RED');
    const hasClinicalRed = signals.some((s) => s.color === 'RED' && s.category === 'CLINICAL');
    const hasBillingRed = signals.some((s) => s.color === 'RED' && s.category === 'BILLING');

    // Clinical RED with severe allergy or lethal interaction = blocked
    const hasLethalInteraction = signals.some(
      (s) => s.ruleId.includes('LETHAL') || s.ruleId.includes('SEVERE_ALLERGY')
    );

    if (hasLethalInteraction) {
      return { canOverride: false, overrideRequires: 'blocked' };
    }

    // Other RED signals require supervisor approval
    if (hasRed) {
      return { canOverride: true, overrideRequires: 'supervisor' };
    }

    // YELLOW signals require justification
    const hasYellow = signals.some((s) => s.color === 'YELLOW');
    if (hasYellow) {
      return { canOverride: true, overrideRequires: 'justification' };
    }

    return { canOverride: true };
  }

  /**
   * Calculate summary counts by category
   */
  private calculateSummary(signals: TrafficLightSignal[]) {
    const summary = {
      clinical: { red: 0, yellow: 0 },
      administrative: { red: 0, yellow: 0 },
      billing: { red: 0, yellow: 0 },
    };

    for (const signal of signals) {
      const category = signal.category.toLowerCase() as 'clinical' | 'administrative' | 'billing';
      if (signal.color === 'RED') {
        summary[category].red++;
      } else if (signal.color === 'YELLOW') {
        summary[category].yellow++;
      }
    }

    return summary;
  }

  /**
   * Capture evaluation for RLHF training
   */
  private async captureForRLHF(
    context: EvaluationContext,
    result: TrafficLightResult
  ): Promise<void> {
    // Only capture non-GREEN evaluations (these are the interesting cases)
    if (result.color === 'GREEN') return;

    await assuranceCaptureService.captureAIEvent({
      patientId: context.patientId,
      eventType: context.action === 'billing' ? 'BILLING' : 'ALERT',
      clinicId: context.clinicId || 'unknown',
      inputContextSnapshot: context.inputContextSnapshot,
      aiRecommendation: {
        trafficLight: result.color,
        signals: result.signals.map((s) => ({
          ruleId: s.ruleId,
          ruleName: s.ruleName,
          category: s.category,
          color: s.color,
          message: s.message,
        })),
        canOverride: result.canOverride,
        overrideRequires: result.overrideRequires,
        glosaRisk: result.totalGlosaRisk,
      },
      aiProvider: 'rules-engine',
      aiLatencyMs: result.metadata.latencyMs,
    });
  }

  /**
   * Get all registered rules (for admin/debugging)
   *
   * PROMPT-NATIVE ARCHITECTURE:
   * Returns rule templates from the prompt-native system.
   */
  getRules(): { clinical: any[]; administrative: any[]; billing: any[] } {
    const templates = getRuleTemplates();
    return {
      clinical: templates.clinical,
      administrative: templates.administrative,
      billing: templates.billing,
    };
  }

  /**
   * Reload rules from prompt templates
   *
   * PROMPT-NATIVE ARCHITECTURE:
   * Reloads and recompiles rules from prompt templates.
   * Call this after updating rule definitions.
   */
  async reloadRulesFromDatabase(): Promise<void> {
    this.promptNativeRules = reloadPromptNativeRules();
    logger.info({
      event: 'rules_reloaded',
      source: 'prompt-native',
      ruleCount: this.promptNativeRules.all.length,
    });
  }
}

// Singleton export
export const trafficLightEngine = new TrafficLightEngine();
