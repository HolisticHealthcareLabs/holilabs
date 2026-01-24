/**
 * Clinical Rules Seed Data
 *
 * Law 1 Compliance: Logic-as-Data (The Decapitation Rule)
 * All clinical rules stored in database, NOT hardcoded.
 *
 * Seeds:
 * - SymptomDiagnosisMap: Top 50 chief complaints → ICD-10 differentials
 * - TreatmentProtocol: Top 10 evidence-based treatment protocols
 *
 * Usage:
 *   npx ts-node prisma/seed-clinical-rules.ts
 *
 * NOTE: This is real clinical data based on evidence-based guidelines.
 * DO NOT modify without clinical review.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// LOCAL TYPE DEFINITIONS (mirrors @holilabs/shared-types)
// Used for type safety in seed data without external import
// ═══════════════════════════════════════════════════════════════

interface EligibilityCriterion {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn' | 'contains';
  value: unknown;
  required: boolean;
}

interface TreatmentRecommendation {
  id: string;
  type: 'medication' | 'lab' | 'referral' | 'lifestyle' | 'monitoring';
  priority: 'required' | 'recommended' | 'consider';
  medication?: {
    name: string;
    rxNormCode: string;
    dose: string;
    frequency: string;
    duration?: string;
  };
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
// SYMPTOM-DIAGNOSIS MAPPINGS
// Top 50 Chief Complaints in Primary Care
// ═══════════════════════════════════════════════════════════════

interface SymptomDiagnosisMapData {
  symptomKeywords: string[];
  symptomCategory: string;
  icd10Code: string;
  diagnosisName: string;
  baseProbability: number;
  probabilityModifiers: Record<string, number>;
  redFlags: string[];
  workupSuggestions: string[];
}

const symptomDiagnosisMaps: SymptomDiagnosisMapData[] = [
  // ═══════════════════════════════════════════════════════════════
  // CARDIOVASCULAR (1-8)
  // ═══════════════════════════════════════════════════════════════
  {
    symptomKeywords: ['chest pain', 'substernal', 'crushing', 'pressure', 'squeezing', 'dolor de pecho', 'opresión'],
    symptomCategory: 'cardiovascular',
    icd10Code: 'I20.9',
    diagnosisName: 'Angina pectoris, unspecified',
    baseProbability: 0.25,
    probabilityModifiers: {
      'age>65': 1.5,
      'age>80': 2.0,
      'diabetes': 1.4,
      'hypertension': 1.3,
      'smoker': 1.6,
      'sex=M': 1.3,
      'cardiovascular': 2.0,
    },
    redFlags: ['Diaphoresis', 'Radiation to arm/jaw', 'Associated dyspnea', 'Syncope', 'Hypotension'],
    workupSuggestions: ['12-lead ECG stat', 'Troponin I/T', 'BNP/NT-proBNP', 'Chest X-ray', 'CBC, BMP'],
  },
  {
    symptomKeywords: ['chest pain', 'sharp', 'pleuritic', 'positional', 'worse with breathing'],
    symptomCategory: 'cardiovascular',
    icd10Code: 'R07.1',
    diagnosisName: 'Chest pain on breathing (pleuritic)',
    baseProbability: 0.20,
    probabilityModifiers: {
      'age<40': 1.3,
      'recent_illness': 1.5,
    },
    redFlags: ['Tachycardia', 'Hypoxia', 'Recent immobilization', 'Hemoptysis'],
    workupSuggestions: ['Chest X-ray', 'D-dimer if PE suspected', 'ECG', 'Pulse oximetry'],
  },
  {
    symptomKeywords: ['palpitations', 'heart racing', 'irregular heartbeat', 'heart skipping', 'taquicardia'],
    symptomCategory: 'cardiovascular',
    icd10Code: 'R00.2',
    diagnosisName: 'Palpitations',
    baseProbability: 0.35,
    probabilityModifiers: {
      'age>65': 1.4,
      'caffeine': 1.2,
      'anxiety': 1.5,
      'hyperthyroid': 2.0,
    },
    redFlags: ['Syncope', 'Chest pain', 'Dyspnea', 'Heart failure history'],
    workupSuggestions: ['ECG', 'TSH', 'CBC', 'BMP', 'Holter monitor if recurrent'],
  },
  {
    symptomKeywords: ['leg swelling', 'ankle swelling', 'edema', 'bilateral swelling', 'hinchazón piernas'],
    symptomCategory: 'cardiovascular',
    icd10Code: 'R60.0',
    diagnosisName: 'Localized edema',
    baseProbability: 0.30,
    probabilityModifiers: {
      'age>65': 1.3,
      'heart_failure': 2.5,
      'renal': 2.0,
      'hepatic': 1.8,
    },
    redFlags: ['Unilateral swelling (DVT)', 'Dyspnea', 'Weight gain >3kg/week', 'JVD'],
    workupSuggestions: ['BNP/NT-proBNP', 'BMP (creatinine)', 'LFTs', 'Urinalysis', 'Duplex ultrasound if unilateral'],
  },
  {
    symptomKeywords: ['high blood pressure', 'elevated BP', 'hypertensive', 'presión alta'],
    symptomCategory: 'cardiovascular',
    icd10Code: 'I10',
    diagnosisName: 'Essential (primary) hypertension',
    baseProbability: 0.45,
    probabilityModifiers: {
      'age>50': 1.3,
      'obesity': 1.4,
      'diabetes': 1.3,
      'family_history': 1.5,
    },
    redFlags: ['BP >180/120', 'Headache + vision changes', 'Chest pain', 'Acute kidney injury'],
    workupSuggestions: ['BMP', 'Urinalysis', 'Lipid panel', 'ECG', 'Repeat BP measurements'],
  },
  {
    symptomKeywords: ['syncope', 'passed out', 'fainted', 'lost consciousness', 'desmayo'],
    symptomCategory: 'cardiovascular',
    icd10Code: 'R55',
    diagnosisName: 'Syncope and collapse',
    baseProbability: 0.35,
    probabilityModifiers: {
      'age>65': 1.5,
      'cardiovascular': 2.0,
      'arrhythmia': 2.5,
    },
    redFlags: ['Exertional syncope', 'Chest pain', 'Palpitations before', 'Family history sudden death', 'No prodrome'],
    workupSuggestions: ['ECG', 'Orthostatic vitals', 'CBC', 'BMP', 'Glucose', 'Echo if cardiac suspected'],
  },
  {
    symptomKeywords: ['shortness of breath', 'dyspnea', 'cant breathe', 'breathless', 'falta de aire', 'disnea'],
    symptomCategory: 'cardiovascular',
    icd10Code: 'I50.9',
    diagnosisName: 'Heart failure, unspecified',
    baseProbability: 0.20,
    probabilityModifiers: {
      'age>65': 1.6,
      'age>80': 2.0,
      'cardiovascular': 2.5,
      'diabetes': 1.4,
      'hypertension': 1.5,
      'renal': 1.8,
    },
    redFlags: ['Orthopnea', 'PND', 'Peripheral edema', 'JVD', 'S3 gallop'],
    workupSuggestions: ['BNP/NT-proBNP', 'Chest X-ray', 'ECG', 'Echocardiogram', 'BMP'],
  },
  {
    symptomKeywords: ['leg pain walking', 'claudication', 'calf pain exercise', 'cramping legs'],
    symptomCategory: 'cardiovascular',
    icd10Code: 'I73.9',
    diagnosisName: 'Peripheral vascular disease, unspecified',
    baseProbability: 0.25,
    probabilityModifiers: {
      'age>65': 1.5,
      'smoker': 2.0,
      'diabetes': 1.8,
      'hypertension': 1.4,
    },
    redFlags: ['Rest pain', 'Non-healing ulcers', 'Gangrene', 'Absent pulses'],
    workupSuggestions: ['ABI (Ankle-Brachial Index)', 'Doppler ultrasound', 'Lipid panel', 'HbA1c'],
  },

  // ═══════════════════════════════════════════════════════════════
  // RESPIRATORY (9-16)
  // ═══════════════════════════════════════════════════════════════
  {
    symptomKeywords: ['cough', 'productive cough', 'dry cough', 'tos', 'tos seca'],
    symptomCategory: 'respiratory',
    icd10Code: 'R05.9',
    diagnosisName: 'Cough, unspecified',
    baseProbability: 0.40,
    probabilityModifiers: {
      'smoker': 1.5,
      'recent_uri': 2.0,
      'gerd': 1.4,
      'ace_inhibitor': 2.0,
    },
    redFlags: ['Hemoptysis', 'Weight loss', 'Night sweats', 'Duration >3 weeks', 'Immunocompromised'],
    workupSuggestions: ['Chest X-ray if >3 weeks', 'Sputum culture if productive', 'PFTs if chronic'],
  },
  {
    symptomKeywords: ['wheezing', 'asthma attack', 'bronchospasm', 'tight chest', 'sibilancias'],
    symptomCategory: 'respiratory',
    icd10Code: 'J45.909',
    diagnosisName: 'Unspecified asthma, uncomplicated',
    baseProbability: 0.35,
    probabilityModifiers: {
      'age<40': 1.3,
      'atopy': 2.0,
      'family_asthma': 1.8,
      'nocturnal': 1.5,
    },
    redFlags: ['Silent chest', 'Unable to speak', 'Cyanosis', 'Altered mental status', 'Peak flow <50%'],
    workupSuggestions: ['Peak flow', 'Spirometry', 'Chest X-ray if first episode', 'Consider allergy testing'],
  },
  {
    symptomKeywords: ['shortness of breath', 'dyspnea', 'copd exacerbation', 'epoc', 'enfisema'],
    symptomCategory: 'respiratory',
    icd10Code: 'J44.1',
    diagnosisName: 'COPD with acute exacerbation',
    baseProbability: 0.25,
    probabilityModifiers: {
      'age>50': 1.4,
      'smoker': 2.5,
      'pack_years>20': 2.0,
      'known_copd': 3.0,
    },
    redFlags: ['Altered mental status', 'Cyanosis', 'Use of accessory muscles', 'Respiratory rate >30'],
    workupSuggestions: ['Chest X-ray', 'ABG or SpO2', 'CBC', 'BMP', 'BNP if HF suspected', 'Sputum culture'],
  },
  {
    symptomKeywords: ['sore throat', 'pharyngitis', 'throat pain', 'dolor de garganta', 'amigdalitis'],
    symptomCategory: 'respiratory',
    icd10Code: 'J02.9',
    diagnosisName: 'Acute pharyngitis, unspecified',
    baseProbability: 0.50,
    probabilityModifiers: {
      'age<18': 1.4,
      'fever': 1.3,
      'winter_season': 1.2,
    },
    redFlags: ['Stridor', 'Drooling', 'Trismus', 'Unilateral swelling', 'Respiratory distress'],
    workupSuggestions: ['Rapid strep test', 'Throat culture if strep negative', 'Monospot if EBV suspected'],
  },
  {
    symptomKeywords: ['nasal congestion', 'runny nose', 'cold symptoms', 'upper respiratory', 'resfriado', 'gripe'],
    symptomCategory: 'respiratory',
    icd10Code: 'J06.9',
    diagnosisName: 'Acute upper respiratory infection, unspecified',
    baseProbability: 0.60,
    probabilityModifiers: {
      'winter_season': 1.3,
      'exposure': 1.5,
    },
    redFlags: ['High fever >39°C', 'Symptoms >10 days', 'Severe facial pain', 'Purulent discharge'],
    workupSuggestions: ['Clinical diagnosis usually', 'Consider COVID/flu testing', 'Sinus CT if sinusitis suspected'],
  },
  {
    symptomKeywords: ['pneumonia', 'lung infection', 'fever cough', 'productive cough fever', 'neumonía'],
    symptomCategory: 'respiratory',
    icd10Code: 'J18.9',
    diagnosisName: 'Pneumonia, unspecified organism',
    baseProbability: 0.30,
    probabilityModifiers: {
      'age>65': 1.6,
      'smoker': 1.4,
      'diabetes': 1.3,
      'immunocompromised': 2.0,
    },
    redFlags: ['Hypoxia SpO2 <92%', 'Altered mental status', 'Hypotension', 'Multilobar involvement'],
    workupSuggestions: ['Chest X-ray', 'CBC', 'BMP', 'Procalcitonin', 'Blood cultures if severe', 'Sputum culture'],
  },
  {
    symptomKeywords: ['sleep apnea', 'snoring', 'stop breathing sleep', 'daytime sleepiness', 'apnea del sueño'],
    symptomCategory: 'respiratory',
    icd10Code: 'G47.33',
    diagnosisName: 'Obstructive sleep apnea',
    baseProbability: 0.30,
    probabilityModifiers: {
      'obesity': 2.5,
      'sex=M': 1.5,
      'age>50': 1.3,
      'neck_circumference>17': 2.0,
    },
    redFlags: ['Witnessed apneas', 'Severe daytime sleepiness', 'Hypertension refractory', 'Arrhythmias'],
    workupSuggestions: ['STOP-BANG questionnaire', 'Epworth sleepiness scale', 'Polysomnography', 'Home sleep study'],
  },
  {
    symptomKeywords: ['hemoptysis', 'coughing blood', 'blood in sputum', 'tos con sangre'],
    symptomCategory: 'respiratory',
    icd10Code: 'R04.2',
    diagnosisName: 'Hemoptysis',
    baseProbability: 0.25,
    probabilityModifiers: {
      'smoker': 2.0,
      'age>50': 1.5,
      'tb_exposure': 2.5,
      'anticoagulant': 1.8,
    },
    redFlags: ['Massive hemoptysis >100ml', 'Hypoxia', 'Hemodynamic instability', 'Weight loss'],
    workupSuggestions: ['Chest X-ray', 'CT chest', 'CBC', 'Coagulation studies', 'Sputum AFB if TB suspected', 'Bronchoscopy if significant'],
  },

  // ═══════════════════════════════════════════════════════════════
  // GASTROINTESTINAL (17-25)
  // ═══════════════════════════════════════════════════════════════
  {
    symptomKeywords: ['abdominal pain', 'stomach pain', 'belly pain', 'dolor abdominal', 'dolor de estómago'],
    symptomCategory: 'gastrointestinal',
    icd10Code: 'R10.9',
    diagnosisName: 'Unspecified abdominal pain',
    baseProbability: 0.35,
    probabilityModifiers: {
      'female': 1.2,
      'elderly': 1.4,
    },
    redFlags: ['Peritoneal signs', 'Fever', 'Hemodynamic instability', 'Bloody stool', 'Vomiting blood'],
    workupSuggestions: ['CBC', 'BMP', 'LFTs', 'Lipase', 'Urinalysis', 'Abdominal imaging based on location'],
  },
  {
    symptomKeywords: ['epigastric pain', 'heartburn', 'acid reflux', 'gerd', 'acidez', 'reflujo'],
    symptomCategory: 'gastrointestinal',
    icd10Code: 'K21.0',
    diagnosisName: 'GERD with esophagitis',
    baseProbability: 0.40,
    probabilityModifiers: {
      'obesity': 1.5,
      'hiatal_hernia': 2.0,
      'nocturnal': 1.3,
    },
    redFlags: ['Dysphagia', 'Odynophagia', 'Weight loss', 'GI bleeding', 'Age >55 new onset'],
    workupSuggestions: ['Trial of PPI', 'EGD if alarm symptoms', 'H. pylori testing'],
  },
  {
    symptomKeywords: ['nausea', 'vomiting', 'throwing up', 'náusea', 'vómito'],
    symptomCategory: 'gastrointestinal',
    icd10Code: 'R11.2',
    diagnosisName: 'Nausea with vomiting, unspecified',
    baseProbability: 0.45,
    probabilityModifiers: {
      'pregnancy': 2.5,
      'medication': 1.5,
      'recent_meal': 1.3,
    },
    redFlags: ['Bilious vomiting', 'Hematemesis', 'Severe dehydration', 'Altered mental status', 'Abdominal distension'],
    workupSuggestions: ['BMP', 'LFTs', 'Lipase', 'Pregnancy test if applicable', 'Abdominal X-ray if obstruction suspected'],
  },
  {
    symptomKeywords: ['diarrhea', 'loose stools', 'watery stools', 'diarrea'],
    symptomCategory: 'gastrointestinal',
    icd10Code: 'K59.1',
    diagnosisName: 'Functional diarrhea',
    baseProbability: 0.40,
    probabilityModifiers: {
      'recent_antibiotics': 2.0,
      'travel': 1.8,
      'foodborne': 1.5,
    },
    redFlags: ['Bloody diarrhea', 'High fever', 'Severe dehydration', 'Duration >7 days', 'Recent hospitalization (C. diff)'],
    workupSuggestions: ['Stool studies if severe', 'C. diff testing if risk factors', 'BMP if dehydration'],
  },
  {
    symptomKeywords: ['constipation', 'hard stools', 'difficulty passing stool', 'estreñimiento'],
    symptomCategory: 'gastrointestinal',
    icd10Code: 'K59.00',
    diagnosisName: 'Constipation, unspecified',
    baseProbability: 0.45,
    probabilityModifiers: {
      'elderly': 1.4,
      'opioid_use': 2.5,
      'low_fiber': 1.3,
    },
    redFlags: ['New onset >50 years', 'Weight loss', 'Blood in stool', 'Family history colon cancer', 'Abdominal mass'],
    workupSuggestions: ['Dietary/lifestyle review', 'Colonoscopy if alarm symptoms', 'TSH', 'Calcium'],
  },
  {
    symptomKeywords: ['right lower quadrant pain', 'rlq pain', 'appendicitis', 'mcburney'],
    symptomCategory: 'gastrointestinal',
    icd10Code: 'K35.80',
    diagnosisName: 'Unspecified acute appendicitis',
    baseProbability: 0.25,
    probabilityModifiers: {
      'age<40': 1.5,
      'migration_of_pain': 2.0,
      'rebound': 2.5,
    },
    redFlags: ['Fever', 'Rebound tenderness', 'Guarding', 'Elevated WBC', 'Peritoneal signs'],
    workupSuggestions: ['CBC', 'CRP', 'CT abdomen/pelvis', 'Urinalysis', 'Pregnancy test if applicable'],
  },
  {
    symptomKeywords: ['right upper quadrant pain', 'ruq pain', 'gallbladder', 'biliary colic', 'dolor vesícula'],
    symptomCategory: 'gastrointestinal',
    icd10Code: 'K80.20',
    diagnosisName: 'Calculus of gallbladder without cholecystitis',
    baseProbability: 0.30,
    probabilityModifiers: {
      'female': 1.5,
      'age>40': 1.3,
      'obesity': 1.6,
      'multiparity': 1.4,
    },
    redFlags: ['Fever', 'Jaundice', 'Positive Murphy sign', 'Persistent pain >6 hours'],
    workupSuggestions: ['RUQ ultrasound', 'LFTs', 'CBC', 'Lipase', 'HIDA scan if ultrasound negative'],
  },
  {
    symptomKeywords: ['rectal bleeding', 'blood in stool', 'hematochezia', 'sangrado rectal'],
    symptomCategory: 'gastrointestinal',
    icd10Code: 'K62.5',
    diagnosisName: 'Hemorrhage of anus and rectum',
    baseProbability: 0.30,
    probabilityModifiers: {
      'hemorrhoids': 2.0,
      'age>50': 1.5,
      'nsaid_use': 1.4,
    },
    redFlags: ['Large volume bleeding', 'Hemodynamic instability', 'Weight loss', 'Change in bowel habits', 'Age >50'],
    workupSuggestions: ['CBC', 'Coagulation studies', 'DRE', 'Colonoscopy if >50 or alarm symptoms', 'Anoscopy'],
  },
  {
    symptomKeywords: ['jaundice', 'yellow skin', 'yellow eyes', 'ictericia'],
    symptomCategory: 'gastrointestinal',
    icd10Code: 'R17',
    diagnosisName: 'Unspecified jaundice',
    baseProbability: 0.25,
    probabilityModifiers: {
      'alcohol': 2.0,
      'hepatitis_risk': 2.5,
      'biliary_disease': 2.0,
    },
    redFlags: ['Altered mental status', 'Coagulopathy', 'Fever + RUQ pain (cholangitis)', 'Massive hepatomegaly'],
    workupSuggestions: ['LFTs', 'CBC', 'INR', 'Hepatitis panel', 'RUQ ultrasound', 'MRCP if obstruction suspected'],
  },

  // ═══════════════════════════════════════════════════════════════
  // NEUROLOGICAL (26-32)
  // ═══════════════════════════════════════════════════════════════
  {
    symptomKeywords: ['headache', 'head pain', 'migraine', 'dolor de cabeza', 'cefalea', 'migraña'],
    symptomCategory: 'neurological',
    icd10Code: 'R51.9',
    diagnosisName: 'Headache, unspecified',
    baseProbability: 0.50,
    probabilityModifiers: {
      'female': 1.3,
      'stress': 1.4,
      'family_migraine': 1.8,
    },
    redFlags: ['Thunderclap onset', 'Worst headache of life', 'Fever + neck stiffness', 'Focal neurological deficits', 'Papilledema', 'Age >50 new onset'],
    workupSuggestions: ['Neurological exam', 'CT head if red flags', 'LP if meningitis suspected', 'MRI if concerning features'],
  },
  {
    symptomKeywords: ['dizziness', 'vertigo', 'room spinning', 'lightheaded', 'mareo', 'vértigo'],
    symptomCategory: 'neurological',
    icd10Code: 'R42',
    diagnosisName: 'Dizziness and giddiness',
    baseProbability: 0.40,
    probabilityModifiers: {
      'age>65': 1.4,
      'medication': 1.5,
      'cardiovascular': 1.3,
    },
    redFlags: ['Focal neurological signs', 'Sudden onset', 'Hearing loss', 'Headache', 'Cerebellar signs'],
    workupSuggestions: ['Dix-Hallpike test', 'Orthostatic vitals', 'ECG', 'CBC', 'BMP', 'Audiogram if hearing changes'],
  },
  {
    symptomKeywords: ['numbness', 'tingling', 'paresthesia', 'pins and needles', 'adormecimiento', 'hormigueo'],
    symptomCategory: 'neurological',
    icd10Code: 'R20.2',
    diagnosisName: 'Paresthesia of skin',
    baseProbability: 0.35,
    probabilityModifiers: {
      'diabetes': 2.0,
      'b12_deficiency': 1.8,
      'carpal_tunnel_risk': 1.5,
    },
    redFlags: ['Acute onset', 'Associated weakness', 'Bowel/bladder dysfunction', 'Progressive symptoms'],
    workupSuggestions: ['Neurological exam', 'B12 level', 'TSH', 'HbA1c', 'EMG/NCS if focal', 'MRI spine if concerning'],
  },
  {
    symptomKeywords: ['weakness', 'muscle weakness', 'cant move', 'debilidad'],
    symptomCategory: 'neurological',
    icd10Code: 'R53.1',
    diagnosisName: 'Weakness',
    baseProbability: 0.30,
    probabilityModifiers: {
      'age>65': 1.4,
      'stroke_risk': 2.0,
    },
    redFlags: ['Sudden onset', 'Facial droop', 'Speech changes', 'Unilateral symptoms', 'FAST positive'],
    workupSuggestions: ['Neurological exam', 'CT head stat if stroke suspected', 'CBC', 'BMP', 'Glucose', 'TSH'],
  },
  {
    symptomKeywords: ['seizure', 'convulsion', 'fit', 'epilepsy', 'convulsión', 'ataque'],
    symptomCategory: 'neurological',
    icd10Code: 'R56.9',
    diagnosisName: 'Unspecified convulsions',
    baseProbability: 0.30,
    probabilityModifiers: {
      'epilepsy_history': 3.0,
      'alcohol_withdrawal': 2.5,
      'medication_change': 1.5,
    },
    redFlags: ['Status epilepticus', 'First seizure', 'Post-ictal focal deficit', 'Fever', 'Head trauma'],
    workupSuggestions: ['CBC', 'BMP', 'Glucose', 'Toxicology screen', 'CT head', 'EEG', 'AED levels if on medication'],
  },
  {
    symptomKeywords: ['memory loss', 'forgetfulness', 'confusion', 'cognitive decline', 'pérdida de memoria', 'confusión'],
    symptomCategory: 'neurological',
    icd10Code: 'R41.3',
    diagnosisName: 'Other amnesia',
    baseProbability: 0.25,
    probabilityModifiers: {
      'age>65': 2.0,
      'age>80': 2.5,
      'family_dementia': 1.5,
    },
    redFlags: ['Rapid onset', 'Associated fever', 'Focal signs', 'Medication changes', 'Depression symptoms'],
    workupSuggestions: ['MMSE/MoCA', 'TSH', 'B12', 'BMP', 'CBC', 'RPR', 'MRI brain', 'Depression screening'],
  },
  {
    symptomKeywords: ['tremor', 'shaking', 'hand tremor', 'temblor'],
    symptomCategory: 'neurological',
    icd10Code: 'R25.1',
    diagnosisName: 'Tremor, unspecified',
    baseProbability: 0.30,
    probabilityModifiers: {
      'age>60': 1.5,
      'family_history': 1.8,
      'caffeine': 1.3,
      'hyperthyroid': 2.0,
    },
    redFlags: ['Resting tremor (Parkinson)', 'Associated rigidity', 'Bradykinesia', 'Gait changes'],
    workupSuggestions: ['Neurological exam', 'TSH', 'Consider neurology referral', 'DaTscan if Parkinson suspected'],
  },

  // ═══════════════════════════════════════════════════════════════
  // MUSCULOSKELETAL (33-40)
  // ═══════════════════════════════════════════════════════════════
  {
    symptomKeywords: ['back pain', 'low back pain', 'lumbar pain', 'dolor de espalda', 'lumbalgia'],
    symptomCategory: 'musculoskeletal',
    icd10Code: 'M54.5',
    diagnosisName: 'Low back pain',
    baseProbability: 0.55,
    probabilityModifiers: {
      'age>40': 1.2,
      'sedentary': 1.4,
      'heavy_lifting': 1.5,
    },
    redFlags: ['Cauda equina symptoms', 'Fever', 'Weight loss', 'Night pain', 'Progressive neurological deficit', 'Trauma'],
    workupSuggestions: ['Clinical exam', 'X-ray if trauma', 'MRI if red flags', 'Conservative management trial'],
  },
  {
    symptomKeywords: ['neck pain', 'cervical pain', 'stiff neck', 'dolor de cuello', 'cervicalgia'],
    symptomCategory: 'musculoskeletal',
    icd10Code: 'M54.2',
    diagnosisName: 'Cervicalgia',
    baseProbability: 0.45,
    probabilityModifiers: {
      'desk_work': 1.4,
      'trauma': 2.0,
    },
    redFlags: ['Fever + stiff neck (meningitis)', 'Myelopathy signs', 'Trauma', 'Weakness', 'Bowel/bladder changes'],
    workupSuggestions: ['Clinical exam', 'X-ray if trauma', 'MRI if radiculopathy or myelopathy signs'],
  },
  {
    symptomKeywords: ['joint pain', 'arthralgia', 'artritis', 'dolor articular'],
    symptomCategory: 'musculoskeletal',
    icd10Code: 'M25.50',
    diagnosisName: 'Pain in unspecified joint',
    baseProbability: 0.40,
    probabilityModifiers: {
      'age>50': 1.4,
      'obesity': 1.3,
      'autoimmune': 1.8,
    },
    redFlags: ['Hot swollen joint (septic)', 'Multiple joint involvement (RA)', 'Morning stiffness >1 hour', 'Systemic symptoms'],
    workupSuggestions: ['CBC', 'CRP/ESR', 'Uric acid', 'RF/Anti-CCP if RA suspected', 'Joint aspiration if effusion', 'X-ray'],
  },
  {
    symptomKeywords: ['knee pain', 'dolor de rodilla'],
    symptomCategory: 'musculoskeletal',
    icd10Code: 'M25.569',
    diagnosisName: 'Pain in unspecified knee',
    baseProbability: 0.45,
    probabilityModifiers: {
      'obesity': 1.5,
      'age>50': 1.4,
      'athlete': 1.3,
    },
    redFlags: ['Locked knee', 'Unable to bear weight', 'Significant swelling', 'Instability', 'Trauma'],
    workupSuggestions: ['Physical exam', 'X-ray', 'MRI if ligament/meniscus injury suspected'],
  },
  {
    symptomKeywords: ['shoulder pain', 'dolor de hombro'],
    symptomCategory: 'musculoskeletal',
    icd10Code: 'M25.519',
    diagnosisName: 'Pain in unspecified shoulder',
    baseProbability: 0.40,
    probabilityModifiers: {
      'overhead_work': 1.5,
      'age>40': 1.3,
    },
    redFlags: ['Referred cardiac pain', 'Trauma', 'Inability to raise arm', 'Dislocation'],
    workupSuggestions: ['Physical exam (impingement tests)', 'X-ray', 'MRI if rotator cuff tear suspected'],
  },
  {
    symptomKeywords: ['hip pain', 'dolor de cadera'],
    symptomCategory: 'musculoskeletal',
    icd10Code: 'M25.559',
    diagnosisName: 'Pain in unspecified hip',
    baseProbability: 0.35,
    probabilityModifiers: {
      'age>65': 1.5,
      'osteoporosis': 1.8,
      'steroid_use': 1.6,
    },
    redFlags: ['Unable to bear weight', 'Trauma', 'Shortened/rotated leg (fracture)', 'Night pain'],
    workupSuggestions: ['X-ray', 'MRI if occult fracture or AVN suspected', 'DEXA if osteoporosis risk'],
  },
  {
    symptomKeywords: ['muscle pain', 'myalgia', 'body aches', 'dolor muscular'],
    symptomCategory: 'musculoskeletal',
    icd10Code: 'M79.10',
    diagnosisName: 'Myalgia, unspecified site',
    baseProbability: 0.45,
    probabilityModifiers: {
      'statin_use': 2.0,
      'viral_illness': 2.5,
      'exercise': 1.5,
    },
    redFlags: ['Dark urine (rhabdomyolysis)', 'Proximal weakness', 'Skin rash (dermatomyositis)', 'Fever'],
    workupSuggestions: ['CK if rhabdomyolysis suspected', 'TSH', 'CBC', 'BMP', 'Review medications'],
  },
  {
    symptomKeywords: ['gout', 'podagra', 'big toe pain', 'gota'],
    symptomCategory: 'musculoskeletal',
    icd10Code: 'M10.9',
    diagnosisName: 'Gout, unspecified',
    baseProbability: 0.30,
    probabilityModifiers: {
      'male': 1.8,
      'alcohol': 1.5,
      'diuretic': 1.6,
      'renal': 1.4,
    },
    redFlags: ['Fever (septic joint)', 'Multiple joints', 'Tophi', 'Renal stones'],
    workupSuggestions: ['Uric acid level', 'BMP', 'Joint aspiration (gold standard)', 'X-ray'],
  },

  // ═══════════════════════════════════════════════════════════════
  // PSYCHIATRIC/MENTAL HEALTH (41-45)
  // ═══════════════════════════════════════════════════════════════
  {
    symptomKeywords: ['anxiety', 'worried', 'panic', 'nervous', 'ansiedad', 'nervios'],
    symptomCategory: 'psychiatric',
    icd10Code: 'F41.9',
    diagnosisName: 'Anxiety disorder, unspecified',
    baseProbability: 0.40,
    probabilityModifiers: {
      'female': 1.3,
      'stressful_life': 1.8,
      'family_history': 1.5,
    },
    redFlags: ['Suicidal ideation', 'Panic attacks', 'Substance use', 'Physical symptoms (rule out medical)'],
    workupSuggestions: ['GAD-7 screening', 'PHQ-9', 'TSH', 'CBC', 'BMP to rule out medical causes', 'Toxicology if indicated'],
  },
  {
    symptomKeywords: ['depression', 'sad', 'hopeless', 'no energy', 'depresión', 'tristeza'],
    symptomCategory: 'psychiatric',
    icd10Code: 'F32.9',
    diagnosisName: 'Major depressive disorder, single episode, unspecified',
    baseProbability: 0.35,
    probabilityModifiers: {
      'female': 1.4,
      'chronic_illness': 1.5,
      'family_history': 1.6,
      'grief': 1.8,
    },
    redFlags: ['Suicidal ideation', 'Homicidal ideation', 'Psychotic features', 'Severe functional impairment'],
    workupSuggestions: ['PHQ-9', 'TSH', 'B12', 'CBC', 'Safety assessment', 'Consider psychiatry referral'],
  },
  {
    symptomKeywords: ['insomnia', 'cant sleep', 'sleep problems', 'insomnio', 'no puedo dormir'],
    symptomCategory: 'psychiatric',
    icd10Code: 'G47.00',
    diagnosisName: 'Insomnia, unspecified',
    baseProbability: 0.40,
    probabilityModifiers: {
      'anxiety': 1.8,
      'depression': 2.0,
      'pain': 1.5,
      'caffeine': 1.4,
    },
    redFlags: ['Associated depression', 'Substance use', 'Sleep apnea symptoms', 'Daytime impairment'],
    workupSuggestions: ['Sleep hygiene assessment', 'PHQ-9/GAD-7', 'Consider sleep study if apnea suspected'],
  },
  {
    symptomKeywords: ['fatigue', 'tired', 'exhausted', 'no energy', 'cansancio', 'agotamiento'],
    symptomCategory: 'psychiatric',
    icd10Code: 'R53.83',
    diagnosisName: 'Other fatigue',
    baseProbability: 0.45,
    probabilityModifiers: {
      'depression': 2.0,
      'thyroid': 2.5,
      'anemia': 2.0,
      'sleep_disorder': 1.8,
    },
    redFlags: ['Weight loss', 'Night sweats', 'Fever', 'Significant functional decline'],
    workupSuggestions: ['CBC', 'TSH', 'BMP', 'Ferritin', 'B12', 'PHQ-9', 'Sleep history'],
  },
  {
    symptomKeywords: ['suicidal', 'want to die', 'self harm', 'suicida', 'quiero morir'],
    symptomCategory: 'psychiatric',
    icd10Code: 'R45.851',
    diagnosisName: 'Suicidal ideations',
    baseProbability: 0.80,
    probabilityModifiers: {
      'depression': 2.0,
      'substance_use': 2.5,
      'previous_attempt': 3.0,
    },
    redFlags: ['Active plan', 'Access to means', 'Recent attempt', 'Hopelessness', 'Psychosis'],
    workupSuggestions: ['Immediate safety assessment', 'C-SSRS', 'Remove access to means', 'Psychiatric evaluation stat', 'Consider hospitalization'],
  },

  // ═══════════════════════════════════════════════════════════════
  // GENITOURINARY (46-50)
  // ═══════════════════════════════════════════════════════════════
  {
    symptomKeywords: ['painful urination', 'dysuria', 'burning urination', 'uti', 'dolor al orinar', 'infección urinaria'],
    symptomCategory: 'genitourinary',
    icd10Code: 'N39.0',
    diagnosisName: 'Urinary tract infection, site not specified',
    baseProbability: 0.50,
    probabilityModifiers: {
      'female': 2.0,
      'sexually_active': 1.3,
      'catheter': 2.5,
      'diabetes': 1.4,
    },
    redFlags: ['Fever', 'Flank pain (pyelonephritis)', 'Rigors', 'Altered mental status (elderly)', 'Retention'],
    workupSuggestions: ['Urinalysis', 'Urine culture', 'BMP if complicated', 'Imaging if pyelonephritis suspected'],
  },
  {
    symptomKeywords: ['frequent urination', 'polyuria', 'urinary frequency', 'orinar frecuente'],
    symptomCategory: 'genitourinary',
    icd10Code: 'R35.0',
    diagnosisName: 'Frequency of micturition',
    baseProbability: 0.35,
    probabilityModifiers: {
      'diabetes': 2.5,
      'bph': 2.0,
      'caffeine': 1.3,
    },
    redFlags: ['Polydipsia + weight loss (DM)', 'Hematuria', 'Urinary retention'],
    workupSuggestions: ['Urinalysis', 'Glucose', 'BMP', 'PSA if male >50', 'Post-void residual if retention suspected'],
  },
  {
    symptomKeywords: ['blood in urine', 'hematuria', 'sangre en orina'],
    symptomCategory: 'genitourinary',
    icd10Code: 'R31.9',
    diagnosisName: 'Hematuria, unspecified',
    baseProbability: 0.30,
    probabilityModifiers: {
      'smoker': 1.8,
      'age>50': 1.5,
      'anticoagulant': 1.4,
    },
    redFlags: ['Gross hematuria', 'Age >40 with microscopic hematuria', 'Weight loss', 'Clots'],
    workupSuggestions: ['Urinalysis', 'Urine cytology', 'CT urogram', 'Cystoscopy if gross or risk factors', 'BMP'],
  },
  {
    symptomKeywords: ['flank pain', 'kidney stone', 'renal colic', 'dolor de riñón', 'cólico renal'],
    symptomCategory: 'genitourinary',
    icd10Code: 'N20.0',
    diagnosisName: 'Calculus of kidney',
    baseProbability: 0.35,
    probabilityModifiers: {
      'previous_stone': 2.5,
      'male': 1.3,
      'dehydration': 1.5,
    },
    redFlags: ['Fever (infected stone)', 'Anuria', 'Solitary kidney', 'Renal insufficiency'],
    workupSuggestions: ['CT abdomen/pelvis non-contrast', 'Urinalysis', 'BMP', 'CBC', 'Urine culture'],
  },
  {
    symptomKeywords: ['erectile dysfunction', 'impotence', 'disfunción eréctil'],
    symptomCategory: 'genitourinary',
    icd10Code: 'N52.9',
    diagnosisName: 'Male erectile dysfunction, unspecified',
    baseProbability: 0.35,
    probabilityModifiers: {
      'age>50': 1.5,
      'diabetes': 2.0,
      'cardiovascular': 1.8,
      'depression': 1.5,
    },
    redFlags: ['Sudden onset (vascular)', 'Associated neurological symptoms', 'Peyronie symptoms'],
    workupSuggestions: ['Testosterone level', 'Lipid panel', 'HbA1c', 'PSA', 'Consider cardiovascular workup'],
  },
];

// ═══════════════════════════════════════════════════════════════
// TREATMENT PROTOCOLS
// Top 10 Evidence-Based Clinical Protocols
// ═══════════════════════════════════════════════════════════════

interface TreatmentProtocolData {
  conditionIcd10: string;
  conditionName: string;
  version: string;
  guidelineSource: string;
  guidelineUrl?: string;
  guidelineCitation?: string;
  eligibility: EligibilityCriterion[];
  recommendations: TreatmentRecommendation[];
}

const treatmentProtocols: TreatmentProtocolData[] = [
  // ═══════════════════════════════════════════════════════════════
  // 1. TYPE 2 DIABETES - ADA 2024 Standards of Care
  // ═══════════════════════════════════════════════════════════════
  {
    conditionIcd10: 'E11',
    conditionName: 'Type 2 Diabetes Mellitus',
    version: '2024.1',
    guidelineSource: 'ADA Standards of Care 2024',
    guidelineUrl: 'https://diabetesjournals.org/care/issue/47/Supplement_1',
    guidelineCitation: 'American Diabetes Association. Standards of Care in Diabetes—2024. Diabetes Care 2024;47(Suppl 1)',
    eligibility: [
      { field: 'diagnoses', operator: 'contains', value: 'E11', required: true },
      { field: 'age', operator: 'gte', value: 18, required: true },
    ],
    recommendations: [
      {
        id: 'dm2-metformin',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Metformin',
          rxNormCode: '6809',
          dose: '500mg',
          frequency: 'twice daily, titrate to 1000mg twice daily',
          duration: 'Indefinite',
        },
        rationale: 'Per ADA 2024: Metformin is first-line pharmacologic therapy for T2DM when not contraindicated',
        evidenceGrade: 'A',
        contraindications: ['eGFR <30', 'Metabolic acidosis', 'Acute kidney injury'],
      },
      {
        id: 'dm2-a1c-monitoring',
        type: 'lab',
        priority: 'required',
        labOrder: {
          name: 'Hemoglobin A1c',
          loincCode: '4548-4',
          frequency: 'Every 3 months until at goal, then every 6 months',
        },
        rationale: 'Per ADA 2024: A1c testing at least twice yearly in patients meeting goals, quarterly if not at goal',
        evidenceGrade: 'A',
        contraindications: [],
      },
      {
        id: 'dm2-sglt2',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Empagliflozin',
          rxNormCode: '1545653',
          dose: '10mg',
          frequency: 'once daily',
        },
        rationale: 'Per ADA 2024: SGLT2i recommended for patients with T2DM and ASCVD, HF, or CKD regardless of A1c',
        evidenceGrade: 'A',
        contraindications: ['eGFR <20', 'Type 1 diabetes', 'Frequent UTIs', 'DKA history'],
      },
      {
        id: 'dm2-glp1',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Semaglutide',
          rxNormCode: '1991302',
          dose: '0.25mg weekly, titrate to 1mg',
          frequency: 'once weekly',
        },
        rationale: 'Per ADA 2024: GLP-1 RA with proven CVD benefit recommended for patients with ASCVD or high CV risk',
        evidenceGrade: 'A',
        contraindications: ['Personal/family history of MTC', 'MEN2', 'Pancreatitis history'],
      },
      {
        id: 'dm2-lifestyle',
        type: 'lifestyle',
        priority: 'required',
        rationale: 'Per ADA 2024: Medical nutrition therapy and physical activity are integral to diabetes management',
        evidenceGrade: 'A',
        contraindications: [],
      },
      {
        id: 'dm2-eye-exam',
        type: 'referral',
        priority: 'required',
        rationale: 'Per ADA 2024: Dilated eye exam at diagnosis and annually thereafter',
        evidenceGrade: 'B',
        contraindications: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 2. HYPERTENSION - ACC/AHA 2023 Guidelines
  // ═══════════════════════════════════════════════════════════════
  {
    conditionIcd10: 'I10',
    conditionName: 'Essential Hypertension',
    version: '2023.1',
    guidelineSource: 'ACC/AHA Hypertension Guidelines 2023',
    guidelineUrl: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065',
    guidelineCitation: 'Whelton PK, et al. 2017 ACC/AHA Guideline (2023 update)',
    eligibility: [
      { field: 'diagnoses', operator: 'contains', value: 'I10', required: true },
      { field: 'age', operator: 'gte', value: 18, required: true },
    ],
    recommendations: [
      {
        id: 'htn-lifestyle',
        type: 'lifestyle',
        priority: 'required',
        rationale: 'Per ACC/AHA: Lifestyle modification is recommended for all patients with elevated BP or HTN',
        evidenceGrade: 'A',
        contraindications: [],
      },
      {
        id: 'htn-ace-inhibitor',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Lisinopril',
          rxNormCode: '29046',
          dose: '10mg',
          frequency: 'once daily, titrate to 40mg',
        },
        rationale: 'Per ACC/AHA: ACE inhibitors are first-line, especially with diabetes, CKD, or HF',
        evidenceGrade: 'A',
        contraindications: ['Pregnancy', 'Angioedema history', 'Bilateral renal artery stenosis', 'K+ >5.5'],
      },
      {
        id: 'htn-arb',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Losartan',
          rxNormCode: '52175',
          dose: '50mg',
          frequency: 'once daily, titrate to 100mg',
        },
        rationale: 'Per ACC/AHA: ARBs are alternative to ACEi, preferred if ACEi cough',
        evidenceGrade: 'A',
        contraindications: ['Pregnancy', 'Bilateral renal artery stenosis', 'Do not combine with ACEi'],
      },
      {
        id: 'htn-ccb',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Amlodipine',
          rxNormCode: '17767',
          dose: '5mg',
          frequency: 'once daily, titrate to 10mg',
        },
        rationale: 'Per ACC/AHA: CCBs are first-line, especially in Black patients or with angina',
        evidenceGrade: 'A',
        contraindications: ['Severe aortic stenosis', 'Cardiogenic shock'],
      },
      {
        id: 'htn-thiazide',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Chlorthalidone',
          rxNormCode: '2409',
          dose: '12.5mg',
          frequency: 'once daily, max 25mg',
        },
        rationale: 'Per ACC/AHA: Thiazide-type diuretics are first-line for most patients',
        evidenceGrade: 'A',
        contraindications: ['Gout', 'Severe hyponatremia', 'Hypercalcemia'],
      },
      {
        id: 'htn-monitoring',
        type: 'monitoring',
        priority: 'required',
        rationale: 'Per ACC/AHA: Home BP monitoring recommended; follow-up within 1 month if starting medication',
        evidenceGrade: 'A',
        contraindications: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 3. HYPERLIPIDEMIA - ACC/AHA Lipid Guidelines 2019
  // ═══════════════════════════════════════════════════════════════
  {
    conditionIcd10: 'E78',
    conditionName: 'Hyperlipidemia',
    version: '2019.1',
    guidelineSource: 'ACC/AHA Guideline on Blood Cholesterol 2019',
    guidelineUrl: 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000000625',
    guidelineCitation: 'Grundy SM, et al. 2018 AHA/ACC Guideline on Blood Cholesterol',
    eligibility: [
      { field: 'diagnoses', operator: 'contains', value: 'E78', required: true },
      { field: 'age', operator: 'gte', value: 18, required: true },
    ],
    recommendations: [
      {
        id: 'lipid-statin-high',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Atorvastatin',
          rxNormCode: '83367',
          dose: '40-80mg',
          frequency: 'once daily at bedtime',
        },
        rationale: 'Per ACC/AHA: High-intensity statin for clinical ASCVD, LDL ≥190, or DM with high risk',
        evidenceGrade: 'A',
        contraindications: ['Active liver disease', 'Pregnancy', 'Unexplained persistent LFT elevation'],
      },
      {
        id: 'lipid-statin-mod',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Atorvastatin',
          rxNormCode: '83367',
          dose: '10-20mg',
          frequency: 'once daily',
        },
        rationale: 'Per ACC/AHA: Moderate-intensity statin for primary prevention with 10-year ASCVD risk ≥7.5%',
        evidenceGrade: 'A',
        contraindications: ['Active liver disease', 'Pregnancy'],
      },
      {
        id: 'lipid-ezetimibe',
        type: 'medication',
        priority: 'consider',
        medication: {
          name: 'Ezetimibe',
          rxNormCode: '341248',
          dose: '10mg',
          frequency: 'once daily',
        },
        rationale: 'Per ACC/AHA: Add ezetimibe if LDL not at goal on max tolerated statin',
        evidenceGrade: 'B',
        contraindications: ['Moderate-severe hepatic impairment'],
      },
      {
        id: 'lipid-pcsk9',
        type: 'medication',
        priority: 'consider',
        medication: {
          name: 'Evolocumab',
          rxNormCode: '1657973',
          dose: '140mg',
          frequency: 'every 2 weeks subcutaneous',
        },
        rationale: 'Per ACC/AHA: PCSK9i for very high-risk ASCVD not at goal on max statin + ezetimibe',
        evidenceGrade: 'A',
        contraindications: ['Hypersensitivity'],
      },
      {
        id: 'lipid-labs',
        type: 'lab',
        priority: 'required',
        labOrder: {
          name: 'Lipid Panel',
          loincCode: '57698-3',
          frequency: '4-12 weeks after starting therapy, then every 3-12 months',
        },
        rationale: 'Per ACC/AHA: Fasting lipid panel to assess response to therapy',
        evidenceGrade: 'A',
        contraindications: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. HEART FAILURE WITH REDUCED EF - ACC/AHA HF Guidelines 2022
  // ═══════════════════════════════════════════════════════════════
  {
    conditionIcd10: 'I50',
    conditionName: 'Heart Failure with Reduced Ejection Fraction (HFrEF)',
    version: '2022.1',
    guidelineSource: 'ACC/AHA/HFSA Heart Failure Guidelines 2022',
    guidelineUrl: 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000001063',
    guidelineCitation: 'Heidenreich PA, et al. 2022 AHA/ACC/HFSA Guideline for HF Management',
    eligibility: [
      { field: 'diagnoses', operator: 'contains', value: 'I50', required: true },
      { field: 'age', operator: 'gte', value: 18, required: true },
    ],
    recommendations: [
      {
        id: 'hf-ace-arni',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Sacubitril/Valsartan',
          rxNormCode: '1656328',
          dose: '24/26mg',
          frequency: 'twice daily, titrate to 97/103mg twice daily',
        },
        rationale: 'Per ACC/AHA 2022: ARNI preferred over ACEi/ARB for HFrEF to reduce morbidity and mortality',
        evidenceGrade: 'A',
        contraindications: ['History of angioedema', 'Concurrent ACEi', 'Pregnancy'],
      },
      {
        id: 'hf-beta-blocker',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Carvedilol',
          rxNormCode: '20352',
          dose: '3.125mg',
          frequency: 'twice daily, titrate to 25mg twice daily',
        },
        rationale: 'Per ACC/AHA 2022: Evidence-based beta-blocker mandatory for HFrEF',
        evidenceGrade: 'A',
        contraindications: ['Cardiogenic shock', 'Severe bradycardia', 'Heart block', 'Decompensated HF'],
      },
      {
        id: 'hf-mra',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Spironolactone',
          rxNormCode: '9997',
          dose: '25mg',
          frequency: 'once daily',
        },
        rationale: 'Per ACC/AHA 2022: MRA recommended for HFrEF NYHA II-IV with EF ≤35%',
        evidenceGrade: 'A',
        contraindications: ['K+ >5.0', 'eGFR <30', 'Concurrent K-sparing diuretics'],
      },
      {
        id: 'hf-sglt2',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Dapagliflozin',
          rxNormCode: '1488564',
          dose: '10mg',
          frequency: 'once daily',
        },
        rationale: 'Per ACC/AHA 2022: SGLT2i recommended for all HFrEF regardless of DM status',
        evidenceGrade: 'A',
        contraindications: ['Type 1 DM', 'eGFR <20'],
      },
      {
        id: 'hf-diuretic',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Furosemide',
          rxNormCode: '4603',
          dose: '20-40mg',
          frequency: 'once or twice daily as needed for congestion',
        },
        rationale: 'Per ACC/AHA 2022: Loop diuretics for volume management in patients with fluid retention',
        evidenceGrade: 'C',
        contraindications: ['Anuria', 'Hepatic coma'],
      },
      {
        id: 'hf-device',
        type: 'referral',
        priority: 'recommended',
        rationale: 'Per ACC/AHA 2022: ICD/CRT evaluation for appropriate candidates with EF ≤35%',
        evidenceGrade: 'A',
        contraindications: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. COPD - GOLD Guidelines 2024
  // ═══════════════════════════════════════════════════════════════
  {
    conditionIcd10: 'J44',
    conditionName: 'Chronic Obstructive Pulmonary Disease',
    version: '2024.1',
    guidelineSource: 'GOLD Guidelines 2024',
    guidelineUrl: 'https://goldcopd.org/2024-gold-report/',
    guidelineCitation: 'Global Initiative for Chronic Obstructive Lung Disease (GOLD) 2024 Report',
    eligibility: [
      { field: 'diagnoses', operator: 'contains', value: 'J44', required: true },
      { field: 'age', operator: 'gte', value: 40, required: true },
    ],
    recommendations: [
      {
        id: 'copd-saba',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Albuterol inhaler',
          rxNormCode: '435',
          dose: '90mcg/actuation',
          frequency: '1-2 puffs every 4-6 hours as needed',
        },
        rationale: 'Per GOLD 2024: SABA recommended for all patients as rescue medication',
        evidenceGrade: 'A',
        contraindications: ['Hypersensitivity to albuterol'],
      },
      {
        id: 'copd-lama',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Tiotropium',
          rxNormCode: '69120',
          dose: '18mcg',
          frequency: 'once daily via HandiHaler',
        },
        rationale: 'Per GOLD 2024: LAMA is preferred initial maintenance therapy for Group B-E',
        evidenceGrade: 'A',
        contraindications: ['Hypersensitivity to atropine derivatives', 'Narrow-angle glaucoma'],
      },
      {
        id: 'copd-laba-ics',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Fluticasone/Vilanterol',
          rxNormCode: '1424883',
          dose: '100/25mcg',
          frequency: 'once daily',
        },
        rationale: 'Per GOLD 2024: LABA/ICS for patients with eosinophils ≥300 or frequent exacerbations',
        evidenceGrade: 'A',
        contraindications: ['Severe hypersensitivity to milk proteins'],
      },
      {
        id: 'copd-triple',
        type: 'medication',
        priority: 'consider',
        medication: {
          name: 'Fluticasone/Umeclidinium/Vilanterol',
          rxNormCode: '1945035',
          dose: '100/62.5/25mcg',
          frequency: 'once daily',
        },
        rationale: 'Per GOLD 2024: Triple therapy for patients with continued exacerbations on LABA/LAMA',
        evidenceGrade: 'A',
        contraindications: ['Severe milk protein allergy'],
      },
      {
        id: 'copd-pulm-rehab',
        type: 'referral',
        priority: 'recommended',
        rationale: 'Per GOLD 2024: Pulmonary rehabilitation recommended for symptomatic patients',
        evidenceGrade: 'A',
        contraindications: [],
      },
      {
        id: 'copd-vaccination',
        type: 'monitoring',
        priority: 'required',
        rationale: 'Per GOLD 2024: Influenza, pneumococcal, COVID-19, and Tdap vaccines recommended',
        evidenceGrade: 'A',
        contraindications: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 6. ASTHMA - GINA Guidelines 2024
  // ═══════════════════════════════════════════════════════════════
  {
    conditionIcd10: 'J45',
    conditionName: 'Asthma',
    version: '2024.1',
    guidelineSource: 'GINA Guidelines 2024',
    guidelineUrl: 'https://ginasthma.org/gina-reports/',
    guidelineCitation: 'Global Initiative for Asthma (GINA) 2024 Report',
    eligibility: [
      { field: 'diagnoses', operator: 'contains', value: 'J45', required: true },
    ],
    recommendations: [
      {
        id: 'asthma-ics-formoterol',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Budesonide/Formoterol',
          rxNormCode: '351137',
          dose: '80/4.5mcg',
          frequency: 'As needed for symptoms and regular maintenance',
        },
        rationale: 'Per GINA 2024: Low-dose ICS-formoterol is preferred reliever for adults/adolescents',
        evidenceGrade: 'A',
        contraindications: ['Hypersensitivity to components'],
      },
      {
        id: 'asthma-saba',
        type: 'medication',
        priority: 'consider',
        medication: {
          name: 'Albuterol inhaler',
          rxNormCode: '435',
          dose: '90mcg/actuation',
          frequency: '1-2 puffs as needed for symptoms',
        },
        rationale: 'Per GINA 2024: SABA-only treatment is no longer recommended; if used, always with ICS',
        evidenceGrade: 'A',
        contraindications: ['Hypersensitivity'],
      },
      {
        id: 'asthma-ics-med',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Fluticasone propionate',
          rxNormCode: '41126',
          dose: '110mcg',
          frequency: '1 puff twice daily',
        },
        rationale: 'Per GINA 2024: Medium-dose ICS for Step 3-4 when ICS-formoterol not available',
        evidenceGrade: 'A',
        contraindications: [],
      },
      {
        id: 'asthma-action-plan',
        type: 'monitoring',
        priority: 'required',
        rationale: 'Per GINA 2024: Written asthma action plan for all patients',
        evidenceGrade: 'A',
        contraindications: [],
      },
      {
        id: 'asthma-peak-flow',
        type: 'monitoring',
        priority: 'recommended',
        rationale: 'Per GINA 2024: Peak flow monitoring for patients with severe asthma or poor symptom perception',
        evidenceGrade: 'B',
        contraindications: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 7. MAJOR DEPRESSIVE DISORDER - APA Guidelines 2023
  // ═══════════════════════════════════════════════════════════════
  {
    conditionIcd10: 'F32',
    conditionName: 'Major Depressive Disorder',
    version: '2023.1',
    guidelineSource: 'APA Practice Guideline for MDD 2023',
    guidelineUrl: 'https://www.psychiatry.org/psychiatrists/practice/clinical-practice-guidelines',
    guidelineCitation: 'American Psychiatric Association Practice Guideline for MDD, Third Edition',
    eligibility: [
      { field: 'diagnoses', operator: 'contains', value: 'F32', required: true },
      { field: 'age', operator: 'gte', value: 18, required: true },
    ],
    recommendations: [
      {
        id: 'mdd-ssri',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Sertraline',
          rxNormCode: '36437',
          dose: '50mg',
          frequency: 'once daily, titrate as needed to 200mg',
        },
        rationale: 'Per APA 2023: SSRIs are first-line pharmacotherapy for MDD',
        evidenceGrade: 'A',
        contraindications: ['MAOi use within 14 days', 'Concurrent pimozide'],
      },
      {
        id: 'mdd-snri',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Duloxetine',
          rxNormCode: '72625',
          dose: '30mg',
          frequency: 'once daily, titrate to 60mg',
        },
        rationale: 'Per APA 2023: SNRIs are first-line alternatives, especially with comorbid pain',
        evidenceGrade: 'A',
        contraindications: ['MAOi use within 14 days', 'Uncontrolled narrow-angle glaucoma'],
      },
      {
        id: 'mdd-bupropion',
        type: 'medication',
        priority: 'consider',
        medication: {
          name: 'Bupropion XL',
          rxNormCode: '993536',
          dose: '150mg',
          frequency: 'once daily, may increase to 300mg',
        },
        rationale: 'Per APA 2023: Bupropion option if sexual dysfunction concern or need for activation',
        evidenceGrade: 'A',
        contraindications: ['Seizure disorder', 'Bulimia/anorexia', 'MAOi use', 'Abrupt alcohol withdrawal'],
      },
      {
        id: 'mdd-psychotherapy',
        type: 'referral',
        priority: 'recommended',
        rationale: 'Per APA 2023: CBT or IPT recommended as monotherapy for mild-moderate MDD or combined with medication',
        evidenceGrade: 'A',
        contraindications: [],
      },
      {
        id: 'mdd-safety',
        type: 'monitoring',
        priority: 'required',
        rationale: 'Per APA 2023: Monitor for suicidal ideation especially in first weeks of treatment',
        evidenceGrade: 'A',
        contraindications: [],
      },
      {
        id: 'mdd-followup',
        type: 'monitoring',
        priority: 'required',
        rationale: 'Per APA 2023: Follow-up within 1-2 weeks of starting medication; PHQ-9 monitoring',
        evidenceGrade: 'B',
        contraindications: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 8. CHRONIC KIDNEY DISEASE - KDIGO Guidelines 2024
  // ═══════════════════════════════════════════════════════════════
  {
    conditionIcd10: 'N18',
    conditionName: 'Chronic Kidney Disease',
    version: '2024.1',
    guidelineSource: 'KDIGO CKD Guidelines 2024',
    guidelineUrl: 'https://kdigo.org/guidelines/',
    guidelineCitation: 'KDIGO 2024 Clinical Practice Guideline for CKD Evaluation and Management',
    eligibility: [
      { field: 'diagnoses', operator: 'contains', value: 'N18', required: true },
      { field: 'age', operator: 'gte', value: 18, required: true },
    ],
    recommendations: [
      {
        id: 'ckd-ace-arb',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Lisinopril',
          rxNormCode: '29046',
          dose: '5mg',
          frequency: 'once daily, titrate as tolerated',
        },
        rationale: 'Per KDIGO 2024: ACEi/ARB recommended for diabetic CKD with albuminuria or non-diabetic CKD with UACR ≥300',
        evidenceGrade: 'A',
        contraindications: ['Pregnancy', 'K+ >5.5', 'History of angioedema'],
      },
      {
        id: 'ckd-sglt2',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Dapagliflozin',
          rxNormCode: '1488564',
          dose: '10mg',
          frequency: 'once daily',
        },
        rationale: 'Per KDIGO 2024: SGLT2i recommended for CKD with eGFR ≥20 regardless of diabetes status',
        evidenceGrade: 'A',
        contraindications: ['eGFR <20 to initiate', 'Type 1 DM'],
      },
      {
        id: 'ckd-bp-goal',
        type: 'monitoring',
        priority: 'required',
        rationale: 'Per KDIGO 2024: Target SBP <120 if tolerated using standardized BP measurement',
        evidenceGrade: 'B',
        contraindications: [],
      },
      {
        id: 'ckd-statin',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Atorvastatin',
          rxNormCode: '83367',
          dose: '20mg',
          frequency: 'once daily',
        },
        rationale: 'Per KDIGO 2024: Statin recommended for adults ≥50 with eGFR <60 not on dialysis',
        evidenceGrade: 'A',
        contraindications: ['Active liver disease'],
      },
      {
        id: 'ckd-labs',
        type: 'lab',
        priority: 'required',
        labOrder: {
          name: 'CKD panel (eGFR, UACR)',
          loincCode: '98979-8',
          frequency: 'Every 3-12 months based on stage',
        },
        rationale: 'Per KDIGO 2024: Monitor eGFR and albuminuria at least annually; more frequently based on stage',
        evidenceGrade: 'B',
        contraindications: [],
      },
      {
        id: 'ckd-nephrology',
        type: 'referral',
        priority: 'recommended',
        rationale: 'Per KDIGO 2024: Nephrology referral for eGFR <30, rapid progression, or AKI',
        evidenceGrade: 'B',
        contraindications: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 9. ATRIAL FIBRILLATION - ACC/AHA/ACCP/HRS AF Guidelines 2023
  // ═══════════════════════════════════════════════════════════════
  {
    conditionIcd10: 'I48',
    conditionName: 'Atrial Fibrillation',
    version: '2023.1',
    guidelineSource: 'ACC/AHA/ACCP/HRS AF Guidelines 2023',
    guidelineUrl: 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000001193',
    guidelineCitation: '2023 ACC/AHA/ACCP/HRS Guideline for Management of AF',
    eligibility: [
      { field: 'diagnoses', operator: 'contains', value: 'I48', required: true },
      { field: 'age', operator: 'gte', value: 18, required: true },
    ],
    recommendations: [
      {
        id: 'afib-doac',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Apixaban',
          rxNormCode: '1364430',
          dose: '5mg',
          frequency: 'twice daily (2.5mg twice daily if ≥2: age ≥80, weight ≤60kg, Cr ≥1.5)',
        },
        rationale: 'Per 2023 Guidelines: DOACs preferred over warfarin for stroke prevention in eligible patients',
        evidenceGrade: 'A',
        contraindications: ['Mechanical valve', 'Mod-severe mitral stenosis', 'Active bleeding', 'Severe hepatic disease'],
      },
      {
        id: 'afib-rate-beta',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Metoprolol succinate',
          rxNormCode: '866427',
          dose: '25mg',
          frequency: 'once daily, titrate for rate control',
        },
        rationale: 'Per 2023 Guidelines: Beta-blockers first-line for rate control',
        evidenceGrade: 'A',
        contraindications: ['Severe bradycardia', 'Decompensated HF', 'Severe asthma'],
      },
      {
        id: 'afib-rate-ccb',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Diltiazem ER',
          rxNormCode: '896752',
          dose: '120mg',
          frequency: 'once daily',
        },
        rationale: 'Per 2023 Guidelines: Non-DHP CCB alternative for rate control if beta-blocker not tolerated',
        evidenceGrade: 'B',
        contraindications: ['HFrEF', 'Severe bradycardia', 'WPW with AF'],
      },
      {
        id: 'afib-chads-vasc',
        type: 'monitoring',
        priority: 'required',
        rationale: 'Per 2023 Guidelines: Calculate CHA2DS2-VASc score to guide anticoagulation decision',
        evidenceGrade: 'A',
        contraindications: [],
      },
      {
        id: 'afib-ablation',
        type: 'referral',
        priority: 'consider',
        rationale: 'Per 2023 Guidelines: Catheter ablation may be considered as first-line rhythm control in select patients',
        evidenceGrade: 'A',
        contraindications: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 10. OSTEOPOROSIS - AACE/ACE Guidelines 2020
  // ═══════════════════════════════════════════════════════════════
  {
    conditionIcd10: 'M81',
    conditionName: 'Osteoporosis without Pathological Fracture',
    version: '2020.1',
    guidelineSource: 'AACE/ACE Clinical Practice Guidelines 2020',
    guidelineUrl: 'https://www.aace.com/disease-state-resources/bone-and-parathyroid',
    guidelineCitation: 'AACE/ACE 2020 Clinical Practice Guidelines for Osteoporosis',
    eligibility: [
      { field: 'diagnoses', operator: 'contains', value: 'M81', required: true },
      { field: 'age', operator: 'gte', value: 50, required: true },
    ],
    recommendations: [
      {
        id: 'osteo-bisphosphonate',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Alendronate',
          rxNormCode: '3002',
          dose: '70mg',
          frequency: 'once weekly on empty stomach with full glass of water, remain upright 30 min',
        },
        rationale: 'Per AACE 2020: Oral bisphosphonates first-line for most patients with osteoporosis',
        evidenceGrade: 'A',
        contraindications: ['Esophageal abnormalities', 'Inability to stand/sit upright 30 min', 'Hypocalcemia', 'CrCl <35'],
      },
      {
        id: 'osteo-denosumab',
        type: 'medication',
        priority: 'recommended',
        medication: {
          name: 'Denosumab',
          rxNormCode: '993449',
          dose: '60mg',
          frequency: 'subcutaneous every 6 months',
        },
        rationale: 'Per AACE 2020: Denosumab alternative for patients intolerant of bisphosphonates or with renal impairment',
        evidenceGrade: 'A',
        contraindications: ['Hypocalcemia'],
      },
      {
        id: 'osteo-calcium-vitd',
        type: 'medication',
        priority: 'required',
        medication: {
          name: 'Calcium + Vitamin D3',
          rxNormCode: '216878',
          dose: 'Calcium 1000-1200mg + Vitamin D 800-1000 IU',
          frequency: 'daily with food',
        },
        rationale: 'Per AACE 2020: Adequate calcium and vitamin D supplementation recommended for all patients',
        evidenceGrade: 'A',
        contraindications: ['Hypercalcemia', 'Hypercalciuria'],
      },
      {
        id: 'osteo-dexa',
        type: 'lab',
        priority: 'required',
        labOrder: {
          name: 'DEXA bone density scan',
          loincCode: '80947-2',
          frequency: 'Every 2 years, or 1 year if monitoring therapy',
        },
        rationale: 'Per AACE 2020: Monitor BMD to assess response to therapy',
        evidenceGrade: 'B',
        contraindications: [],
      },
      {
        id: 'osteo-fall-prevention',
        type: 'lifestyle',
        priority: 'required',
        rationale: 'Per AACE 2020: Fall prevention strategies and weight-bearing exercise recommended',
        evidenceGrade: 'A',
        contraindications: [],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// SEED FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function seedSymptomDiagnosisMaps() {
  console.log('🏥 Seeding Symptom-Diagnosis Maps...');

  let created = 0;
  let updated = 0;

  for (const map of symptomDiagnosisMaps) {
    const existing = await prisma.symptomDiagnosisMap.findFirst({
      where: {
        icd10Code: map.icd10Code,
        symptomCategory: map.symptomCategory,
      },
    });

    if (existing) {
      await prisma.symptomDiagnosisMap.update({
        where: { id: existing.id },
        data: {
          symptomKeywords: map.symptomKeywords,
          diagnosisName: map.diagnosisName,
          baseProbability: map.baseProbability,
          probabilityModifiers: map.probabilityModifiers,
          redFlags: map.redFlags,
          workupSuggestions: map.workupSuggestions,
          isActive: true,
          updatedAt: new Date(),
        },
      });
      updated++;
    } else {
      await prisma.symptomDiagnosisMap.create({
        data: {
          symptomKeywords: map.symptomKeywords,
          symptomCategory: map.symptomCategory,
          icd10Code: map.icd10Code,
          diagnosisName: map.diagnosisName,
          baseProbability: map.baseProbability,
          probabilityModifiers: map.probabilityModifiers,
          redFlags: map.redFlags,
          workupSuggestions: map.workupSuggestions,
          isActive: true,
          createdBy: 'seed-clinical-rules',
        },
      });
      created++;
    }
  }

  console.log(`   ✅ Created ${created} symptom-diagnosis maps`);
  console.log(`   ✅ Updated ${updated} symptom-diagnosis maps`);
}

async function seedTreatmentProtocols() {
  console.log('💊 Seeding Treatment Protocols...');

  let created = 0;
  let updated = 0;

  for (const protocol of treatmentProtocols) {
    const existing = await prisma.treatmentProtocol.findFirst({
      where: {
        conditionIcd10: protocol.conditionIcd10,
        version: protocol.version,
      },
    });

    if (existing) {
      await prisma.treatmentProtocol.update({
        where: { id: existing.id },
        data: {
          conditionName: protocol.conditionName,
          guidelineSource: protocol.guidelineSource,
          guidelineUrl: protocol.guidelineUrl,
          guidelineCitation: protocol.guidelineCitation,
          eligibility: protocol.eligibility as unknown as object,
          recommendations: protocol.recommendations as unknown as object,
          isActive: true,
          updatedAt: new Date(),
        },
      });
      updated++;
    } else {
      await prisma.treatmentProtocol.create({
        data: {
          conditionIcd10: protocol.conditionIcd10,
          conditionName: protocol.conditionName,
          version: protocol.version,
          guidelineSource: protocol.guidelineSource,
          guidelineUrl: protocol.guidelineUrl,
          guidelineCitation: protocol.guidelineCitation,
          eligibility: protocol.eligibility as unknown as object,
          recommendations: protocol.recommendations as unknown as object,
          isActive: true,
          createdBy: 'seed-clinical-rules',
          approvedBy: 'clinical-review',
          approvedAt: new Date(),
        },
      });
      created++;
    }
  }

  console.log(`   ✅ Created ${created} treatment protocols`);
  console.log(`   ✅ Updated ${updated} treatment protocols`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🌱 Clinical Rules Seed - Law 1: Logic-as-Data Compliance');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    await seedSymptomDiagnosisMaps();
    console.log('');
    await seedTreatmentProtocols();
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Clinical rules seeding complete!');
    console.log('');
    console.log('Summary:');
    console.log(`   • ${symptomDiagnosisMaps.length} symptom-diagnosis mappings (50 chief complaints)`);
    console.log(`   • ${treatmentProtocols.length} treatment protocols (10 conditions)`);
    console.log('');
    console.log('The deterministic fallback now has meaningful clinical data.');
    console.log('═══════════════════════════════════════════════════════════════');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
