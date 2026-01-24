/**
 * Patient Type Definitions
 *
 * Law 2 Compliance: Shared Types Treaty
 * Single Source of Truth for patient-related types.
 *
 * Law 7 Compliance: Context Merging
 * These types support merging real-time AI output with historical patient data.
 */

import type { ClinicalAlert } from './clinical';

// ═══════════════════════════════════════════════════════════════
// PATIENT CORE TYPES
// ═══════════════════════════════════════════════════════════════

export interface Diagnosis {
  id: string;
  icd10Code: string;
  name: string;
  clinicalStatus: 'ACTIVE' | 'RESOLVED' | 'INACTIVE' | 'RECURRENCE';
  onsetDate?: string;
  recordedDate?: string;
}

export interface Medication {
  id: string;
  name: string;
  rxNormCode?: string;
  dose?: string;
  frequency?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'STOPPED' | 'UNVERIFIED';
  source?: 'EHR' | 'AI_SCRIBE' | 'PATIENT_REPORTED';
  needsReconciliation?: boolean;
  startDate?: string;
}

export interface Allergy {
  id: string;
  allergen: string;
  type: 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  status: 'ACTIVE' | 'INACTIVE' | 'UNVERIFIED';
  source?: 'EHR' | 'AI_SCRIBE' | 'PATIENT_REPORTED';
  needsReconciliation?: boolean;
}

export interface LabResult {
  id: string;
  name: string;
  loincCode?: string;
  value: string | number;
  unit: string;
  referenceRange?: string;
  interpretation?: 'normal' | 'abnormal' | 'critical';
  resultDate: string;
}

export interface RiskScore {
  id: string;
  type: string; // 'ASCVD', 'DIABETES_RISK', 'FALL_RISK', etc.
  score: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'very-high';
  calculatedAt: string;
  inputs?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// VITAL SIGNS
// ═══════════════════════════════════════════════════════════════

export interface RealTimeVitals {
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  recordedAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// PATIENT CONTEXT (for rules engine input)
// ═══════════════════════════════════════════════════════════════

/**
 * PatientContext contains the data needed for clinical decision support.
 * Used as input to symptom diagnosis and treatment protocol engines.
 */
export interface PatientContext {
  patientId: string;
  age: number;
  sex: 'M' | 'F' | 'O';

  // Medical history
  diagnoses?: Diagnosis[];
  medications?: Medication[];
  allergies?: Allergy[];
  recentLabs?: LabResult[];
  riskScores?: RiskScore[];

  // Lifestyle factors
  isSmoker?: boolean;
  hasDiabetes?: boolean;
  hasHypertension?: boolean;
  hasCKD?: boolean;
  hasCAD?: boolean;

  // Vitals
  currentVitals?: RealTimeVitals;
}

// ═══════════════════════════════════════════════════════════════
// MERGED PATIENT STATE (Context Merging - Law 7)
// ═══════════════════════════════════════════════════════════════

/**
 * MergedPatientState is the result of combining:
 * - Real-time data from AI Scribe (Layer 1: Probabilistic)
 * - Historical data from database (deterministic)
 *
 * This is the input to the Rules Engine (Layer 2: Deterministic).
 *
 * Law 7 Check: "Does the rules engine receive PatientState that includes
 * BOTH real-time vitals AND historical diagnoses/medications?"
 */
export interface MergedPatientState {
  // Patient identity
  patientId: string;
  age: number;
  sex: 'M' | 'F' | 'O';

  // Historical context (from database)
  historicalDiagnoses: Diagnosis[];
  currentMedications: Medication[];
  knownAllergies: Allergy[];
  recentLabResults: LabResult[];
  riskScores: RiskScore[];

  // Real-time context (from AI scribe)
  currentVitals: RealTimeVitals;
  chiefComplaint: string;
  currentSymptoms: string[];

  // Merged alerts
  activeAlerts: ClinicalAlert[];

  // Metadata
  mergedAt: string;
  dataFreshness: {
    historicalAsOf: string;
    realTimeAsOf: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// PATIENT STATE (Legacy compatibility)
// ═══════════════════════════════════════════════════════════════

/**
 * PatientState is an alias for MergedPatientState for backwards compatibility.
 *
 * @deprecated Use MergedPatientState for new code
 */
export type PatientState = MergedPatientState;
