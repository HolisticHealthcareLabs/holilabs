/**
 * Demo Scenarios for CDSS Playground
 *
 * 5 hardcoded patient scenarios conforming to CDSContext interface.
 * No database, no auth, no external APIs — pure static data.
 *
 * Each scenario is designed to trigger specific CDS rules:
 * - diabetes: lab abnormalities + screening gaps (YELLOW)
 * - hypertension: lipid abnormalities + screening gaps (YELLOW)
 * - drug-interaction: warfarin+aspirin + penicillin allergy (RED)
 * - preventive: screening reminders only (GREEN)
 * - doac-safety: missing CrCl + low weight (RED/BLOCK)
 */

import type {
  CDSContext,
  Medication,
  Allergy,
  Condition,
  LabResult,
  VitalSigns,
  PatientDemographics,
} from '@/lib/cds/types';

export type TrafficLightSignal = 'green' | 'yellow' | 'red';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  trafficLight: TrafficLightSignal;
  demographicsSummary: string;
  context: CDSContext;
}

function makeContext(params: {
  scenarioId: string;
  hookType: CDSContext['hookType'];
  medications?: Medication[];
  allergies?: Allergy[];
  conditions?: Condition[];
  labResults?: LabResult[];
  vitalSigns?: VitalSigns;
  demographics?: PatientDemographics;
}): CDSContext {
  return {
    patientId: `demo-${params.scenarioId}`,
    userId: 'demo-clinician',
    hookInstance: crypto.randomUUID(),
    hookType: params.hookType,
    context: {
      patientId: `demo-${params.scenarioId}`,
      medications: params.medications ?? [],
      allergies: params.allergies ?? [],
      conditions: params.conditions ?? [],
      labResults: params.labResults ?? [],
      vitalSigns: params.vitalSigns,
      demographics: params.demographics,
    },
  };
}

// ─── Scenario 1: Maria — Diabetes ────────────────────────────────────────────

const diabetesContext = makeContext({
  scenarioId: 'diabetes',
  hookType: 'patient-view',
  medications: [
    {
      id: 'med-d1',
      name: 'Metformin',
      genericName: 'Metformin',
      dosage: '850mg',
      frequency: 'BID',
      route: 'oral',
      status: 'active',
    },
    {
      id: 'med-d2',
      name: 'Enalapril',
      genericName: 'Enalapril',
      dosage: '10mg',
      frequency: 'QD',
      route: 'oral',
      status: 'active',
    },
    {
      id: 'med-d3',
      name: 'Atorvastatin',
      genericName: 'Atorvastatin',
      dosage: '20mg',
      frequency: 'QD',
      route: 'oral',
      status: 'active',
    },
  ],
  allergies: [
    {
      id: 'allergy-d1',
      allergen: 'Penicillin',
      reaction: 'Rash, urticaria',
      severity: 'moderate',
      verificationStatus: 'confirmed',
    },
    {
      id: 'allergy-d2',
      allergen: 'Shellfish',
      reaction: 'Angioedema',
      severity: 'severe',
      verificationStatus: 'confirmed',
    },
  ],
  conditions: [
    {
      id: 'cond-d1',
      code: 'E11.9',
      display: 'Type 2 Diabetes Mellitus',
      icd10Code: 'E11.9',
      snomedCode: '44054006',
      clinicalStatus: 'active',
      verificationStatus: 'confirmed',
      recordedDate: '2018-03-15',
    },
    {
      id: 'cond-d2',
      code: 'I10',
      display: 'Essential Hypertension',
      icd10Code: 'I10',
      snomedCode: '38341003',
      clinicalStatus: 'active',
      verificationStatus: 'confirmed',
      recordedDate: '2019-06-20',
    },
  ],
  labResults: [
    {
      id: 'lab-d1',
      testName: 'HbA1c',
      loincCode: '4548-4',
      value: 7.2,
      unit: '%',
      referenceRange: '4.0 - 5.6',
      interpretation: 'high',
      effectiveDate: new Date(Date.now() - 7 * 86400000).toISOString(),
      status: 'final',
    },
    {
      id: 'lab-d2',
      testName: 'Fasting Glucose',
      loincCode: '1558-6',
      value: 145,
      unit: 'mg/dL',
      referenceRange: '70 - 100',
      interpretation: 'high',
      effectiveDate: new Date(Date.now() - 7 * 86400000).toISOString(),
      status: 'final',
    },
    {
      id: 'lab-d3',
      testName: 'eGFR',
      loincCode: '33914-3',
      value: 58,
      unit: 'mL/min/1.73m2',
      referenceRange: '> 60',
      interpretation: 'low',
      effectiveDate: new Date(Date.now() - 7 * 86400000).toISOString(),
      status: 'final',
    },
  ],
  vitalSigns: {
    bloodPressureSystolic: 135,
    bloodPressureDiastolic: 85,
    heartRate: 78,
    temperature: 97.7,
    weight: 78,
    height: 165,
    bmi: 28.7,
    recordedAt: new Date().toISOString(),
  },
  demographics: {
    age: 60,
    gender: 'female',
    birthDate: '1965-03-15',
    pregnant: false,
    smoking: false,
    alcohol: false,
  },
});

// ─── Scenario 2: Carlos — Hypertension ──────────────────────────────────────

const hypertensionContext = makeContext({
  scenarioId: 'hypertension',
  hookType: 'patient-view',
  medications: [
    {
      id: 'med-h1',
      name: 'Losartan',
      genericName: 'Losartan',
      dosage: '50mg',
      frequency: 'QD',
      route: 'oral',
      status: 'active',
    },
    {
      id: 'med-h2',
      name: 'Amlodipine',
      genericName: 'Amlodipine',
      dosage: '5mg',
      frequency: 'QD',
      route: 'oral',
      status: 'active',
    },
    {
      id: 'med-h3',
      name: 'Atorvastatin',
      genericName: 'Atorvastatin',
      dosage: '40mg',
      frequency: 'QD',
      route: 'oral',
      status: 'active',
    },
    {
      id: 'med-h4',
      name: 'Aspirin',
      genericName: 'Aspirin',
      rxNormCode: '1191',
      dosage: '100mg',
      frequency: 'QD',
      route: 'oral',
      status: 'active',
    },
  ],
  allergies: [],
  conditions: [
    {
      id: 'cond-h1',
      code: 'I10',
      display: 'Essential Hypertension',
      icd10Code: 'I10',
      snomedCode: '38341003',
      clinicalStatus: 'active',
      verificationStatus: 'confirmed',
      recordedDate: '2016-08-22',
    },
    {
      id: 'cond-h2',
      code: 'E78.5',
      display: 'Dyslipidemia',
      icd10Code: 'E78.5',
      snomedCode: '370992007',
      clinicalStatus: 'active',
      verificationStatus: 'confirmed',
      recordedDate: '2018-01-15',
    },
  ],
  labResults: [
    {
      id: 'lab-h1',
      testName: 'LDL Cholesterol',
      loincCode: '13457-7',
      value: 145,
      unit: 'mg/dL',
      referenceRange: '< 100',
      interpretation: 'high',
      effectiveDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      status: 'final',
    },
    {
      id: 'lab-h2',
      testName: 'Total Cholesterol',
      loincCode: '2093-3',
      value: 230,
      unit: 'mg/dL',
      referenceRange: '< 200',
      interpretation: 'high',
      effectiveDate: new Date(Date.now() - 14 * 86400000).toISOString(),
      status: 'final',
    },
  ],
  vitalSigns: {
    bloodPressureSystolic: 142,
    bloodPressureDiastolic: 90,
    heartRate: 72,
    temperature: 98.2,
    weight: 85,
    height: 170,
    bmi: 29.4,
    recordedAt: new Date().toISOString(),
  },
  demographics: {
    age: 67,
    gender: 'male',
    birthDate: '1958-08-22',
    smoking: false,
    alcohol: false,
  },
});

// ─── Scenario 3: Pedro — Drug Interaction ───────────────────────────────────

const drugInteractionContext = makeContext({
  scenarioId: 'drug-interaction',
  hookType: 'medication-prescribe',
  medications: [
    {
      id: 'med-di1',
      name: 'Warfarin',
      genericName: 'Warfarin',
      rxNormCode: '11289',
      dosage: '5mg',
      frequency: 'QD',
      route: 'oral',
      status: 'active',
    },
    {
      id: 'med-di2',
      name: 'Aspirin',
      genericName: 'Aspirin',
      rxNormCode: '1191',
      dosage: '325mg',
      frequency: 'QD',
      route: 'oral',
      status: 'active',
    },
    {
      id: 'med-di3',
      name: 'Amoxicillin',
      genericName: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'TID',
      route: 'oral',
      status: 'draft',
    },
  ],
  allergies: [
    {
      id: 'allergy-di1',
      allergen: 'Penicillin',
      reaction: 'Anaphylaxis',
      severity: 'life-threatening',
      verificationStatus: 'confirmed',
    },
  ],
  conditions: [
    {
      id: 'cond-di1',
      code: 'I48.91',
      display: 'Atrial Fibrillation, Unspecified',
      icd10Code: 'I48.91',
      snomedCode: '49436004',
      clinicalStatus: 'active',
      verificationStatus: 'confirmed',
      recordedDate: '2020-05-10',
    },
    {
      id: 'cond-di2',
      code: 'I82.40',
      display: 'Deep Vein Thrombosis (history)',
      icd10Code: 'I82.40',
      snomedCode: '128053003',
      clinicalStatus: 'inactive',
      verificationStatus: 'confirmed',
      recordedDate: '2022-11-01',
    },
  ],
  labResults: [
    {
      id: 'lab-di1',
      testName: 'INR',
      loincCode: '6301-6',
      value: 2.5,
      unit: '',
      referenceRange: '2.0 - 3.0',
      interpretation: 'normal',
      effectiveDate: new Date(Date.now() - 3 * 86400000).toISOString(),
      status: 'final',
    },
  ],
  vitalSigns: {
    bloodPressureSystolic: 128,
    bloodPressureDiastolic: 82,
    heartRate: 84,
    weight: 80,
    height: 175,
    bmi: 26.1,
    recordedAt: new Date().toISOString(),
  },
  demographics: {
    age: 45,
    gender: 'male',
    birthDate: '1980-07-20',
    smoking: false,
    alcohol: false,
  },
});

// ─── Scenario 4: Ana — Preventive ───────────────────────────────────────────

const preventiveContext = makeContext({
  scenarioId: 'preventive',
  hookType: 'patient-view',
  medications: [],
  allergies: [],
  conditions: [],
  labResults: [
    {
      id: 'lab-p1',
      testName: 'Complete Blood Count',
      loincCode: '58410-2',
      value: 'Normal',
      unit: '',
      referenceRange: 'Normal',
      interpretation: 'normal',
      effectiveDate: new Date().toISOString(),
      status: 'final',
    },
    {
      id: 'lab-p2',
      testName: 'Fasting Glucose',
      loincCode: '1558-6',
      value: 88,
      unit: 'mg/dL',
      referenceRange: '70 - 100',
      interpretation: 'normal',
      effectiveDate: new Date().toISOString(),
      status: 'final',
    },
  ],
  vitalSigns: {
    bloodPressureSystolic: 115,
    bloodPressureDiastolic: 75,
    heartRate: 68,
    temperature: 98.1,
    weight: 62,
    height: 165,
    bmi: 22.8,
    recordedAt: new Date().toISOString(),
  },
  demographics: {
    age: 39,
    gender: 'female',
    birthDate: '1986-11-30',
    pregnant: false,
    smoking: false,
    alcohol: false,
  },
});

// ─── Scenario 5: Jorge — DOAC Safety ────────────────────────────────────────

const doacSafetyContext = makeContext({
  scenarioId: 'doac-safety',
  hookType: 'patient-view',
  medications: [
    {
      id: 'med-doac1',
      name: 'Rivaroxaban',
      genericName: 'Rivaroxaban',
      dosage: '20mg',
      frequency: 'QD',
      route: 'oral',
      status: 'active',
    },
  ],
  allergies: [],
  conditions: [
    {
      id: 'cond-doac1',
      code: 'I48.91',
      display: 'Atrial Fibrillation, Unspecified',
      icd10Code: 'I48.91',
      snomedCode: '49436004',
      clinicalStatus: 'active',
      verificationStatus: 'confirmed',
      recordedDate: '2019-04-12',
    },
  ],
  labResults: [],
  vitalSigns: {
    bloodPressureSystolic: 138,
    bloodPressureDiastolic: 78,
    heartRate: 88,
    weight: 48,
    height: 162,
    bmi: 18.3,
    recordedAt: new Date().toISOString(),
  },
  demographics: {
    age: 72,
    gender: 'male',
    birthDate: '1953-09-05',
    smoking: false,
    alcohol: false,
  },
});

// ─── Export ──────────────────────────────────────────────────────────────────

export const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  diabetes: {
    id: 'diabetes',
    name: 'Maria Gonzalez',
    description: '60F, Type 2 Diabetes + Hypertension. Elevated HbA1c, reduced kidney function.',
    trafficLight: 'yellow',
    demographicsSummary: '60 years old, Female',
    context: diabetesContext,
  },
  hypertension: {
    id: 'hypertension',
    name: 'Carlos Fernandez',
    description: '67M, Hypertension + Dyslipidemia. High LDL, cardiovascular risk.',
    trafficLight: 'yellow',
    demographicsSummary: '67 years old, Male',
    context: hypertensionContext,
  },
  'drug-interaction': {
    id: 'drug-interaction',
    name: 'Pedro Morales',
    description: '45M, on Warfarin + Aspirin. Doctor prescribing Amoxicillin (penicillin allergy).',
    trafficLight: 'red',
    demographicsSummary: '45 years old, Male',
    context: drugInteractionContext,
  },
  preventive: {
    id: 'preventive',
    name: 'Ana Martinez',
    description: '39F, healthy. Annual checkup with screening reminders.',
    trafficLight: 'green',
    demographicsSummary: '39 years old, Female',
    context: preventiveContext,
  },
  'doac-safety': {
    id: 'doac-safety',
    name: 'Jorge Ramirez',
    description: '72M, on Rivaroxaban. No recent kidney labs, low weight (48kg).',
    trafficLight: 'red',
    demographicsSummary: '72 years old, Male',
    context: doacSafetyContext,
  },
};

export const SCENARIO_IDS = Object.keys(DEMO_SCENARIOS);
