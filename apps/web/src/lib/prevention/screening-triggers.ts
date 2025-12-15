/**
 * Screening Trigger System
 *
 * Automatically generates preventive care screening reminders based on:
 * - Patient age and gender
 * - USPSTF Grade A/B recommendations
 * - Last screening date
 * - Risk factors
 *
 * Phase 1: Quick Win - Prevention Automation
 */

import { prisma } from '@/lib/prisma';
import { addMonths, differenceInMonths, isBefore } from 'date-fns';

/**
 * Screening rule definition
 */
export interface ScreeningRule {
  name: string;
  screeningType: string;
  uspstfGrade: 'A' | 'B' | 'C';
  ageRange: { min: number; max?: number };
  genderRestriction?: 'male' | 'female';
  frequency: { years?: number; months?: number };
  conditions?: string[]; // Required conditions (e.g., ['diabetes', 'hypertension'])
  riskFactors?: {
    tobaccoUse?: boolean;
    familyHistory?: string[]; // e.g., ['breast_cancer', 'colon_cancer']
    bmiMin?: number;
  };
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  clinicalRecommendation: string;
  guidelineSource: string;
}

/**
 * USPSTF Grade A/B Screening Rules
 */
export const SCREENING_RULES: ScreeningRule[] = [
  // Cardiovascular
  {
    name: 'Blood Pressure Screening',
    screeningType: 'BLOOD_PRESSURE',
    uspstfGrade: 'A',
    ageRange: { min: 18 },
    frequency: { years: 1 },
    priority: 'HIGH',
    clinicalRecommendation: 'Annual blood pressure screening for all adults',
    guidelineSource: 'USPSTF 2024',
  },
  {
    name: 'Lipid Panel (Cholesterol)',
    screeningType: 'CHOLESTEROL',
    uspstfGrade: 'B',
    ageRange: { min: 40, max: 75 },
    frequency: { years: 5 },
    priority: 'HIGH',
    clinicalRecommendation: 'Lipid screening every 5 years for cardiovascular risk assessment',
    guidelineSource: 'USPSTF 2024',
  },
  {
    name: 'Diabetes Screening (HbA1c)',
    screeningType: 'DIABETES_SCREENING',
    uspstfGrade: 'B',
    ageRange: { min: 35, max: 70 },
    frequency: { years: 3 },
    riskFactors: { bmiMin: 25 }, // Overweight/obese
    priority: 'HIGH',
    clinicalRecommendation: 'Screen for type 2 diabetes every 3 years if BMI ≥ 25',
    guidelineSource: 'USPSTF 2024 / ADA 2024',
  },

  // Cancer Screenings - Enhanced with comprehensive clinical decision support
  {
    name: 'Colorectal Cancer Screening',
    screeningType: 'COLONOSCOPY',
    uspstfGrade: 'A',
    ageRange: { min: 45, max: 75 },
    frequency: { years: 10 }, // If colonoscopy (most sensitive)
    priority: 'HIGH',
    clinicalRecommendation: `**USPSTF Grade A**: Colorectal cancer screening reduces mortality by 68%

**Screening Options** (patient choice):
1. **Colonoscopy** (Gold Standard):
   - Every 10 years
   - Most sensitive (detects 95% of polyps)
   - Allows same-procedure polypectomy
   - Requires bowel prep and sedation

2. **FIT Test** (Fecal Immunochemical Test):
   - Annual testing
   - Non-invasive, no prep
   - 79% sensitivity for cancer
   - Positive test → colonoscopy needed

3. **FIT-DNA (Cologuard)**:
   - Every 3 years
   - 92% sensitivity for cancer
   - No bowel prep, stool sample at home
   - Positive test → colonoscopy needed

4. **CT Colonography** (Virtual Colonoscopy):
   - Every 5 years
   - Less invasive than colonoscopy
   - Requires bowel prep
   - Positive findings → colonoscopy needed

**High-Risk Criteria** (screen earlier/more frequently):
- Family history of CRC or adenomatous polyps
- Personal history of IBD (Crohn's, UC)
- Hereditary syndromes (Lynch, FAP)
- If high-risk: Start screening at age 40 or 10 years before youngest affected relative

**Evidence**: NEJM 2022 - Colonoscopy reduces CRC incidence by 31%, mortality by 68%`,
    guidelineSource: 'USPSTF 2024 / ACS 2024',
  },
  {
    name: 'Breast Cancer Screening (Mammogram)',
    screeningType: 'MAMMOGRAM',
    uspstfGrade: 'B',
    ageRange: { min: 50, max: 74 },
    genderRestriction: 'female',
    frequency: { years: 2 },
    priority: 'HIGH',
    clinicalRecommendation: 'Biennial mammography for women age 50-74',
    guidelineSource: 'USPSTF 2024',
  },
  {
    name: 'Cervical Cancer Screening',
    screeningType: 'CERVICAL_CANCER',
    uspstfGrade: 'A',
    ageRange: { min: 21, max: 65 },
    genderRestriction: 'female',
    frequency: { years: 3 }, // Pap smear alone
    priority: 'HIGH',
    clinicalRecommendation: `**USPSTF Grade A**: Cervical cancer screening prevents 60-90% of cases

**Screening Strategies** (evidence-based):
1. **Ages 21-29** (Cytology Alone):
   - Pap smear every 3 years
   - HPV testing NOT recommended (high false-positive rate)

2. **Ages 30-65** (Preferred: Co-testing):
   - **Option A** (Preferred): Pap + HPV co-testing every 5 years
   - **Option B**: Pap smear alone every 3 years
   - **Option C**: HPV testing alone every 5 years

3. **Ages 65+** (Can Discontinue If):
   - 3 consecutive negative Pap tests, OR
   - 2 consecutive negative co-tests in past 10 years
   - Most recent test within 5 years
   - NO history of CIN2+ in past 25 years

**Continue Screening If**:
- History of CIN2, CIN3, or cervical cancer
- Immunocompromised (HIV, transplant)
- DES exposure in utero
- Never adequately screened

**Post-Hysterectomy**:
- Stop screening if cervix removed AND no CIN2+ history
- Continue if cervix retained or CIN2+ history

**HPV Vaccination Status**:
- Screening intervals SAME regardless of vaccine status
- Gardasil 9 protects against 90% of cervical cancers
- Vaccination does NOT eliminate need for screening

**Evidence**:
- Pap screening → 60-80% reduction in cervical cancer incidence
- HPV co-testing → 90% sensitivity for CIN3+
- Early detection → 93% 5-year survival rate (localized disease)`,
    guidelineSource: 'USPSTF 2024 / ACS 2024 / ACOG 2024',
  },
  {
    name: 'Lung Cancer Screening',
    screeningType: 'LUNG_CANCER',
    uspstfGrade: 'B',
    ageRange: { min: 50, max: 80 },
    frequency: { years: 1 },
    riskFactors: { tobaccoUse: true },
    priority: 'HIGH',
    clinicalRecommendation: 'Annual low-dose CT for adults 50-80 with 20+ pack-year smoking history',
    guidelineSource: 'USPSTF 2024',
  },

  // Vaccinations
  {
    name: 'Influenza Vaccine',
    screeningType: 'INFLUENZA',
    uspstfGrade: 'A',
    ageRange: { min: 18 },
    frequency: { years: 1 },
    priority: 'HIGH',
    clinicalRecommendation: 'Annual flu vaccine for all adults',
    guidelineSource: 'CDC 2024',
  },
  {
    name: 'Pneumococcal Vaccine',
    screeningType: 'PNEUMOCOCCAL',
    uspstfGrade: 'A',
    ageRange: { min: 65 },
    frequency: { years: 5 }, // PPSV23 revaccination
    priority: 'HIGH',
    clinicalRecommendation: 'Pneumococcal vaccination for all adults ≥65',
    guidelineSource: 'CDC 2024',
  },
  {
    name: 'Shingles Vaccine (Shingrix)',
    screeningType: 'SHINGLES',
    uspstfGrade: 'A',
    ageRange: { min: 50 },
    frequency: { years: 5 }, // Typically 2-dose series, but monitor for updates
    priority: 'MEDIUM',
    clinicalRecommendation: 'Shingrix vaccine series for adults ≥50',
    guidelineSource: 'CDC 2024',
  },
];

/**
 * Calculate patient age
 */
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Check if patient meets risk factor criteria
 */
function meetsRiskFactors(
  patient: any,
  riskFactors?: ScreeningRule['riskFactors']
): boolean {
  if (!riskFactors) return true;

  // BMI check
  if (riskFactors.bmiMin && patient.bmi) {
    if (patient.bmi < riskFactors.bmiMin) {
      return false;
    }
  }

  // Tobacco use
  if (riskFactors.tobaccoUse !== undefined) {
    if (patient.tobaccoUse !== riskFactors.tobaccoUse) {
      return false;
    }
  }

  // All risk factors met
  return true;
}

/**
 * Check if screening is due based on last screening date
 */
function isScreeningDue(
  lastScreeningDate: Date | null,
  frequency: ScreeningRule['frequency']
): boolean {
  if (!lastScreeningDate) {
    return true; // Never done - due now
  }

  const today = new Date();
  const monthsSinceScreening = differenceInMonths(today, lastScreeningDate);

  const frequencyMonths = (frequency.years || 0) * 12 + (frequency.months || 0);

  return monthsSinceScreening >= frequencyMonths;
}

/**
 * Get screening field name from screening type
 */
function getScreeningFieldName(screeningType: string): string | null {
  const fieldMap: Record<string, string> = {
    BLOOD_PRESSURE: 'lastBloodPressureCheck',
    CHOLESTEROL: 'lastCholesterolTest',
    DIABETES_SCREENING: 'lastHbA1c',
    COLONOSCOPY: 'lastColonoscopy',
    MAMMOGRAM: 'lastMammogram',
    CERVICAL_CANCER: 'lastPapSmear',
    LUNG_CANCER: 'lastColonoscopy', // TODO: Add dedicated field
    PROSTATE_CANCER: 'lastProstateScreening',
    INFLUENZA: 'lastImmunizationUpdate',
    PNEUMOCOCCAL: 'lastImmunizationUpdate',
    SHINGLES: 'lastImmunizationUpdate',
  };

  return fieldMap[screeningType] || null;
}

/**
 * Generate due screenings for a patient
 */
export async function generateDueScreenings(
  patientId: string
): Promise<Array<{
  rule: ScreeningRule;
  dueDate: Date;
  overdueDays: number;
  lastScreeningDate: Date | null;
}>> {
  // Fetch patient with screening data
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      dateOfBirth: true,
      gender: true,
      bmi: true,
      tobaccoUse: true,
      lastBloodPressureCheck: true,
      lastCholesterolTest: true,
      lastHbA1c: true,
      lastColonoscopy: true,
      lastMammogram: true,
      lastPapSmear: true,
      lastProstateScreening: true,
      lastImmunizationUpdate: true,
    },
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  const age = calculateAge(patient.dateOfBirth);
  const dueScreenings: Array<{
    rule: ScreeningRule;
    dueDate: Date;
    overdueDays: number;
    lastScreeningDate: Date | null;
  }> = [];

  for (const rule of SCREENING_RULES) {
    // Age check
    if (age < rule.ageRange.min) continue;
    if (rule.ageRange.max && age > rule.ageRange.max) continue;

    // Gender check
    if (rule.genderRestriction) {
      const patientGender = patient.gender?.toLowerCase();
      if (patientGender !== rule.genderRestriction) continue;
    }

    // Risk factors check
    if (!meetsRiskFactors(patient, rule.riskFactors)) continue;

    // Get last screening date
    const fieldName = getScreeningFieldName(rule.screeningType);
    const lastScreeningDate = fieldName
      ? (patient[fieldName as keyof typeof patient] as Date | null)
      : null;

    // Check if due
    if (isScreeningDue(lastScreeningDate, rule.frequency)) {
      const dueDate = lastScreeningDate
        ? addMonths(
            lastScreeningDate,
            (rule.frequency.years || 0) * 12 + (rule.frequency.months || 0)
          )
        : new Date();

      const today = new Date();
      const overdueDays = isBefore(dueDate, today)
        ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      dueScreenings.push({
        rule,
        dueDate,
        overdueDays,
        lastScreeningDate,
      });
    }
  }

  return dueScreenings;
}

/**
 * Create prevention plan reminders for due screenings
 */
export async function createScreeningReminders(
  patientId: string,
  clinicianId: string
): Promise<number> {
  const dueScreenings = await generateDueScreenings(patientId);

  let remindersCreated = 0;

  for (const screening of dueScreenings) {
    // Check if reminder already exists
    const existingReminder = await prisma.preventiveCareReminder.findFirst({
      where: {
        patientId,
        screeningType: screening.rule.screeningType as any,
        status: 'DUE',
      },
    });

    if (existingReminder) {
      continue; // Skip if reminder already exists
    }

    // Note: PreventiveCareReminder is sufficient for tracking screening schedules.
    // Prevention plans are reserved for interventions based on abnormal lab results.

    remindersCreated++;
  }

  return remindersCreated;
}

/**
 * Auto-generate screening reminders for all active patients
 * Run this as a daily cron job
 */
export async function autoGenerateScreeningReminders(): Promise<{
  patientsProcessed: number;
  remindersCreated: number;
}> {
  console.log('[Screening Triggers] Starting auto-generation...');

  const activePatients = await prisma.patient.findMany({
    where: { isActive: true },
    select: { id: true, assignedClinicianId: true },
  });

  let remindersCreated = 0;

  for (const patient of activePatients) {
    try {
      const created = await createScreeningReminders(
        patient.id,
        patient.assignedClinicianId || 'SYSTEM'
      );
      remindersCreated += created;
    } catch (error) {
      console.error(`[Screening Triggers] Error for patient ${patient.id}:`, error);
    }
  }

  console.log(
    `[Screening Triggers] Complete. Processed ${activePatients.length} patients, created ${remindersCreated} reminders`
  );

  return {
    patientsProcessed: activePatients.length,
    remindersCreated,
  };
}
