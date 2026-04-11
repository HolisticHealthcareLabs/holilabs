import { NextRequest, NextResponse } from 'next/server';
import type { MedicalDiscipline } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { getDisciplineConfig } from '@/lib/prevention/disciplines/registry';
import { generateDisciplineContext } from '@/lib/prevention/disciplines/context-generator';
import type { PatientDisciplineInput } from '@/lib/prevention/disciplines/types';
import { BRAZIL_SCREENING_RULES } from '@/lib/prevention/screening-rules-br';
import { COLOMBIA_SCREENING_RULES } from '@/lib/prevention/screening-rules-co';
import { BOLIVIA_SCREENING_RULES } from '@/lib/prevention/screening-rules-bo';
import type { ScreeningRule } from '@/lib/prevention/screening-triggers';
import '@/lib/prevention/disciplines/index';

export const dynamic = 'force-dynamic';

const JURISDICTION_RULES: Record<string, ScreeningRule[]> = {
  BR: BRAZIL_SCREENING_RULES,
  CO: COLOMBIA_SCREENING_RULES,
  BO: BOLIVIA_SCREENING_RULES,
};

const VALID_DISCIPLINES = new Set<string>([
  'CARDIOLOGY', 'ENDOCRINOLOGY', 'ONCOLOGY', 'MENTAL_HEALTH',
  'PEDIATRICS', 'GERIATRICS', 'NEPHROLOGY', 'PULMONOLOGY',
  'OB_GYN', 'PRIMARY_CARE',
]);

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

function mapGenderToBiologicalSex(gender: string | null): 'MALE' | 'FEMALE' {
  if (!gender) return 'MALE';
  const normalized = gender.toUpperCase();
  if (normalized === 'FEMALE' || normalized === 'F') return 'FEMALE';
  return 'MALE';
}

function resolveJurisdiction(country: string | null): 'BR' | 'CO' | 'BO' {
  const normalized = (country ?? 'BR').toUpperCase();
  if (normalized === 'CO' || normalized === 'COLOMBIA') return 'CO';
  if (normalized === 'BO' || normalized === 'BOLIVIA') return 'BO';
  return 'BR';
}

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const discipline = context.params?.discipline as string;

      if (!VALID_DISCIPLINES.has(discipline)) {
        return NextResponse.json(
          { error: 'Invalid discipline', valid: Array.from(VALID_DISCIPLINES) },
          { status: 400 },
        );
      }

      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');

      if (!patientId) {
        return NextResponse.json(
          { error: 'Missing required query parameter: patientId' },
          { status: 400 },
        );
      }

      const config = getDisciplineConfig(discipline as MedicalDiscipline);
      if (!config) {
        return NextResponse.json(
          { error: `Discipline '${discipline}' is not registered` },
          { status: 404 },
        );
      }

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          dateOfBirth: true,
          gender: true,
          country: true,
          tobaccoUse: true,
          bmi: true,
          lastBloodPressureCheck: true,
          lastCholesterolTest: true,
          lastHbA1c: true,
          lastMammogram: true,
          lastPapSmear: true,
          lastColonoscopy: true,
          lastProstateScreening: true,
        },
      });

      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }

      const age = calculateAge(patient.dateOfBirth);
      const biologicalSex = mapGenderToBiologicalSex(patient.gender);
      const jurisdiction = resolveJurisdiction(patient.country);

      const lastScreenings: Record<string, Date> = {};
      if (patient.lastBloodPressureCheck) lastScreenings['BLOOD_PRESSURE'] = patient.lastBloodPressureCheck;
      if (patient.lastCholesterolTest) lastScreenings['CHOLESTEROL'] = patient.lastCholesterolTest;
      if (patient.lastHbA1c) lastScreenings['DIABETES_SCREENING'] = patient.lastHbA1c;
      if (patient.lastMammogram) lastScreenings['MAMMOGRAM'] = patient.lastMammogram;
      if (patient.lastPapSmear) lastScreenings['PAP_SMEAR'] = patient.lastPapSmear;
      if (patient.lastColonoscopy) lastScreenings['COLONOSCOPY'] = patient.lastColonoscopy;
      if (patient.lastProstateScreening) lastScreenings['PROSTATE_SCREENING'] = patient.lastProstateScreening;

      const riskFactors: string[] = [];
      if (patient.tobaccoUse) riskFactors.push('TOBACCO_USE');
      if (patient.bmi && patient.bmi >= 30) riskFactors.push('OBESITY');
      if (patient.bmi && patient.bmi >= 25 && patient.bmi < 30) riskFactors.push('OVERWEIGHT');

      // AWAITING_REVIEW: Patient data extraction needs refinement for full clinical data
      // ICD-10 codes, active medications, and lab results require joins to
      // encounter/diagnosis, medication, and lab-result models once they are normalized.
      const icd10Codes: string[] = [];
      const activeMedications: string[] = [];
      const labResults: Record<string, { value: number; date: Date }> = {};

      const input: PatientDisciplineInput = {
        patientId: patient.id,
        age,
        biologicalSex,
        icd10Codes,
        activeMedications,
        lastScreenings,
        labResults,
        riskFactors,
        jurisdiction,
      };

      const screeningRules = JURISDICTION_RULES[jurisdiction] ?? [];
      const result = generateDisciplineContext(input, config, screeningRules);

      return NextResponse.json({ data: result });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to generate discipline context' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN'] as any,
    audit: { action: 'READ', resource: 'PreventionDisciplineContext' },
  },
);
