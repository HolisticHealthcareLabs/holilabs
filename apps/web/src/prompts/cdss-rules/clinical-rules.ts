/**
 * CDSS Clinical Rules (Prompt-Native)
 *
 * Declarative rule templates for clinical decision support.
 * Rules are defined in templates and compiled at runtime.
 *
 * Rules included:
 * 1. Drug Interactions - Major drug-drug interactions
 * 2. Sepsis Risk - qSOFA score calculation
 * 3. Cardiac Risk - Hypertension detection
 * 4. Abnormal Labs - Critical lab values
 * 5. Polypharmacy - >10 active medications
 * 6. Renal Dosing - Nephrotoxic drug monitoring
 * 7. Anticoagulation Monitoring - Warfarin + INR
 * 8. Chronic Disease Gaps - Treatment gaps
 * 9. Duplicate Therapy - Same-class medications
 * 10. Lab Monitoring - Medication-specific lab monitoring
 *
 * @module prompts/cdss-rules/clinical-rules
 */

import type { CDSSRuleTemplate, DrugInteraction, DrugClass, LabMonitoringRequirement } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// EMBEDDED DATA: Drug Interactions
// ═══════════════════════════════════════════════════════════════════════════

export const DRUG_INTERACTIONS: DrugInteraction[] = [
  // Critical interactions
  { drug1: 'warfarin', drug2: 'aspirin', risk: 'Increased bleeding risk', priority: 'critical' },
  { drug1: 'simvastatin', drug2: 'clarithromycin', risk: 'Rhabdomyolysis risk', priority: 'critical' },
  { drug1: 'methotrexate', drug2: 'nsaid', risk: 'Severe methotrexate toxicity', priority: 'critical' },
  { drug1: 'maoi', drug2: 'ssri', risk: 'Serotonin syndrome', priority: 'critical' },
  { drug1: 'digoxin', drug2: 'amiodarone', risk: 'Digoxin toxicity', priority: 'critical' },

  // High-priority interactions
  { drug1: 'warfarin', drug2: 'ibuprofen', risk: 'Increased bleeding risk', priority: 'high' },
  { drug1: 'metformin', drug2: 'alcohol', risk: 'Lactic acidosis risk', priority: 'high' },
  { drug1: 'lisinopril', drug2: 'spironolactone', risk: 'Hyperkalemia risk', priority: 'high' },
  { drug1: 'lithium', drug2: 'nsaid', risk: 'Lithium toxicity', priority: 'high' },
  { drug1: 'atorvastatin', drug2: 'gemfibrozil', risk: 'Myopathy risk', priority: 'high' },
  { drug1: 'ciprofloxacin', drug2: 'theophylline', risk: 'Theophylline toxicity', priority: 'high' },
  { drug1: 'fluconazole', drug2: 'warfarin', risk: 'Increased bleeding risk', priority: 'high' },
  { drug1: 'metronidazole', drug2: 'warfarin', risk: 'Increased bleeding risk', priority: 'high' },
  { drug1: 'potassium', drug2: 'spironolactone', risk: 'Severe hyperkalemia', priority: 'high' },
  { drug1: 'sildenafil', drug2: 'nitrate', risk: 'Severe hypotension', priority: 'critical' },
];

// ═══════════════════════════════════════════════════════════════════════════
// EMBEDDED DATA: Drug Classes for Duplicate Therapy
// ═══════════════════════════════════════════════════════════════════════════

export const DRUG_CLASSES: DrugClass[] = [
  { name: 'statins', drugs: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin'] },
  { name: 'PPIs', drugs: ['omeprazole', 'pantoprazole', 'esomeprazole', 'lansoprazole', 'rabeprazole'] },
  { name: 'ACE inhibitors', drugs: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'benazepril'] },
  { name: 'ARBs', drugs: ['losartan', 'valsartan', 'irbesartan', 'olmesartan', 'candesartan'] },
  { name: 'beta blockers', drugs: ['metoprolol', 'atenolol', 'carvedilol', 'propranolol', 'bisoprolol'] },
  { name: 'SSRIs', drugs: ['sertraline', 'fluoxetine', 'paroxetine', 'citalopram', 'escitalopram'] },
  { name: 'benzodiazepines', drugs: ['lorazepam', 'alprazolam', 'diazepam', 'clonazepam', 'temazepam'] },
  { name: 'opioids', drugs: ['hydrocodone', 'oxycodone', 'morphine', 'fentanyl', 'tramadol'] },
];

// ═══════════════════════════════════════════════════════════════════════════
// EMBEDDED DATA: Lab Monitoring Requirements
// ═══════════════════════════════════════════════════════════════════════════

export const LAB_MONITORING: LabMonitoringRequirement[] = [
  {
    drugs: ['warfarin'],
    tests: ['inr', 'pt'],
    intervalDays: 30,
    reason: 'INR monitoring for anticoagulation safety',
  },
  {
    drugs: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'],
    tests: ['alt', 'ast', 'liver'],
    intervalDays: 365,
    reason: 'Liver function monitoring for statin hepatotoxicity',
  },
  {
    drugs: ['metformin', 'lisinopril', 'nsaid', 'gentamicin', 'vancomycin'],
    tests: ['creatinine', 'gfr', 'egfr'],
    intervalDays: 180,
    reason: 'Renal function monitoring for nephrotoxic medications',
  },
  {
    drugs: ['lithium'],
    tests: ['lithium', 'tsh', 'creatinine'],
    intervalDays: 90,
    reason: 'Lithium level and thyroid/renal monitoring',
  },
  {
    drugs: ['digoxin'],
    tests: ['digoxin', 'potassium', 'creatinine'],
    intervalDays: 90,
    reason: 'Digoxin level and electrolyte monitoring',
  },
  {
    drugs: ['methotrexate'],
    tests: ['cbc', 'liver', 'creatinine'],
    intervalDays: 90,
    reason: 'Monitoring for methotrexate toxicity',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// EMBEDDED DATA: Nephrotoxic Medications
// ═══════════════════════════════════════════════════════════════════════════

export const NEPHROTOXIC_DRUGS = [
  'metformin', 'nsaid', 'ibuprofen', 'naproxen', 'lisinopril', 'enalapril',
  'gentamicin', 'vancomycin', 'amphotericin', 'acyclovir', 'lithium',
];

// ═══════════════════════════════════════════════════════════════════════════
// EMBEDDED DATA: Hypertension Medications
// ═══════════════════════════════════════════════════════════════════════════

export const HYPERTENSION_DRUGS = [
  'lisinopril', 'amlodipine', 'losartan', 'hydrochlorothiazide', 'metoprolol',
  'atenolol', 'valsartan', 'enalapril', 'nifedipine', 'diltiazem',
];

// ═══════════════════════════════════════════════════════════════════════════
// EMBEDDED DATA: Diabetes Medications
// ═══════════════════════════════════════════════════════════════════════════

export const DIABETES_DRUGS = [
  'metformin', 'insulin', 'glipizide', 'glyburide', 'semaglutide',
  'ozempic', 'januvia', 'sitagliptin', 'empagliflozin', 'jardiance',
];

// ═══════════════════════════════════════════════════════════════════════════
// CLINICAL RULE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const CLINICAL_RULES: CDSSRuleTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Rule 1: Drug Interactions
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'DRUG_INTERACTION',
    name: 'Drug Interaction Warning',
    version: '1.0.0',
    isActive: true,

    insightType: 'interaction_warning',
    defaultPriority: 'high',
    category: 'clinical',

    description: 'Detects major drug-drug interactions that may cause harm',
    descriptionPortuguese: 'Detecta interacoes medicamentosas importantes que podem causar danos',

    titleTemplate: 'Drug Interaction Warning',
    messageTemplate: '{{patientName}}: {{drug1}} interacts with {{drug2}}. {{risk}} detected.',
    messageTemplatePortuguese: '{{patientName}}: {{drug1}} interage com {{drug2}}. {{risk}} detectado.',

    defaultConfidence: 95,

    evidence: [
      {
        source: 'FDA Drug Safety Database',
        citation: 'Major drug-drug interaction alert',
      },
    ],

    actionable: true,
    actions: [
      {
        label: 'Adjust Dosage',
        type: 'primary',
        actionType: 'adjust_medication',
        metadataTemplate: { patientId: '{{patientId}}', drug1: '{{drug1}}', drug2: '{{drug2}}' },
      },
      {
        label: 'View Interactions',
        type: 'secondary',
        actionType: 'view_patient',
        metadataTemplate: { patientId: '{{patientId}}' },
      },
    ],

    dataDependencies: ['medications'],

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateDrugInteractions',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rule 2: Sepsis Risk (qSOFA)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'SEPSIS_RISK',
    name: 'Sepsis Risk Alert',
    version: '1.0.0',
    isActive: true,

    insightType: 'risk_alert',
    defaultPriority: 'critical',
    category: 'clinical',

    description: 'Calculates qSOFA score to detect high sepsis risk',
    descriptionPortuguese: 'Calcula pontuacao qSOFA para detectar alto risco de sepse',

    titleTemplate: 'High Sepsis Risk Detected',
    messageTemplate: '{{patientName}} shows signs of sepsis (qSOFA {{qSofaScore}}/3): {{criteria}}. Immediate evaluation recommended.',
    messageTemplatePortuguese: '{{patientName}} apresenta sinais de sepse (qSOFA {{qSofaScore}}/3): {{criteria}}. Avaliacao imediata recomendada.',

    defaultConfidence: 85,

    evidence: [
      {
        source: 'Seymour et al.',
        citation: 'JAMA 2016 - qSOFA Score for Sepsis Prediction',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26903338/',
      },
    ],

    actionable: true,
    actions: [
      {
        label: 'Start Sepsis Protocol',
        type: 'primary',
        actionType: 'start_protocol',
        metadataTemplate: { patientId: '{{patientId}}', protocol: 'sepsis' },
      },
      {
        label: 'Review Details',
        type: 'secondary',
        actionType: 'view_patient',
        metadataTemplate: { patientId: '{{patientId}}' },
      },
    ],

    dataDependencies: ['vitals'],

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateSepsisRisk',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rule 3: Cardiac Risk (Hypertension)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'HYPERTENSION_UNTREATED',
    name: 'Untreated Hypertension',
    version: '1.0.0',
    isActive: true,

    insightType: 'recommendation',
    defaultPriority: 'high',
    category: 'clinical',

    description: 'Detects Stage 2 hypertension without pharmacologic treatment',
    descriptionPortuguese: 'Detecta hipertensao estagio 2 sem tratamento farmacologico',

    titleTemplate: 'Hypertension Management Needed',
    messageTemplate: '{{patientName}}: BP {{systolic}}/{{diastolic}} mmHg (Stage 2 Hypertension). Consider pharmacologic treatment.',
    messageTemplatePortuguese: '{{patientName}}: PA {{systolic}}/{{diastolic}} mmHg (Hipertensao Estagio 2). Considere tratamento farmacologico.',

    defaultConfidence: 90,

    evidence: [
      {
        source: 'ACC/AHA 2017',
        citation: 'Guideline for the Prevention, Detection, Evaluation, and Management of High Blood Pressure',
      },
    ],

    actionable: true,
    actions: [
      {
        label: 'Start Treatment',
        type: 'primary',
        actionType: 'prescribe_medication',
        metadataTemplate: { patientId: '{{patientId}}', condition: 'hypertension' },
      },
    ],

    dataDependencies: ['vitals', 'medications'],

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateHypertension',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rule 4: Critical Lab Results
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CRITICAL_LAB',
    name: 'Critical Lab Result',
    version: '1.0.0',
    isActive: true,

    insightType: 'risk_alert',
    defaultPriority: 'critical',
    category: 'clinical',

    description: 'Alerts on critical lab values requiring immediate attention',
    descriptionPortuguese: 'Alerta sobre valores laboratoriais criticos que requerem atencao imediata',

    titleTemplate: 'Critical Lab Result',
    messageTemplate: '{{patientName}}: {{testName}} is {{value}} {{unit}} (Reference: {{referenceRange}}). Immediate attention required.',
    messageTemplatePortuguese: '{{patientName}}: {{testName}} esta {{value}} {{unit}} (Referencia: {{referenceRange}}). Atencao imediata necessaria.',

    defaultConfidence: 99,

    actionable: true,
    actions: [
      {
        label: 'Review Result',
        type: 'primary',
        actionType: 'view_lab',
        metadataTemplate: { patientId: '{{patientId}}', testName: '{{testName}}' },
      },
    ],

    dataDependencies: ['labResults'],

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateCriticalLabs',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rule 5: Polypharmacy Alert
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'POLYPHARMACY',
    name: 'Polypharmacy Alert',
    version: '1.0.0',
    isActive: true,

    insightType: 'recommendation',
    defaultPriority: 'medium',
    category: 'clinical',

    description: 'Alerts when patient has 10 or more active medications',
    descriptionPortuguese: 'Alerta quando paciente tem 10 ou mais medicamentos ativos',

    titleTemplate: 'Polypharmacy Alert',
    messageTemplate: '{{patientName}} is on {{medicationCount}} active medications. Consider medication reconciliation to reduce adverse drug events and improve adherence.',
    messageTemplatePortuguese: '{{patientName}} esta usando {{medicationCount}} medicamentos ativos. Considere reconciliacao medicamentosa para reduzir eventos adversos e melhorar adesao.',

    defaultConfidence: 88,

    evidence: [
      {
        source: 'Masnoon et al.',
        citation: 'BMC Geriatrics 2017 - Polypharmacy and Adverse Outcomes',
      },
    ],

    actionable: true,
    actions: [
      {
        label: 'Review Medications',
        type: 'primary',
        actionType: 'view_medications',
        metadataTemplate: { patientId: '{{patientId}}' },
      },
    ],

    dataDependencies: ['medications'],

    conditionLogic: {
      type: 'function-name',
      value: 'evaluatePolypharmacy',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rule 6: Renal Function Monitoring
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'RENAL_MONITORING',
    name: 'Renal Function Monitoring Required',
    version: '1.0.0',
    isActive: true,

    insightType: 'recommendation',
    defaultPriority: 'high',
    category: 'clinical',

    description: 'Alerts when nephrotoxic medications lack recent renal function testing',
    descriptionPortuguese: 'Alerta quando medicamentos nefrotoxicos estao sem teste de funcao renal recente',

    titleTemplate: 'Renal Function Monitoring Required',
    messageTemplate: '{{patientName}} is on nephrotoxic medications without recent renal function testing. Order creatinine/GFR to ensure safe dosing.',
    messageTemplatePortuguese: '{{patientName}} esta usando medicamentos nefrotoxicos sem teste de funcao renal recente. Solicite creatinina/TFG para garantir dosagem segura.',

    defaultConfidence: 92,

    evidence: [
      {
        source: 'KDIGO 2012',
        citation: 'Clinical Practice Guideline for the Evaluation and Management of CKD',
      },
    ],

    actionable: true,
    actions: [
      {
        label: 'Order Creatinine',
        type: 'primary',
        actionType: 'order_lab',
        metadataTemplate: { patientId: '{{patientId}}', test: 'Creatinine' },
      },
    ],

    dataDependencies: ['medications', 'labResults'],

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateRenalMonitoring',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rule 7: INR Monitoring (Warfarin)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INR_MONITORING',
    name: 'INR Monitoring Alert',
    version: '1.0.0',
    isActive: true,

    insightType: 'risk_alert',
    defaultPriority: 'high',
    category: 'clinical',

    description: 'Monitors INR for patients on warfarin therapy',
    descriptionPortuguese: 'Monitora INR para pacientes em terapia com varfarina',

    titleTemplate: 'INR Monitoring {{status}}',
    messageTemplate: '{{patientName}} {{message}}',
    messageTemplatePortuguese: '{{patientName}} {{messagePortuguese}}',

    defaultConfidence: 95,

    evidence: [
      {
        source: 'AHA/ACC 2019',
        citation: 'Management of Anticoagulation in Atrial Fibrillation',
      },
    ],

    actionable: true,
    actions: [
      {
        label: '{{actionLabel}}',
        type: 'primary',
        actionType: 'order_lab',
        metadataTemplate: { patientId: '{{patientId}}', test: 'INR' },
      },
    ],

    dataDependencies: ['medications', 'labResults'],

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateInrMonitoring',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rule 8: Diabetes Treatment Gap
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'DIABETES_TREATMENT_GAP',
    name: 'Diabetes Treatment Gap',
    version: '1.0.0',
    isActive: true,

    insightType: 'recommendation',
    defaultPriority: 'high',
    category: 'clinical',

    description: 'Detects diabetes diagnosis without current diabetes medications',
    descriptionPortuguese: 'Detecta diagnostico de diabetes sem medicamentos atuais para diabetes',

    titleTemplate: 'Diabetes Treatment Gap',
    messageTemplate: '{{patientName}} has diabetes diagnosis but no current diabetes medications. Consider pharmacologic treatment to reduce complications.',
    messageTemplatePortuguese: '{{patientName}} tem diagnostico de diabetes mas nenhum medicamento atual para diabetes. Considere tratamento farmacologico para reduzir complicacoes.',

    defaultConfidence: 90,

    evidence: [
      {
        source: 'ADA 2024',
        citation: 'Standards of Medical Care in Diabetes',
      },
    ],

    actionable: true,
    actions: [
      {
        label: 'Start Treatment',
        type: 'primary',
        actionType: 'prescribe_medication',
        metadataTemplate: { patientId: '{{patientId}}', condition: 'diabetes' },
      },
    ],

    dataDependencies: ['diagnoses', 'medications'],

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateDiabetesTreatmentGap',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rule 9: Duplicate Therapy
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'DUPLICATE_THERAPY',
    name: 'Duplicate Therapy Detected',
    version: '1.0.0',
    isActive: true,

    insightType: 'recommendation',
    defaultPriority: 'medium',
    category: 'clinical',

    description: 'Detects multiple medications from the same drug class',
    descriptionPortuguese: 'Detecta multiplos medicamentos da mesma classe farmacologica',

    titleTemplate: 'Duplicate Therapy Detected',
    messageTemplate: '{{patientName}} is on multiple medications from the same class ({{className}}): {{medications}}. Consider consolidating therapy.',
    messageTemplatePortuguese: '{{patientName}} esta usando multiplos medicamentos da mesma classe ({{className}}): {{medications}}. Considere consolidar terapia.',

    defaultConfidence: 94,

    actionable: true,
    actions: [
      {
        label: 'Review Medications',
        type: 'primary',
        actionType: 'view_medications',
        metadataTemplate: { patientId: '{{patientId}}', className: '{{className}}' },
      },
    ],

    dataDependencies: ['medications'],

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateDuplicateTherapy',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rule 10: Statin Liver Monitoring
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'STATIN_MONITORING',
    name: 'Statin Monitoring Required',
    version: '1.0.0',
    isActive: true,

    insightType: 'recommendation',
    defaultPriority: 'medium',
    category: 'clinical',

    description: 'Alerts when statin therapy lacks recent liver function testing',
    descriptionPortuguese: 'Alerta quando terapia com estatina esta sem teste de funcao hepatica recente',

    titleTemplate: 'Statin Monitoring Required',
    messageTemplate: '{{patientName}} is on statin therapy without recent liver function testing. Annual monitoring recommended to detect hepatotoxicity.',
    messageTemplatePortuguese: '{{patientName}} esta em terapia com estatina sem teste de funcao hepatica recente. Monitoramento anual recomendado para detectar hepatotoxicidade.',

    defaultConfidence: 88,

    evidence: [
      {
        source: 'ACC/AHA 2018',
        citation: 'Guideline on the Management of Blood Cholesterol',
      },
    ],

    actionable: true,
    actions: [
      {
        label: 'Order LFTs',
        type: 'primary',
        actionType: 'order_lab',
        metadataTemplate: { patientId: '{{patientId}}', test: 'Liver Function Tests' },
      },
    ],

    dataDependencies: ['medications', 'labResults'],

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateStatinMonitoring',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rule 11: Diabetes Screening
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'DIABETES_SCREENING',
    name: 'Diabetes Screening Recommended',
    version: '1.0.0',
    isActive: true,

    insightType: 'diagnostic_support',
    defaultPriority: 'medium',
    category: 'clinical',

    description: 'Recommends diabetes screening for patients with risk factors',
    descriptionPortuguese: 'Recomenda triagem de diabetes para pacientes com fatores de risco',

    titleTemplate: 'Diabetes Screening Recommended',
    messageTemplate: '{{patientName}}: Risk factors present ({{riskFactors}}). Consider HbA1c screening.',
    messageTemplatePortuguese: '{{patientName}}: Fatores de risco presentes ({{riskFactors}}). Considere triagem de HbA1c.',

    defaultConfidence: 82,

    evidence: [
      {
        source: 'ADA 2024',
        citation: 'Standards of Medical Care in Diabetes',
      },
    ],

    actionable: true,
    actions: [
      {
        label: 'Order HbA1c',
        type: 'primary',
        actionType: 'order_lab',
        metadataTemplate: { patientId: '{{patientId}}', test: 'HbA1c' },
      },
    ],

    dataDependencies: ['diagnoses', 'labResults'],

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateDiabetesScreening',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Rule 12: Preventive Care (Wellness Visit)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'WELLNESS_VISIT_DUE',
    name: 'Annual Wellness Visit Overdue',
    version: '1.0.0',
    isActive: true,

    insightType: 'recommendation',
    defaultPriority: 'low',
    category: 'operational',

    description: 'Alerts when patient is overdue for annual wellness visit',
    descriptionPortuguese: 'Alerta quando paciente esta atrasado para visita anual de bem-estar',

    titleTemplate: 'Annual Wellness Visit Overdue',
    messageTemplate: '{{patientName}} is due for annual wellness visit (last visit: {{lastVisit}}). Early scheduling improves outcomes.',
    messageTemplatePortuguese: '{{patientName}} deve fazer visita anual de bem-estar (ultima visita: {{lastVisit}}). Agendamento antecipado melhora resultados.',

    defaultConfidence: 100,

    actionable: true,
    actions: [
      {
        label: 'Schedule Visit',
        type: 'primary',
        actionType: 'schedule_appointment',
        metadataTemplate: { patientId: '{{patientId}}', type: 'wellness' },
      },
    ],

    dataDependencies: ['lastVisit'],

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateWellnessVisit',
    },
  },
];
