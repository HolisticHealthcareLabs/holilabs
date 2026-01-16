/**
 * CDSS V3 - Prevention Service
 *
 * Single-responsibility service for prevention gap detection.
 * Checks drug interactions, screening gaps, and critical labs.
 */

import { PatientRepository, PatientContext } from '@/lib/repositories';
import logger from '@/lib/logger';
import {
  PreventionAlertSchema,
  type PreventionAlert,
} from '@/lib/schemas/prevention-alert.schema';

// Re-export for convenience
export { PreventionAlertSchema, type PreventionAlert };

/**
 * Known drug interactions (simplified - production would use DrugBank API)
 */
const DRUG_INTERACTIONS = new Map<string, { with: string; risk: string; severity: 'critical' | 'warning' }>([
  ['warfarin', { with: 'aspirin', risk: 'Increased bleeding risk', severity: 'critical' }],
  ['warfarin', { with: 'ibuprofen', risk: 'Increased bleeding risk', severity: 'warning' }],
  ['warfarin', { with: 'naproxen', risk: 'Increased bleeding risk', severity: 'warning' }],
  ['metformin', { with: 'contrast', risk: 'Lactic acidosis risk - hold 48h before/after procedure', severity: 'critical' }],
  ['lisinopril', { with: 'spironolactone', risk: 'Hyperkalemia risk', severity: 'warning' }],
  ['lisinopril', { with: 'potassium', risk: 'Hyperkalemia risk', severity: 'warning' }],
  ['simvastatin', { with: 'clarithromycin', risk: 'Rhabdomyolysis risk', severity: 'critical' }],
  ['simvastatin', { with: 'erythromycin', risk: 'Rhabdomyolysis risk', severity: 'critical' }],
  ['digoxin', { with: 'amiodarone', risk: 'Digoxin toxicity risk', severity: 'critical' }],
  ['clopidogrel', { with: 'omeprazole', risk: 'Reduced antiplatelet effect', severity: 'warning' }],
]);

/**
 * USPSTF Screening recommendations by age/sex
 */
interface ScreeningRecommendation {
  name: string;
  ageMin: number;
  ageMax: number;
  sex?: 'M' | 'F';
  intervalYears: number;
  grade: string;
  labName?: string; // Lab test name to check for recent completion
}

const USPSTF_SCREENINGS: ScreeningRecommendation[] = [
  { name: 'Colonoscopy', ageMin: 45, ageMax: 75, intervalYears: 10, grade: 'A' },
  { name: 'Mammography', ageMin: 50, ageMax: 74, sex: 'F', intervalYears: 2, grade: 'B' },
  { name: 'Cervical Cancer Screening (Pap)', ageMin: 21, ageMax: 65, sex: 'F', intervalYears: 3, grade: 'A' },
  { name: 'Lipid Panel', ageMin: 40, ageMax: 75, intervalYears: 5, grade: 'B', labName: 'lipid' },
  { name: 'Diabetes Screening (HbA1c)', ageMin: 35, ageMax: 70, intervalYears: 3, grade: 'B', labName: 'a1c' },
  { name: 'Blood Pressure Screening', ageMin: 18, ageMax: 100, intervalYears: 1, grade: 'A' },
  { name: 'Lung Cancer Screening (LDCT)', ageMin: 50, ageMax: 80, intervalYears: 1, grade: 'B' },
  { name: 'Osteoporosis Screening (DEXA)', ageMin: 65, ageMax: 100, sex: 'F', intervalYears: 2, grade: 'B' },
];

export class PreventionService {
  constructor(private readonly patientRepo: PatientRepository) {}

  /**
   * Get all actionable alerts for a patient
   * Returns only alerts that require action (not informational)
   */
  async getActionableAlerts(patientId: string): Promise<PreventionAlert[]> {
    const context = await this.patientRepo.getPatientContext(patientId);

    if (!context) {
      logger.warn({ event: 'prevention_patient_not_found', patientId });
      return [];
    }

    const alerts: PreventionAlert[] = [];

    // Check drug interactions
    const interactions = this.checkDrugInteractions(context);
    alerts.push(...interactions);

    // Check screening gaps
    const screenings = this.checkScreeningGaps(context);
    alerts.push(...screenings.filter(s => s.type === 'screening_overdue'));

    // Check critical labs (last 7 days)
    const criticalLabs = await this.checkCriticalLabs(patientId);
    alerts.push(...criticalLabs);

    // Check recent hospitalizations
    const hospitalizations = await this.checkRecentHospitalizations(patientId);
    alerts.push(...hospitalizations);

    // Validate all alerts with Zod
    const validatedAlerts = alerts.map(a => {
      try {
        return PreventionAlertSchema.parse(a);
      } catch (error) {
        logger.error({ event: 'prevention_alert_validation_failed', alert: a, error });
        return null;
      }
    }).filter((a): a is PreventionAlert => a !== null);

    logger.info({
      event: 'prevention_alerts_generated',
      patientId,
      totalAlerts: validatedAlerts.length,
      criticalCount: validatedAlerts.filter(a => a.severity === 'critical').length,
    });

    return validatedAlerts;
  }

  /**
   * Check for drug interactions in patient's medications
   */
  private checkDrugInteractions(context: PatientContext): PreventionAlert[] {
    const alerts: PreventionAlert[] = [];
    const meds = context.medications.map(m => m.name.toLowerCase());

    for (const [drug1, interaction] of DRUG_INTERACTIONS) {
      if (meds.some(m => m.includes(drug1)) && meds.some(m => m.includes(interaction.with))) {
        alerts.push({
          id: `drug_${context.id}_${drug1}_${interaction.with}`,
          type: 'drug_interaction',
          severity: interaction.severity,
          title: 'Drug Interaction Warning',
          description: `${drug1} + ${interaction.with}: ${interaction.risk}`,
          action: {
            label: 'Review Medications',
            type: 'link',
            payload: { patientId: context.id, tab: 'medications' },
          },
          source: 'FDA Drug Safety Database',
          createdAt: new Date(),
        });
      }
    }

    return alerts;
  }

  /**
   * Check for overdue screenings based on USPSTF guidelines
   */
  private checkScreeningGaps(context: PatientContext): PreventionAlert[] {
    const alerts: PreventionAlert[] = [];
    const age = this.calculateAge(context.dateOfBirth);
    const sex = context.sex?.toUpperCase() as 'M' | 'F' | undefined;

    for (const screening of USPSTF_SCREENINGS) {
      // Check age eligibility
      if (age < screening.ageMin || age > screening.ageMax) continue;

      // Check sex eligibility
      if (screening.sex && screening.sex !== sex) continue;

      // Check if screening was done recently
      const lastScreeningDate = this.findLastScreeningDate(context, screening);
      const daysSinceScreening = lastScreeningDate
        ? this.daysSince(lastScreeningDate)
        : Infinity;

      const intervalDays = screening.intervalYears * 365;
      const isOverdue = daysSinceScreening > intervalDays;
      const isDueSoon = daysSinceScreening > intervalDays - 90; // Due within 90 days

      if (isOverdue) {
        alerts.push({
          id: `screening_${context.id}_${screening.name.replace(/\s/g, '_')}`,
          type: 'screening_overdue',
          severity: 'warning',
          title: `${screening.name} Overdue`,
          description: lastScreeningDate
            ? `Last done ${this.formatDate(lastScreeningDate)}. Recommended every ${screening.intervalYears} year(s).`
            : `No record found. Recommended for age ${screening.ageMin}-${screening.ageMax}.`,
          action: {
            label: `Order ${screening.name}`,
            type: 'order',
            payload: { patientId: context.id, screeningType: screening.name },
          },
          source: `USPSTF Grade ${screening.grade}`,
          createdAt: new Date(),
        });
      } else if (isDueSoon && !isOverdue) {
        alerts.push({
          id: `screening_${context.id}_${screening.name.replace(/\s/g, '_')}`,
          type: 'screening_due',
          severity: 'info',
          title: `${screening.name} Due Soon`,
          description: `Due within 90 days. Last done ${lastScreeningDate ? this.formatDate(lastScreeningDate) : 'never'}.`,
          action: {
            label: `Schedule ${screening.name}`,
            type: 'order',
            payload: { patientId: context.id, screeningType: screening.name },
          },
          source: `USPSTF Grade ${screening.grade}`,
          createdAt: new Date(),
        });
      }
    }

    return alerts;
  }

  /**
   * Check for critical lab values in the last 7 days
   */
  private async checkCriticalLabs(patientId: string): Promise<PreventionAlert[]> {
    const criticalLabs = await this.patientRepo.getCriticalLabs(patientId, 7);

    return criticalLabs.map(lab => ({
      id: `critical_lab_${patientId}_${lab.id}`,
      type: 'critical_lab' as const,
      severity: 'critical' as const,
      title: 'Critical Lab Result',
      description: `${lab.testName}: ${lab.value} ${lab.unit} (Reference: ${lab.referenceRange})`,
      action: {
        label: 'Review Result',
        type: 'link' as const,
        payload: { patientId, labId: lab.id },
      },
      source: 'Lab Results',
      createdAt: lab.createdAt,
    }));
  }

  /**
   * Check for recent hospitalizations (last 30 days)
   */
  private async checkRecentHospitalizations(patientId: string): Promise<PreventionAlert[]> {
    const count = await this.patientRepo.getRecentHospitalizations(patientId, 30);

    if (count > 0) {
      return [{
        id: `hospitalization_${patientId}`,
        type: 'recent_hospitalization',
        severity: 'warning',
        title: 'Recent Hospitalization',
        description: `Patient had ${count} hospitalization(s) in the last 30 days. Consider medication reconciliation.`,
        action: {
          label: 'Review History',
          type: 'link',
          payload: { patientId, tab: 'history' },
        },
        source: 'Hospital Records',
        createdAt: new Date(),
      }];
    }

    return [];
  }

  /**
   * Find the last date a screening was performed
   */
  private findLastScreeningDate(
    context: PatientContext,
    screening: ScreeningRecommendation
  ): Date | null {
    // Check lab results for the screening
    if (screening.labName) {
      const matchingLab = context.labResults.find(
        lab => lab.testName.toLowerCase().includes(screening.labName!)
      );
      if (matchingLab) {
        return matchingLab.createdAt;
      }
    }

    // For other screenings, would check procedures/orders (not implemented in current model)
    return null;
  }

  /**
   * Helper: Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
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

// Export factory function for dependency injection
export function createPreventionService(
  patientRepo: PatientRepository = new PatientRepository()
): PreventionService {
  return new PreventionService(patientRepo);
}
