import type { Patient } from '../_components/PatientContextBar';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Problem    { description: string; status: 'active' | 'chronic' | 'resolved'; onset: string }
export interface Medication { name: string; dose: string; frequency: string; prescriber?: string; startDate?: string }
export interface Allergy    { allergen: string; reaction: string; severity: 'mild' | 'moderate' | 'severe' }
export interface Diagnosis  { description: string; icd10: string; year: number }
export interface Encounter  { date: string; type: string; provider: string; summary: string }

// ── Extended patient data (lifelong record) ──
export interface Demographics {
  sex: 'M' | 'F' | 'O';
  bloodType: string;
  language: string;
  ethnicity?: string;
  maritalStatus?: string;
  occupation?: string;
  emergencyContact?: { name: string; relation: string; phone: string };
  insurance?: { provider: string; plan: string; memberId: string };
  // Interoperability — care network
  primaryCareProvider?: { name: string; facility: string; phone?: string };
  referredBy?: { name: string; specialty: string; facility: string };
  connectedFacilities?: { name: string; system: string; lastSync?: string; recordCount?: number }[];
  careTeam?: { name: string; role: string; specialty: string; facility?: string }[];
}

export interface VitalSigns {
  date: string;
  bp: string;
  hr: number;
  temp?: string;
  spo2?: number;
  rr?: number;
  weight?: string;
  height?: string;
  bmi?: number;
}

export interface FamilyHistory {
  relation: string;
  condition: string;
  ageAtOnset?: number;
  deceased?: boolean;
  ageAtDeath?: number;
}

export interface SocialHistory {
  tobacco: { status: 'never' | 'former' | 'current'; packYears?: number; quitDate?: string };
  alcohol: { status: 'none' | 'social' | 'moderate' | 'heavy'; drinksPerWeek?: number };
  exercise: { frequency: string; type?: string };
  diet?: string;
  occupation?: string;
  livingSituation?: string;
}

export interface SurgicalHistory {
  procedure: string;
  date: string;
  surgeon?: string;
  hospital?: string;
  complications?: string;
}

export interface Immunization {
  vaccine: string;
  date: string;
  dueDate?: string;
  status: 'completed' | 'due' | 'overdue';
}

export interface LabResult {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  date: string;
  flag?: 'normal' | 'high' | 'low' | 'critical';
}

export interface FacesheetData {
  problems:       Problem[];
  medications:    Medication[];
  allergies:      Allergy[];
  diagnoses:      Diagnosis[];
  encounters:     Encounter[];
  demographics?:  Demographics;
  vitals?:        VitalSigns[];
  familyHistory?: FamilyHistory[];
  socialHistory?: SocialHistory;
  surgicalHistory?: SurgicalHistory[];
  immunizations?: Immunization[];
  labResults?:    LabResult[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo roster
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_PATIENTS: Patient[] = [
  { id: 'P001', organizationId: 'org-demo-clinic', name: 'Robert Chen',         dob: '03/15/1958', mrn: 'MRN-001', email: 'robert.chen@email.com',       phone: '+5511984321001' },
  { id: 'P002', organizationId: 'org-demo-clinic', name: 'Maria Santos',        dob: '07/22/1972', mrn: 'MRN-002', email: 'maria.santos@email.com',      phone: '+5511984321002' },
  { id: 'P003', organizationId: 'org-demo-clinic', name: "James O'Brien",       dob: '11/08/1945', mrn: 'MRN-003', email: 'james.obrien@email.com',      phone: '+5511984321003' },
  { id: 'P004', organizationId: 'org-partner-hospital', name: 'Sofia Reyes',    dob: '02/14/1985', mrn: 'MRN-004', email: 'sofia.reyes@email.com',       phone: '+5731984321004' },
  { id: 'P005', organizationId: 'org-demo-clinic', name: 'Ana Luísa Ferreira',  dob: '09/03/1990', mrn: 'MRN-005', email: 'ana.ferreira@email.com',      phone: '+5511984321005' },
  { id: 'P006', organizationId: 'org-demo-clinic', name: 'Carlos Eduardo Lima', dob: '01/28/1963', mrn: 'MRN-006', email: 'carlos.lima@email.com',       phone: '+5511984321006' },
  { id: 'P007', organizationId: 'org-demo-clinic', name: 'Patricia Morales',    dob: '06/17/1978', mrn: 'MRN-007', email: 'patricia.morales@email.com',   phone: '+5731984321007' },
  { id: 'P008', organizationId: 'org-partner-hospital', name: 'Tomás Herrera',  dob: '12/05/1955', mrn: 'MRN-008', email: 'tomas.herrera@email.com',     phone: '+5731984321008' },
  { id: 'P009', organizationId: 'org-demo-clinic', name: 'Beatriz Oliveira',    dob: '04/22/1988', mrn: 'MRN-009', email: 'beatriz.oliveira@email.com',  phone: '+5511984321009' },
  { id: 'P010', organizationId: 'org-demo-clinic', name: 'Ricardo Nakamura',    dob: '08/11/1970', mrn: 'MRN-010', email: 'ricardo.nakamura@email.com',  phone: '+5511984321010' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic facesheet data (industry-standard EHR sections)
// ─────────────────────────────────────────────────────────────────────────────

const FACESHEET: Record<string, FacesheetData> = {
  P001: {
    demographics: {
      sex: 'M', bloodType: 'A+', language: 'English', ethnicity: 'Asian', maritalStatus: 'Married',
      occupation: 'Retired engineer',
      emergencyContact: { name: 'Linda Chen', relation: 'Spouse', phone: '+5511984321099' },
      insurance: { provider: 'Bradesco Saude', plan: 'Executive Plus', memberId: 'BRD-44821' },
      primaryCareProvider: { name: 'Dr. Ana Lopes', facility: 'Clínica São Lucas', phone: '+551134567890' },
      referredBy: { name: 'Dr. Ricardo Alvarez', specialty: 'Cardiology', facility: 'Hospital Sírio-Libanês' },
      connectedFacilities: [
        { name: 'Hospital Sírio-Libanês', system: 'Tasy (Philips)', lastSync: '2026-03-04', recordCount: 28 },
        { name: 'Lab Fleury', system: 'MV Sistemas', lastSync: '2026-02-18', recordCount: 45 },
        { name: 'Clínica São Lucas', system: 'FHIR R4', lastSync: '2026-03-01', recordCount: 112 },
        { name: 'Hospital Albert Einstein', system: 'Epic (Care Everywhere)', lastSync: '2025-09-15', recordCount: 6 },
      ],
      careTeam: [
        { name: 'Dr. Ana Lopes', role: 'PCP', specialty: 'Internal Medicine', facility: 'Clínica São Lucas' },
        { name: 'Dr. Ricardo Alvarez', role: 'Specialist', specialty: 'Cardiology', facility: 'Sírio-Libanês' },
        { name: 'Dr. Mariana Costa', role: 'Specialist', specialty: 'Endocrinology', facility: 'Sírio-Libanês' },
        { name: 'Enf. Patricia Silva', role: 'Nurse', specialty: 'Cardiac Rehab', facility: 'Clínica São Lucas' },
      ],
    },
    vitals: [
      { date: '2026-03-05', bp: '162/95', hr: 94, temp: '36.8°C', spo2: 93, rr: 18, weight: '82 kg', height: '175 cm', bmi: 26.8 },
      { date: '2026-02-18', bp: '148/88', hr: 78, spo2: 96, weight: '82 kg' },
      { date: '2025-11-04', bp: '140/85', hr: 72, spo2: 97, weight: '81 kg' },
      { date: '2025-07-22', bp: '138/82', hr: 70, spo2: 98, weight: '80 kg' },
    ],
    familyHistory: [
      { relation: 'Father', condition: 'Myocardial infarction', ageAtOnset: 55, deceased: true, ageAtDeath: 62 },
      { relation: 'Mother', condition: 'Type 2 Diabetes', ageAtOnset: 60, deceased: false },
      { relation: 'Mother', condition: 'Breast cancer', ageAtOnset: 68, deceased: false },
      { relation: 'Brother', condition: 'Hypertension', ageAtOnset: 48, deceased: false },
      { relation: 'Paternal grandfather', condition: 'Stroke', ageAtOnset: 70, deceased: true, ageAtDeath: 72 },
    ],
    socialHistory: {
      tobacco: { status: 'former', packYears: 15, quitDate: '2010-01-01' },
      alcohol: { status: 'social', drinksPerWeek: 3 },
      exercise: { frequency: '2x/week', type: 'Walking, light cycling' },
      diet: 'Low-sodium, trying to reduce red meat',
      livingSituation: 'Lives with spouse in own home',
    },
    surgicalHistory: [
      { procedure: 'Appendectomy', date: '1985-06-15', hospital: 'São Paulo General' },
      { procedure: 'Right knee arthroscopy', date: '2019-03-22', surgeon: 'Dr. R. Alvarez', hospital: 'Sírio-Libanês', complications: 'None' },
    ],
    immunizations: [
      { vaccine: 'Influenza',  date: '2025-04-10', dueDate: '2026-04-10', status: 'completed' },
      { vaccine: 'COVID-19 (Bivalent)', date: '2024-11-15', status: 'completed' },
      { vaccine: 'Pneumococcal (PCV20)', date: '2023-03-01', dueDate: '2028-03-01', status: 'completed' },
      { vaccine: 'Shingrix (Dose 2)', date: '2023-06-10', status: 'completed' },
      { vaccine: 'Tetanus (Td)', date: '2020-08-20', dueDate: '2030-08-20', status: 'completed' },
    ],
    labResults: [
      { name: 'HbA1c',       value: '7.1',  unit: '%',     referenceRange: '< 6.5',     date: '2026-02-18', flag: 'high' },
      { name: 'LDL-C',       value: '142',  unit: 'mg/dL', referenceRange: '< 100',     date: '2026-02-18', flag: 'high' },
      { name: 'HDL-C',       value: '38',   unit: 'mg/dL', referenceRange: '> 40',      date: '2026-02-18', flag: 'low' },
      { name: 'Triglycerides',value: '198',  unit: 'mg/dL', referenceRange: '< 150',     date: '2026-02-18', flag: 'high' },
      { name: 'Creatinine',  value: '1.1',  unit: 'mg/dL', referenceRange: '0.7-1.3',   date: '2026-02-18', flag: 'normal' },
      { name: 'eGFR',        value: '72',   unit: 'mL/min',referenceRange: '> 60',       date: '2026-02-18', flag: 'normal' },
      { name: 'Fasting Glucose', value: '132', unit: 'mg/dL', referenceRange: '70-100',  date: '2026-02-18', flag: 'high' },
      { name: 'TSH',         value: '2.4',  unit: 'mIU/L', referenceRange: '0.4-4.0',   date: '2026-02-18', flag: 'normal' },
    ],
    problems: [
      { description: 'Acute Chest Pain',         status: 'active',   onset: '2026-03-05' },
      { description: 'Essential Hypertension',   status: 'chronic',  onset: '2015-06-12' },
      { description: 'Hyperlipidemia',           status: 'chronic',  onset: '2018-02-20' },
      { description: 'Type 2 Diabetes Mellitus', status: 'chronic',  onset: '2020-09-07' },
    ],
    medications: [
      { name: 'Atorvastatin',       dose: '40 mg',   frequency: 'Once daily', prescriber: 'Dr. A. Lopes', startDate: '2018-03-01'  },
      { name: 'Lisinopril',         dose: '10 mg',   frequency: 'Once daily', prescriber: 'Dr. A. Lopes', startDate: '2015-07-01'  },
      { name: 'Aspirin (low-dose)', dose: '81 mg',   frequency: 'Once daily', prescriber: 'Dr. R. Alvarez', startDate: '2020-01-15'  },
      { name: 'Metformin',          dose: '500 mg',  frequency: 'Twice daily', prescriber: 'Dr. M. Costa', startDate: '2020-10-01'  },
      { name: 'Metoprolol Succinate',dose: '25 mg',  frequency: 'Once daily', prescriber: 'Dr. R. Alvarez', startDate: '2024-06-15'  },
      { name: 'Omeprazole',         dose: '20 mg',   frequency: 'Once daily', prescriber: 'Dr. A. Lopes', startDate: '2022-01-10'  },
    ],
    allergies: [
      { allergen: 'Penicillin', reaction: 'Urticaria',   severity: 'moderate' },
      { allergen: 'Shellfish',  reaction: 'Anaphylaxis', severity: 'severe'   },
    ],
    diagnoses: [
      { description: 'Essential Hypertension',   icd10: 'I10',   year: 2015 },
      { description: 'Hyperlipidemia',           icd10: 'E78.5', year: 2018 },
      { description: 'Type 2 Diabetes Mellitus', icd10: 'E11.9', year: 2020 },
    ],
    encounters: [
      { date: '2026-02-18', type: 'Office Visit',    provider: 'Dr. A. Lopes',   summary: 'Annual physical. HTN well-controlled. A1C 7.1.' },
      { date: '2025-11-04', type: 'Cardiology',      provider: 'Dr. R. Alvarez', summary: 'Echo normal. Continued current regimen.' },
      { date: '2025-07-22', type: 'Lab Follow-up',   provider: 'Dr. A. Lopes',   summary: 'Lipid panel improved. Statin dose maintained.' },
    ],
  },
  P002: {
    demographics: {
      sex: 'F', bloodType: 'O+', language: 'Portuguese', ethnicity: 'White/Latina', maritalStatus: 'Married',
      occupation: 'School teacher',
      emergencyContact: { name: 'João Santos', relation: 'Spouse', phone: '+5511984321050' },
      insurance: { provider: 'Bradesco Saude', plan: 'Integral', memberId: 'BRD-55203' },
      primaryCareProvider: { name: 'Dr. A. Lopes', facility: 'Clínica São Lucas', phone: '+551134567890' },
      referredBy: { name: 'Dr. M. Costa', specialty: 'Endocrinology', facility: 'Hospital São Luiz' },
      connectedFacilities: [
        { name: 'Lab Fleury', system: 'MV Sistemas', lastSync: '2026-03-10', recordCount: 32 },
        { name: 'Hospital São Luiz', system: 'FHIR R4', lastSync: '2026-02-22', recordCount: 18 },
      ],
      careTeam: [
        { name: 'Dr. A. Lopes', role: 'PCP', specialty: 'Internal Medicine', facility: 'Clínica São Lucas' },
        { name: 'Dr. M. Costa', role: 'Specialist', specialty: 'Endocrinology', facility: 'Hospital São Luiz' },
        { name: 'Nut. Fernanda Reis', role: 'Nutritionist', specialty: 'Clinical Nutrition', facility: 'Clínica São Lucas' },
      ],
    },
    vitals: [
      { date: '2026-03-10', bp: '128/82', hr: 76, temp: '36.5°C', spo2: 97, rr: 16, weight: '72 kg', height: '160 cm', bmi: 28.2 },
      { date: '2026-01-10', bp: '132/84', hr: 78, spo2: 97, weight: '73 kg' },
      { date: '2025-09-14', bp: '130/80', hr: 74, spo2: 98, weight: '72 kg' },
    ],
    familyHistory: [
      { relation: 'Mother', condition: 'Type 2 Diabetes', ageAtOnset: 50, deceased: false },
      { relation: 'Father', condition: 'Stroke', ageAtOnset: 68, deceased: true, ageAtDeath: 74 },
      { relation: 'Sister', condition: 'Gestational Diabetes', ageAtOnset: 32, deceased: false },
      { relation: 'Maternal grandmother', condition: 'Type 2 Diabetes', ageAtOnset: 55, deceased: true, ageAtDeath: 78 },
    ],
    socialHistory: {
      tobacco: { status: 'never' },
      alcohol: { status: 'social', drinksPerWeek: 2 },
      exercise: { frequency: '3x/week', type: 'Walking, light aerobics' },
      diet: 'Mediterranean-style, moderate carbohydrate restriction',
      livingSituation: 'Lives with spouse and two adult children',
    },
    surgicalHistory: [
      { procedure: 'Cesarean section', date: '2000-11-15', hospital: 'Hospital São Luiz' },
      { procedure: 'Laparoscopic cholecystectomy', date: '2018-06-22', surgeon: 'Dr. R. Mendes', hospital: 'Hospital São Luiz', complications: 'None' },
    ],
    immunizations: [
      { vaccine: 'Influenza', date: '2025-04-20', dueDate: '2026-04-20', status: 'completed' },
      { vaccine: 'COVID-19 (Bivalent)', date: '2024-10-05', status: 'completed' },
      { vaccine: 'Hepatitis B (Dose 3)', date: '2022-08-15', status: 'completed' },
      { vaccine: 'Tetanus (dTpa)', date: '2021-03-10', dueDate: '2031-03-10', status: 'completed' },
    ],
    labResults: [
      { name: 'HbA1c',          value: '7.8',  unit: '%',     referenceRange: '< 6.5',    date: '2026-03-10', flag: 'high' },
      { name: 'Fasting Glucose', value: '148',  unit: 'mg/dL', referenceRange: '70-100',   date: '2026-03-10', flag: 'high' },
      { name: 'LDL-C',          value: '118',  unit: 'mg/dL', referenceRange: '< 100',    date: '2026-03-10', flag: 'high' },
      { name: 'HDL-C',          value: '52',   unit: 'mg/dL', referenceRange: '> 40',     date: '2026-03-10', flag: 'normal' },
      { name: 'Creatinine',     value: '0.9',  unit: 'mg/dL', referenceRange: '0.6-1.1',  date: '2026-03-10', flag: 'normal' },
      { name: 'eGFR',           value: '88',   unit: 'mL/min', referenceRange: '> 60',    date: '2026-03-10', flag: 'normal' },
      { name: 'TSH',            value: '2.8',  unit: 'mIU/L', referenceRange: '0.4-4.0',  date: '2026-03-10', flag: 'normal' },
      { name: 'Microalbumin/Cr', value: '18',  unit: 'mg/g',  referenceRange: '< 30',     date: '2026-03-10', flag: 'normal' },
    ],
    problems: [
      { description: 'Type 2 Diabetes Mellitus', status: 'chronic', onset: '2019-04-15' },
      { description: 'Essential Hypertension',   status: 'chronic', onset: '2021-01-30' },
    ],
    medications: [
      { name: 'Metformin',  dose: '500 mg', frequency: 'Twice daily' },
      { name: 'Metoprolol', dose: '25 mg',  frequency: 'Twice daily' },
    ],
    allergies: [
      { allergen: 'Sulfonamides', reaction: 'Maculopapular rash', severity: 'mild' },
    ],
    diagnoses: [
      { description: 'Type 2 Diabetes Mellitus', icd10: 'E11.9', year: 2019 },
      { description: 'Essential Hypertension',   icd10: 'I10',   year: 2021 },
    ],
    encounters: [
      { date: '2026-01-10', type: 'Endocrinology', provider: 'Dr. P. Costa',   summary: 'HbA1c 6.8%. Metformin dose unchanged.' },
      { date: '2025-09-14', type: 'Office Visit',  provider: 'Dr. M. Ferreira', summary: 'BP 128/82. Medication compliance confirmed.' },
    ],
  },
  P003: {
    demographics: {
      sex: 'M', bloodType: 'B+', language: 'English', ethnicity: 'White', maritalStatus: 'Widowed',
      occupation: 'Retired military officer',
      emergencyContact: { name: "Sean O'Brien", relation: 'Son', phone: '+5511984321060' },
      insurance: { provider: 'Amil', plan: 'Amil One S2500', memberId: 'AML-77814' },
      primaryCareProvider: { name: 'Dr. F. Teixeira', facility: 'Hospital Sírio-Libanês', phone: '+551131556000' },
      referredBy: { name: 'Dr. R. Alvarez', specialty: 'Cardiology', facility: 'Hospital Sírio-Libanês' },
      connectedFacilities: [
        { name: 'Hospital Sírio-Libanês', system: 'Tasy (Philips)', lastSync: '2026-03-15', recordCount: 64 },
        { name: 'Hospital Albert Einstein', system: 'Epic (Care Everywhere)', lastSync: '2026-01-20', recordCount: 22 },
        { name: 'Lab Fleury', system: 'MV Sistemas', lastSync: '2026-02-28', recordCount: 38 },
      ],
      careTeam: [
        { name: 'Dr. F. Teixeira', role: 'PCP', specialty: 'Geriatrics', facility: 'Sírio-Libanês' },
        { name: 'Dr. R. Alvarez', role: 'Specialist', specialty: 'Cardiology', facility: 'Sírio-Libanês' },
        { name: 'Dr. J. Sousa', role: 'Specialist', specialty: 'Nephrology', facility: 'Albert Einstein' },
        { name: 'Dr. G. Monteiro', role: 'Specialist', specialty: 'Geriatric Medicine', facility: 'Sírio-Libanês' },
      ],
    },
    vitals: [
      { date: '2026-03-05', bp: '148/88', hr: 82, temp: '36.4°C', spo2: 94, rr: 20, weight: '70 kg', height: '170 cm', bmi: 24.2 },
      { date: '2026-02-28', bp: '142/84', hr: 78, spo2: 95, weight: '70 kg' },
      { date: '2025-12-11', bp: '138/82', hr: 80, spo2: 95, weight: '71 kg' },
    ],
    familyHistory: [
      { relation: 'Father', condition: 'Stroke', ageAtOnset: 70, deceased: true, ageAtDeath: 72 },
      { relation: 'Mother', condition: 'Congestive Heart Failure', ageAtOnset: 75, deceased: true, ageAtDeath: 82 },
      { relation: 'Brother', condition: 'Atrial Fibrillation', ageAtOnset: 65, deceased: false },
      { relation: 'Paternal uncle', condition: 'Abdominal aortic aneurysm', ageAtOnset: 68, deceased: true, ageAtDeath: 69 },
    ],
    socialHistory: {
      tobacco: { status: 'former', packYears: 30, quitDate: '1990-06-01' },
      alcohol: { status: 'moderate', drinksPerWeek: 5 },
      exercise: { frequency: '3x/week', type: 'Light walking, 15 minutes' },
      diet: 'Low-sodium, fluid-restricted (1.5L/day)',
      livingSituation: 'Lives alone; son visits weekly. Home health aide 3x/week',
    },
    surgicalHistory: [
      { procedure: 'CABG x3', date: '2015-09-10', surgeon: 'Dr. L. Cardoso', hospital: 'Hospital Albert Einstein', complications: 'None' },
      { procedure: 'Right total hip replacement', date: '2019-04-18', surgeon: 'Dr. H. Navarro', hospital: 'Hospital Sírio-Libanês', complications: 'None' },
      { procedure: 'Pacemaker implant (dual-chamber)', date: '2022-11-03', surgeon: 'Dr. R. Alvarez', hospital: 'Hospital Sírio-Libanês', complications: 'None' },
    ],
    immunizations: [
      { vaccine: 'Influenza (high-dose)', date: '2025-04-15', dueDate: '2026-04-15', status: 'completed' },
      { vaccine: 'COVID-19 (Bivalent)', date: '2024-10-20', status: 'completed' },
      { vaccine: 'Pneumococcal (PCV20)', date: '2023-05-10', dueDate: '2028-05-10', status: 'completed' },
      { vaccine: 'Shingrix (Dose 2)', date: '2022-01-15', status: 'completed' },
      { vaccine: 'Tetanus (Td)', date: '2019-06-01', dueDate: '2029-06-01', status: 'completed' },
    ],
    labResults: [
      { name: 'INR',        value: '2.8',  unit: '',      referenceRange: '2.0-3.0',  date: '2026-02-28', flag: 'normal' },
      { name: 'BNP',        value: '450',  unit: 'pg/mL', referenceRange: '< 100',    date: '2026-02-28', flag: 'high' },
      { name: 'Creatinine', value: '1.4',  unit: 'mg/dL', referenceRange: '0.7-1.3',  date: '2026-02-28', flag: 'high' },
      { name: 'eGFR',       value: '48',   unit: 'mL/min', referenceRange: '> 60',    date: '2026-02-28', flag: 'low' },
      { name: 'Potassium',  value: '4.8',  unit: 'mEq/L', referenceRange: '3.5-5.0',  date: '2026-02-28', flag: 'normal' },
      { name: 'Hemoglobin', value: '12.1', unit: 'g/dL',  referenceRange: '13.5-17.5', date: '2026-02-28', flag: 'low' },
      { name: 'Sodium',     value: '138',  unit: 'mEq/L', referenceRange: '136-145',  date: '2026-02-28', flag: 'normal' },
      { name: 'Digoxin Level', value: '1.1', unit: 'ng/mL', referenceRange: '0.5-2.0', date: '2026-02-28', flag: 'normal' },
    ],
    problems: [
      { description: 'Atrial Fibrillation',             status: 'chronic',  onset: '2012-11-08' },
      { description: 'Congestive Heart Failure',        status: 'chronic',  onset: '2014-03-22' },
      { description: 'Chronic Kidney Disease, Stage 3', status: 'chronic',  onset: '2017-08-01' },
    ],
    medications: [
      { name: 'Warfarin',   dose: '5 mg',     frequency: 'Once daily' },
      { name: 'Furosemide', dose: '40 mg',    frequency: 'Once daily' },
      { name: 'Digoxin',    dose: '0.125 mg', frequency: 'Once daily' },
    ],
    allergies: [
      { allergen: 'Codeine', reaction: 'Respiratory depression', severity: 'severe'   },
      { allergen: 'Latex',   reaction: 'Contact dermatitis',     severity: 'moderate' },
    ],
    diagnoses: [
      { description: 'Atrial Fibrillation',             icd10: 'I48.91', year: 2012 },
      { description: 'Congestive Heart Failure',        icd10: 'I50.9',  year: 2014 },
      { description: 'Chronic Kidney Disease, Stage 3', icd10: 'N18.3',  year: 2017 },
    ],
    encounters: [
      { date: '2026-02-28', type: 'Cardiology',     provider: 'Dr. R. Alvarez', summary: 'INR 2.4. Warfarin dose stable. Fluid weight stable.' },
      { date: '2025-12-11', type: 'Nephrology',     provider: 'Dr. J. Sousa',   summary: 'eGFR 48. Dietary restriction counselling.' },
      { date: '2025-10-03', type: 'ED Visit',       provider: 'Dr. T. Mendes',  summary: 'AF with RVR. Cardioverted. Discharged 48h.' },
    ],
  },
  P004: {
    demographics: {
      sex: 'F', bloodType: 'A-', language: 'Spanish', ethnicity: 'Mestiza', maritalStatus: 'Single',
      occupation: 'Software engineer',
      emergencyContact: { name: 'Carmen Reyes', relation: 'Mother', phone: '+5731984321070' },
      insurance: { provider: 'SulAmerica', plan: 'Prestige', memberId: 'SAM-33019' },
      primaryCareProvider: { name: 'Dr. M. Ferreira', facility: 'Clínica São Lucas', phone: '+551134567890' },
      referredBy: { name: 'Dr. P. Costa', specialty: 'Endocrinology', facility: 'Hospital São Luiz' },
      connectedFacilities: [
        { name: 'Hospital São Luiz', system: 'FHIR R4', lastSync: '2026-03-12', recordCount: 14 },
        { name: 'Lab Fleury', system: 'MV Sistemas', lastSync: '2026-01-22', recordCount: 20 },
      ],
      careTeam: [
        { name: 'Dr. M. Ferreira', role: 'PCP', specialty: 'Family Medicine', facility: 'Clínica São Lucas' },
        { name: 'Dr. P. Costa', role: 'Specialist', specialty: 'Endocrinology', facility: 'Hospital São Luiz' },
      ],
    },
    vitals: [
      { date: '2026-03-12', bp: '118/74', hr: 68, temp: '36.6°C', spo2: 99, rr: 14, weight: '62 kg', height: '165 cm', bmi: 22.8 },
      { date: '2026-01-22', bp: '116/72', hr: 70, spo2: 99, weight: '62 kg' },
      { date: '2025-08-30', bp: '120/76', hr: 72, spo2: 98, weight: '63 kg' },
    ],
    familyHistory: [
      { relation: 'Mother', condition: 'Hashimoto thyroiditis', ageAtOnset: 42, deceased: false },
      { relation: 'Maternal aunt', condition: 'Graves disease', ageAtOnset: 38, deceased: false },
      { relation: 'Father', condition: 'Hypertension', ageAtOnset: 55, deceased: false },
    ],
    socialHistory: {
      tobacco: { status: 'never' },
      alcohol: { status: 'social', drinksPerWeek: 3 },
      exercise: { frequency: '4x/week', type: 'Yoga, running' },
      diet: 'Balanced, avoids acidic/spicy foods for GERD management',
      livingSituation: 'Lives alone in apartment',
    },
    surgicalHistory: [],
    immunizations: [
      { vaccine: 'Influenza', date: '2025-05-10', dueDate: '2026-05-10', status: 'completed' },
      { vaccine: 'COVID-19 (Bivalent)', date: '2024-09-15', status: 'completed' },
      { vaccine: 'HPV (completed series)', date: '2008-06-01', status: 'completed' },
      { vaccine: 'Tetanus (dTpa)', date: '2022-11-20', dueDate: '2032-11-20', status: 'completed' },
    ],
    labResults: [
      { name: 'TSH',        value: '2.1',  unit: 'mIU/L', referenceRange: '0.4-4.0',  date: '2026-01-22', flag: 'normal' },
      { name: 'Free T4',    value: '1.2',  unit: 'ng/dL', referenceRange: '0.8-1.8',  date: '2026-01-22', flag: 'normal' },
      { name: 'Anti-TPO',   value: '245',  unit: 'IU/mL', referenceRange: '< 35',     date: '2026-01-22', flag: 'high' },
      { name: 'Hemoglobin', value: '13.4', unit: 'g/dL',  referenceRange: '12.0-16.0', date: '2026-01-22', flag: 'normal' },
      { name: 'Vitamin D',  value: '28',   unit: 'ng/mL', referenceRange: '30-100',   date: '2026-01-22', flag: 'low' },
      { name: 'Ferritin',   value: '45',   unit: 'ng/mL', referenceRange: '12-150',   date: '2026-01-22', flag: 'normal' },
    ],
    problems: [
      { description: 'Hypothyroidism',                   status: 'chronic',  onset: '2016-05-19' },
      { description: 'Gastroesophageal Reflux Disease',  status: 'chronic',  onset: '2020-11-03' },
    ],
    medications: [
      { name: 'Levothyroxine', dose: '100 mcg', frequency: 'Once daily (fasting)' },
      { name: 'Omeprazole',    dose: '20 mg',   frequency: 'Once daily'           },
    ],
    allergies: [],
    diagnoses: [
      { description: 'Hypothyroidism',                  icd10: 'E03.9', year: 2016 },
      { description: 'Gastroesophageal Reflux Disease', icd10: 'K21.0', year: 2020 },
    ],
    encounters: [
      { date: '2026-01-22', type: 'Endocrinology', provider: 'Dr. P. Costa',    summary: 'TSH 2.1 mU/L. Levothyroxine dose maintained.' },
      { date: '2025-08-30', type: 'Office Visit',  provider: 'Dr. M. Ferreira', summary: 'GERD symptoms improved with PPI. Lifestyle counselling.' },
    ],
  },
  P005: {
    demographics: {
      sex: 'F', bloodType: 'AB+', language: 'Portuguese', ethnicity: 'Mixed/Parda', maritalStatus: 'Single',
      occupation: 'Marketing analyst',
      emergencyContact: { name: 'Cláudia Ferreira', relation: 'Mother', phone: '+5511984321080' },
      insurance: { provider: 'Unimed', plan: 'Unimed Flex', memberId: 'UNI-44892' },
      primaryCareProvider: { name: 'Dr. M. Ferreira', facility: 'Clínica São Lucas', phone: '+551134567890' },
      referredBy: { name: 'Dr. L. Barbosa', specialty: 'Gynecology', facility: 'Hospital São Luiz' },
      connectedFacilities: [
        { name: 'Lab Fleury', system: 'MV Sistemas', lastSync: '2026-02-05', recordCount: 15 },
        { name: 'Hospital São Luiz', system: 'FHIR R4', lastSync: '2026-01-10', recordCount: 8 },
      ],
      careTeam: [
        { name: 'Dr. M. Ferreira', role: 'PCP', specialty: 'Family Medicine', facility: 'Clínica São Lucas' },
        { name: 'Dr. L. Barbosa', role: 'Specialist', specialty: 'Gynecology', facility: 'Hospital São Luiz' },
        { name: 'Nut. Carolina Duarte', role: 'Nutritionist', specialty: 'Clinical Nutrition', facility: 'Clínica São Lucas' },
      ],
    },
    vitals: [
      { date: '2026-02-05', bp: '110/68', hr: 82, temp: '36.4°C', spo2: 98, rr: 16, weight: '68 kg', height: '163 cm', bmi: 25.6 },
      { date: '2025-12-15', bp: '108/70', hr: 86, spo2: 97, weight: '69 kg' },
      { date: '2025-09-20', bp: '112/72', hr: 78, spo2: 99, weight: '70 kg' },
    ],
    familyHistory: [
      { relation: 'Mother', condition: 'Polycystic Ovary Syndrome', ageAtOnset: 22, deceased: false },
      { relation: 'Father', condition: 'Type 2 Diabetes', ageAtOnset: 58, deceased: false },
      { relation: 'Maternal grandmother', condition: 'Iron Deficiency Anemia', ageAtOnset: 40, deceased: true, ageAtDeath: 85 },
      { relation: 'Sister', condition: 'Endometriosis', ageAtOnset: 28, deceased: false },
    ],
    socialHistory: {
      tobacco: { status: 'never' },
      alcohol: { status: 'social', drinksPerWeek: 2 },
      exercise: { frequency: '2x/week', type: 'Pilates, occasional swimming' },
      diet: 'Trying to increase iron-rich foods; mostly plant-based',
      livingSituation: 'Lives alone in apartment',
    },
    surgicalHistory: [],
    immunizations: [
      { vaccine: 'Influenza', date: '2025-04-22', dueDate: '2026-04-22', status: 'completed' },
      { vaccine: 'COVID-19 (Bivalent)', date: '2024-11-01', status: 'completed' },
      { vaccine: 'HPV (completed series)', date: '2010-03-15', status: 'completed' },
      { vaccine: 'Hepatitis B (Dose 3)', date: '2008-06-20', status: 'completed' },
      { vaccine: 'Tetanus (dTpa)', date: '2023-07-10', dueDate: '2033-07-10', status: 'completed' },
    ],
    labResults: [
      { name: 'Hemoglobin',  value: '10.8', unit: 'g/dL',   referenceRange: '12.0-16.0', date: '2026-02-05', flag: 'low' },
      { name: 'Ferritin',    value: '8',    unit: 'ng/mL',  referenceRange: '12-150',    date: '2026-02-05', flag: 'low' },
      { name: 'Iron',        value: '35',   unit: 'mcg/dL', referenceRange: '60-170',    date: '2026-02-05', flag: 'low' },
      { name: 'TIBC',        value: '420',  unit: 'mcg/dL', referenceRange: '250-370',   date: '2026-02-05', flag: 'high' },
      { name: 'Testosterone (total)', value: '68', unit: 'ng/dL', referenceRange: '15-46', date: '2026-02-05', flag: 'high' },
      { name: 'DHEA-S',      value: '380',  unit: 'mcg/dL', referenceRange: '35-256',    date: '2026-02-05', flag: 'high' },
      { name: 'Fasting Glucose', value: '92', unit: 'mg/dL', referenceRange: '70-100',   date: '2026-02-05', flag: 'normal' },
      { name: 'TSH',         value: '2.0',  unit: 'mIU/L',  referenceRange: '0.4-4.0',   date: '2026-02-05', flag: 'normal' },
    ],
    problems: [
      { description: 'Iron Deficiency Anemia',       status: 'active',  onset: '2025-11-20' },
      { description: 'Polycystic Ovary Syndrome',    status: 'chronic', onset: '2018-03-10' },
    ],
    medications: [
      { name: 'Ferrous Sulfate',       dose: '325 mg', frequency: 'Once daily' },
      { name: 'Oral Contraceptive',    dose: 'combo',  frequency: 'Once daily' },
    ],
    allergies: [
      { allergen: 'Ibuprofen', reaction: 'Gastric irritation', severity: 'mild' },
    ],
    diagnoses: [
      { description: 'Iron Deficiency Anemia',    icd10: 'D50.9', year: 2025 },
      { description: 'Polycystic Ovary Syndrome', icd10: 'E28.2', year: 2018 },
    ],
    encounters: [
      { date: '2026-02-05', type: 'Gynecology',    provider: 'Dr. L. Barbosa', summary: 'Menstrual irregularity stable. Hb 10.8 g/dL, improving.' },
      { date: '2025-12-15', type: 'Office Visit',  provider: 'Dr. M. Ferreira', summary: 'Iron supplementation started. CBC follow-up in 8 weeks.' },
    ],
  },
  P006: {
    demographics: {
      sex: 'M', bloodType: 'O-', language: 'Portuguese', ethnicity: 'Black/Preto', maritalStatus: 'Divorced',
      occupation: 'Retired bus driver',
      emergencyContact: { name: 'Fernanda Lima', relation: 'Daughter', phone: '+5511984321090' },
      insurance: { provider: 'Unimed', plan: 'Unimed Especial', memberId: 'UNI-66745' },
      primaryCareProvider: { name: 'Dr. M. Ferreira', facility: 'Clínica São Lucas', phone: '+551134567890' },
      referredBy: { name: 'Dr. F. Guimarães', specialty: 'Pulmonology', facility: 'Hospital Sírio-Libanês' },
      connectedFacilities: [
        { name: 'Hospital Sírio-Libanês', system: 'Tasy (Philips)', lastSync: '2026-03-01', recordCount: 24 },
        { name: 'Lab Fleury', system: 'MV Sistemas', lastSync: '2026-02-15', recordCount: 30 },
        { name: 'Clínica São Lucas', system: 'FHIR R4', lastSync: '2026-03-01', recordCount: 42 },
      ],
      careTeam: [
        { name: 'Dr. M. Ferreira', role: 'PCP', specialty: 'Family Medicine', facility: 'Clínica São Lucas' },
        { name: 'Dr. F. Guimarães', role: 'Specialist', specialty: 'Pulmonology', facility: 'Sírio-Libanês' },
        { name: 'Dr. H. Navarro', role: 'Specialist', specialty: 'Orthopedics', facility: 'Sírio-Libanês' },
        { name: 'Dr. S. Ribeiro', role: 'Specialist', specialty: 'Urology', facility: 'Clínica São Lucas' },
      ],
    },
    vitals: [
      { date: '2026-03-01', bp: '138/84', hr: 78, temp: '36.7°C', spo2: 92, rr: 22, weight: '88 kg', height: '178 cm', bmi: 27.8 },
      { date: '2025-11-20', bp: '134/82', hr: 76, spo2: 93, weight: '87 kg' },
      { date: '2025-08-10', bp: '130/80', hr: 74, spo2: 94, weight: '86 kg' },
    ],
    familyHistory: [
      { relation: 'Father', condition: 'COPD', ageAtOnset: 58, deceased: true, ageAtDeath: 70 },
      { relation: 'Father', condition: 'Lung cancer', ageAtOnset: 68, deceased: true, ageAtDeath: 70 },
      { relation: 'Mother', condition: 'Osteoarthritis', ageAtOnset: 60, deceased: true, ageAtDeath: 84 },
      { relation: 'Brother', condition: 'Prostate cancer', ageAtOnset: 65, deceased: false },
      { relation: 'Paternal uncle', condition: 'COPD', ageAtOnset: 62, deceased: true, ageAtDeath: 71 },
    ],
    socialHistory: {
      tobacco: { status: 'former', packYears: 40, quitDate: '2017-10-01' },
      alcohol: { status: 'moderate', drinksPerWeek: 7 },
      exercise: { frequency: '2x/week', type: 'Walking, pulmonary rehab exercises' },
      diet: 'High protein; struggles with weight management',
      livingSituation: 'Lives alone; daughter visits 2x/week',
    },
    surgicalHistory: [
      { procedure: 'Inguinal hernia repair', date: '2005-03-12', hospital: 'Hospital Municipal de São Paulo' },
      { procedure: 'Right knee arthroscopy', date: '2020-08-15', surgeon: 'Dr. H. Navarro', hospital: 'Hospital Sírio-Libanês', complications: 'None' },
    ],
    immunizations: [
      { vaccine: 'Influenza', date: '2025-04-08', dueDate: '2026-04-08', status: 'completed' },
      { vaccine: 'COVID-19 (Bivalent)', date: '2024-10-12', status: 'completed' },
      { vaccine: 'Pneumococcal (PCV20)', date: '2023-02-20', dueDate: '2028-02-20', status: 'completed' },
      { vaccine: 'Shingrix (Dose 2)', date: '2024-01-15', status: 'completed' },
      { vaccine: 'Tetanus (Td)', date: '2020-05-10', dueDate: '2030-05-10', status: 'completed' },
    ],
    labResults: [
      { name: 'FEV1/FVC',    value: '0.58', unit: 'ratio',  referenceRange: '> 0.70',   date: '2026-03-01', flag: 'low' },
      { name: 'PSA',          value: '2.1',  unit: 'ng/mL',  referenceRange: '< 4.0',    date: '2025-08-10', flag: 'normal' },
      { name: 'CRP',          value: '4.2',  unit: 'mg/L',   referenceRange: '< 3.0',    date: '2026-03-01', flag: 'high' },
      { name: 'Hemoglobin',   value: '14.8', unit: 'g/dL',   referenceRange: '13.5-17.5', date: '2026-03-01', flag: 'normal' },
      { name: 'Vitamin D',    value: '18',   unit: 'ng/mL',  referenceRange: '30-100',   date: '2026-03-01', flag: 'low' },
      { name: 'Creatinine',   value: '1.0',  unit: 'mg/dL',  referenceRange: '0.7-1.3',  date: '2026-03-01', flag: 'normal' },
      { name: 'Fasting Glucose', value: '105', unit: 'mg/dL', referenceRange: '70-100',  date: '2026-03-01', flag: 'high' },
    ],
    problems: [
      { description: 'Chronic Obstructive Pulmonary Disease', status: 'chronic', onset: '2017-09-14' },
      { description: 'Osteoarthritis, Bilateral Knees',      status: 'chronic', onset: '2019-06-01' },
      { description: 'Benign Prostatic Hyperplasia',          status: 'chronic', onset: '2022-01-15' },
    ],
    medications: [
      { name: 'Tiotropium (Spiriva)', dose: '18 mcg', frequency: 'Once daily (inhaled)' },
      { name: 'Albuterol PRN',        dose: '90 mcg', frequency: 'As needed' },
      { name: 'Tamsulosin',           dose: '0.4 mg', frequency: 'Once daily' },
    ],
    allergies: [
      { allergen: 'Aspirin', reaction: 'Bronchospasm', severity: 'severe' },
    ],
    diagnoses: [
      { description: 'COPD, moderate',                  icd10: 'J44.1', year: 2017 },
      { description: 'Osteoarthritis, bilateral knees', icd10: 'M17.0', year: 2019 },
      { description: 'Benign Prostatic Hyperplasia',    icd10: 'N40.0', year: 2022 },
    ],
    encounters: [
      { date: '2026-03-01', type: 'Pulmonology',   provider: 'Dr. F. Guimarães', summary: 'FEV1 58% predicted. No exacerbation in 6 months.' },
      { date: '2025-11-20', type: 'Orthopedics',   provider: 'Dr. H. Navarro',   summary: 'Knee pain managed with PT. No surgical indication yet.' },
      { date: '2025-08-10', type: 'Urology',       provider: 'Dr. S. Ribeiro',   summary: 'PSA 2.1. Tamsulosin effective. Annual follow-up.' },
    ],
  },
  P007: {
    demographics: {
      sex: 'F', bloodType: 'A+', language: 'Spanish', ethnicity: 'Mestiza', maritalStatus: 'Married',
      occupation: 'Graphic designer',
      emergencyContact: { name: 'Diego Morales', relation: 'Spouse', phone: '+5731984321100' },
      insurance: { provider: 'SulAmerica', plan: 'Especial 100', memberId: 'SAM-22187' },
      primaryCareProvider: { name: 'Dr. M. Ferreira', facility: 'Clínica São Lucas', phone: '+551134567890' },
      referredBy: { name: 'Dr. C. Vega', specialty: 'Neurology', facility: 'Hospital Albert Einstein' },
      connectedFacilities: [
        { name: 'Hospital Albert Einstein', system: 'Epic (Care Everywhere)', lastSync: '2026-02-20', recordCount: 12 },
        { name: 'Clínica São Lucas', system: 'FHIR R4', lastSync: '2026-03-05', recordCount: 26 },
      ],
      careTeam: [
        { name: 'Dr. M. Ferreira', role: 'PCP', specialty: 'Family Medicine', facility: 'Clínica São Lucas' },
        { name: 'Dr. C. Vega', role: 'Specialist', specialty: 'Neurology', facility: 'Albert Einstein' },
        { name: 'Dr. A. Muniz', role: 'Specialist', specialty: 'Psychiatry', facility: 'Clínica São Lucas' },
      ],
    },
    vitals: [
      { date: '2026-02-20', bp: '120/76', hr: 72, temp: '36.5°C', spo2: 99, rr: 14, weight: '64 kg', height: '162 cm', bmi: 24.4 },
      { date: '2025-10-08', bp: '118/74', hr: 70, spo2: 99, weight: '63 kg' },
      { date: '2025-06-15', bp: '122/78', hr: 74, spo2: 98, weight: '64 kg' },
    ],
    familyHistory: [
      { relation: 'Mother', condition: 'Migraine with aura', ageAtOnset: 25, deceased: false },
      { relation: 'Father', condition: 'Generalized Anxiety Disorder', ageAtOnset: 45, deceased: false },
      { relation: 'Sister', condition: 'Major Depressive Disorder', ageAtOnset: 30, deceased: false },
      { relation: 'Maternal grandmother', condition: 'Stroke', ageAtOnset: 72, deceased: true, ageAtDeath: 72 },
    ],
    socialHistory: {
      tobacco: { status: 'never' },
      alcohol: { status: 'social', drinksPerWeek: 1 },
      exercise: { frequency: '3x/week', type: 'Yoga, meditation, walking' },
      diet: 'Migraine elimination diet; avoids aged cheese, red wine, MSG',
      livingSituation: 'Lives with spouse and one child (age 10)',
    },
    surgicalHistory: [
      { procedure: 'Cesarean section', date: '2016-02-10', hospital: 'Hospital São Luiz', complications: 'None' },
    ],
    immunizations: [
      { vaccine: 'Influenza', date: '2025-05-05', dueDate: '2026-05-05', status: 'completed' },
      { vaccine: 'COVID-19 (Bivalent)', date: '2024-09-28', status: 'completed' },
      { vaccine: 'HPV (completed series)', date: '2006-08-15', status: 'completed' },
      { vaccine: 'Tetanus (dTpa)', date: '2021-10-01', dueDate: '2031-10-01', status: 'completed' },
      { vaccine: 'Hepatitis A (Dose 2)', date: '2015-03-20', status: 'completed' },
    ],
    labResults: [
      { name: 'TSH',          value: '1.8',  unit: 'mIU/L', referenceRange: '0.4-4.0',   date: '2026-02-20', flag: 'normal' },
      { name: 'CBC - WBC',    value: '6.2',  unit: 'K/uL',  referenceRange: '4.5-11.0',  date: '2026-02-20', flag: 'normal' },
      { name: 'Hemoglobin',   value: '13.8', unit: 'g/dL',  referenceRange: '12.0-16.0', date: '2026-02-20', flag: 'normal' },
      { name: 'Vitamin B12',  value: '380',  unit: 'pg/mL', referenceRange: '200-900',   date: '2026-02-20', flag: 'normal' },
      { name: 'Magnesium',    value: '1.7',  unit: 'mg/dL', referenceRange: '1.7-2.2',   date: '2026-02-20', flag: 'normal' },
      { name: 'CRP',          value: '0.8',  unit: 'mg/L',  referenceRange: '< 3.0',     date: '2026-02-20', flag: 'normal' },
    ],
    problems: [
      { description: 'Migraine with Aura',     status: 'chronic', onset: '2010-04-08' },
      { description: 'Generalized Anxiety Disorder', status: 'active', onset: '2023-02-20' },
    ],
    medications: [
      { name: 'Topiramate',   dose: '50 mg',  frequency: 'Twice daily' },
      { name: 'Sumatriptan',  dose: '100 mg', frequency: 'PRN (max 2/week)' },
      { name: 'Escitalopram', dose: '10 mg',  frequency: 'Once daily' },
    ],
    allergies: [],
    diagnoses: [
      { description: 'Migraine with Aura',           icd10: 'G43.1', year: 2010 },
      { description: 'Generalized Anxiety Disorder', icd10: 'F41.1', year: 2023 },
    ],
    encounters: [
      { date: '2026-02-20', type: 'Neurology',     provider: 'Dr. C. Vega',     summary: 'Migraine frequency reduced to 2/month. Continue topiramate.' },
      { date: '2025-10-08', type: 'Psychiatry',    provider: 'Dr. A. Muniz',    summary: 'GAD stable on escitalopram. CBT referral discussed.' },
    ],
  },
  P008: {
    demographics: {
      sex: 'M', bloodType: 'O+', language: 'Spanish', ethnicity: 'Mestizo', maritalStatus: 'Married',
      occupation: 'Retired accountant',
      emergencyContact: { name: 'Isabel Herrera', relation: 'Spouse', phone: '+5731984321110' },
      insurance: { provider: 'Amil', plan: 'Amil One S4000', memberId: 'AML-88452' },
      primaryCareProvider: { name: 'Dr. P. Costa', facility: 'Hospital Sírio-Libanês', phone: '+551131556000' },
      referredBy: { name: 'Dr. R. Alvarez', specialty: 'Cardiology', facility: 'Hospital Sírio-Libanês' },
      connectedFacilities: [
        { name: 'Hospital Sírio-Libanês', system: 'Tasy (Philips)', lastSync: '2026-03-10', recordCount: 52 },
        { name: 'Hospital Albert Einstein', system: 'Epic (Care Everywhere)', lastSync: '2026-01-15', recordCount: 18 },
        { name: 'Lab Fleury', system: 'MV Sistemas', lastSync: '2026-03-10', recordCount: 44 },
      ],
      careTeam: [
        { name: 'Dr. P. Costa', role: 'PCP', specialty: 'Endocrinology', facility: 'Sírio-Libanês' },
        { name: 'Dr. R. Alvarez', role: 'Specialist', specialty: 'Cardiology', facility: 'Sírio-Libanês' },
        { name: 'Dr. J. Sousa', role: 'Specialist', specialty: 'Nephrology', facility: 'Albert Einstein' },
        { name: 'Dr. T. Andrade', role: 'Specialist', specialty: 'Neurology', facility: 'Sírio-Libanês' },
      ],
    },
    vitals: [
      { date: '2026-03-10', bp: '142/86', hr: 74, temp: '36.6°C', spo2: 96, rr: 18, weight: '85 kg', height: '172 cm', bmi: 28.7 },
      { date: '2026-01-15', bp: '138/84', hr: 72, spo2: 97, weight: '84 kg' },
      { date: '2025-09-25', bp: '136/82', hr: 76, spo2: 97, weight: '84 kg' },
    ],
    familyHistory: [
      { relation: 'Father', condition: 'Coronary Artery Disease', ageAtOnset: 52, deceased: true, ageAtDeath: 64 },
      { relation: 'Mother', condition: 'Type 2 Diabetes', ageAtOnset: 48, deceased: true, ageAtDeath: 76 },
      { relation: 'Brother', condition: 'Type 2 Diabetes', ageAtOnset: 45, deceased: false },
      { relation: 'Sister', condition: 'Chronic Kidney Disease', ageAtOnset: 60, deceased: false },
      { relation: 'Paternal grandfather', condition: 'Myocardial Infarction', ageAtOnset: 58, deceased: true, ageAtDeath: 58 },
    ],
    socialHistory: {
      tobacco: { status: 'former', packYears: 20, quitDate: '2014-02-01' },
      alcohol: { status: 'none' },
      exercise: { frequency: '2x/week', type: 'Light walking, 20 minutes' },
      diet: 'Diabetic diet; low sodium, low potassium; carb counting',
      livingSituation: 'Lives with spouse in own home',
    },
    surgicalHistory: [
      { procedure: 'PCI with stent placement (LAD)', date: '2018-07-22', surgeon: 'Dr. R. Alvarez', hospital: 'Hospital Sírio-Libanês', complications: 'None' },
      { procedure: 'Cataract surgery (bilateral)', date: '2022-03-15', surgeon: 'Dr. V. Campos', hospital: 'Hospital Albert Einstein', complications: 'None' },
    ],
    immunizations: [
      { vaccine: 'Influenza (high-dose)', date: '2025-04-18', dueDate: '2026-04-18', status: 'completed' },
      { vaccine: 'COVID-19 (Bivalent)', date: '2024-10-10', status: 'completed' },
      { vaccine: 'Pneumococcal (PCV20)', date: '2023-06-01', dueDate: '2028-06-01', status: 'completed' },
      { vaccine: 'Shingrix (Dose 2)', date: '2023-09-15', status: 'completed' },
      { vaccine: 'Tetanus (Td)', date: '2021-01-20', dueDate: '2031-01-20', status: 'completed' },
    ],
    labResults: [
      { name: 'HbA1c',          value: '7.8',  unit: '%',     referenceRange: '< 6.5',     date: '2026-03-10', flag: 'high' },
      { name: 'Fasting Glucose', value: '156',  unit: 'mg/dL', referenceRange: '70-100',    date: '2026-03-10', flag: 'high' },
      { name: 'Creatinine',     value: '1.3',  unit: 'mg/dL', referenceRange: '0.7-1.3',   date: '2026-03-10', flag: 'normal' },
      { name: 'eGFR',           value: '72',   unit: 'mL/min', referenceRange: '> 60',      date: '2026-03-10', flag: 'normal' },
      { name: 'LDL-C',          value: '88',   unit: 'mg/dL', referenceRange: '< 70',      date: '2026-03-10', flag: 'high' },
      { name: 'Troponin I',     value: '< 0.01', unit: 'ng/mL', referenceRange: '< 0.04',  date: '2026-03-10', flag: 'normal' },
      { name: 'Microalbumin/Cr', value: '45',  unit: 'mg/g',  referenceRange: '< 30',      date: '2026-03-10', flag: 'high' },
      { name: 'Potassium',      value: '4.5',  unit: 'mEq/L', referenceRange: '3.5-5.0',   date: '2026-03-10', flag: 'normal' },
    ],
    problems: [
      { description: 'Coronary Artery Disease',    status: 'chronic', onset: '2018-07-22' },
      { description: 'Type 2 Diabetes Mellitus',   status: 'chronic', onset: '2014-01-05' },
      { description: 'Peripheral Neuropathy',      status: 'chronic', onset: '2021-11-18' },
      { description: 'Stage 2 Chronic Kidney Disease', status: 'chronic', onset: '2023-06-30' },
    ],
    medications: [
      { name: 'Clopidogrel',  dose: '75 mg',  frequency: 'Once daily' },
      { name: 'Metformin',    dose: '1000 mg', frequency: 'Twice daily' },
      { name: 'Insulin Glargine', dose: '20 units', frequency: 'At bedtime' },
      { name: 'Gabapentin',   dose: '300 mg', frequency: 'Three times daily' },
    ],
    allergies: [
      { allergen: 'ACE Inhibitors', reaction: 'Angioedema', severity: 'severe' },
      { allergen: 'Contrast Dye',   reaction: 'Urticaria',  severity: 'moderate' },
    ],
    diagnoses: [
      { description: 'Coronary Artery Disease',       icd10: 'I25.10', year: 2018 },
      { description: 'Type 2 Diabetes Mellitus',      icd10: 'E11.9',  year: 2014 },
      { description: 'Diabetic Peripheral Neuropathy', icd10: 'G63',   year: 2021 },
      { description: 'CKD Stage 2',                   icd10: 'N18.2',  year: 2023 },
    ],
    encounters: [
      { date: '2026-03-10', type: 'Cardiology',   provider: 'Dr. R. Alvarez', summary: 'Stress test negative. Clopidogrel continued.' },
      { date: '2026-01-15', type: 'Endocrinology', provider: 'Dr. P. Costa',  summary: 'A1C 7.8%. Insulin titration pending.' },
      { date: '2025-09-25', type: 'Nephrology',    provider: 'Dr. J. Sousa',  summary: 'eGFR 72. Avoid nephrotoxics. Annual monitoring.' },
    ],
  },
  P009: {
    demographics: {
      sex: 'F', bloodType: 'B-', language: 'Portuguese', ethnicity: 'White/Branca', maritalStatus: 'Married',
      occupation: 'Veterinarian',
      emergencyContact: { name: 'Rafael Oliveira', relation: 'Spouse', phone: '+5511984321120' },
      insurance: { provider: 'Bradesco Saude', plan: 'Top Nacional', memberId: 'BRD-77536' },
      primaryCareProvider: { name: 'Dr. M. Ferreira', facility: 'Clínica São Lucas', phone: '+551134567890' },
      referredBy: { name: 'Dr. F. Guimarães', specialty: 'Pulmonology', facility: 'Hospital Albert Einstein' },
      connectedFacilities: [
        { name: 'Hospital Albert Einstein', system: 'Epic (Care Everywhere)', lastSync: '2026-01-28', recordCount: 10 },
        { name: 'Lab Fleury', system: 'MV Sistemas', lastSync: '2026-01-28', recordCount: 18 },
        { name: 'Clínica São Lucas', system: 'FHIR R4', lastSync: '2026-03-05', recordCount: 34 },
      ],
      careTeam: [
        { name: 'Dr. M. Ferreira', role: 'PCP', specialty: 'Family Medicine', facility: 'Clínica São Lucas' },
        { name: 'Dr. F. Guimarães', role: 'Specialist', specialty: 'Pulmonology', facility: 'Albert Einstein' },
        { name: 'Dr. N. Tavares', role: 'Specialist', specialty: 'Allergy & Immunology', facility: 'Albert Einstein' },
      ],
    },
    vitals: [
      { date: '2026-01-28', bp: '114/72', hr: 74, temp: '36.5°C', spo2: 97, rr: 16, weight: '58 kg', height: '167 cm', bmi: 20.8 },
      { date: '2025-06-05', bp: '112/70', hr: 72, spo2: 98, weight: '57 kg' },
      { date: '2025-01-15', bp: '116/74', hr: 76, spo2: 96, weight: '58 kg' },
    ],
    familyHistory: [
      { relation: 'Mother', condition: 'Asthma', ageAtOnset: 12, deceased: false },
      { relation: 'Father', condition: 'Allergic rhinitis', ageAtOnset: 20, deceased: false },
      { relation: 'Brother', condition: 'Eczema (atopic dermatitis)', ageAtOnset: 5, deceased: false },
      { relation: 'Maternal grandmother', condition: 'Asthma', ageAtOnset: 30, deceased: true, ageAtDeath: 80 },
    ],
    socialHistory: {
      tobacco: { status: 'never' },
      alcohol: { status: 'social', drinksPerWeek: 2 },
      exercise: { frequency: '3x/week', type: 'Swimming (indoor pool, controlled environment)' },
      diet: 'Balanced; anti-inflammatory focus',
      livingSituation: 'Lives with spouse; no pets at home (trigger avoidance)',
    },
    surgicalHistory: [
      { procedure: 'Septoplasty', date: '2015-09-20', surgeon: 'Dr. E. Santos', hospital: 'Hospital São Luiz', complications: 'None' },
    ],
    immunizations: [
      { vaccine: 'Influenza', date: '2025-03-28', dueDate: '2026-03-28', status: 'due' },
      { vaccine: 'COVID-19 (Bivalent)', date: '2024-11-10', status: 'completed' },
      { vaccine: 'Tetanus (dTpa)', date: '2022-05-15', dueDate: '2032-05-15', status: 'completed' },
      { vaccine: 'Hepatitis B (Dose 3)', date: '2010-04-01', status: 'completed' },
      { vaccine: 'Yellow Fever', date: '2020-01-10', dueDate: '2030-01-10', status: 'completed' },
    ],
    labResults: [
      { name: 'IgE (total)',   value: '320',  unit: 'IU/mL', referenceRange: '< 100',     date: '2026-01-28', flag: 'high' },
      { name: 'Eosinophils',   value: '6.2',  unit: '%',     referenceRange: '1-4',        date: '2026-01-28', flag: 'high' },
      { name: 'Hemoglobin',    value: '13.6', unit: 'g/dL',  referenceRange: '12.0-16.0',  date: '2026-01-28', flag: 'normal' },
      { name: 'Peak Flow',     value: '380',  unit: 'L/min', referenceRange: '380-500',    date: '2026-01-28', flag: 'normal' },
      { name: 'Vitamin D',     value: '34',   unit: 'ng/mL', referenceRange: '30-100',     date: '2026-01-28', flag: 'normal' },
      { name: 'CRP',           value: '1.2',  unit: 'mg/L',  referenceRange: '< 3.0',      date: '2026-01-28', flag: 'normal' },
    ],
    problems: [
      { description: 'Asthma, Moderate Persistent', status: 'chronic', onset: '2005-08-14' },
      { description: 'Allergic Rhinitis',            status: 'chronic', onset: '2008-03-22' },
    ],
    medications: [
      { name: 'Fluticasone/Salmeterol', dose: '250/50 mcg', frequency: 'Twice daily (inhaled)' },
      { name: 'Cetirizine',             dose: '10 mg',       frequency: 'Once daily' },
      { name: 'Albuterol PRN',          dose: '90 mcg',      frequency: 'As needed' },
    ],
    allergies: [
      { allergen: 'Dust Mites',   reaction: 'Rhinitis / wheeze', severity: 'moderate' },
      { allergen: 'Cat Dander',   reaction: 'Asthma exacerbation', severity: 'moderate' },
    ],
    diagnoses: [
      { description: 'Asthma, Moderate Persistent', icd10: 'J45.40', year: 2005 },
      { description: 'Allergic Rhinitis',            icd10: 'J30.9',  year: 2008 },
    ],
    encounters: [
      { date: '2026-01-28', type: 'Pulmonology', provider: 'Dr. F. Guimarães', summary: 'ACT score 22. Well-controlled. Continue current regimen.' },
      { date: '2025-06-05', type: 'Allergy',     provider: 'Dr. N. Tavares',   summary: 'Skin prick positive for dust mites, cat. Immunotherapy discussed.' },
    ],
  },
  P010: {
    demographics: {
      sex: 'M', bloodType: 'A+', language: 'Portuguese', ethnicity: 'Asian/Japanese-Brazilian', maritalStatus: 'Divorced',
      occupation: 'Civil engineer',
      emergencyContact: { name: 'Yuki Nakamura', relation: 'Sister', phone: '+5511984321130' },
      insurance: { provider: 'SulAmerica', plan: 'Executivo', memberId: 'SAM-11478' },
      primaryCareProvider: { name: 'Dr. M. Ferreira', facility: 'Clínica São Lucas', phone: '+551134567890' },
      referredBy: { name: 'Dr. A. Muniz', specialty: 'Psychiatry', facility: 'Hospital Albert Einstein' },
      connectedFacilities: [
        { name: 'Hospital Albert Einstein', system: 'Epic (Care Everywhere)', lastSync: '2026-03-08', recordCount: 16 },
        { name: 'Clínica São Lucas', system: 'FHIR R4', lastSync: '2026-03-08', recordCount: 28 },
        { name: 'Lab Fleury', system: 'MV Sistemas', lastSync: '2026-02-20', recordCount: 22 },
      ],
      careTeam: [
        { name: 'Dr. M. Ferreira', role: 'PCP', specialty: 'Family Medicine', facility: 'Clínica São Lucas' },
        { name: 'Dr. A. Muniz', role: 'Specialist', specialty: 'Psychiatry', facility: 'Albert Einstein' },
        { name: 'Dr. H. Navarro', role: 'Specialist', specialty: 'Orthopedics', facility: 'Sírio-Libanês' },
      ],
    },
    vitals: [
      { date: '2026-03-08', bp: '126/80', hr: 68, temp: '36.6°C', spo2: 98, rr: 16, weight: '78 kg', height: '174 cm', bmi: 25.8 },
      { date: '2026-01-18', bp: '122/78', hr: 66, spo2: 99, weight: '77 kg' },
      { date: '2025-11-02', bp: '124/78', hr: 70, spo2: 98, weight: '78 kg' },
    ],
    familyHistory: [
      { relation: 'Father', condition: 'Major Depressive Disorder', ageAtOnset: 50, deceased: true, ageAtDeath: 68 },
      { relation: 'Mother', condition: 'Generalized Anxiety Disorder', ageAtOnset: 45, deceased: false },
      { relation: 'Brother', condition: 'Alcohol Use Disorder', ageAtOnset: 35, deceased: false },
      { relation: 'Paternal grandmother', condition: 'Bipolar Disorder Type II', ageAtOnset: 38, deceased: true, ageAtDeath: 74 },
    ],
    socialHistory: {
      tobacco: { status: 'current', packYears: 10 },
      alcohol: { status: 'moderate', drinksPerWeek: 8 },
      exercise: { frequency: '1x/week', type: 'Walking (limited by back pain)' },
      diet: 'Irregular meals; high caffeine intake (4-5 cups/day)',
      livingSituation: 'Lives alone; divorced 2 years ago',
    },
    surgicalHistory: [
      { procedure: 'Wisdom teeth extraction', date: '1995-06-10', hospital: 'Hospital São Luiz' },
    ],
    immunizations: [
      { vaccine: 'Influenza', date: '2025-05-12', dueDate: '2026-05-12', status: 'completed' },
      { vaccine: 'COVID-19 (Bivalent)', date: '2024-10-25', status: 'completed' },
      { vaccine: 'Hepatitis B (Dose 3)', date: '2005-09-01', status: 'completed' },
      { vaccine: 'Tetanus (dTpa)', date: '2020-02-15', dueDate: '2030-02-15', status: 'completed' },
    ],
    labResults: [
      { name: 'TSH',          value: '3.2',  unit: 'mIU/L', referenceRange: '0.4-4.0',   date: '2026-03-08', flag: 'normal' },
      { name: 'Vitamin D',    value: '16',   unit: 'ng/mL', referenceRange: '30-100',     date: '2026-03-08', flag: 'low' },
      { name: 'Vitamin B12',  value: '210',  unit: 'pg/mL', referenceRange: '200-900',    date: '2026-03-08', flag: 'normal' },
      { name: 'Hemoglobin',   value: '15.2', unit: 'g/dL',  referenceRange: '13.5-17.5',  date: '2026-03-08', flag: 'normal' },
      { name: 'ALT',          value: '48',   unit: 'U/L',   referenceRange: '7-56',       date: '2026-03-08', flag: 'normal' },
      { name: 'GGT',          value: '62',   unit: 'U/L',   referenceRange: '9-48',       date: '2026-03-08', flag: 'high' },
      { name: 'Fasting Glucose', value: '94', unit: 'mg/dL', referenceRange: '70-100',    date: '2026-03-08', flag: 'normal' },
      { name: 'Cortisol (AM)', value: '22',  unit: 'mcg/dL', referenceRange: '6-18',      date: '2026-03-08', flag: 'high' },
    ],
    problems: [
      { description: 'Major Depressive Disorder, Recurrent', status: 'active',  onset: '2020-02-10' },
      { description: 'Insomnia',                              status: 'chronic', onset: '2021-07-03' },
      { description: 'Lumbar Disc Herniation (L4-L5)',         status: 'active',  onset: '2025-10-12' },
    ],
    medications: [
      { name: 'Sertraline',      dose: '100 mg', frequency: 'Once daily' },
      { name: 'Trazodone',       dose: '50 mg',  frequency: 'At bedtime' },
      { name: 'Cyclobenzaprine', dose: '10 mg',  frequency: 'At bedtime PRN' },
    ],
    allergies: [
      { allergen: 'Tramadol', reaction: 'Nausea / vomiting', severity: 'mild' },
    ],
    diagnoses: [
      { description: 'Major Depressive Disorder, Recurrent', icd10: 'F33.1', year: 2020 },
      { description: 'Insomnia',                              icd10: 'G47.00', year: 2021 },
      { description: 'Lumbar Disc Herniation (L4-L5)',         icd10: 'M51.16', year: 2025 },
    ],
    encounters: [
      { date: '2026-03-08', type: 'Psychiatry',    provider: 'Dr. A. Muniz',    summary: 'PHQ-9 score 12 (moderate). Sertraline dose adequate. Therapy ongoing.' },
      { date: '2026-01-18', type: 'Orthopedics',   provider: 'Dr. H. Navarro',  summary: 'MRI confirmed L4-L5 herniation. Conservative management with PT.' },
      { date: '2025-11-02', type: 'Sleep Medicine', provider: 'Dr. K. Yamamoto', summary: 'Sleep hygiene reviewed. Trazodone effective. No apnea on screening.' },
    ],
  },
};

const NEW_PATIENT_TEMPLATE: FacesheetData = {
  problems:    [],
  medications: [],
  allergies:   [],
  diagnoses:   [],
  encounters:  [],
};

export function getFacesheetForPatient(patientId: string): FacesheetData {
  return FACESHEET[patientId] ?? NEW_PATIENT_TEMPLATE;
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo imaging data
// ─────────────────────────────────────────────────────────────────────────────

export interface DrawerImagingStudy {
  id: string;
  modality: string;
  bodyPart: string;
  description: string;
  status: 'COMPLETED' | 'REPORTED' | 'SCHEDULED' | 'IN_PROGRESS';
  studyDate: string;
  isAbnormal: boolean;
  radiologist: string | null;
  thumbnailUrl?: string;
  imagePath?: string;
  reportingPhysician?: string;
  orderingPhysician?: string;
  findings?: string;
}

// Inline SVG data URIs for imaging thumbnails — zero external deps, zero legal risk
const MODALITY_COLORS: Record<string, { bg: string; fg: string }> = {
  'CT':          { bg: '#1a1a2e', fg: '#4a9eff' },
  'X-Ray':       { bg: '#0a0a14', fg: '#e0e0e0' },
  'MRI':         { bg: '#1a1a2e', fg: '#7c4dff' },
  'Ultrasound':  { bg: '#0d1b2a', fg: '#00bcd4' },
  'Mammography': { bg: '#1a1a1a', fg: '#ff9800' },
  'PET':         { bg: '#1a0a2e', fg: '#e040fb' },
};
function generateThumbnail(modality: string): string {
  const c = MODALITY_COLORS[modality] || MODALITY_COLORS['CT'];
  const label = modality === 'X-Ray' ? 'XR' : modality === 'Ultrasound' ? 'US' : modality === 'Mammography' ? 'MG' : modality.slice(0, 2).toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="${c.bg}"/><circle cx="48" cy="40" r="22" fill="none" stroke="${c.fg}" stroke-width="1.5" opacity="0.4"/><circle cx="48" cy="40" r="12" fill="none" stroke="${c.fg}" stroke-width="1" opacity="0.25"/><line x1="20" y1="70" x2="76" y2="70" stroke="${c.fg}" stroke-width="1" opacity="0.15"/><line x1="20" y1="78" x2="60" y2="78" stroke="${c.fg}" stroke-width="1" opacity="0.1"/><text x="48" y="44" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="${c.fg}" opacity="0.7">${label}</text></svg>`)}`;
}

const DEMO_IMAGING: Record<string, DrawerImagingStudy[]> = {
  P001: [
    { id: 'IMG-001', modality: 'X-Ray', bodyPart: 'Chest', description: 'PA and Lateral Chest X-Ray', status: 'REPORTED', studyDate: '2026-03-04', isAbnormal: true, radiologist: 'Dr. V. Matsuda', imagePath: '/demo/pacs/cardiology/chest-xr-cardiomegaly.png', reportingPhysician: 'Dr. V. Matsuda', orderingPhysician: 'Dr. R. Alvarez', findings: 'Mild cardiomegaly, pulmonary congestion' },
    { id: 'IMG-002', modality: 'CT', bodyPart: 'Chest', description: 'CT Coronary Angiography', status: 'REPORTED', studyDate: '2026-03-05', isAbnormal: true, radiologist: 'Dr. V. Matsuda', imagePath: '/demo/pacs/cardiology/ct-coronary-calcification.png', reportingPhysician: 'Dr. V. Matsuda', orderingPhysician: 'Dr. R. Alvarez', findings: 'Coronary artery calcification, Agatston score 320' },
    { id: 'IMG-020', modality: 'Ultrasound', bodyPart: 'Thyroid', description: 'Thyroid Ultrasound', status: 'REPORTED', studyDate: '2026-02-20', isAbnormal: false, radiologist: 'Dr. L. Monteiro', imagePath: '/demo/pacs/endocrinology/us-thyroid-nodule.png', reportingPhysician: 'Dr. L. Monteiro', orderingPhysician: 'Dr. R. Alvarez', findings: 'Small hypoechoic nodule right lobe, 8mm, TIRADS 3' },
  ],
  P002: [
    { id: 'IMG-012', modality: 'X-Ray', bodyPart: 'Chest', description: 'Chest X-Ray (PA)', status: 'REPORTED', studyDate: '2026-02-18', isAbnormal: false, radiologist: 'Dr. V. Matsuda', imagePath: '/demo/pacs/general-practice/chest-xr-normal.png', reportingPhysician: 'Dr. V. Matsuda', orderingPhysician: 'Dr. A. Costa', findings: 'No acute cardiopulmonary abnormality' },
    { id: 'IMG-013', modality: 'Ultrasound', bodyPart: 'Eye', description: 'Fundus Photography', status: 'REPORTED', studyDate: '2026-01-10', isAbnormal: true, radiologist: 'Dr. P. Nakamura', imagePath: '/demo/pacs/ophthalmology/fundus-diabetic-retinopathy.png', reportingPhysician: 'Dr. P. Nakamura', orderingPhysician: 'Dr. A. Costa', findings: 'Moderate non-proliferative diabetic retinopathy, microaneurysms, hard exudates' },
  ],
  P003: [
    { id: 'IMG-003', modality: 'X-Ray', bodyPart: 'Chest', description: 'Chest X-Ray (portable)', status: 'REPORTED', studyDate: '2025-10-03', isAbnormal: true, radiologist: 'Dr. V. Matsuda', imagePath: '/demo/pacs/pulmonology/chest-xr-copd.png', reportingPhysician: 'Dr. V. Matsuda', orderingPhysician: 'Dr. M. Silva', findings: 'Hyperinflated lungs, flattened diaphragms consistent with COPD' },
    { id: 'IMG-004', modality: 'X-Ray', bodyPart: 'Pelvis', description: 'AP Pelvis X-Ray', status: 'REPORTED', studyDate: '2026-02-28', isAbnormal: true, radiologist: 'Dr. L. Monteiro', imagePath: '/demo/pacs/radiology/pelvis-xr-femoral-fracture.png', reportingPhysician: 'Dr. L. Monteiro', orderingPhysician: 'Dr. M. Silva', findings: 'Right femoral neck fracture, Garden type II' },
  ],
  P004: [
    { id: 'IMG-014', modality: 'Mammography', bodyPart: 'Breast', description: 'Bilateral Screening Mammography', status: 'REPORTED', studyDate: '2026-03-12', isAbnormal: true, radiologist: 'Dr. L. Monteiro', imagePath: '/demo/pacs/oncology/mammogram-spiculated-mass.png', reportingPhysician: 'Dr. L. Monteiro', orderingPhysician: 'Dr. C. Gutierrez', findings: 'Spiculated mass right upper outer quadrant, 1.2cm, BI-RADS 5' },
    { id: 'IMG-021', modality: 'MRI', bodyPart: 'Brain', description: 'Brain MRI without contrast', status: 'REPORTED', studyDate: '2026-03-01', isAbnormal: false, radiologist: 'Dr. V. Matsuda', imagePath: '/demo/pacs/psychiatry/brain-mri-normal.png', reportingPhysician: 'Dr. V. Matsuda', orderingPhysician: 'Dr. C. Gutierrez', findings: 'Normal brain parenchyma, no mass or acute infarct' },
  ],
  P005: [
    { id: 'IMG-015', modality: 'Ultrasound', bodyPart: 'Uterus', description: 'Obstetric US 12-week', status: 'REPORTED', studyDate: '2026-03-20', isAbnormal: false, radiologist: 'Dr. L. Monteiro', imagePath: '/demo/pacs/obstetrics-gynecology/us-obstetric-12week.png', reportingPhysician: 'Dr. L. Monteiro', orderingPhysician: 'Dr. F. Rojas', findings: 'Single viable intrauterine pregnancy, CRL 55mm consistent with 12w2d, NT 1.3mm normal' },
  ],
  P006: [
    { id: 'IMG-006', modality: 'X-Ray', bodyPart: 'Chest', description: 'Chest X-Ray (PA)', status: 'REPORTED', studyDate: '2026-03-01', isAbnormal: false, radiologist: 'Dr. V. Matsuda', imagePath: '/demo/pacs/internal-medicine/chest-xr-normal-elderly.png', reportingPhysician: 'Dr. V. Matsuda', orderingPhysician: 'Dr. H. Tanaka', findings: 'Age-appropriate findings, no acute process' },
    { id: 'IMG-007', modality: 'Ultrasound', bodyPart: 'Kidney', description: 'Renal Ultrasound', status: 'REPORTED', studyDate: '2025-11-20', isAbnormal: true, radiologist: 'Dr. L. Monteiro', imagePath: '/demo/pacs/nephrology/us-renal-ckd.png', reportingPhysician: 'Dr. L. Monteiro', orderingPhysician: 'Dr. H. Tanaka', findings: 'Bilateral increased echogenicity, right kidney 9.8cm, left 10.1cm, consistent with CKD' },
  ],
  P007: [
    { id: 'IMG-017', modality: 'X-Ray', bodyPart: 'Knee', description: 'Weight-bearing Knee X-Ray', status: 'REPORTED', studyDate: '2026-02-25', isAbnormal: true, radiologist: 'Dr. V. Matsuda', imagePath: '/demo/pacs/orthopedics/knee-xr-osteoarthritis.png', reportingPhysician: 'Dr. V. Matsuda', orderingPhysician: 'Dr. J. Park', findings: 'Bilateral medial compartment narrowing, osteophyte formation, Kellgren-Lawrence grade 3' },
    { id: 'IMG-018', modality: 'X-Ray', bodyPart: 'Chest', description: 'Preoperative Chest X-Ray', status: 'REPORTED', studyDate: '2026-02-25', isAbnormal: false, radiologist: 'Dr. L. Monteiro', imagePath: '/demo/pacs/anesthesiology/chest-xr-preop-normal.png', reportingPhysician: 'Dr. L. Monteiro', orderingPhysician: 'Dr. J. Park', findings: 'Clear lungs, normal cardiac silhouette, cleared for surgery' },
  ],
  P008: [
    { id: 'IMG-008', modality: 'MRI', bodyPart: 'Brain', description: 'Brain MRI with DWI', status: 'REPORTED', studyDate: '2026-03-10', isAbnormal: true, radiologist: 'Dr. V. Matsuda', imagePath: '/demo/pacs/neurology/brain-mri-ischemic.png', reportingPhysician: 'Dr. V. Matsuda', orderingPhysician: 'Dr. E. Vargas', findings: 'Acute ischemic infarct left MCA territory, 15mm, restricted diffusion on DWI' },
    { id: 'IMG-009', modality: 'MRI', bodyPart: 'Prostate', description: 'Prostate MRI multiparametric', status: 'REPORTED', studyDate: '2025-09-25', isAbnormal: true, radiologist: 'Dr. L. Monteiro', imagePath: '/demo/pacs/urology/mri-prostate-pirads3.png', reportingPhysician: 'Dr. L. Monteiro', orderingPhysician: 'Dr. E. Vargas', findings: 'PI-RADS 3 lesion transition zone, 12mm, recommend surveillance' },
  ],
  P009: [
    { id: 'IMG-019', modality: 'CT', bodyPart: 'Abdomen', description: 'CT Abdomen/Pelvis with Contrast', status: 'REPORTED', studyDate: '2026-03-15', isAbnormal: true, radiologist: 'Dr. V. Matsuda', imagePath: '/demo/pacs/emergency-medicine/ct-abdomen-splenic-laceration.png', reportingPhysician: 'Dr. V. Matsuda', orderingPhysician: 'Dr. L. Ferreira', findings: 'Grade II splenic laceration, small perisplenic hematoma' },
    { id: 'IMG-022', modality: 'Ultrasound', bodyPart: 'Skin', description: 'Dermoscopy Imaging', status: 'REPORTED', studyDate: '2026-03-10', isAbnormal: false, radiologist: 'Dr. P. Nakamura', imagePath: '/demo/pacs/dermatology/dermoscopy-melanocytic.png', reportingPhysician: 'Dr. P. Nakamura', orderingPhysician: 'Dr. L. Ferreira', findings: 'Benign melanocytic nevus, regular pigment network, no atypical features' },
  ],
  P010: [
    { id: 'IMG-011', modality: 'CT', bodyPart: 'Abdomen', description: 'CT Pancreas Protocol', status: 'REPORTED', studyDate: '2025-10-12', isAbnormal: true, radiologist: 'Dr. V. Matsuda', imagePath: '/demo/pacs/gastroenterology/ct-pancreatic-mass.png', reportingPhysician: 'Dr. V. Matsuda', orderingPhysician: 'Dr. S. Kim', findings: 'Hypodense mass pancreatic head, 2.3cm, biliary dilation, suspicious for malignancy' },
  ],
};

export function getImagingForPatient(patientId: string): DrawerImagingStudy[] {
  return (DEMO_IMAGING[patientId] ?? []).map(study => ({
    ...study,
    thumbnailUrl: study.thumbnailUrl || study.imagePath || generateThumbnail(study.modality),
  }));
}
