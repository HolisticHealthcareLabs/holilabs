/**
 * Clinical Decision Support Engine
 *
 * Core engine for evaluating clinical rules and generating alerts
 * Based on CDS Hooks and OpenCDS architecture
 *
 * Performance Optimizations:
 * - Redis caching with automatic invalidation
 * - Parallel rule evaluation
 * - Detailed performance monitoring
 * - Circuit breaker for fault tolerance
 *
 * @compliance HL7 FHIR, CDS Hooks 2.0
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { performance } from 'perf_hooks';
import type {
  CDSContext,
  CDSAlert,
  CDSRule,
  CDSEvaluationResult,
  CDSHookType,
  CDSResponse,
} from '../types';
import { checkDrugInteractions, checkDrugInteractionsWithAPI } from '../rules/drug-interactions';
import { findApplicableGuidelines } from '../rules/clinical-guidelines';
import { WHO_PEN_RULES } from '../rules/who-pen-protocols';
import { PAHO_PREVENTION_RULES } from '../rules/paho-prevention';
import { getCacheClient, generateCacheKey } from '@/lib/cache/redis-client';

/**
 * Performance Metrics
 */
interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  slowEvaluations: number;
  totalEvaluations: number;
  avgProcessingTime: number;
}

/**
 * CDS Engine Class
 */
export class CDSEngine {
  private static instance: CDSEngine;
  private rules: CDSRule[] = [];
  private enabledRules: Map<string, boolean> = new Map();
  private cache = getCacheClient();
  private metrics: PerformanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    slowEvaluations: 0,
    totalEvaluations: 0,
    avgProcessingTime: 0,
  };

  // Performance thresholds
  private readonly SLOW_EVALUATION_THRESHOLD = 2000; // 2 seconds
  private readonly CACHE_TTL = {
    'patient-view': 300,         // 5 minutes
    'medication-prescribe': 60,  // 1 minute
    'order-select': 60,
    'order-sign': 60,
    'encounter-start': 180,      // 3 minutes
    'encounter-discharge': 180,
  } as const;

  constructor() {
    this.initializeDefaultRules();
  }

  public static getInstance(): CDSEngine {
    if (!CDSEngine.instance) {
      CDSEngine.instance = new CDSEngine();
    }
    return CDSEngine.instance;
  }

  /**
   * Generate cache key from context
   */
  private generateContextHash(context: CDSContext, hookType: CDSHookType): string {
    const relevantData = {
      patientId: context.patientId,
      hookType,
      medications: context.context.medications?.map(m => ({ id: m.id, name: m.name })),
      allergies: context.context.allergies?.map(a => ({ allergen: a.allergen, severity: a.severity })),
      conditions: context.context.conditions?.map(c => ({ code: c.code, status: c.clinicalStatus })),
      labResults: context.context.labResults?.map(l => ({ testName: l.testName, interpretation: l.interpretation })),
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(relevantData))
      .digest('hex')
      .substring(0, 16);

    return generateCacheKey('cdss', context.patientId, hookType, hash);
  }

  /**
   * Evaluate CDS rules for a given context with caching and parallelization
   */
  public async evaluate(context: CDSContext, hookType?: CDSHookType): Promise<CDSEvaluationResult> {
    // Allow hookType parameter to override context.hookType
    const effectiveHookType = hookType || context.hookType;
    const startTime = performance.now();

    console.log(`🔍 [CDS Engine] Evaluating ${effectiveHookType} hook for patient ${context.patientId}`);

    // Check cache first
    const cacheKey = this.generateContextHash(context, effectiveHookType);
    try {
      const cached = await this.cache.get<CDSEvaluationResult>(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        this.metrics.totalEvaluations++;
        console.log(`⚡ [CDS Engine] CACHE HIT for ${cacheKey} (${Math.round(performance.now() - startTime)}ms)`);

        // Update timestamp but preserve cached alerts
        return {
          ...cached,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.error('[CDS Engine] Cache read error:', error);
    }

    this.metrics.cacheMisses++;

    // Filter rules for this hook type
    const applicableRules = this.rules.filter(
      rule => rule.triggerHooks.includes(effectiveHookType) && rule.enabled
    );

    // Sort by priority (higher first)
    applicableRules.sort((a, b) => b.priority - a.priority);

    // Evaluate rules in parallel
    const rulePromises = applicableRules.map(async (rule) => {
      try {
        const ruleStartTime = performance.now();

        // Check condition
        if (!rule.condition(context)) {
          return { rule, alert: null, duration: performance.now() - ruleStartTime };
        }

        // Generate alert
        const alert = await rule.evaluate(context);
        const duration = performance.now() - ruleStartTime;

        if (alert) {
          console.log(`✅ [CDS Engine] Rule fired: ${rule.name} (${alert.severity}, ${Math.round(duration)}ms)`);
        }

        return { rule, alert, duration };
      } catch (error) {
        console.error(`❌ [CDS Engine] Error evaluating rule ${rule.id}:`, error);
        return { rule, alert: null, duration: 0, error };
      }
    });

    // Wait for all rules to complete
    const results = await Promise.allSettled(rulePromises);

    // Collect alerts and metrics
    const alerts: CDSAlert[] = [];
    let rulesEvaluated = 0;
    let rulesFired = 0;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        rulesEvaluated++;
        if (result.value.alert) {
          alerts.push(result.value.alert);
          rulesFired++;
        }
      }
    }

    const processingTime = Math.round(performance.now() - startTime);

    // Update metrics
    this.metrics.totalEvaluations++;
    this.metrics.avgProcessingTime =
      (this.metrics.avgProcessingTime * (this.metrics.totalEvaluations - 1) + processingTime) /
      this.metrics.totalEvaluations;

    if (processingTime > this.SLOW_EVALUATION_THRESHOLD) {
      this.metrics.slowEvaluations++;
      console.warn(`⚠️ [CDS Engine] SLOW EVALUATION: ${processingTime}ms (threshold: ${this.SLOW_EVALUATION_THRESHOLD}ms)`);
    }

    console.log(
      `📊 [CDS Engine] Evaluation complete: ${rulesFired}/${rulesEvaluated} rules fired in ${processingTime}ms`
    );

    const evaluationResult: CDSEvaluationResult = {
      timestamp: new Date().toISOString(),
      hookType: context.hookType,
      context: {
        patientId: context.patientId,
        encounterId: context.encounterId,
        userId: context.userId,
      },
      alerts,
      rulesEvaluated,
      rulesFired,
      processingTime,
    };

    // Cache the result asynchronously (don't block response)
    const ttl = this.CACHE_TTL[effectiveHookType] || 300;
    this.cache.set(cacheKey, evaluationResult, ttl).catch((error) => {
      console.error('[CDS Engine] Cache write error:', error);
    });

    return evaluationResult;
  }

  /**
   * Invalidate cache for a specific patient
   */
  public async invalidatePatientCache(patientId: string): Promise<void> {
    try {
      const pattern = generateCacheKey('cdss', patientId, '*');
      const deleted = await this.cache.deletePattern(pattern);
      console.log(`🗑️ [CDS Engine] Invalidated ${deleted} cache entries for patient ${patientId}`);
    } catch (error) {
      console.error('[CDS Engine] Cache invalidation error:', error);
    }
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): PerformanceMetrics & { cacheMetrics: any } {
    return {
      ...this.metrics,
      cacheMetrics: this.cache.getMetrics(),
    };
  }

  /**
   * Reset performance metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      slowEvaluations: 0,
      totalEvaluations: 0,
      avgProcessingTime: 0,
    };
    this.cache.resetMetrics();
  }

  /**
   * Format evaluation result as CDS Hooks response
   */
  public formatAsCDSHooksResponse(result: CDSEvaluationResult): CDSResponse {
    return {
      cards: result.alerts,
      systemActions: [],
    };
  }

  /**
   * Register a new rule
   */
  public registerRule(rule: CDSRule): void {
    this.rules.push(rule);
    this.enabledRules.set(rule.id, rule.enabled);
    console.log(`📝 [CDS Engine] Registered rule: ${rule.name}`);
  }

  /**
   * Enable/disable a rule
   */
  public setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.enabledRules.set(ruleId, enabled);
    }
  }

  /**
   * Disable a rule
   */
  public disableRule(ruleId: string): void {
    this.setRuleEnabled(ruleId, false);
  }

  /**
   * Enable a rule
   */
  public enableRule(ruleId: string): void {
    this.setRuleEnabled(ruleId, true);
  }

  /**
   * Get all registered rules
   */
  public getRules(): CDSRule[] {
    return this.rules;
  }

  /**
   * Initialize default clinical rules
   */
  private initializeDefaultRules(): void {
    // Rule: Drug-Drug Interactions
    this.registerRule({
      id: 'drug-interaction-check',
      name: 'Drug-Drug Interaction Check',
      description: 'Checks for dangerous drug-drug interactions using NLM RxNav API',
      category: 'drug-interaction',
      severity: 'critical',
      triggerHooks: ['medication-prescribe', 'order-sign'],
      priority: 10,
      enabled: true,
      evidenceStrength: 'A',
      source: 'NLM RxNav, DrugBank',
      condition: (context) => {
        return !!context.context.medications && context.context.medications.length >= 2;
      },
      evaluate: async (context) => {
        const medications = context.context.medications || [];

        // Use async API for live RxNav data
        let interactions;
        try {
          interactions = await checkDrugInteractionsWithAPI(medications);
        } catch (error) {
          console.error('[CDS Engine] Drug interaction API failed, using fallback:', error);
          interactions = checkDrugInteractions(medications);
        }

        if (interactions.length === 0) return null;

        // Get most severe interaction
        const severityOrder = { 'contraindicated': 4, 'major': 3, 'moderate': 2, 'minor': 1 };
        const mostSevere = interactions.sort(
          (a, b) => severityOrder[b.severity] - severityOrder[a.severity]
        )[0];

        const indicator = mostSevere.severity === 'contraindicated' || mostSevere.severity === 'major'
          ? 'critical'
          : mostSevere.severity === 'moderate'
          ? 'warning'
          : 'info';

        return {
          id: uuidv4(),
          ruleId: 'drug-interaction-check',
          summary: `${mostSevere.severity.toUpperCase()}: ${mostSevere.drug1.name} + ${mostSevere.drug2.name}`,
          detail: `${mostSevere.description}\n\nClinical Effects: ${mostSevere.clinicalEffects}\n\nManagement: ${mostSevere.management}`,
          severity: indicator,
          category: 'drug-interaction',
          indicator,
          source: {
            label: mostSevere.source,
            url: mostSevere.source.includes('RxNav')
              ? 'https://rxnav.nlm.nih.gov/'
              : 'https://www.drugbank.com',
          },
          suggestions: [
            {
              label: 'Review medication list',
              isRecommended: true,
            },
            {
              label: 'Consider alternative medication',
              isRecommended: mostSevere.severity === 'contraindicated',
            },
          ],
          overrideReasons: [
            'Patient has taken combination safely in past',
            'Benefits outweigh risks after discussion',
            'No suitable alternatives available',
          ],
          timestamp: new Date().toISOString(),
        };
      },
    });

    // Rule: Drug-Allergy Check
    this.registerRule({
      id: 'drug-allergy-check',
      name: 'Drug-Allergy Interaction Check',
      description: 'Alerts when prescribing medication patient is allergic to',
      category: 'allergy',
      severity: 'critical',
      triggerHooks: ['medication-prescribe', 'order-sign'],
      priority: 10,
      enabled: true,
      condition: (context) => {
        return !!context.context.medications && !!context.context.allergies;
      },
      evaluate: (context) => {
        const medications = context.context.medications || [];
        const allergies = context.context.allergies || [];

        // Check if any medication matches an allergy
        for (const med of medications) {
          for (const allergy of allergies) {
            if (med.name.toLowerCase().includes(allergy.allergen.toLowerCase()) ||
                allergy.allergen.toLowerCase().includes(med.name.toLowerCase())) {

              return {
                id: uuidv4(),
                ruleId: 'drug-allergy-check',
                summary: `ALLERGY ALERT: Patient allergic to ${allergy.allergen}`,
                detail: `Patient has documented ${allergy.severity} allergy to ${allergy.allergen}.\n\nReaction: ${allergy.reaction || 'Unknown'}\n\nAttempting to prescribe: ${med.name}`,
                severity: 'critical',
                category: 'allergy',
                indicator: 'critical',
                source: {
                  label: 'Patient Allergy List',
                },
                suggestions: [
                  {
                    label: 'Select alternative medication',
                    isRecommended: true,
                  },
                ],
                timestamp: new Date().toISOString(),
              };
            }
          }
        }

        return null;
      },
    });

    // Rule: Abnormal Lab Results
    this.registerRule({
      id: 'abnormal-lab-alert',
      name: 'Abnormal Lab Results Alert',
      description: 'Alerts for critical or abnormal lab values',
      category: 'lab-abnormal',
      severity: 'warning',
      triggerHooks: ['patient-view', 'encounter-start'],
      priority: 8,
      enabled: true,
      condition: (context) => {
        return !!context.context.labResults && context.context.labResults.length > 0;
      },
      evaluate: (context) => {
        const labResults = context.context.labResults || [];
        const criticalLabs = labResults.filter(lab => lab.interpretation === 'critical' || lab.interpretation === 'high');

        if (criticalLabs.length === 0) return null;

        const labList = criticalLabs
          .map(lab => `- ${lab.testName}: ${lab.value} ${lab.unit || ''} (${lab.interpretation})`)
          .join('\n');

        return {
          id: uuidv4(),
          ruleId: 'abnormal-lab-alert',
          summary: `${criticalLabs.length} Abnormal Lab Result${criticalLabs.length > 1 ? 's' : ''}`,
          detail: `Critical or abnormal lab values requiring attention:\n\n${labList}`,
          severity: 'warning',
          category: 'lab-abnormal',
          indicator: 'warning',
          source: {
            label: 'Lab Results',
          },
          suggestions: [
            {
              label: 'Review lab results',
              isRecommended: true,
            },
            {
              label: 'Consider repeat testing if indicated',
            },
          ],
          timestamp: new Date().toISOString(),
        };
      },
    });

    // Rule: Clinical Guidelines
    this.registerRule({
      id: 'clinical-guideline-recommendations',
      name: 'Evidence-Based Guideline Recommendations',
      description: 'Provides evidence-based clinical guideline recommendations',
      category: 'guideline-recommendation',
      severity: 'info',
      triggerHooks: ['patient-view', 'encounter-start'],
      priority: 5,
      enabled: true,
      condition: (context) => {
        return !!context.context.demographics;
      },
      evaluate: (context) => {
        const demographics = context.context.demographics;
        if (!demographics) return null;

        const conditions = context.context.conditions?.map(c => c.icd10Code).filter(Boolean) as string[] || [];

        const guidelines = findApplicableGuidelines({
          age: demographics.age,
          gender: demographics.gender,
          conditions,
          riskFactors: [], // Could calculate CVD risk, etc.
        });

        if (guidelines.length === 0) return null;

        const guidelineList = guidelines.slice(0, 3).map(g =>
          `- ${g.title} (${g.evidenceStrength})`
        ).join('\n');

        return {
          id: uuidv4(),
          ruleId: 'clinical-guideline-recommendations',
          summary: `${guidelines.length} Clinical Guideline${guidelines.length > 1 ? 's' : ''} Applicable`,
          detail: `Evidence-based guidelines for this patient:\n\n${guidelineList}\n\nReview full guidelines for detailed recommendations.`,
          severity: 'info',
          category: 'guideline-recommendation',
          indicator: 'info',
          source: {
            label: 'USPSTF, ACC/AHA, ADA',
            url: 'https://www.uspreventiveservicestaskforce.org/',
          },
          links: guidelines.slice(0, 3).map(g => ({
            label: g.title,
            url: g.sourceUrl || '#',
            type: 'absolute' as const,
          })),
          timestamp: new Date().toISOString(),
        };
      },
    });

    // Rule: Duplicate Therapy Check
    this.registerRule({
      id: 'duplicate-therapy-check',
      name: 'Duplicate Therapy Alert',
      description: 'Checks for duplicate medications from the same therapeutic class',
      category: 'duplicate-therapy',
      severity: 'warning',
      triggerHooks: ['medication-prescribe', 'order-sign'],
      priority: 7,
      enabled: true,
      condition: (context) => {
        return !!context.context.medications && context.context.medications.length >= 2;
      },
      evaluate: (context) => {
        const medications = context.context.medications || [];

        // Check for duplicate drug classes (simplified - in production would use RxNorm classes)
        const classes = new Map<string, string[]>();

        // Common therapeutic classes (simplified)
        const therapeuticClasses: Record<string, string[]> = {
          'NSAID': ['ibuprofen', 'naproxen', 'diclofenac', 'celecoxib', 'meloxicam'],
          'ACE Inhibitor': ['lisinopril', 'enalapril', 'ramipril', 'captopril'],
          'ARB': ['losartan', 'valsartan', 'irbesartan', 'candesartan'],
          'Statin': ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'],
          'SSRI': ['sertraline', 'fluoxetine', 'citalopram', 'escitalopram', 'paroxetine'],
          'PPI': ['omeprazole', 'pantoprazole', 'esomeprazole', 'lansoprazole'],
        };

        // Map medications to classes
        for (const med of medications) {
          for (const [className, drugs] of Object.entries(therapeuticClasses)) {
            if (drugs.some(drug => med.name.toLowerCase().includes(drug))) {
              if (!classes.has(className)) {
                classes.set(className, []);
              }
              classes.get(className)!.push(med.name);
            }
          }
        }

        // Find duplicates
        const duplicates = Array.from(classes.entries()).filter(([_, meds]) => meds.length > 1);

        if (duplicates.length === 0) return null;

        const duplicateList = duplicates.map(([className, meds]) =>
          `- ${className}: ${meds.join(', ')}`
        ).join('\n');

        return {
          id: uuidv4(),
          ruleId: 'duplicate-therapy-check',
          summary: `Duplicate Therapy Detected`,
          detail: `Patient is on multiple medications from the same therapeutic class:\n\n${duplicateList}\n\nConsider consolidating to a single agent.`,
          severity: 'warning',
          category: 'duplicate-therapy',
          indicator: 'warning',
          source: {
            label: 'Medication Review',
          },
          suggestions: [
            {
              label: 'Review medication regimen',
              isRecommended: true,
            },
            {
              label: 'Consolidate to single agent if appropriate',
            },
          ],
          timestamp: new Date().toISOString(),
        };
      },
    });

    // Register WHO PEN protocols (low-resource settings)
    for (const rule of WHO_PEN_RULES) {
      this.registerRule(rule);
    }

    // Register PAHO prevention protocols
    for (const rule of PAHO_PREVENTION_RULES) {
      this.registerRule(rule);
    }

    console.log(`✅ [CDS Engine] Initialized with ${this.rules.length} rules (including WHO PEN and PAHO protocols)`);
  }
}

// Export singleton instance
export const cdsEngine = CDSEngine.getInstance();
