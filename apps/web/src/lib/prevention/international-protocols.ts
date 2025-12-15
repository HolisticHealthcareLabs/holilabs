/**
 * INTERNATIONAL PREVENTION PROTOCOLS DATABASE
 *
 * Comprehensive database of evidence-based prevention protocols from:
 * - WHO Global Prevention (2025)
 * - NHS England Prevention Toolkit (October 2025)
 * - European Society of Cardiology Guidelines (2025)
 * - Canadian Task Force on Preventive Health Care (2025)
 * - Australian RACGP Red Book 10th Edition (August 2025)
 * - WHO Sickle Cell Disease Guidelines (June 2025)
 * - NASCC Sickle Cell Consensus (January 2025)
 */

export type ProtocolPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type EvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'Consensus';
export type ProtocolSource = 'WHO' | 'NHS' | 'ESC' | 'CTF' | 'RACGP' | 'NASCC' | 'ADA' | 'KDIGO' | 'ACS';

export interface PreventionProtocol {
  id: string;
  name: string;
  description: string;
  conditionKey: string; // Links to condition detection system
  source: ProtocolSource;
  guidelineVersion: string; // e.g., "2025", "October 2025"
  priority: ProtocolPriority;
  evidenceGrade: EvidenceGrade;
  applicabilityCriteria?: {
    ageMin?: number;
    ageMax?: number;
    gender?: 'male' | 'female';
    pregnancy?: boolean;
    labValueThresholds?: Record<string, { min?: number; max?: number }>;
  };
  interventions: Array<{
    category: 'medication' | 'lifestyle' | 'screening' | 'referral' | 'education' | 'monitoring';
    intervention: string;
    evidence: string;
    frequency?: string;
  }>;
  guidelineUrl?: string;
  clinicalNotes?: string;
}

/**
 * International Prevention Protocols Database
 */
export const INTERNATIONAL_PROTOCOLS: Record<string, PreventionProtocol[]> = {
  // ========================================
  // SICKLE CELL ANEMIA
  // ========================================
  sickle_cell_anemia: [
    {
      id: 'scd-pregnancy-who-2025',
      name: 'WHO SCD Pregnancy Management (2025)',
      description: 'First global guideline for managing sickle cell disease during pregnancy, childbirth, and interpregnancy period. Women with SCD have 4-11x higher maternal mortality risk.',
      conditionKey: 'sickle_cell_anemia',
      source: 'WHO',
      guidelineVersion: 'June 2025',
      priority: 'CRITICAL',
      evidenceGrade: 'A',
      applicabilityCriteria: {
        gender: 'female',
        ageMin: 15,
        ageMax: 49,
        pregnancy: true,
      },
      interventions: [
        {
          category: 'medication',
          intervention: 'Folic acid 5mg daily (increased dose for SCD, higher than standard 400mcg prenatal)',
          evidence: 'WHO 2025 - Grade A: Prevents neural tube defects and compensates for increased red cell turnover',
          frequency: 'daily',
        },
        {
          category: 'medication',
          intervention: 'Iron supplementation (adjusted for malaria-endemic areas per WHO guidelines)',
          evidence: 'WHO 2025 - Grade B: Tailored dosing based on ferritin levels and geographic location',
          frequency: 'daily if indicated',
        },
        {
          category: 'screening',
          intervention: 'Pre-eclampsia screening every prenatal visit (BP, proteinuria, symptoms)',
          evidence: 'WHO 2025 - Grade A: SCD increases pre-eclampsia risk significantly',
          frequency: 'every visit',
        },
        {
          category: 'monitoring',
          intervention: 'Monthly hemoglobin monitoring (more frequent if anemia worsens)',
          evidence: 'WHO 2025 - Grade B: Detect worsening anemia early',
          frequency: 'monthly',
        },
        {
          category: 'screening',
          intervention: 'Fetal growth surveillance ultrasound every 4 weeks starting at 24 weeks gestation',
          evidence: 'WHO 2025 - Grade B: Higher risk of intrauterine growth restriction (IUGR)',
          frequency: 'every 4 weeks after 24 weeks',
        },
        {
          category: 'referral',
          intervention: 'Hematology consultation for hydroxyurea management (discuss continuation vs. discontinuation)',
          evidence: 'WHO 2025 - Expert consensus: Individualized decision-making required',
          frequency: 'first trimester and as needed',
        },
        {
          category: 'education',
          intervention: 'Counseling on warning signs: severe pain crisis, fever, shortness of breath, decreased fetal movement',
          evidence: 'WHO 2025 - Grade B: Early recognition prevents complications',
          frequency: 'each visit',
        },
      ],
      guidelineUrl: 'https://www.who.int/publications/i/item/9789240109124',
      clinicalNotes: 'Multidisciplinary care essential: obstetrics, hematology, anesthesia. Plan delivery at tertiary center with blood bank access.',
    },
    {
      id: 'scd-pain-management-nascc-2025',
      name: 'NASCC SCD Pain Crisis Prevention',
      description: 'National Alliance of Sickle Cell Centers consensus recommendations for preventing and managing acute pain crises.',
      conditionKey: 'sickle_cell_anemia',
      source: 'NASCC',
      guidelineVersion: 'January 2025',
      priority: 'HIGH',
      evidenceGrade: 'Consensus',
      interventions: [
        {
          category: 'lifestyle',
          intervention: 'Adequate hydration: 8-10 glasses (64-80 oz) water daily to prevent sickling',
          evidence: 'NASCC 2025 Consensus: Dehydration triggers vaso-occlusive crises',
          frequency: 'daily',
        },
        {
          category: 'lifestyle',
          intervention: 'Avoid temperature extremes (cold exposure can trigger crisis)',
          evidence: 'NASCC 2025 Consensus: Temperature changes precipitate sickling',
        },
        {
          category: 'medication',
          intervention: 'Hydroxyurea for pain frequency reduction (evidence-based, reduces crisis by 50%)',
          evidence: 'NASCC 2025 - Grade A: Proven efficacy in reducing pain episodes',
          frequency: 'daily (if prescribed)',
        },
        {
          category: 'education',
          intervention: 'Pain management plan on file with primary care and emergency department',
          evidence: 'NASCC 2025 Consensus: Reduces delays in ED treatment and opioid stigma',
        },
        {
          category: 'education',
          intervention: 'Emergency department pain protocol card for patient to carry',
          evidence: 'NASCC 2025 Consensus: Standardizes care across facilities',
        },
      ],
      clinicalNotes: 'Early aggressive pain management in ED reduces hospital admissions and opioid-seeking stigma.',
    },
    {
      id: 'scd-iron-overload-monitoring-nascc-2025',
      name: 'NASCC Iron Overload Screening',
      description: 'Monitoring and management of iron overload in transfusion-dependent SCD patients.',
      conditionKey: 'sickle_cell_anemia',
      source: 'NASCC',
      guidelineVersion: 'January 2025 (in development)',
      priority: 'MEDIUM',
      evidenceGrade: 'Consensus',
      applicabilityCriteria: {
        labValueThresholds: {
          ferritin: { min: 1000 }, // Only if transfusion history
        },
      },
      interventions: [
        {
          category: 'monitoring',
          intervention: 'Annual ferritin monitoring (more frequent if on chronic transfusions)',
          evidence: 'NASCC 2025 - In Development: Ferritin >1000 ng/mL indicates iron overload',
          frequency: 'annually',
        },
        {
          category: 'screening',
          intervention: 'MRI T2* for cardiac iron assessment if ferritin consistently >1000 ng/mL',
          evidence: 'NASCC 2025 - In Development: Cardiac iron deposition is life-threatening',
          frequency: 'as indicated',
        },
        {
          category: 'medication',
          intervention: 'Chelation therapy (deferasirox oral or deferoxamine IV/SQ) if iron overload confirmed',
          evidence: 'NASCC 2025 - Grade B: Prevents cardiac and liver damage',
          frequency: 'daily (if prescribed)',
        },
      ],
      clinicalNotes: 'Transfusion-dependent patients require aggressive iron monitoring and chelation.',
    },
  ],

  // ========================================
  // HYPERTENSION
  // ========================================
  hypertension: [
    {
      id: 'bp-target-who-2025',
      name: 'WHO 25 by 25 Blood Pressure Target',
      description: 'WHO global target to reduce blood pressure prevalence by 25% by 2025.',
      conditionKey: 'hypertension',
      source: 'WHO',
      guidelineVersion: '2025',
      priority: 'HIGH',
      evidenceGrade: 'A',
      interventions: [
        {
          category: 'monitoring',
          intervention: 'Target BP <140/90 mmHg for general population',
          evidence: 'WHO 2025 Target 6 - Grade A',
        },
        {
          category: 'monitoring',
          intervention: 'Target BP <130/80 mmHg if diabetes or chronic kidney disease',
          evidence: 'WHO 2025 - Grade A: Stricter targets reduce cardiovascular events',
        },
        {
          category: 'lifestyle',
          intervention: 'Dietary sodium restriction <2g/day (5g salt)',
          evidence: 'WHO 2025 - Grade A: 5mmHg systolic BP reduction',
          frequency: 'daily',
        },
        {
          category: 'lifestyle',
          intervention: 'DASH diet (fruits, vegetables, low-fat dairy, reduced saturated fat)',
          evidence: 'WHO 2025 - Grade A: 11mmHg systolic BP reduction',
        },
      ],
      guidelineUrl: 'https://www.who.int/teams/noncommunicable-diseases/on-the-road-to-2025',
    },
    {
      id: 'dual-bp-therapy-nhs-2025',
      name: 'NHS Dual Blood Pressure Therapy (October 2025)',
      description: 'Most patients require ≥2 BP medications. Adding second drug more effective than increasing first dose.',
      conditionKey: 'hypertension',
      source: 'NHS',
      guidelineVersion: 'October 2025',
      priority: 'HIGH',
      evidenceGrade: 'A',
      interventions: [
        {
          category: 'medication',
          intervention: 'First-line: ACE inhibitor or ARB + Calcium channel blocker OR thiazide diuretic',
          evidence: 'NHS 2025 CVD Prevention Toolkit - Grade A',
          frequency: 'daily',
        },
        {
          category: 'medication',
          intervention: 'If BP not controlled on 2 drugs, add third agent from different class',
          evidence: 'NHS 2025 - Grade A: Triple therapy often required',
          frequency: 'daily',
        },
        {
          category: 'monitoring',
          intervention: 'Monthly BP checks until target achieved, then quarterly',
          evidence: 'NHS 2025 - Grade B',
          frequency: 'monthly initially, then quarterly',
        },
      ],
      guidelineUrl: 'https://int.sussex.ics.nhs.uk/clinical_documents/cvd-prevention-toolkit/',
      clinicalNotes: 'Adding second drug superior to increasing dose of first drug (NHS 2025 toolkit key message).',
    },
  ],

  // ========================================
  // HYPERLIPIDEMIA / CARDIOVASCULAR
  // ========================================
  hyperlipidemia: [
    {
      id: 'lipid-nhs-2025',
      name: 'NHS Lipid Management (2025)',
      description: 'Atorvastatin 20mg first-line therapy per NHS England 2025/26 priorities.',
      conditionKey: 'hyperlipidemia',
      source: 'NHS',
      guidelineVersion: 'October 2025',
      priority: 'HIGH',
      evidenceGrade: 'A',
      interventions: [
        {
          category: 'medication',
          intervention: 'Atorvastatin 20mg daily (first-line lipid-lowering therapy)',
          evidence: 'NHS 2025 CVD Prevention Toolkit - Grade A',
          frequency: 'daily',
        },
        {
          category: 'monitoring',
          intervention: 'LDL target: <70 mg/dL (1.8 mmol/L) for secondary prevention',
          evidence: 'NHS 2025, ESC 2025 - Grade A',
        },
        {
          category: 'monitoring',
          intervention: 'LDL target: <100 mg/dL (2.6 mmol/L) for primary prevention',
          evidence: 'NHS 2025, NICE NG181 - Grade A',
        },
        {
          category: 'medication',
          intervention: 'Consider inclisiran if LDL not at target after 3 months statin therapy (NHS contract March 2025)',
          evidence: 'NHS 2025 - Grade B: New reimbursement model April 2025',
          frequency: 'every 6 months (injection)',
        },
        {
          category: 'monitoring',
          intervention: 'Annual lipid panel monitoring',
          evidence: 'NHS 2025 - Grade A',
          frequency: 'annually',
        },
      ],
      guidelineUrl: 'https://www.england.nhs.uk/ourwork/clinical-policy/cvd/',
      clinicalNotes: 'NHS 2025/26 priority: Reduce premature deaths from heart disease/strokes by 25% within decade.',
    },
    {
      id: 'esc-dyslipidemia-2025',
      name: 'ESC Dyslipidaemia Guidelines (2025 Update)',
      description: '2025 Focused Update of ESC/EAS dyslipidaemia guidelines based on evidence through March 2025.',
      conditionKey: 'hyperlipidemia',
      source: 'ESC',
      guidelineVersion: '2025',
      priority: 'HIGH',
      evidenceGrade: 'A',
      interventions: [
        {
          category: 'medication',
          intervention: 'High-intensity statin therapy for very high cardiovascular risk (atorvastatin 40-80mg or rosuvastatin 20-40mg)',
          evidence: 'ESC 2025 Dyslipidaemia Update - Grade A',
          frequency: 'daily',
        },
        {
          category: 'medication',
          intervention: 'Add ezetimibe if LDL not at target on maximally tolerated statin',
          evidence: 'ESC 2025 - Grade A: 15-20% additional LDL reduction',
          frequency: 'daily',
        },
        {
          category: 'medication',
          intervention: 'PCSK9 inhibitors (alirocumab, evolocumab) for refractory hyperlipidemia',
          evidence: 'ESC 2025 - Grade A: 50-60% LDL reduction',
          frequency: 'every 2-4 weeks (injection)',
        },
      ],
      guidelineUrl: 'https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines',
    },
  ],

  // ========================================
  // DIABETES TYPE 2
  // ========================================
  diabetes_type_2: [
    {
      id: 't2dm-management-ada-2025',
      name: 'Type 2 Diabetes Comprehensive Management',
      description: 'ADA Standards of Care 2025 for Type 2 Diabetes.',
      conditionKey: 'diabetes_type_2',
      source: 'ADA',
      guidelineVersion: '2025',
      priority: 'HIGH',
      evidenceGrade: 'A',
      interventions: [
        {
          category: 'medication',
          intervention: 'Metformin first-line therapy (unless contraindicated)',
          evidence: 'ADA 2025 - Grade A: Proven efficacy, low cost, cardiovascular neutral',
          frequency: 'daily',
        },
        {
          category: 'medication',
          intervention: 'GLP-1 receptor agonist (semaglutide, dulaglutide) if cardiovascular disease or high risk',
          evidence: 'ADA 2025 - Grade A: Cardiovascular benefit proven',
          frequency: 'weekly (injection)',
        },
        {
          category: 'medication',
          intervention: 'SGLT2 inhibitor (empagliflozin, dapagliflozin) if heart failure or CKD',
          evidence: 'ADA 2025 - Grade A: Renal and cardiac protection',
          frequency: 'daily',
        },
        {
          category: 'monitoring',
          intervention: 'HbA1c target <7% for most adults (individualize based on comorbidities)',
          evidence: 'ADA 2025 - Grade A',
        },
        {
          category: 'screening',
          intervention: 'Annual dilated retinal exam for diabetic retinopathy',
          evidence: 'ADA 2025 - Grade A',
          frequency: 'annually',
        },
        {
          category: 'screening',
          intervention: 'Annual foot exam (monofilament, pulses, inspection)',
          evidence: 'ADA 2025 - Grade A: Prevent diabetic foot ulcers',
          frequency: 'annually',
        },
        {
          category: 'screening',
          intervention: 'Annual urine albumin-to-creatinine ratio for diabetic nephropathy',
          evidence: 'ADA 2025 - Grade A',
          frequency: 'annually',
        },
      ],
    },
  ],

  // ========================================
  // CHRONIC KIDNEY DISEASE
  // ========================================
  chronic_kidney_disease: [
    {
      id: 'ckd-management-kdigo-2025',
      name: 'KDIGO CKD Management',
      description: 'Kidney Disease: Improving Global Outcomes guidelines for CKD management.',
      conditionKey: 'chronic_kidney_disease',
      source: 'KDIGO',
      guidelineVersion: '2024',
      priority: 'HIGH',
      evidenceGrade: 'A',
      interventions: [
        {
          category: 'medication',
          intervention: 'ACE inhibitor or ARB for blood pressure control and albuminuria reduction',
          evidence: 'KDIGO 2024 - Grade A: Slows CKD progression',
          frequency: 'daily',
        },
        {
          category: 'medication',
          intervention: 'SGLT2 inhibitor (empagliflozin, dapagliflozin) for CKD with diabetes or heart failure',
          evidence: 'KDIGO 2024 - Grade A: Renal protection independent of glucose lowering',
          frequency: 'daily',
        },
        {
          category: 'monitoring',
          intervention: 'eGFR and urine albumin every 3-6 months depending on stage',
          evidence: 'KDIGO 2024 - Grade A',
          frequency: 'every 3-6 months',
        },
        {
          category: 'lifestyle',
          intervention: 'Dietary protein restriction to 0.8 g/kg/day if eGFR <30',
          evidence: 'KDIGO 2024 - Grade B',
          frequency: 'daily',
        },
        {
          category: 'referral',
          intervention: 'Nephrology referral if eGFR <30 or rapid decline (>5 mL/min/year)',
          evidence: 'KDIGO 2024 - Grade A',
        },
      ],
    },
  ],

  // ========================================
  // DEPRESSION / ANXIETY (RACGP)
  // ========================================
  depression: [
    {
      id: 'depression-screening-racgp-2025',
      name: 'RACGP Depression Screening (Red Book 10th Ed)',
      description: 'Australian RACGP guidelines for depression screening and management.',
      conditionKey: 'depression',
      source: 'RACGP',
      guidelineVersion: 'August 2025',
      priority: 'HIGH',
      evidenceGrade: 'A',
      interventions: [
        {
          category: 'screening',
          intervention: 'PHQ-9 screening every visit for patients with depression history',
          evidence: 'RACGP Red Book 10th Ed 2025 - Grade A',
          frequency: 'every visit initially, then quarterly',
        },
        {
          category: 'screening',
          intervention: 'Suicide risk assessment (ask directly about suicidal ideation)',
          evidence: 'RACGP 2025 - Grade A: Critical for patient safety',
          frequency: 'every visit if moderate-severe depression',
        },
        {
          category: 'referral',
          intervention: 'Mental health professional referral for moderate-severe depression (PHQ-9 ≥15)',
          evidence: 'RACGP 2025 - Grade A',
        },
        {
          category: 'education',
          intervention: 'Psychoeducation on depression, treatment options, and self-management',
          evidence: 'RACGP 2025 - Grade B',
        },
      ],
    },
  ],

  // ========================================
  // SMOKING CESSATION (CTF)
  // ========================================
  tobacco_use: [
    {
      id: 'smoking-cessation-ctf-2025',
      name: 'Canadian Task Force Tobacco Cessation (August 2025)',
      description: 'Latest guidelines for tobacco smoking cessation in adults.',
      conditionKey: 'tobacco_use',
      source: 'CTF',
      guidelineVersion: 'August 2025',
      priority: 'HIGH',
      evidenceGrade: 'A',
      interventions: [
        {
          category: 'medication',
          intervention: 'Varenicline (first-line pharmacotherapy for smoking cessation)',
          evidence: 'CTF 2025 - Grade A: Doubles quit rates vs. placebo',
          frequency: '12 weeks',
        },
        {
          category: 'medication',
          intervention: 'Nicotine replacement therapy (NRT): patch, gum, lozenge',
          evidence: 'CTF 2025 - Grade A: 50-70% increase in quit rates',
          frequency: '8-12 weeks',
        },
        {
          category: 'medication',
          intervention: 'Bupropion SR as alternative if varenicline contraindicated',
          evidence: 'CTF 2025 - Grade A',
          frequency: '7-12 weeks',
        },
        {
          category: 'education',
          intervention: 'Behavioral counseling (5 A\'s: Ask, Advise, Assess, Assist, Arrange)',
          evidence: 'CTF 2025 - Grade A: Combined with pharmacotherapy most effective',
          frequency: 'every visit',
        },
      ],
    },
  ],
};

/**
 * Get all protocols for a specific condition
 */
export function getProtocolsForCondition(conditionKey: string): PreventionProtocol[] {
  return INTERNATIONAL_PROTOCOLS[conditionKey] || [];
}

/**
 * Get protocols by priority
 */
export function getProtocolsByPriority(
  protocols: PreventionProtocol[],
  priority: ProtocolPriority
): PreventionProtocol[] {
  return protocols.filter((p) => p.priority === priority);
}

/**
 * Get critical priority protocols across all conditions
 */
export function getCriticalProtocols(): PreventionProtocol[] {
  const allProtocols: PreventionProtocol[] = [];

  for (const protocols of Object.values(INTERNATIONAL_PROTOCOLS)) {
    allProtocols.push(...protocols.filter((p) => p.priority === 'CRITICAL'));
  }

  return allProtocols;
}

/**
 * Check if protocol is applicable to patient
 */
export function isProtocolApplicable(
  protocol: PreventionProtocol,
  patient: {
    age?: number;
    gender?: 'male' | 'female';
    isPregnant?: boolean;
    labValues?: Record<string, number>;
  }
): boolean {
  const criteria = protocol.applicabilityCriteria;
  if (!criteria) return true; // No criteria = applicable to all

  // Age check
  if (criteria.ageMin && patient.age && patient.age < criteria.ageMin) return false;
  if (criteria.ageMax && patient.age && patient.age > criteria.ageMax) return false;

  // Gender check
  if (criteria.gender && patient.gender && patient.gender !== criteria.gender) return false;

  // Pregnancy check
  if (criteria.pregnancy !== undefined && patient.isPregnant !== criteria.pregnancy) return false;

  // Lab value thresholds
  if (criteria.labValueThresholds && patient.labValues) {
    for (const [labName, thresholds] of Object.entries(criteria.labValueThresholds)) {
      const value = patient.labValues[labName];
      if (value === undefined) continue;

      if (thresholds.min !== undefined && value < thresholds.min) return false;
      if (thresholds.max !== undefined && value > thresholds.max) return false;
    }
  }

  return true;
}

/**
 * Get applicable protocols for patient
 */
export function getApplicableProtocols(
  conditionKey: string,
  patient: {
    age?: number;
    gender?: 'male' | 'female';
    isPregnant?: boolean;
    labValues?: Record<string, number>;
  }
): PreventionProtocol[] {
  const protocols = getProtocolsForCondition(conditionKey);
  return protocols.filter((protocol) => isProtocolApplicable(protocol, patient));
}
