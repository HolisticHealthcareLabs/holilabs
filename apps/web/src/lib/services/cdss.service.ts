/**
 * Clinical Decision Support System (CDSS) Service
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * Rules are defined declaratively in prompt templates, not TypeScript logic.
 * This enables rule updates without code deployments.
 *
 * Generates real-time clinical insights by analyzing:
 * - Patient medications (drug interactions)
 * - Vital signs (sepsis risk, cardiac risk)
 * - Lab results (abnormal values, trends)
 * - Preventive care (overdue screenings)
 * - Cost optimization (generic alternatives)
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { reviewQueueService } from './review-queue.service';

// PROMPT-NATIVE: Import rule loader and types
import {
  getLoadedCDSSRules,
  reloadCDSSRules as reloadPromptNativeRules,
  getCDSSRuleTemplates,
  convertToAIInsight,
  type CDSSPatientContext,
  type CompiledCDSSRule,
} from '@/prompts/cdss-rules';

export interface AIInsight {
  id: string;
  type:
    | 'risk_alert'
    | 'recommendation'
    | 'optimization'
    | 'interaction_warning'
    | 'diagnostic_support'
    | 'cost_saving';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  confidence: number; // 0-100
  category: 'clinical' | 'operational' | 'financial';
  patientId?: string;
  patientName?: string;
  evidence?: {
    source: string;
    citation: string;
    url?: string;
  }[];
  actionable: boolean;
  actions?: {
    label: string;
    type: 'primary' | 'secondary';
    actionType?: string;
    metadata?: Record<string, any>;
  }[];
  metadata?: Record<string, any>;
}

interface PatientContext {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  medications: Array<{
    id: string;
    name: string;
    dose: string;
    isActive: boolean;
  }>;
  vitals: Array<{
    temperature?: number;
    heartRate?: number;
    systolicBP?: number;
    diastolicBP?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    createdAt: Date;
  }>;
  labResults: Array<{
    testName: string;
    value: string;
    unit: string;
    referenceRange: string;
    isAbnormal: boolean;
    isCritical: boolean;
    createdAt: Date;
  }>;
  allergies: Array<{
    allergen: string;
    reaction: string;
    severity: 'MILD' | 'MODERATE' | 'SEVERE';
  }>;
  diagnoses: Array<{
    icd10Code: string;
    description: string;
    diagnosedAt: Date;
  }>;
  lastVisit?: Date;
}

export class CDSSService {
  // PROMPT-NATIVE: Store compiled rules
  private promptNativeRules: ReturnType<typeof getLoadedCDSSRules>;

  constructor() {
    // Load prompt-native rules (new architecture)
    this.promptNativeRules = getLoadedCDSSRules();
  }

  /**
   * Generate all insights for a clinician's patient panel
   *
   * PROMPT-NATIVE ARCHITECTURE:
   * Uses compiled rules from prompt templates instead of hardcoded methods.
   */
  async generateInsights(clinicianId: string): Promise<AIInsight[]> {
    try {
      const insights: AIInsight[] = [];

      // Get all active patients for this clinician
      const patients = await this.getClinicianPatients(clinicianId);

      for (const patient of patients) {
        const patientContext = await this.getPatientContext(patient.id);

        // PROMPT-NATIVE: Evaluate all rules in parallel
        const cdssContext = this.toCDSSPatientContext(patientContext);

        const ruleResults = await Promise.all(
          this.promptNativeRules.all.map(async (rule) => {
            try {
              const result = await rule.evaluate(cdssContext);
              if (result && result.triggered) {
                return convertToAIInsight(result, rule, cdssContext);
              }
              return null;
            } catch (error) {
              logger.error({
                event: 'cdss_rule_evaluation_error',
                ruleId: rule.id,
                patientId: patient.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              return null;
            }
          })
        );

        // Filter out null results and add to insights
        insights.push(...ruleResults.filter((r): r is AIInsight => r !== null));
      }

      // Add operational and financial insights (these remain as methods for now)
      insights.push(...(await this.checkOperationalOptimizations(clinicianId)));
      insights.push(...(await this.checkCostSavings(clinicianId)));

      // Sort by priority
      insights.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Flag low-confidence or high-risk insights for manual review
      await this.flagInsightsForReview(clinicianId, insights);

      logger.info({
        event: 'cdss_insights_generated',
        clinicianId,
        totalInsights: insights.length,
        criticalInsights: insights.filter((i) => i.priority === 'critical').length,
        source: 'prompt-native',
      });

      return insights;
    } catch (error) {
      logger.error({
        event: 'cdss_insights_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Convert PatientContext to CDSSPatientContext format
   */
  private toCDSSPatientContext(ctx: PatientContext): CDSSPatientContext {
    return {
      id: ctx.id,
      firstName: ctx.firstName,
      lastName: ctx.lastName,
      dateOfBirth: ctx.dateOfBirth,
      age: this.calculateAge(ctx.dateOfBirth),
      medications: ctx.medications,
      vitals: ctx.vitals,
      labResults: ctx.labResults,
      allergies: ctx.allergies,
      diagnoses: ctx.diagnoses,
      lastVisit: ctx.lastVisit,
    };
  }

  /**
   * Reload rules from prompt templates (for hot-reloading)
   */
  reloadRules(): void {
    this.promptNativeRules = reloadPromptNativeRules();
    logger.info({
      event: 'cdss_rules_reloaded',
      ruleCount: this.promptNativeRules.all.length,
    });
  }

  /**
   * Get all registered rules (for admin/debugging)
   */
  getRules() {
    return getCDSSRuleTemplates();
  }

  /**
   * Get patient context for CDSS analysis
   */
  private async getPatientContext(patientId: string): Promise<PatientContext> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        medications: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        vitalSigns: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Last 5 vital sign records
        },
        labResults: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 lab results
        },
        allergies: true,
        diagnoses: {
          orderBy: { diagnosedAt: 'desc' },
          take: 10,
        },
        appointments: {
          where: { status: 'COMPLETED' },
          orderBy: { endTime: 'desc' },
          take: 1,
        },
      },
    });

    if (!patient) {
      throw new Error(`Patient ${patientId} not found`);
    }

    return {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      medications: patient.medications.map((m) => ({
        id: m.id,
        name: m.name,
        dose: m.dose,
        isActive: m.isActive,
      })),
      vitals: patient.vitalSigns.map((v) => ({
        temperature: v.temperature || undefined,
        heartRate: v.heartRate || undefined,
        systolicBP: v.systolicBP || undefined,
        diastolicBP: v.diastolicBP || undefined,
        respiratoryRate: v.respiratoryRate || undefined,
        oxygenSaturation: v.oxygenSaturation || undefined,
        createdAt: v.createdAt,
      })),
      labResults: patient.labResults.map((l) => ({
        testName: l.testName,
        value: l.value || '',
        unit: l.unit || '',
        referenceRange: l.referenceRange || '',
        isAbnormal: l.isAbnormal,
        isCritical: l.isCritical,
        createdAt: l.createdAt,
      })),
      allergies: patient.allergies.map((a) => ({
        allergen: a.allergen,
        reaction: a.reactions?.join(', ') || '',
        severity: (a.severity as 'MILD' | 'MODERATE' | 'SEVERE') || 'MILD',
      })),
      diagnoses: patient.diagnoses.map((d) => ({
        icd10Code: d.icd10Code,
        description: d.description,
        diagnosedAt: d.diagnosedAt,
      })),
      lastVisit: patient.appointments[0]?.endTime,
    };
  }

  /**
   * Get all patients for a clinician
   */
  private async getClinicianPatients(clinicianId: string) {
    return await prisma.patient.findMany({
      where: {
        OR: [
          { appointments: { some: { clinicianId } } },
          { soapNotes: { some: { clinicianId } } },
        ],
      },
      take: 50, // Limit to 50 most relevant patients
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * OPERATIONAL RULE: Check for operational optimizations
   */
  private async checkOperationalOptimizations(clinicianId: string): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Count patients due for wellness visits
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const patientsNeedingVisits = await prisma.patient.count({
      where: {
        appointments: {
          some: { clinicianId },
        },
        OR: [
          { updatedAt: { lte: oneYearAgo } },
          {
            appointments: {
              none: {
                startTime: { gte: oneYearAgo },
                status: 'COMPLETED',
              },
            },
          },
        ],
      },
    });

    if (patientsNeedingVisits > 0) {
      insights.push({
        id: `wellness_visits_batch_${clinicianId}`,
        type: 'recommendation',
        priority: 'medium',
        title: 'Preventive Care Reminder',
        description: `${patientsNeedingVisits} patients due for annual wellness visits. Early scheduling improves outcomes and reduces no-show rates.`,
        confidence: 92,
        category: 'operational',
        actionable: true,
        actions: [
          {
            label: 'View Patients',
            type: 'primary',
            actionType: 'view_patient_list',
            metadata: { clinicianId, filter: 'wellness_due' },
          },
        ],
        metadata: { count: patientsNeedingVisits },
      });
    }

    return insights;
  }

  /**
   * FINANCIAL RULE: Check for cost-saving opportunities
   */
  private async checkCostSavings(clinicianId: string): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Generic alternatives for common brand-name drugs
    const genericAlternatives = new Map([
      ['lipitor', 'atorvastatin'],
      ['crestor', 'rosuvastatin'],
      ['nexium', 'esomeprazole'],
      ['advair', 'fluticasone-salmeterol'],
    ]);

    const patientsWithBrandMeds = await prisma.patient.findMany({
      where: {
        appointments: { some: { clinicianId } },
        medications: {
          some: {
            isActive: true,
            name: {
              in: Array.from(genericAlternatives.keys()),
              mode: 'insensitive',
            },
          },
        },
      },
      include: {
        medications: {
          where: { isActive: true },
        },
      },
    });

    if (patientsWithBrandMeds.length > 0) {
      // Estimate savings (rough estimate: $200/patient/year)
      const estimatedSavings = patientsWithBrandMeds.length * 200;

      insights.push({
        id: `generic_alternatives_${clinicianId}`,
        type: 'cost_saving',
        priority: 'low',
        title: 'Generic Alternatives Available',
        description: `${patientsWithBrandMeds.length} patients on brand-name medications. Switch to generics for potential savings: $${estimatedSavings.toLocaleString()}/year with equivalent efficacy.`,
        confidence: 98,
        category: 'financial',
        actionable: true,
        actions: [
          {
            label: 'Review Patients',
            type: 'primary',
            actionType: 'view_patient_list',
            metadata: { clinicianId, filter: 'brand_meds' },
          },
        ],
        metadata: { patientCount: patientsWithBrandMeds.length, estimatedSavings },
      });
    }

    return insights;
  }

  /**
   * Flag low-confidence or high-risk insights for manual review
   */
  private async flagInsightsForReview(
    clinicianId: string,
    insights: AIInsight[]
  ): Promise<void> {
    try {
      // Flag insights that need review
      const insightsToFlag = insights.filter(
        (insight) =>
          // Critical priority always needs review
          insight.priority === 'critical' ||
          // Low confidence needs review
          insight.confidence < 80 ||
          // High-risk interactions need review
          (insight.type === 'interaction_warning' && insight.priority === 'high')
      );

      // Add to review queue
      for (const insight of insightsToFlag) {
        if (insight.patientId) {
          try {
            await reviewQueueService.addToQueue(
              clinicianId,
              insight.patientId,
              'cdss_insight',
              insight.id,
              insight.confidence / 100, // Convert to 0-1 scale
              insight.priority === 'critical' ? 'high_risk' : 'low_confidence',
              {
                sectionType: insight.type,
                flagDetails: insight.description,
              }
            );
          } catch (error) {
            // Log but don't fail if review queue addition fails
            logger.error({
              event: 'review_queue_flag_error',
              insightId: insight.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      if (insightsToFlag.length > 0) {
        logger.info({
          event: 'cdss_insights_flagged_for_review',
          count: insightsToFlag.length,
          clinicianId,
        });
      }
    } catch (error) {
      logger.error({
        event: 'flag_insights_for_review_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - this is not critical
    }
  }

  /**
   * Helper: Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Helper: Days since date
   */
  private daysSince(date: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Format date
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

// Export singleton instance
export const cdssService = new CDSSService();
