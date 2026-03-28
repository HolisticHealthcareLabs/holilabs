import type { MedicalDiscipline } from '@prisma/client';

export type EvidenceTier = 'TIER_1_GUIDELINE' | 'TIER_2_CONSENSUS' | 'PENDING_CLINICAL_REVIEW';

export interface ClinicalProvenance {
  sourceAuthority: string;
  citationUrl: string;
  evidenceTier: EvidenceTier;
  lastReviewedDate?: string;
}

export interface DisciplineConfig {
  discipline: MedicalDiscipline;
  displayName: string;
  description: string;
  jurisdictions: ('BR' | 'CO' | 'BO')[];

  screeningRuleIds: string[];
  screeningFilters: {
    ageRange?: [number, number];
    biologicalSex?: ('MALE' | 'FEMALE')[];
    requiredConditionIcd10?: string[];
    excludeConditionIcd10?: string[];
    pregnancyRelevant?: boolean;
  };

  riskWeights: Record<string, {
    weight: number;
    sourceAuthority: string;
    evidenceTier: EvidenceTier;
  }>;

  interventionPriority: Array<{
    code: string;
    description: string;
    urgency: 'EMERGENT' | 'URGENT' | 'ROUTINE' | 'PREVENTIVE';
    sourceAuthority: string;
    evidenceTier: EvidenceTier;
  }>;

  monitoringSchedule: Array<{
    biomarkerCode: string;
    intervalDays: number;
    conditionTrigger?: string;
    sourceAuthority: string;
  }>;

  referralTriggers: Array<{
    condition: object;
    urgency: 'EMERGENT' | 'URGENT' | 'ROUTINE';
    description: string;
    sourceAuthority: string;
  }>;

  jurisdictionOverrides?: Record<'BR' | 'CO' | 'BO', Partial<DisciplineConfig>>;
}

export interface PatientDisciplineInput {
  patientId: string;
  age: number;
  biologicalSex: 'MALE' | 'FEMALE';
  icd10Codes: string[];
  activeMedications: string[];
  lastScreenings: Record<string, Date>;
  labResults: Record<string, { value: number; date: Date }>;
  riskFactors: string[];
  jurisdiction: 'BR' | 'CO' | 'BO';
  isPregnant?: boolean;
}

export interface ScreeningRecommendation {
  ruleName: string;
  screeningType: string;
  dueDate: Date | null;
  overdue: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceAuthority: string;
}

export interface RiskAssessment {
  factor: string;
  weight: number;
  present: boolean;
  sourceAuthority: string;
  evidenceTier: EvidenceTier;
}

export interface InterventionRecommendation {
  code: string;
  description: string;
  urgency: 'EMERGENT' | 'URGENT' | 'ROUTINE' | 'PREVENTIVE';
  applicable: boolean;
  sourceAuthority: string;
}

export interface MonitoringDueItem {
  biomarkerCode: string;
  nextDueDate: Date;
  overdue: boolean;
  intervalDays: number;
  sourceAuthority: string;
}

export interface ReferralRecommendation {
  targetDiscipline?: string;
  urgency: 'EMERGENT' | 'URGENT' | 'ROUTINE';
  description: string;
  triggered: boolean;
  sourceAuthority: string;
}

export interface DisciplineContextOutput {
  discipline: MedicalDiscipline;
  patientId: string;
  applicableScreenings: ScreeningRecommendation[];
  riskAssessment: RiskAssessment[];
  prioritizedInterventions: InterventionRecommendation[];
  monitoringSchedule: MonitoringDueItem[];
  referralRecommendations: ReferralRecommendation[];
  metadata: {
    generatedAt: Date;
    jurisdiction: 'BR' | 'CO' | 'BO';
    configVersion: string;
  };
}
