/**
 * Clinical Decision Support Rules for Lab Results
 * Automatic alerts and treatment recommendations for abnormal laboratory values
 *
 * Based on:
 * - Evidence-based clinical guidelines
 * - UpToDate clinical recommendations
 * - ACC/AHA, ADA, KDIGO, and other specialty society guidelines
 */

import { LabReferenceRange } from './lab-reference-ranges';

export interface ClinicalAlert {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  recommendations: string[];
  urgency: 'routine' | 'urgent' | 'immediate';
  requiresNotification: boolean;
  notifyRoles?: string[]; // Which roles to notify
}

export interface TreatmentRecommendation {
  condition: string;
  interventions: string[];
  monitoring: string[];
  referrals?: string[];
  timeframe: string;
  evidenceLevel: 'A' | 'B' | 'C'; // A = Strong evidence, B = Moderate, C = Limited
}

export interface RenalFunctionInput {
  eGFR?: number;
  creatinineClearance?: number;
  measuredAt?: string;
}

export interface RenalDataAssessment {
  hasAnyRenalValue: boolean;
  isMissingCriticalInput: boolean;
  isStale: boolean;
  ageHours: number | null;
  referenceTimeUsed: string | null;
  rationale: string[];
}

/**
 * Deterministic renal data quality assessment for medication safety checks.
 * If no reference time is provided, freshness cannot be proven and the data is treated as stale.
 */
export function assessRenalDataQuality(
  renal: RenalFunctionInput | undefined,
  opts: {
    maxAgeHours: number;
    referenceTimeIso?: string;
  }
): RenalDataAssessment {
  const rationale: string[] = [];
  const hasAnyRenalValue = Boolean(
    renal && (typeof renal.eGFR === 'number' || typeof renal.creatinineClearance === 'number')
  );

  if (!hasAnyRenalValue) {
    rationale.push('Missing renal value: provide eGFR or creatinine clearance.');
    return {
      hasAnyRenalValue: false,
      isMissingCriticalInput: true,
      isStale: true,
      ageHours: null,
      referenceTimeUsed: opts.referenceTimeIso || null,
      rationale,
    };
  }

  const measuredAt = renal?.measuredAt;
  const referenceTimeIso = opts.referenceTimeIso;
  if (!measuredAt) {
    rationale.push('Renal value timestamp missing; freshness cannot be determined.');
    return {
      hasAnyRenalValue: true,
      isMissingCriticalInput: false,
      isStale: true,
      ageHours: null,
      referenceTimeUsed: referenceTimeIso || null,
      rationale,
    };
  }

  if (!referenceTimeIso) {
    rationale.push('Reference time missing; renal freshness cannot be deterministically verified.');
    return {
      hasAnyRenalValue: true,
      isMissingCriticalInput: false,
      isStale: true,
      ageHours: null,
      referenceTimeUsed: null,
      rationale,
    };
  }

  const measuredMs = Date.parse(measuredAt);
  const referenceMs = Date.parse(referenceTimeIso);
  if (Number.isNaN(measuredMs) || Number.isNaN(referenceMs)) {
    rationale.push('Invalid timestamp format for renal data freshness check.');
    return {
      hasAnyRenalValue: true,
      isMissingCriticalInput: false,
      isStale: true,
      ageHours: null,
      referenceTimeUsed: referenceTimeIso,
      rationale,
    };
  }

  const ageHours = Math.max(0, (referenceMs - measuredMs) / (1000 * 60 * 60));
  const isStale = ageHours > opts.maxAgeHours;
  rationale.push(
    isStale
      ? `Renal data is stale (${ageHours.toFixed(1)}h old; max ${opts.maxAgeHours}h).`
      : `Renal data is fresh (${ageHours.toFixed(1)}h old; max ${opts.maxAgeHours}h).`
  );

  return {
    hasAnyRenalValue: true,
    isMissingCriticalInput: false,
    isStale,
    ageHours,
    referenceTimeUsed: referenceTimeIso,
    rationale,
  };
}

/**
 * Generate clinical alerts for critical lab values
 */
export function generateCriticalAlerts(
  testName: string,
  loincCode: string,
  value: number,
  range: LabReferenceRange,
  interpretation: 'critical-low' | 'low' | 'normal' | 'high' | 'critical-high'
): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];

  // Critical Potassium
  if (loincCode === '2823-3' && interpretation.includes('critical')) {
    if (interpretation === 'critical-low') {
      alerts.push({
        severity: 'critical',
        title: 'CRITICAL: Severe Hypokalemia',
        message: `Potassium critically low at ${value} mEq/L (normal: ${range.normalMin}-${range.normalMax})`,
        recommendations: [
          'IMMEDIATE: Obtain 12-lead ECG to assess for arrhythmias',
          'Initiate cardiac monitoring',
          'Administer IV potassium replacement (10-20 mEq/hr via central line)',
          'Recheck potassium in 2-4 hours',
          'Investigate underlying cause (diuretics, diarrhea, vomiting)',
          'Check magnesium level (hypomagnesemia prevents K correction)',
        ],
        urgency: 'immediate',
        requiresNotification: true,
        notifyRoles: ['ADMIN', 'CLINICIAN', 'NURSE'],
      });
    } else {
      alerts.push({
        severity: 'critical',
        title: 'CRITICAL: Severe Hyperkalemia',
        message: `Potassium critically high at ${value} mEq/L (normal: ${range.normalMin}-${range.normalMax})`,
        recommendations: [
          'IMMEDIATE: Obtain 12-lead ECG to assess for peaked T waves, widened QRS',
          'Initiate cardiac monitoring',
          'If ECG changes: Give IV calcium gluconate 10% 10mL over 2-3 minutes (cardiac protection)',
          'Lower potassium: Insulin 10 units IV + D50W 50mL, Albuterol 10-20mg nebulized',
          'Consider sodium polystyrene sulfonate (Kayexalate) 15-30g PO/PR',
          'Dialysis consult if K >6.5 or refractory',
          'Stop potassium-sparing diuretics, ACE inhibitors, NSAIDs',
          'Recheck potassium in 2 hours',
        ],
        urgency: 'immediate',
        requiresNotification: true,
        notifyRoles: ['ADMIN', 'CLINICIAN'],
      });
    }
  }

  // Critical Glucose
  if (loincCode === '2345-7' && interpretation.includes('critical')) {
    if (interpretation === 'critical-low') {
      alerts.push({
        severity: 'critical',
        title: 'CRITICAL: Severe Hypoglycemia',
        message: `Glucose critically low at ${value} mg/dL (normal: ${range.normalMin}-${range.normalMax})`,
        recommendations: [
          'IMMEDIATE: If conscious - give 15g fast-acting carbohydrates',
          'If unconscious or unable to swallow: IV D50W 25-50mL or IM glucagon 1mg',
          'Recheck glucose in 15 minutes',
          'Once glucose >70 mg/dL, give complex carbohydrates',
          'Identify cause: insulin dose error, missed meal, excessive exercise, alcohol',
          'Adjust diabetes medications to prevent recurrence',
          'Consider continuous glucose monitoring',
        ],
        urgency: 'immediate',
        requiresNotification: true,
        notifyRoles: ['ADMIN', 'CLINICIAN', 'NURSE'],
      });
    } else {
      alerts.push({
        severity: 'critical',
        title: 'CRITICAL: Severe Hyperglycemia',
        message: `Glucose critically high at ${value} mg/dL (normal: ${range.normalMin}-${range.normalMax})`,
        recommendations: [
          'IMMEDIATE: Check for DKA or HHS - obtain BMP, venous pH, beta-hydroxybutyrate',
          'Assess patient for symptoms: polyuria, polydipsia, altered mental status, Kussmaul breathing',
          'IV fluid resuscitation with NS 1-2L bolus',
          'Insulin therapy: IV regular insulin 0.1 units/kg/hr (if DKA)',
          'Potassium replacement (often needed despite normal K)',
          'Monitor glucose hourly',
          'ICU admission if DKA or HHS confirmed',
          'Identify precipitant: infection, MI, medication non-compliance',
        ],
        urgency: 'immediate',
        requiresNotification: true,
        notifyRoles: ['ADMIN', 'CLINICIAN'],
      });
    }
  }

  // Critical Sodium
  if (loincCode === '2951-2' && interpretation.includes('critical')) {
    if (interpretation === 'critical-low') {
      alerts.push({
        severity: 'critical',
        title: 'CRITICAL: Severe Hyponatremia',
        message: `Sodium critically low at ${value} mEq/L (normal: ${range.normalMin}-${range.normalMax})`,
        recommendations: [
          'IMMEDIATE: Assess for neurological symptoms (confusion, seizures, coma)',
          'If symptomatic: Give 3% hypertonic saline 100mL bolus over 10 minutes',
          'Goal: Raise Na by 4-6 mEq/L in first 4 hours to stop symptoms',
          'WARNING: Correct slowly - max 8-10 mEq/L in 24 hours to avoid osmotic demyelination',
          'Calculate fluid deficit and correct over 48 hours',
          'Identify cause: SIADH, heart failure, cirrhosis, diuretics, psychogenic polydipsia',
          'Recheck sodium every 2-4 hours initially',
          'Neurology consult if seizures or severe symptoms',
        ],
        urgency: 'immediate',
        requiresNotification: true,
        notifyRoles: ['ADMIN', 'CLINICIAN'],
      });
    } else {
      alerts.push({
        severity: 'critical',
        title: 'CRITICAL: Severe Hypernatremia',
        message: `Sodium critically high at ${value} mEq/L (normal: ${range.normalMin}-${range.normalMax})`,
        recommendations: [
          'IMMEDIATE: Assess mental status and volume status',
          'Calculate free water deficit: 0.6 × weight(kg) × (Na/140 - 1)',
          'Replace deficit with D5W or 0.45% saline over 48 hours',
          'WARNING: Correct slowly - max 10-12 mEq/L per 24 hours to avoid cerebral edema',
          'Recheck sodium every 2-4 hours',
          'Identify cause: dehydration, diabetes insipidus, excessive sodium intake',
          'If diabetes insipidus: Consider desmopressin',
        ],
        urgency: 'immediate',
        requiresNotification: true,
        notifyRoles: ['ADMIN', 'CLINICIAN'],
      });
    }
  }

  // Critical Creatinine (Acute Kidney Injury)
  if (loincCode === '2160-0' && interpretation === 'critical-high') {
    alerts.push({
      severity: 'critical',
      title: 'CRITICAL: Severe Renal Failure',
      message: `Creatinine critically elevated at ${value} mg/dL (normal: ${range.normalMin}-${range.normalMax})`,
      recommendations: [
        'IMMEDIATE: Nephrology consult - dialysis likely needed',
        'Check BUN, potassium, bicarbonate, urinalysis',
        'Assess for uremic symptoms: confusion, pericarditis, bleeding',
        'Review medications - stop nephrotoxic drugs (NSAIDs, contrast, aminoglycosides)',
        'Dose-adjust all medications for renal function',
        'Fluid management: assess volume status, may need fluid restriction',
        'Indications for emergent dialysis: hyperkalemia, acidosis, volume overload, uremic symptoms',
        'Investigate cause: prerenal (dehydration), intrinsic (ATN, GN), postrenal (obstruction)',
        'Renal ultrasound to rule out obstruction',
      ],
      urgency: 'immediate',
      requiresNotification: true,
      notifyRoles: ['ADMIN', 'CLINICIAN'],
    });
  }

  // Critical Hemoglobin (Severe Anemia)
  if (loincCode === '718-7' && interpretation === 'critical-low') {
    alerts.push({
      severity: 'critical',
      title: 'CRITICAL: Severe Anemia',
      message: `Hemoglobin critically low at ${value} g/dL (normal: ${range.normalMin}-${range.normalMax})`,
      recommendations: [
        'IMMEDIATE: Assess hemodynamic stability (BP, HR, oxygen saturation)',
        'Type and cross-match for blood transfusion',
        'Transfuse if symptomatic or Hgb <7 g/dL (threshold may be higher in cardiac patients)',
        'Investigate cause: acute bleeding (GI, trauma), hemolysis, bone marrow failure',
        'Complete workup: CBC with differential, reticulocyte count, iron studies, B12, folate',
        'If acute bleeding: surgical consult, consider endoscopy/colonoscopy',
        'Monitor closely for signs of tissue hypoxia',
      ],
      urgency: 'immediate',
      requiresNotification: true,
      notifyRoles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    });
  }

  // Critical WBC (Severe Leukopenia/Neutropenia)
  if (loincCode === '6690-2' && interpretation === 'critical-low') {
    alerts.push({
      severity: 'critical',
      title: 'CRITICAL: Severe Leukopenia',
      message: `WBC critically low at ${value} x10^3/uL (normal: ${range.normalMin}-${range.normalMax})`,
      recommendations: [
        'IMMEDIATE: Check absolute neutrophil count (ANC)',
        'If ANC <500: FEBRILE NEUTROPENIA PROTOCOL',
        'Check temperature - if fever (>38°C): broad-spectrum antibiotics immediately',
        'Neutropenic precautions: isolation, hand hygiene, avoid fresh flowers/fruits',
        'Hematology consult',
        'Consider G-CSF (filgrastim) if chemotherapy-related',
        'Workup: peripheral smear, bone marrow biopsy if cause unclear',
        'Hold myelosuppressive medications',
        'Daily monitoring until recovery',
      ],
      urgency: 'immediate',
      requiresNotification: true,
      notifyRoles: ['ADMIN', 'CLINICIAN'],
    });
  }

  // Critical Platelets (Severe Thrombocytopenia)
  if (loincCode === '777-3' && interpretation === 'critical-low') {
    alerts.push({
      severity: 'critical',
      title: 'CRITICAL: Severe Thrombocytopenia',
      message: `Platelet count critically low at ${value} x10^3/uL (normal: ${range.normalMin}-${range.normalMax})`,
      recommendations: [
        'IMMEDIATE: Bleeding precautions - avoid IM injections, suppositories, rectal temps',
        'Assess for active bleeding (petechiae, purpura, mucosal bleeding)',
        'Hold anticoagulants and antiplatelet agents',
        'If platelets <10,000 or active bleeding: transfuse platelets',
        'Investigate cause: ITP, DIC, HIT, drug-induced, TTP/HUS',
        'Labs: PT/INR, aPTT, fibrinogen, D-dimer, LDH, peripheral smear',
        'Hematology consult',
        'If ITP suspected: consider IVIG or corticosteroids',
        'If HIT suspected: STOP all heparin immediately',
        'Avoid invasive procedures until platelets >50,000',
      ],
      urgency: 'immediate',
      requiresNotification: true,
      notifyRoles: ['ADMIN', 'CLINICIAN'],
    });
  }

  // Critical Troponin (Acute MI)
  if (loincCode === '10839-9' && interpretation === 'critical-high') {
    alerts.push({
      severity: 'critical',
      title: 'CRITICAL: Acute Myocardial Infarction',
      message: `Troponin I critically elevated at ${value} ng/mL (normal: ${range.normalMin}-${range.normalMax})`,
      recommendations: [
        'IMMEDIATE: Activate STEMI protocol if ECG shows ST elevation',
        'Obtain 12-lead ECG immediately',
        'Cardiology consult for cardiac catheterization',
        'Dual antiplatelet therapy: Aspirin 325mg + P2Y12 inhibitor (ticagrelor 180mg or clopidogrel 600mg)',
        'Anticoagulation: Heparin or enoxaparin',
        'Nitrates for chest pain (unless RV infarct)',
        'Beta-blocker if no contraindications',
        'Statin therapy (high-intensity)',
        'Serial troponins every 3-6 hours',
        'Telemetry monitoring',
        'Risk stratify with TIMI or GRACE score',
      ],
      urgency: 'immediate',
      requiresNotification: true,
      notifyRoles: ['ADMIN', 'CLINICIAN'],
    });
  }

  return alerts;
}

/**
 * Generate treatment recommendations for non-critical abnormal values
 */
export function generateTreatmentRecommendations(
  testName: string,
  loincCode: string,
  value: number,
  range: LabReferenceRange,
  interpretation: 'critical-low' | 'low' | 'normal' | 'high' | 'critical-high'
): TreatmentRecommendation[] {
  const recommendations: TreatmentRecommendation[] = [];

  // Elevated LDL Cholesterol
  if (loincCode === '13457-7' && interpretation === 'high') {
    recommendations.push({
      condition: 'Elevated LDL Cholesterol',
      interventions: [
        'Calculate 10-year ASCVD risk using Pooled Cohort Equations',
        'Lifestyle modifications: Mediterranean diet, exercise 150 min/week, weight loss if overweight',
        'Consider statin therapy per ACC/AHA guidelines:',
        '  - LDL ≥190: High-intensity statin',
        '  - Diabetes age 40-75: Moderate to high-intensity statin',
        '  - ASCVD risk ≥7.5%: Moderate to high-intensity statin',
        'High-intensity statins: Atorvastatin 40-80mg or Rosuvastatin 20-40mg',
        'Moderate-intensity statins: Atorvastatin 10-20mg, Rosuvastatin 5-10mg, Simvastatin 20-40mg',
        'Recheck lipids in 4-12 weeks after starting therapy',
      ],
      monitoring: [
        'Lipid panel every 3-12 months',
        'Monitor for statin side effects (myalgias, transaminitis)',
        'Check CK if muscle symptoms develop',
        'LFTs at baseline and as clinically indicated',
      ],
      referrals: ['Cardiology if familial hypercholesterolemia suspected', 'Nutrition counseling'],
      timeframe: 'Initiate within 2 weeks',
      evidenceLevel: 'A',
    });
  }

  // Elevated HbA1c (Diabetes)
  if (loincCode === '4548-4' && value >= 6.5) {
    const isNewDiabetes = value >= 6.5 && value < 9.0;
    const isPoorControl = value >= 9.0;

    recommendations.push({
      condition: isPoorControl ? 'Poorly Controlled Diabetes' : 'New Diabetes Diagnosis',
      interventions: [
        'Confirm diagnosis with repeat HbA1c or fasting glucose',
        'Diabetes education: nutrition, SMBG, foot care, eye care',
        'Lifestyle: Weight loss 5-10% if overweight, 150 min exercise/week, Mediterranean diet',
        'Metformin 500-1000mg BID (first-line unless contraindicated)',
        'If HbA1c >9% or symptomatic: Consider adding second agent or insulin',
        'Second-line agents: GLP-1 RA (if ASCVD/CKD), SGLT2i (if HF/CKD), or DPP-4i',
        'Set individualized HbA1c goal: <7% for most, <8% if elderly/comorbid',
        'Screen for complications: retinopathy, nephropathy, neuropathy',
      ],
      monitoring: [
        'HbA1c every 3 months until controlled, then every 6 months',
        'Annual comprehensive foot exam',
        'Annual dilated eye exam',
        'Annual urine albumin/creatinine ratio',
        'Annual lipid panel',
        'Blood pressure at each visit (goal <130/80)',
      ],
      referrals: [
        'Endocrinology if uncontrolled despite 2-3 agents',
        'Ophthalmology for dilated retinal exam',
        'Diabetes education program',
        'Nutrition counseling',
      ],
      timeframe: 'Initiate treatment immediately',
      evidenceLevel: 'A',
    });
  }

  // Prediabetes (HbA1c 5.7-6.4%)
  if (loincCode === '4548-4' && value >= 5.7 && value < 6.5) {
    recommendations.push({
      condition: 'Prediabetes',
      interventions: [
        'Intensive lifestyle intervention: goal 7% weight loss',
        'Exercise 150 min/week of moderate-intensity activity',
        'Referral to Diabetes Prevention Program (DPP)',
        'Consider metformin if age <60, BMI ≥35, or prior gestational diabetes',
        'Screen for other cardiovascular risk factors',
      ],
      monitoring: [
        'HbA1c annually',
        'Annual lipid panel',
        'Blood pressure monitoring',
      ],
      referrals: ['Diabetes Prevention Program', 'Nutrition counseling'],
      timeframe: 'Initiate within 1 month',
      evidenceLevel: 'A',
    });
  }

  // Hypothyroidism (Elevated TSH)
  if (loincCode === '3016-3' && interpretation === 'high') {
    const isOvert = value > 10;
    const isSubclinical = value >= 4 && value <= 10;

    if (isOvert) {
      recommendations.push({
        condition: 'Primary Hypothyroidism',
        interventions: [
          'Start levothyroxine 1.6 mcg/kg/day (round to nearest 12.5 or 25 mcg increment)',
          'Take on empty stomach 30-60 minutes before breakfast',
          'Avoid taking with calcium, iron, or PPI (separate by 4 hours)',
          'Lower starting dose if elderly or cardiac disease: 25-50 mcg daily',
          'Recheck TSH in 6-8 weeks and adjust dose by 12.5-25 mcg increments',
          'Goal TSH: 0.5-2.5 mIU/L',
        ],
        monitoring: [
          'TSH every 6-8 weeks until stable',
          'Once stable: TSH annually',
          'Assess for symptom improvement: fatigue, weight, constipation',
        ],
        referrals: ['Endocrinology if refractory or complex'],
        timeframe: 'Initiate within 1 week',
        evidenceLevel: 'A',
      });
    } else if (isSubclinical) {
      recommendations.push({
        condition: 'Subclinical Hypothyroidism',
        interventions: [
          'Repeat TSH with free T4 in 2-3 months to confirm',
          'Consider treatment if TSH >10, symptomatic, pregnant, or antithyroid antibodies positive',
          'If treating: start low-dose levothyroxine 25-50 mcg daily',
        ],
        monitoring: [
          'TSH every 3 months',
          'Monitor for progression to overt hypothyroidism',
        ],
        referrals: ['Endocrinology if uncertain about treatment decision'],
        timeframe: 'Recheck labs in 2-3 months',
        evidenceLevel: 'B',
      });
    }
  }

  // Hyperthyroidism (Low TSH)
  if (loincCode === '3016-3' && interpretation === 'low') {
    recommendations.push({
      condition: 'Hyperthyroidism',
      interventions: [
        'Check free T4 and T3 to confirm hyperthyroidism',
        'If elevated: Check TSH receptor antibodies (Graves) or thyroid uptake scan',
        'Beta-blocker for symptom control: propranolol 20-40mg TID or metoprolol 25-50mg BID',
        'Endocrinology consult for definitive management',
        'Treatment options: methimazole, radioactive iodine, or thyroidectomy',
        'If Graves: methimazole 10-30mg daily',
        'If toxic nodule: consider radioactive iodine ablation',
      ],
      monitoring: [
        'TSH, free T4 every 4-6 weeks until controlled',
        'Monitor for complications: atrial fibrillation, osteoporosis',
        'If on methimazole: CBC to monitor for agranulocytosis',
      ],
      referrals: ['Endocrinology (required)', 'Cardiology if atrial fibrillation'],
      timeframe: 'Endocrinology consult within 1 week',
      evidenceLevel: 'A',
    });
  }

  // Anemia (Low Hemoglobin)
  if (loincCode === '718-7' && interpretation === 'low' && value > 7) {
    recommendations.push({
      condition: 'Anemia',
      interventions: [
        'Complete workup: CBC with differential, reticulocyte count',
        'Iron studies: serum iron, TIBC, ferritin, transferrin saturation',
        'B12 and folate levels',
        'Classify anemia: microcytic (MCV <80), normocytic (80-100), macrocytic (>100)',
        'If iron deficiency (low ferritin): Oral iron 325mg ferrous sulfate daily',
        'If B12 deficiency: IM cyanocobalamin 1000 mcg weekly x 4 weeks, then monthly',
        'If folate deficiency: Folic acid 1mg daily',
        'Investigate underlying cause: GI bleeding, chronic disease, hemolysis',
      ],
      monitoring: [
        'Recheck CBC in 4-8 weeks after starting treatment',
        'Reticulocyte count should rise in 1 week (indicates response)',
        'If iron deficiency: continue iron for 3-6 months to replete stores',
        'If persistent: consider GI evaluation (endoscopy/colonoscopy)',
      ],
      referrals: [
        'Gastroenterology if suspected GI bleeding',
        'Hematology if cause unclear or refractory',
      ],
      timeframe: 'Initiate workup within 1 week',
      evidenceLevel: 'A',
    });
  }

  // Chronic Kidney Disease (Elevated Creatinine)
  if (loincCode === '2160-0' && interpretation === 'high' && value < 10) {
    recommendations.push({
      condition: 'Chronic Kidney Disease',
      interventions: [
        'Calculate eGFR using CKD-EPI equation',
        'Stage CKD: G1 (≥90), G2 (60-89), G3a (45-59), G3b (30-44), G4 (15-29), G5 (<15)',
        'Check urine albumin/creatinine ratio to assess proteinuria',
        'Blood pressure control: goal <130/80, ACE inhibitor or ARB preferred if proteinuria',
        'Glycemic control if diabetic: goal HbA1c <7%',
        'Avoid nephrotoxins: NSAIDs, contrast dye (use cautiously)',
        'Adjust medications for renal function',
        'If eGFR <30: restrict dietary protein (0.8 g/kg/day) and potassium',
      ],
      monitoring: [
        'eGFR and creatinine: annually if Stage 1-2, every 6 months if Stage 3, every 3 months if Stage 4-5',
        'Urine albumin/creatinine ratio annually',
        'Electrolytes (especially potassium) regularly',
        'Calcium, phosphate, PTH if Stage 3b or higher',
        'Hemoglobin if Stage 3 or higher',
      ],
      referrals: [
        'Nephrology if eGFR <30 or rapidly declining',
        'Dietitian for renal diet counseling',
      ],
      timeframe: 'Initiate management immediately',
      evidenceLevel: 'A',
    });
  }

  return recommendations;
}

/**
 * Determine if immediate clinician notification is required
 */
export function requiresImmediateNotification(
  interpretation: string,
  alerts: ClinicalAlert[]
): boolean {
  // Critical interpretations always require notification
  if (interpretation.includes('critical')) {
    return true;
  }

  // Check if any alert requires notification
  return alerts.some((alert) => alert.requiresNotification);
}

/**
 * Get notification priority level
 */
export function getNotificationPriority(
  interpretation: string,
  alerts: ClinicalAlert[]
): 'low' | 'medium' | 'high' | 'critical' {
  if (interpretation.includes('critical')) {
    return 'critical';
  }

  const hasWarning = alerts.some((alert) => alert.severity === 'warning');
  if (hasWarning) {
    return 'high';
  }

  if (interpretation !== 'normal') {
    return 'medium';
  }

  return 'low';
}
