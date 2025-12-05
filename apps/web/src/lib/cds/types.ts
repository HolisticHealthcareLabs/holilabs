/**
 * Clinical Decision Support (CDS) Types
 *
 * Based on CDS Hooks 2.0 and HL7 FHIR Clinical Reasoning standards
 * Adapted from: https://cds-hooks.org/ and https://www.opencds.org/
 *
 * @compliance HL7 FHIR, CDS Hooks 2.0
 */

/**
 * Alert severity levels (based on CDS Hooks)
 */
export type CDSAlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Alert categories
 */
export type CDSAlertCategory =
  | 'drug-interaction'
  | 'allergy'
  | 'guideline-recommendation'
  | 'lab-abnormal'
  | 'preventive-care'
  | 'duplicate-therapy'
  | 'contraindication'
  | 'dosing-guidance';

/**
 * CDS Hook types (workflow triggers)
 */
export type CDSHookType =
  | 'patient-view'         // Opening patient chart
  | 'medication-prescribe' // Prescribing medication
  | 'order-select'         // Selecting orders
  | 'order-sign'           // Signing orders
  | 'encounter-start'      // Starting encounter
  | 'encounter-discharge'; // Discharging patient

/**
 * Evidence strength rating (GRADE system)
 */
export type EvidenceStrength = 'A' | 'B' | 'C' | 'D' | 'insufficient';

/**
 * Action type for CDS card
 */
export type CDSActionType = 'create' | 'update' | 'delete';

/**
 * CDS Alert/Card (based on CDS Hooks Card)
 */
export interface CDSAlert {
  id: string;
  ruleId?: string; // ID of the rule that generated this alert
  summary: string;
  detail?: string;
  severity: CDSAlertSeverity;
  category: CDSAlertCategory;
  indicator: 'info' | 'warning' | 'critical'; // Visual indicator
  source: {
    label: string;
    url?: string;
    icon?: string;
  };
  suggestions?: CDSSuggestion[];
  links?: CDSLink[];
  selectionBehavior?: 'at-most-one' | 'any';
  overrideReasons?: string[];
  timestamp: string;
  expiresAt?: string;
}

/**
 * CDS Suggestion (actionable recommendation)
 */
export interface CDSSuggestion {
  label: string;
  uuid?: string;
  actions?: CDSAction[];
  isRecommended?: boolean;
}

/**
 * CDS Action (FHIR resource modification)
 */
export interface CDSAction {
  type: CDSActionType;
  description: string;
  resource?: any; // FHIR Resource
}

/**
 * CDS Link (external resource)
 */
export interface CDSLink {
  label: string;
  url: string;
  type: 'absolute' | 'smart';
  appContext?: string;
}

/**
 * Clinical context for CDS evaluation
 */
export interface CDSContext {
  patientId: string;
  encounterId?: string;
  userId: string; // Clinician ID
  hookInstance: string; // UUID for this hook invocation
  hookType: CDSHookType;
  context: {
    patientId: string;
    encounterId?: string;
    medications?: Medication[];
    allergies?: Allergy[];
    conditions?: Condition[];
    labResults?: LabResult[];
    vitalSigns?: VitalSigns;
    demographics?: PatientDemographics;
  };
  prefetch?: {
    [key: string]: any; // Pre-fetched FHIR resources
  };
}

/**
 * Medication (simplified FHIR MedicationRequest)
 */
export interface Medication {
  id: string;
  name: string;
  genericName?: string;
  rxNormCode?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  endDate?: string;
  prescriberId?: string;
  status: 'active' | 'completed' | 'discontinued' | 'draft';
}

/**
 * Allergy (simplified FHIR AllergyIntolerance)
 */
export interface Allergy {
  id: string;
  allergen: string;
  allergenCode?: string;
  reaction?: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  onsetDate?: string;
  verificationStatus: 'confirmed' | 'unconfirmed' | 'refuted';
}

/**
 * Condition (simplified FHIR Condition)
 */
export interface Condition {
  id: string;
  code: string;
  display: string;
  icd10Code?: string;
  snomedCode?: string;
  clinicalStatus: 'active' | 'recurrence' | 'relapse' | 'inactive' | 'remission' | 'resolved';
  verificationStatus: 'confirmed' | 'provisional' | 'differential' | 'refuted';
  onsetDate?: string;
  recordedDate: string;
}

/**
 * Lab Result (simplified FHIR Observation)
 */
export interface LabResult {
  id: string;
  testName: string;
  loincCode?: string;
  value: string | number;
  unit?: string;
  referenceRange?: string;
  interpretation?: 'normal' | 'low' | 'high' | 'critical';
  effectiveDate: string;
  status: 'final' | 'preliminary' | 'amended';
}

/**
 * Vital Signs
 */
export interface VitalSigns {
  temperature?: number; // Fahrenheit
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number; // kg
  height?: number; // cm
  bmi?: number;
  recordedAt?: string;
}

/**
 * Patient Demographics
 */
export interface PatientDemographics {
  age: number;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  pregnant?: boolean;
  breastfeeding?: boolean;
  smoking?: boolean;
  alcohol?: boolean;
}

/**
 * Clinical Guideline
 */
export interface ClinicalGuideline {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceUrl?: string;
  evidenceStrength: EvidenceStrength;
  conditions: string[]; // ICD-10 codes
  recommendations: GuidelineRecommendation[];
  datePublished: string;
  dateLastUpdated: string;
  version: string;
}

/**
 * Guideline Recommendation
 */
export interface GuidelineRecommendation {
  id: string;
  text: string;
  strength: 'strong' | 'weak' | 'conditional';
  evidenceLevel: EvidenceStrength;
  category: 'screening' | 'treatment' | 'prevention' | 'diagnostic' | 'monitoring';
  population?: string;
  contraindications?: string[];
  considerations?: string[];
}

/**
 * Drug Interaction
 */
export interface DrugInteraction {
  id: string;
  drug1: {
    name: string;
    rxNormCode?: string;
  };
  drug2: {
    name: string;
    rxNormCode?: string;
  };
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  clinicalEffects?: string;
  management?: string;
  documentation: 'excellent' | 'good' | 'fair' | 'poor';
  source: string;
}

/**
 * CDS Rule Definition
 */
export interface CDSRule {
  id: string;
  name: string;
  description: string;
  category: CDSAlertCategory;
  severity: CDSAlertSeverity;
  triggerHooks: CDSHookType[];
  condition: (context: CDSContext) => boolean;
  evaluate: (context: CDSContext) => CDSAlert | null;
  priority: number; // 1-10, higher = more important
  enabled: boolean;
  evidenceStrength?: EvidenceStrength;
  source?: string;
  sourceUrl?: string;
}

/**
 * CDS Service Configuration
 */
export interface CDSServiceConfig {
  id: string;
  name: string;
  title: string;
  description: string;
  hook: CDSHookType;
  prefetch?: {
    [key: string]: string; // FHIR query
  };
  useTwoWaySSL?: boolean;
}

/**
 * CDS Response (based on CDS Hooks response)
 */
export interface CDSResponse {
  cards: CDSAlert[];
  systemActions?: CDSAction[];
}

/**
 * CDS Evaluation Result
 */
export interface CDSEvaluationResult {
  timestamp: string;
  hookType: CDSHookType;
  context: {
    patientId: string;
    encounterId?: string;
    userId: string;
  };
  alerts: CDSAlert[];
  rulesEvaluated: number;
  rulesFired: number;
  processingTime: number;
}
