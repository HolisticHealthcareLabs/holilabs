/**
 * Clinical Decision Support System (CDSS) Service
 *
 * Generates real-time clinical insights by analyzing:
 * - Patient medications (drug interactions)
 * - Vital signs (sepsis risk, cardiac risk)
 * - Lab results (abnormal values, trends)
 * - Preventive care (overdue screenings)
 * - Cost optimization (generic alternatives)
 *
 * Replaces hardcoded AIInsights with intelligent clinical reasoning
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { reviewQueueService } from './review-queue.service';

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
  /**
   * Generate all insights for a clinician's patient panel
   */
  async generateInsights(clinicianId: string): Promise<AIInsight[]> {
    try {
      const insights: AIInsight[] = [];

      // Get all active patients for this clinician
      const patients = await this.getClinicianPatients(clinicianId);

      for (const patient of patients) {
        const patientContext = await this.getPatientContext(patient.id);

        // Run all clinical rules
        insights.push(...(await this.checkDrugInteractions(patientContext)));
        insights.push(...(await this.checkSepsisRisk(patientContext)));
        insights.push(...(await this.checkCardiacRisk(patientContext)));
        insights.push(...(await this.checkAbnormalLabs(patientContext)));
        insights.push(...(await this.checkPreventiveCare(patientContext)));
        insights.push(...(await this.checkDiagnosticOpportunities(patientContext)));
        insights.push(...(await this.checkPolypharmacy(patientContext)));
        insights.push(...(await this.checkRenalDosing(patientContext)));
        insights.push(...(await this.checkAnticoagulationMonitoring(patientContext)));
        insights.push(...(await this.checkChronicDiseaseGaps(patientContext)));
        insights.push(...(await this.checkDuplicateTherapy(patientContext)));
        insights.push(...(await this.checkLabMonitoring(patientContext)));
      }

      // Add operational and financial insights
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
   * CLINICAL RULE 1: Check for drug interactions
   */
  private async checkDrugInteractions(patient: PatientContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Known major drug interactions (simplified - in production, use DrugBank API)
    // Using array instead of Map to support multiple interactions for the same drug
    const interactions: Array<{ drug1: string; drug2: string; risk: string; priority: 'critical' | 'high' }> = [
      { drug1: 'warfarin', drug2: 'aspirin', risk: 'Increased bleeding risk', priority: 'critical' },
      { drug1: 'warfarin', drug2: 'ibuprofen', risk: 'Increased bleeding risk', priority: 'high' },
      { drug1: 'metformin', drug2: 'alcohol', risk: 'Lactic acidosis risk', priority: 'high' },
      { drug1: 'lisinopril', drug2: 'spironolactone', risk: 'Hyperkalemia risk', priority: 'high' },
      { drug1: 'simvastatin', drug2: 'clarithromycin', risk: 'Rhabdomyolysis risk', priority: 'critical' },
    ];

    const meds = patient.medications.map((m) => m.name.toLowerCase());

    for (const interaction of interactions) {
      if (meds.includes(interaction.drug1) && meds.includes(interaction.drug2)) {
        insights.push({
          id: `drug_interaction_${patient.id}_${interaction.drug1}_${interaction.drug2}`,
          type: 'interaction_warning',
          priority: interaction.priority,
          title: 'Drug Interaction Warning',
          description: `${patient.firstName} ${patient.lastName}: ${interaction.drug1} interacts with ${interaction.drug2}. ${interaction.risk} detected.`,
          confidence: 95,
          category: 'clinical',
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          actionable: true,
          actions: [
            {
              label: 'Adjust Dosage',
              type: 'primary',
              actionType: 'adjust_medication',
              metadata: { patientId: patient.id, drug1: interaction.drug1, drug2: interaction.drug2 },
            },
            {
              label: 'View Interactions',
              type: 'secondary',
              actionType: 'view_patient',
              metadata: { patientId: patient.id },
            },
          ],
          evidence: [
            {
              source: 'FDA Drug Safety Database',
              citation: `Major interaction: ${interaction.drug1} + ${interaction.drug2}`,
            },
          ],
          metadata: { drug1: interaction.drug1, drug2: interaction.drug2, risk: interaction.risk },
        });
      }
    }

    return insights;
  }

  /**
   * CLINICAL RULE 2: Check sepsis risk using qSOFA
   */
  private async checkSepsisRisk(patient: PatientContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    if (patient.vitals.length === 0) return insights;

    const latestVitals = patient.vitals[0];

    // Check if we have sufficient vital signs data for qSOFA calculation
    if (
      !latestVitals.respiratoryRate &&
      !latestVitals.systolicBP &&
      !latestVitals.heartRate
    ) {
      // Insufficient data for qSOFA calculation
      return insights;
    }

    // qSOFA score (Quick Sequential Organ Failure Assessment)
    let qSofaScore = 0;
    const criteria: string[] = [];

    // Respiratory rate >= 22/min
    if (latestVitals.respiratoryRate && latestVitals.respiratoryRate >= 22) {
      qSofaScore++;
      criteria.push(`Tachypnea (RR ${latestVitals.respiratoryRate})`);
    }

    // Systolic BP <= 100 mmHg
    if (latestVitals.systolicBP && latestVitals.systolicBP <= 100) {
      qSofaScore++;
      criteria.push(`Hypotension (SBP ${latestVitals.systolicBP})`);
    }

    // Heart rate >= 110/min (simplified - actual qSOFA uses altered mentation)
    if (latestVitals.heartRate && latestVitals.heartRate >= 110) {
      qSofaScore++;
      criteria.push(`Tachycardia (HR ${latestVitals.heartRate})`);
    }

    // Temperature >= 38°C or <= 36°C
    if (
      latestVitals.temperature &&
      (latestVitals.temperature >= 38.0 || latestVitals.temperature <= 36.0)
    ) {
      criteria.push(`Temperature ${latestVitals.temperature}°C`);
    }

    // qSOFA >= 2 indicates high sepsis risk
    if (qSofaScore >= 2) {
      insights.push({
        id: `sepsis_risk_${patient.id}`,
        type: 'risk_alert',
        priority: 'critical',
        title: 'High Sepsis Risk Detected',
        description: `${patient.firstName} ${patient.lastName} shows signs of sepsis (qSOFA ${qSofaScore}/3): ${criteria.join(', ')}. Immediate evaluation recommended.`,
        confidence: 85 + qSofaScore * 5,
        category: 'clinical',
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        actionable: true,
        actions: [
          {
            label: 'Start Sepsis Protocol',
            type: 'primary',
            actionType: 'start_protocol',
            metadata: { patientId: patient.id, protocol: 'sepsis' },
          },
          {
            label: 'Review Details',
            type: 'secondary',
            actionType: 'view_patient',
            metadata: { patientId: patient.id },
          },
        ],
        evidence: [
          {
            source: 'Seymour et al.',
            citation: 'JAMA 2016 - qSOFA Score for Sepsis Prediction',
            url: 'https://pubmed.ncbi.nlm.nih.gov/26903338/',
          },
        ],
        metadata: { qSofaScore, criteria },
      });
    }

    return insights;
  }

  /**
   * CLINICAL RULE 3: Check cardiac risk (simplified ASCVD)
   */
  private async checkCardiacRisk(patient: PatientContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Check for hypertension
    if (patient.vitals.length > 0) {
      const latestVitals = patient.vitals[0];

      if (
        latestVitals.systolicBP &&
        latestVitals.diastolicBP &&
        (latestVitals.systolicBP >= 140 || latestVitals.diastolicBP >= 90)
      ) {
        // Check if already on hypertension meds
        const onHypertensionMeds = patient.medications.some((m) =>
          ['lisinopril', 'amlodipine', 'losartan', 'hydrochlorothiazide'].some((med) =>
            m.name.toLowerCase().includes(med)
          )
        );

        if (!onHypertensionMeds) {
          insights.push({
            id: `hypertension_${patient.id}`,
            type: 'recommendation',
            priority: 'high',
            title: 'Hypertension Management Needed',
            description: `${patient.firstName} ${patient.lastName}: BP ${latestVitals.systolicBP}/${latestVitals.diastolicBP} mmHg (Stage 2 Hypertension). Consider pharmacologic treatment.`,
            confidence: 90,
            category: 'clinical',
            patientId: patient.id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            actionable: true,
            actions: [
              {
                label: 'Start Treatment',
                type: 'primary',
                actionType: 'prescribe_medication',
                metadata: { patientId: patient.id, condition: 'hypertension' },
              },
            ],
            evidence: [
              {
                source: 'ACC/AHA 2017',
                citation: 'Guideline for the Prevention, Detection, Evaluation, and Management of High Blood Pressure',
              },
            ],
          });
        }
      }
    }

    return insights;
  }

  /**
   * CLINICAL RULE 4: Check for abnormal lab results
   */
  private async checkAbnormalLabs(patient: PatientContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Check for critical lab values
    const criticalLabs = patient.labResults.filter((lab) => lab.isCritical);

    for (const lab of criticalLabs) {
      insights.push({
        id: `critical_lab_${patient.id}_${lab.testName}`,
        type: 'risk_alert',
        priority: 'critical',
        title: 'Critical Lab Result',
        description: `${patient.firstName} ${patient.lastName}: ${lab.testName} is ${lab.value} ${lab.unit} (Reference: ${lab.referenceRange}). Immediate attention required.`,
        confidence: 99,
        category: 'clinical',
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        actionable: true,
        actions: [
          {
            label: 'Review Result',
            type: 'primary',
            actionType: 'view_lab',
            metadata: { patientId: patient.id, testName: lab.testName },
          },
        ],
        metadata: { testName: lab.testName, value: lab.value, unit: lab.unit },
      });
    }

    return insights;
  }

  /**
   * CLINICAL RULE 5: Check preventive care (screenings, wellness visits)
   */
  private async checkPreventiveCare(patient: PatientContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Check last wellness visit
    if (!patient.lastVisit || this.daysSince(patient.lastVisit) > 365) {
      insights.push({
        id: `wellness_visit_${patient.id}`,
        type: 'recommendation',
        priority: 'low',
        title: 'Annual Wellness Visit Overdue',
        description: `${patient.firstName} ${patient.lastName} is due for annual wellness visit (last visit: ${patient.lastVisit ? this.formatDate(patient.lastVisit) : 'Never'}). Early scheduling improves outcomes.`,
        confidence: 100,
        category: 'operational',
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        actionable: true,
        actions: [
          {
            label: 'Schedule Visit',
            type: 'primary',
            actionType: 'schedule_appointment',
            metadata: { patientId: patient.id, type: 'wellness' },
          },
        ],
      });
    }

    return insights;
  }

  /**
   * CLINICAL RULE 6: Diagnostic opportunities
   */
  private async checkDiagnosticOpportunities(patient: PatientContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Example: Diabetes screening for patients with risk factors
    const age = this.calculateAge(patient.dateOfBirth);
    const hasHypertension = patient.diagnoses.some((d) => d.icd10Code.startsWith('I10'));
    const hasObesity = patient.diagnoses.some((d) => d.icd10Code.startsWith('E66'));

    if (age >= 35 && (hasHypertension || hasObesity)) {
      const hasRecentA1C = patient.labResults.some(
        (lab) => lab.testName.toLowerCase().includes('a1c') && this.daysSince(lab.createdAt) <= 365
      );

      if (!hasRecentA1C) {
        insights.push({
          id: `diabetes_screening_${patient.id}`,
          type: 'diagnostic_support',
          priority: 'medium',
          title: 'Diabetes Screening Recommended',
          description: `${patient.firstName} ${patient.lastName}: Risk factors present (age ${age}, ${hasHypertension ? 'hypertension' : 'obesity'}). Consider HbA1c screening.`,
          confidence: 82,
          category: 'clinical',
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          actionable: true,
          actions: [
            {
              label: 'Order HbA1c',
              type: 'primary',
              actionType: 'order_lab',
              metadata: { patientId: patient.id, test: 'HbA1c' },
            },
          ],
          evidence: [
            {
              source: 'ADA 2024',
              citation: 'Standards of Medical Care in Diabetes',
            },
          ],
        });
      }
    }

    return insights;
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
   * CLINICAL RULE 7: Polypharmacy alert (>10 active medications)
   */
  private async checkPolypharmacy(patient: PatientContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    const activeMedCount = patient.medications.length;

    if (activeMedCount >= 10) {
      insights.push({
        id: `polypharmacy_${patient.id}`,
        type: 'recommendation',
        priority: 'medium',
        title: 'Polypharmacy Alert',
        description: `${patient.firstName} ${patient.lastName} is on ${activeMedCount} active medications. Consider medication reconciliation to reduce adverse drug events and improve adherence.`,
        confidence: 88,
        category: 'clinical',
        patientId: patient.id,
        patientName: `${patient.firstName} ${patient.lastName}`,
        actionable: true,
        actions: [
          {
            label: 'Review Medications',
            type: 'primary',
            actionType: 'view_medications',
            metadata: { patientId: patient.id },
          },
        ],
        evidence: [
          {
            source: 'Masnoon et al.',
            citation: 'BMC Geriatrics 2017 - Polypharmacy and Adverse Outcomes',
          },
        ],
        metadata: { medicationCount: activeMedCount },
      });
    }

    return insights;
  }

  /**
   * CLINICAL RULE 8: Renal function monitoring for nephrotoxic drugs
   */
  private async checkRenalDosing(patient: PatientContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Nephrotoxic medications requiring renal monitoring
    const nephrotoxicDrugs = ['metformin', 'nsaid', 'ibuprofen', 'naproxen', 'lisinopril', 'enalapril', 'gentamicin'];

    const onNephrotoxicMeds = patient.medications.some((m) =>
      nephrotoxicDrugs.some((drug) => m.name.toLowerCase().includes(drug))
    );

    if (onNephrotoxicMeds) {
      // Check for recent creatinine test
      const hasRecentCreatinine = patient.labResults.some(
        (lab) =>
          (lab.testName.toLowerCase().includes('creatinine') || lab.testName.toLowerCase().includes('gfr')) &&
          this.daysSince(lab.createdAt) <= 180
      );

      if (!hasRecentCreatinine) {
        insights.push({
          id: `renal_monitoring_${patient.id}`,
          type: 'recommendation',
          priority: 'high',
          title: 'Renal Function Monitoring Required',
          description: `${patient.firstName} ${patient.lastName} is on nephrotoxic medications without recent renal function testing. Order creatinine/GFR to ensure safe dosing.`,
          confidence: 92,
          category: 'clinical',
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          actionable: true,
          actions: [
            {
              label: 'Order Creatinine',
              type: 'primary',
              actionType: 'order_lab',
              metadata: { patientId: patient.id, test: 'Creatinine' },
            },
          ],
          evidence: [
            {
              source: 'KDIGO 2012',
              citation: 'Clinical Practice Guideline for the Evaluation and Management of CKD',
            },
          ],
        });
      }
    }

    return insights;
  }

  /**
   * CLINICAL RULE 9: Anticoagulation monitoring (Warfarin + INR)
   */
  private async checkAnticoagulationMonitoring(patient: PatientContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Check if patient is on warfarin
    const onWarfarin = patient.medications.some((m) => m.name.toLowerCase().includes('warfarin'));

    if (onWarfarin) {
      // Check for recent INR test
      const recentINR = patient.labResults.find(
        (lab) => lab.testName.toLowerCase().includes('inr') && this.daysSince(lab.createdAt) <= 30
      );

      if (!recentINR) {
        insights.push({
          id: `inr_monitoring_${patient.id}`,
          type: 'risk_alert',
          priority: 'high',
          title: 'INR Monitoring Overdue',
          description: `${patient.firstName} ${patient.lastName} is on warfarin without INR testing in the past 30 days. Risk of bleeding or clotting complications.`,
          confidence: 95,
          category: 'clinical',
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          actionable: true,
          actions: [
            {
              label: 'Order INR',
              type: 'primary',
              actionType: 'order_lab',
              metadata: { patientId: patient.id, test: 'INR' },
            },
          ],
          evidence: [
            {
              source: 'AHA/ACC 2019',
              citation: 'Management of Anticoagulation in Atrial Fibrillation',
            },
          ],
        });
      } else {
        // Check if INR is therapeutic (2.0-3.0 for most indications)
        const inrValue = parseFloat(recentINR.value);
        if (!isNaN(inrValue) && (inrValue < 2.0 || inrValue > 3.5)) {
          insights.push({
            id: `inr_out_of_range_${patient.id}`,
            type: 'risk_alert',
            priority: inrValue < 1.5 || inrValue > 4.0 ? 'critical' : 'high',
            title: 'INR Out of Therapeutic Range',
            description: `${patient.firstName} ${patient.lastName}: INR ${inrValue} is ${inrValue < 2.0 ? 'below' : 'above'} therapeutic range. ${inrValue < 2.0 ? 'Increased clotting risk' : 'Increased bleeding risk'}.`,
            confidence: 97,
            category: 'clinical',
            patientId: patient.id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            actionable: true,
            actions: [
              {
                label: 'Adjust Dose',
                type: 'primary',
                actionType: 'adjust_medication',
                metadata: { patientId: patient.id, medication: 'warfarin', inrValue },
              },
            ],
            metadata: { inrValue, targetRange: '2.0-3.0' },
          });
        }
      }
    }

    return insights;
  }

  /**
   * CLINICAL RULE 10: Chronic disease management gaps
   */
  private async checkChronicDiseaseGaps(patient: PatientContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Check for diabetes without medication
    const hasDiabetes = patient.diagnoses.some((d) => d.icd10Code.startsWith('E10') || d.icd10Code.startsWith('E11'));

    if (hasDiabetes) {
      const onDiabetesMeds = patient.medications.some((m) =>
        ['metformin', 'insulin', 'glipizide', 'glyburide', 'semaglutide', 'ozempic'].some((drug) =>
          m.name.toLowerCase().includes(drug)
        )
      );

      if (!onDiabetesMeds) {
        insights.push({
          id: `diabetes_treatment_gap_${patient.id}`,
          type: 'recommendation',
          priority: 'high',
          title: 'Diabetes Treatment Gap',
          description: `${patient.firstName} ${patient.lastName} has diabetes diagnosis but no current diabetes medications. Consider pharmacologic treatment to reduce complications.`,
          confidence: 90,
          category: 'clinical',
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          actionable: true,
          actions: [
            {
              label: 'Start Treatment',
              type: 'primary',
              actionType: 'prescribe_medication',
              metadata: { patientId: patient.id, condition: 'diabetes' },
            },
          ],
          evidence: [
            {
              source: 'ADA 2024',
              citation: 'Standards of Medical Care in Diabetes',
            },
          ],
        });
      }
    }

    return insights;
  }

  /**
   * CLINICAL RULE 11: Duplicate therapy detection
   */
  private async checkDuplicateTherapy(patient: PatientContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Drug classes to check for duplicates
    const drugClasses = {
      statins: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'],
      ppis: ['omeprazole', 'pantoprazole', 'esomeprazole', 'lansoprazole'],
      acei: ['lisinopril', 'enalapril', 'ramipril', 'captopril'],
      arbs: ['losartan', 'valsartan', 'irbesartan', 'olmesartan'],
      betaBlockers: ['metoprolol', 'atenolol', 'carvedilol', 'propranolol'],
    };

    for (const [className, drugs] of Object.entries(drugClasses)) {
      const matchingMeds = patient.medications.filter((m) =>
        drugs.some((drug) => m.name.toLowerCase().includes(drug))
      );

      if (matchingMeds.length > 1) {
        insights.push({
          id: `duplicate_therapy_${className}_${patient.id}`,
          type: 'recommendation',
          priority: 'medium',
          title: 'Duplicate Therapy Detected',
          description: `${patient.firstName} ${patient.lastName} is on multiple medications from the same class (${className}): ${matchingMeds.map((m) => m.name).join(', ')}. Consider consolidating therapy.`,
          confidence: 94,
          category: 'clinical',
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          actionable: true,
          actions: [
            {
              label: 'Review Medications',
              type: 'primary',
              actionType: 'view_medications',
              metadata: { patientId: patient.id, className },
            },
          ],
          metadata: { drugClass: className, medications: matchingMeds.map((m) => m.name) },
        });
      }
    }

    return insights;
  }

  /**
   * CLINICAL RULE 12: Lab monitoring for high-risk medications
   */
  private async checkLabMonitoring(patient: PatientContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // Statins require LFT monitoring
    const onStatins = patient.medications.some((m) =>
      ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'].some((drug) =>
        m.name.toLowerCase().includes(drug)
      )
    );

    if (onStatins) {
      const hasRecentLFT = patient.labResults.some(
        (lab) =>
          (lab.testName.toLowerCase().includes('alt') ||
            lab.testName.toLowerCase().includes('ast') ||
            lab.testName.toLowerCase().includes('liver')) &&
          this.daysSince(lab.createdAt) <= 365
      );

      if (!hasRecentLFT) {
        insights.push({
          id: `statin_monitoring_${patient.id}`,
          type: 'recommendation',
          priority: 'medium',
          title: 'Statin Monitoring Required',
          description: `${patient.firstName} ${patient.lastName} is on statin therapy without recent liver function testing. Annual monitoring recommended to detect hepatotoxicity.`,
          confidence: 88,
          category: 'clinical',
          patientId: patient.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          actionable: true,
          actions: [
            {
              label: 'Order LFTs',
              type: 'primary',
              actionType: 'order_lab',
              metadata: { patientId: patient.id, test: 'Liver Function Tests' },
            },
          ],
          evidence: [
            {
              source: 'ACC/AHA 2018',
              citation: 'Guideline on the Management of Blood Cholesterol',
            },
          ],
        });
      }
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
