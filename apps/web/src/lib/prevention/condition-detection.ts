/**
 * AUTOMATED CONDITION DETECTION SERVICE
 *
 * Real-time detection of pre-existing conditions from clinical notes, problem lists,
 * medications, and lab results to trigger automated prevention plan generation.
 *
 * Supports:
 * - NLP-based condition detection from clinical notes
 * - ICD-10 code matching
 * - Medication-based inference
 * - Lab result pattern recognition
 *
 * International Guidelines Integration:
 * - WHO Global Prevention Protocols
 * - NHS England Prevention Toolkit
 * - ESC Cardiovascular Guidelines
 * - Canadian Task Force Recommendations
 * - Australian RACGP Red Book
 * - WHO Sickle Cell Disease Guidelines (2025)
 */

export type ConditionCategory =
  | 'cardiovascular'
  | 'metabolic'
  | 'hematologic'
  | 'respiratory'
  | 'renal'
  | 'endocrine'
  | 'oncology'
  | 'mental_health'
  | 'musculoskeletal'
  | 'gastrointestinal';

export type ConditionSeverity = 'mild' | 'moderate' | 'severe' | 'critical';

export interface DetectedCondition {
  id: string;
  name: string;
  category: ConditionCategory;
  severity?: ConditionSeverity;
  icd10Codes: string[];
  detectedFrom: 'clinical_note' | 'problem_list' | 'medication' | 'lab_result' | 'manual';
  confidence: number; // 0-100
  detectedAt: Date;
  relevantProtocols: string[]; // Protocol IDs from international guidelines
}

/**
 * Condition detection patterns for NLP analysis
 */
const CONDITION_PATTERNS: Record<string, {
  patterns: RegExp[];
  category: ConditionCategory;
  icd10Codes: string[];
  protocolIds: string[];
}> = {
  // =======================
  // CARDIOVASCULAR
  // =======================
  hypertension: {
    patterns: [
      /hypertension|high blood pressure|HTN|elevated BP/i,
      /BP\s*\d{3}\/\d{2,3}/i, // BP readings like "BP 160/95"
    ],
    category: 'cardiovascular',
    icd10Codes: ['I10', 'I11', 'I12', 'I13', 'I15'],
    protocolIds: ['bp-target-who-2025', 'dual-bp-therapy-nhs-2025'],
  },
  coronary_artery_disease: {
    patterns: [
      /coronary artery disease|CAD|ischemic heart disease|IHD/i,
      /myocardial infarction|MI|heart attack|STEMI|NSTEMI/i,
      /post[\s-]?MI|post myocardial infarction/i,
    ],
    category: 'cardiovascular',
    icd10Codes: ['I20', 'I21', 'I22', 'I23', 'I24', 'I25'],
    protocolIds: ['secondary-prevention-cad-esc-2025', 'lipid-nhs-2025', 'antiplatelet-esc-2025'],
  },
  heart_failure: {
    patterns: [
      /heart failure|HF|cardiac failure/i,
      /CHF|congestive heart failure/i,
      /reduced ejection fraction|HFrEF|HFpEF/i,
    ],
    category: 'cardiovascular',
    icd10Codes: ['I50'],
    protocolIds: ['heart-failure-management-esc-2025', 'fluid-management-nhs-2025'],
  },
  atrial_fibrillation: {
    patterns: [
      /atrial fibrillation|AFib|AF|A[\s-]?fib/i,
      /atrial flutter|AFL/i,
    ],
    category: 'cardiovascular',
    icd10Codes: ['I48'],
    protocolIds: ['stroke-prevention-afib-esc-2025', 'rate-control-esc-2025'],
  },

  // =======================
  // METABOLIC
  // =======================
  diabetes_type_1: {
    patterns: [
      /diabetes type 1|T1DM|type 1 diabetes|insulin[\s-]dependent diabetes|IDDM/i,
      /juvenile diabetes/i,
    ],
    category: 'metabolic',
    icd10Codes: ['E10'],
    protocolIds: ['t1dm-management-ada-2025', 'retinopathy-screening-ada-2025'],
  },
  diabetes_type_2: {
    patterns: [
      /diabetes type 2|T2DM|type 2 diabetes|non[\s-]insulin[\s-]dependent diabetes|NIDDM/i,
      /adult[\s-]onset diabetes/i,
    ],
    category: 'metabolic',
    icd10Codes: ['E11'],
    protocolIds: ['t2dm-management-ada-2025', 'metformin-therapy-ada-2025', 'cardiovascular-risk-reduction-ada-2025'],
  },
  prediabetes: {
    patterns: [
      /prediabetes|pre[\s-]diabetes/i,
      /impaired fasting glucose|IFG/i,
      /impaired glucose tolerance|IGT/i,
      /HbA1c\s*5\.[7-9]|HbA1c\s*6\.[0-4]/i, // HbA1c 5.7-6.4%
    ],
    category: 'metabolic',
    icd10Codes: ['R73.03', 'R73.09'],
    protocolIds: ['prediabetes-prevention-ada-2025', 'lifestyle-intervention-who-2025'],
  },
  obesity: {
    patterns: [
      /obesity|obese/i,
      /BMI\s*[3-9]\d/i, // BMI 30+
      /morbid obesity|class III obesity/i,
    ],
    category: 'metabolic',
    icd10Codes: ['E66'],
    protocolIds: ['weight-management-racgp-2025', 'metabolic-syndrome-screening-who-2025'],
  },
  hyperlipidemia: {
    patterns: [
      /hyperlipidemia|dyslipidemia|hypercholesterolemia/i,
      /high cholesterol|elevated LDL|elevated triglycerides/i,
    ],
    category: 'metabolic',
    icd10Codes: ['E78'],
    protocolIds: ['lipid-nhs-2025', 'statin-therapy-esc-2025', 'inclisiran-nhs-2025'],
  },

  // =======================
  // HEMATOLOGIC
  // =======================
  sickle_cell_anemia: {
    patterns: [
      /sickle cell anemia|SCA|sickle cell disease|SCD/i,
      /hemoglobin SS|HbSS|hemoglobin SC|HbSC/i,
      /sickle[\s-]?cell/i,
    ],
    category: 'hematologic',
    icd10Codes: ['D57'],
    protocolIds: [
      'scd-pregnancy-who-2025',
      'scd-pain-management-nascc-2025',
      'scd-iron-overload-monitoring-nascc-2025',
      'hydroxyurea-therapy-nascc-2025',
    ],
  },
  thalassemia: {
    patterns: [
      /thalassemia|thalassaemia/i,
      /beta[\s-]?thalassemia|alpha[\s-]?thalassemia/i,
    ],
    category: 'hematologic',
    icd10Codes: ['D56'],
    protocolIds: ['thalassemia-iron-overload-monitoring', 'transfusion-management'],
  },
  anemia_iron_deficiency: {
    patterns: [
      /iron deficiency anemia|IDA/i,
      /ferritin\s*<\s*\d{1,2}\b/i, // Ferritin < 30
      /microcytic anemia/i,
    ],
    category: 'hematologic',
    icd10Codes: ['D50'],
    protocolIds: ['iron-supplementation-who-2025', 'gi-bleeding-workup'],
  },

  // =======================
  // RESPIRATORY
  // =======================
  asthma: {
    patterns: [
      /asthma|reactive airway disease|RAD/i,
      /bronchospasm/i,
    ],
    category: 'respiratory',
    icd10Codes: ['J45'],
    protocolIds: ['asthma-management-racgp-2025', 'inhaler-technique-optimization'],
  },
  copd: {
    patterns: [
      /COPD|chronic obstructive pulmonary disease/i,
      /emphysema|chronic bronchitis/i,
    ],
    category: 'respiratory',
    icd10Codes: ['J44'],
    protocolIds: ['copd-management-racgp-2025', 'smoking-cessation-ctf-2025', 'pulmonary-rehab'],
  },
  sleep_apnea: {
    patterns: [
      /sleep apnea|obstructive sleep apnea|OSA/i,
      /CPAP|BiPAP/i,
    ],
    category: 'respiratory',
    icd10Codes: ['G47.33'],
    protocolIds: ['cpap-compliance-monitoring', 'cardiovascular-risk-osa-management'],
  },

  // =======================
  // RENAL
  // =======================
  chronic_kidney_disease: {
    patterns: [
      /chronic kidney disease|CKD|chronic renal disease|CRD/i,
      /renal insufficiency|renal impairment/i,
      /eGFR\s*[1-5]\d/i, // eGFR 10-59
    ],
    category: 'renal',
    icd10Codes: ['N18'],
    protocolIds: ['ckd-management-kdigo-2025', 'ace-inhibitor-therapy-ckd', 'anemia-ckd-management'],
  },

  // =======================
  // ENDOCRINE
  // =======================
  hypothyroidism: {
    patterns: [
      /hypothyroidism|underactive thyroid/i,
      /TSH\s*>\s*\d{1,2}/i, // TSH > 10
      /Hashimoto|autoimmune thyroiditis/i,
    ],
    category: 'endocrine',
    icd10Codes: ['E03'],
    protocolIds: ['hypothyroidism-management', 'levothyroxine-monitoring'],
  },
  hyperthyroidism: {
    patterns: [
      /hyperthyroidism|overactive thyroid|thyrotoxicosis/i,
      /Graves disease|toxic nodular goiter/i,
    ],
    category: 'endocrine',
    icd10Codes: ['E05'],
    protocolIds: ['hyperthyroidism-management', 'cardiovascular-monitoring-hyperthyroid'],
  },
  osteoporosis: {
    patterns: [
      /osteoporosis|osteopenia/i,
      /FRAX score/i,
      /bone density|DEXA scan/i,
    ],
    category: 'endocrine',
    icd10Codes: ['M80', 'M81'],
    protocolIds: ['osteoporosis-management-racgp-2025', 'fall-prevention-ctf-2025', 'bisphosphonate-therapy'],
  },

  // =======================
  // ONCOLOGY
  // =======================
  breast_cancer_history: {
    patterns: [
      /breast cancer history|history of breast cancer|breast CA|breast carcinoma/i,
      /post[\s-]?mastectomy|lumpectomy/i,
    ],
    category: 'oncology',
    icd10Codes: ['Z85.3'],
    protocolIds: ['breast-cancer-surveillance-acs-2025', 'bone-health-breast-cancer-survivors'],
  },
  colon_cancer_history: {
    patterns: [
      /colon cancer history|colorectal cancer history|CRC history/i,
      /post[\s-]?colectomy/i,
    ],
    category: 'oncology',
    icd10Codes: ['Z85.038', 'Z85.048'],
    protocolIds: ['colonoscopy-surveillance-acs-2025', 'cea-monitoring'],
  },

  // =======================
  // MENTAL HEALTH
  // =======================
  depression: {
    patterns: [
      /depression|major depressive disorder|MDD/i,
      /PHQ[\s-]?9/i,
      /dysthymia|persistent depressive disorder/i,
    ],
    category: 'mental_health',
    icd10Codes: ['F32', 'F33'],
    protocolIds: ['depression-screening-racgp-2025', 'suicide-risk-assessment-racgp-2025'],
  },
  anxiety: {
    patterns: [
      /anxiety|generalized anxiety disorder|GAD/i,
      /panic disorder|social anxiety/i,
      /GAD[\s-]?7/i,
    ],
    category: 'mental_health',
    icd10Codes: ['F41'],
    protocolIds: ['anxiety-management-racgp-2025', 'stress-reduction-interventions'],
  },
};

/**
 * Medication-to-condition inference mapping
 */
const MEDICATION_INFERENCE: Record<string, {
  conditions: string[];
  confidence: number;
}> = {
  // Diabetes medications
  'metformin': { conditions: ['diabetes_type_2', 'prediabetes'], confidence: 95 },
  'insulin': { conditions: ['diabetes_type_1', 'diabetes_type_2'], confidence: 90 },
  'glipizide': { conditions: ['diabetes_type_2'], confidence: 95 },
  'semaglutide': { conditions: ['diabetes_type_2', 'obesity'], confidence: 90 },

  // Cardiovascular medications
  'lisinopril': { conditions: ['hypertension', 'heart_failure', 'chronic_kidney_disease'], confidence: 80 },
  'losartan': { conditions: ['hypertension', 'chronic_kidney_disease'], confidence: 80 },
  'amlodipine': { conditions: ['hypertension', 'coronary_artery_disease'], confidence: 80 },
  'atorvastatin': { conditions: ['hyperlipidemia', 'coronary_artery_disease'], confidence: 85 },
  'clopidogrel': { conditions: ['coronary_artery_disease', 'atrial_fibrillation'], confidence: 85 },
  'warfarin': { conditions: ['atrial_fibrillation'], confidence: 90 },
  'apixaban': { conditions: ['atrial_fibrillation'], confidence: 90 },

  // Sickle cell medications
  'hydroxyurea': { conditions: ['sickle_cell_anemia'], confidence: 98 },

  // Respiratory medications
  'albuterol': { conditions: ['asthma', 'copd'], confidence: 85 },
  'fluticasone': { conditions: ['asthma', 'copd'], confidence: 85 },

  // Thyroid medications
  'levothyroxine': { conditions: ['hypothyroidism'], confidence: 95 },
  'methimazole': { conditions: ['hyperthyroidism'], confidence: 95 },

  // Mental health medications
  'sertraline': { conditions: ['depression', 'anxiety'], confidence: 80 },
  'escitalopram': { conditions: ['depression', 'anxiety'], confidence: 80 },
};

/**
 * Detect conditions from clinical note text using NLP patterns
 */
export function detectConditionsFromText(
  clinicalNote: string
): DetectedCondition[] {
  const detectedConditions: DetectedCondition[] = [];
  const now = new Date();

  for (const [conditionKey, config] of Object.entries(CONDITION_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(clinicalNote)) {
        // Calculate confidence based on pattern specificity
        let confidence = 85; // Base confidence for pattern match

        // Increase confidence if ICD-10 code explicitly mentioned
        for (const icd10 of config.icd10Codes) {
          if (clinicalNote.includes(icd10)) {
            confidence = 95;
            break;
          }
        }

        detectedConditions.push({
          id: `${conditionKey}-${Date.now()}`,
          name: conditionKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          category: config.category,
          icd10Codes: config.icd10Codes,
          detectedFrom: 'clinical_note',
          confidence,
          detectedAt: now,
          relevantProtocols: config.protocolIds,
        });

        // Only match once per condition
        break;
      }
    }
  }

  return detectedConditions;
}

/**
 * Infer conditions from medication list
 */
export function inferConditionsFromMedications(
  medications: Array<{ name: string; startDate?: Date }>
): DetectedCondition[] {
  const detectedConditions: DetectedCondition[] = [];
  const now = new Date();

  for (const medication of medications) {
    const medicationNameLower = medication.name.toLowerCase();

    for (const [medName, inference] of Object.entries(MEDICATION_INFERENCE)) {
      if (medicationNameLower.includes(medName)) {
        for (const conditionKey of inference.conditions) {
          const config = CONDITION_PATTERNS[conditionKey];
          if (!config) continue;

          detectedConditions.push({
            id: `${conditionKey}-med-${Date.now()}`,
            name: conditionKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            category: config.category,
            icd10Codes: config.icd10Codes,
            detectedFrom: 'medication',
            confidence: inference.confidence,
            detectedAt: now,
            relevantProtocols: config.protocolIds,
          });
        }

        break; // Only match first medication pattern
      }
    }
  }

  return detectedConditions;
}

/**
 * Detect conditions from ICD-10 codes (problem list)
 */
export function detectConditionsFromICD10(
  icd10Codes: string[]
): DetectedCondition[] {
  const detectedConditions: DetectedCondition[] = [];
  const now = new Date();

  for (const icd10Code of icd10Codes) {
    for (const [conditionKey, config] of Object.entries(CONDITION_PATTERNS)) {
      // Match ICD-10 codes (partial match for subcategories)
      const matchesICD10 = config.icd10Codes.some((code) =>
        icd10Code.startsWith(code)
      );

      if (matchesICD10) {
        detectedConditions.push({
          id: `${conditionKey}-icd10-${Date.now()}`,
          name: conditionKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          category: config.category,
          icd10Codes: config.icd10Codes,
          detectedFrom: 'problem_list',
          confidence: 100, // ICD-10 codes from problem list are definitive
          detectedAt: now,
          relevantProtocols: config.protocolIds,
        });

        break; // Only match once per ICD-10 code
      }
    }
  }

  return detectedConditions;
}

/**
 * Deduplicate detected conditions (prefer higher confidence)
 */
export function deduplicateConditions(
  conditions: DetectedCondition[]
): DetectedCondition[] {
  const conditionMap = new Map<string, DetectedCondition>();

  for (const condition of conditions) {
    const existingCondition = conditionMap.get(condition.name);

    if (!existingCondition || condition.confidence > existingCondition.confidence) {
      conditionMap.set(condition.name, condition);
    }
  }

  return Array.from(conditionMap.values());
}

/**
 * Main function: Comprehensive condition detection
 */
export async function detectConditionsForPatient(input: {
  clinicalNote?: string;
  medications?: Array<{ name: string; startDate?: Date }>;
  icd10Codes?: string[];
}): Promise<DetectedCondition[]> {
  let allConditions: DetectedCondition[] = [];

  // Detect from clinical note
  if (input.clinicalNote) {
    const noteConditions = detectConditionsFromText(input.clinicalNote);
    allConditions = [...allConditions, ...noteConditions];
  }

  // Infer from medications
  if (input.medications && input.medications.length > 0) {
    const medConditions = inferConditionsFromMedications(input.medications);
    allConditions = [...allConditions, ...medConditions];
  }

  // Detect from ICD-10 codes
  if (input.icd10Codes && input.icd10Codes.length > 0) {
    const icd10Conditions = detectConditionsFromICD10(input.icd10Codes);
    allConditions = [...allConditions, ...icd10Conditions];
  }

  // Deduplicate conditions
  const uniqueConditions = deduplicateConditions(allConditions);

  // Sort by confidence (highest first)
  uniqueConditions.sort((a, b) => b.confidence - a.confidence);

  return uniqueConditions;
}

/**
 * Get conditions by category
 */
export function getConditionsByCategory(
  conditions: DetectedCondition[],
  category: ConditionCategory
): DetectedCondition[] {
  return conditions.filter((c) => c.category === category);
}

/**
 * Get high-confidence conditions (confidence >= 90)
 */
export function getHighConfidenceConditions(
  conditions: DetectedCondition[]
): DetectedCondition[] {
  return conditions.filter((c) => c.confidence >= 90);
}

/**
 * Check if patient has specific condition
 */
export function hasCondition(
  conditions: DetectedCondition[],
  conditionName: string
): boolean {
  return conditions.some(
    (c) => c.name.toLowerCase().includes(conditionName.toLowerCase())
  );
}
