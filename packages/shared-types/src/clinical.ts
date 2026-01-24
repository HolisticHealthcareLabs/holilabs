/**
 * Clinical Type Definitions
 *
 * Law 2 Compliance: Shared Types Treaty
 * This is the Single Source of Truth for all clinical types.
 *
 * Both AI Scribe Agent and Prevention Hub Agent must import from here.
 * The Check: "Do both agents import PatientState from the same file?"
 */

// ═══════════════════════════════════════════════════════════════
// SYMPTOM-TO-DIAGNOSIS TYPES
// ═══════════════════════════════════════════════════════════════

export interface SymptomInput {
  chiefComplaint: string;
  duration?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  associatedSymptoms?: string[];
  aggravatingFactors?: string[];
  relievingFactors?: string[];
}

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'fallback';

export interface DifferentialDiagnosis {
  icd10Code: string;
  name: string;
  probability: number; // 0-1, AI-generated
  confidence: ConfidenceLevel;
  reasoning: string;
  redFlags: string[];
  workupSuggestions: string[];
  source: 'ai' | 'rule-based' | 'hybrid';
}

export interface DiagnosisOutput {
  differentials: DifferentialDiagnosis[];
  urgency: 'emergent' | 'urgent' | 'routine';
  processingMethod: 'ai' | 'fallback' | 'hybrid';
  fallbackReason?: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// TREATMENT PROTOCOL TYPES
// ═══════════════════════════════════════════════════════════════

export interface TreatmentProtocol {
  id: string;
  version: string;
  conditionIcd10: string;
  guidelineSource: string; // "ACC/AHA 2022", "ADA 2024"
  guidelineUrl?: string;
  effectiveDate: string;
  expirationDate?: string;

  // Eligibility criteria (Logic-as-Data)
  eligibilityCriteria: EligibilityCriterion[];

  // Treatment steps
  recommendations: TreatmentRecommendation[];
}

export interface EligibilityCriterion {
  field: string; // "age", "labs.hba1c", "diagnoses.includes"
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn' | 'contains';
  value: unknown;
  required: boolean;
}

export interface TreatmentRecommendation {
  id: string;
  type: 'medication' | 'lab' | 'referral' | 'lifestyle' | 'monitoring';
  priority: 'required' | 'recommended' | 'consider';

  // For medications
  medication?: {
    name: string;
    rxNormCode: string;
    dose: string;
    frequency: string;
    duration?: string;
  };

  // For labs
  labOrder?: {
    name: string;
    loincCode: string;
    frequency: string;
  };

  rationale: string;
  evidenceGrade: 'A' | 'B' | 'C' | 'D' | 'expert-opinion';
  contraindications: string[];
}

// ═══════════════════════════════════════════════════════════════
// MEDICATION ADHERENCE TYPES
// ═══════════════════════════════════════════════════════════════

export interface AdherenceAssessment {
  patientId: string;
  overallScore: number; // 0-100
  riskLevel: 'low' | 'moderate' | 'high';
  medications: MedicationAdherence[];
  interventions: AdherenceIntervention[];
  processingMethod: 'ai' | 'fallback' | 'hybrid';
}

export interface MedicationAdherence {
  medicationId: string;
  medicationName: string;
  adherenceScore: number; // 0-100 based on refill patterns
  daysSupplyRemaining: number;
  lastRefillDate: string | null;
  expectedRefillDate: string | null;
  missedRefills: number;
  riskFactors: string[];
}

export interface AdherenceIntervention {
  type: 'reminder' | 'education' | 'simplification' | 'cost' | 'followup';
  priority: 'high' | 'medium' | 'low';
  description: string;
  targetMedication?: string;
}

// ═══════════════════════════════════════════════════════════════
// CLINICAL ALERT TYPES
// ═══════════════════════════════════════════════════════════════

export interface ClinicalAlert {
  type:
    | 'VITAL_CRITICAL'
    | 'RECONCILIATION_NEEDED'
    | 'DRUG_INTERACTION'
    | 'ALLERGY_WARNING'
    | 'CARE_GAP'
    | 'ADHERENCE_RISK';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  items?: string[];
  recommendation?: string;
  createdAt?: string;
}
