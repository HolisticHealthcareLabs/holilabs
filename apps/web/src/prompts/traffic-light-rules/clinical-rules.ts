/**
 * Clinical Traffic Light Rules (Prompt-Native)
 *
 * PROMPT-NATIVE ARCHITECTURE:
 * These rules are defined declaratively, not as TypeScript logic.
 * The engine compiles them into evaluators at runtime.
 *
 * To add a new rule:
 * 1. Add it to this file with all required fields
 * 2. No code changes needed - the engine will pick it up
 *
 * To modify a rule:
 * 1. Change the template here
 * 2. Version bump if changing behavior
 */

import { RuleTemplate } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// DRUG INTERACTION DATA (Embedded for offline evaluation)
// ═══════════════════════════════════════════════════════════════════════════

export const DRUG_INTERACTIONS = {
  lethal: [
    { drugs: ['warfarin', 'aspirin'], risk: 'Fatal bleeding' },
    { drugs: ['methotrexate', 'nsaid'], risk: 'Bone marrow suppression' },
    { drugs: ['maoi', 'ssri'], risk: 'Serotonin syndrome' },
    { drugs: ['digoxin', 'amiodarone'], risk: 'Fatal arrhythmia' },
    { drugs: ['lithium', 'nsaid'], risk: 'Lithium toxicity' },
    { drugs: ['simvastatin', 'clarithromycin'], risk: 'Rhabdomyolysis' },
    { drugs: ['metformin', 'iodinated contrast'], risk: 'Lactic acidosis' },
  ],
  severe: [
    { drugs: ['ace inhibitor', 'potassium'], risk: 'Hyperkalemia' },
    { drugs: ['beta blocker', 'verapamil'], risk: 'Bradycardia' },
    { drugs: ['fluoroquinolone', 'corticosteroid'], risk: 'Tendon rupture' },
    { drugs: ['ssri', 'tramadol'], risk: 'Seizure risk' },
    { drugs: ['benzodiazepine', 'opioid'], risk: 'Respiratory depression' },
  ],
  moderate: [
    { drugs: ['ace inhibitor', 'spironolactone'], risk: 'Hyperkalemia' },
    { drugs: ['metformin', 'alcohol'], risk: 'Hypoglycemia' },
    { drugs: ['ppi', 'clopidogrel'], risk: 'Reduced antiplatelet effect' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// ALLERGY CROSS-REACTIVITY DATA
// ═══════════════════════════════════════════════════════════════════════════

export const ALLERGY_GROUPS = {
  penicillins: ['penicillin', 'amoxicillin', 'ampicillin', 'piperacillin', 'oxacillin'],
  cephalosporins: ['cephalexin', 'ceftriaxone', 'cefazolin', 'cefepime', 'cefuroxime'],
  sulfonamides: ['sulfamethoxazole', 'sulfasalazine', 'sulfadiazine'],
  nsaids: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'ketorolac'],
  opioids: ['morphine', 'codeine', 'hydrocodone', 'oxycodone', 'fentanyl'],
  fluoroquinolones: ['ciprofloxacin', 'levofloxacin', 'moxifloxacin'],
  statins: ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin'],
};

// Cross-reactivity risk: penicillin allergy → 10% cephalosporin risk
export const CROSS_REACTIVITY = {
  penicillins: { cephalosporins: 0.1 }, // 10% cross-reactivity
  sulfonamides: { thiazides: 0.05 },
};

// ═══════════════════════════════════════════════════════════════════════════
// CLINICAL RULES (Prompt-Native)
// ═══════════════════════════════════════════════════════════════════════════

export const CLINICAL_RULES: RuleTemplate[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // ALLERGY: Direct Match (RED)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'ALLERGY_DIRECT_MATCH',
    name: 'Direct Allergy Match',
    version: '1.0.0',
    category: 'CLINICAL',
    defaultColor: 'RED',
    isActive: true,

    applicableActions: ['prescription', 'order'],
    requiredPayloadFields: ['medication'],

    conditionDescription: `
      Trigger RED when the prescribed medication directly matches a documented allergy.
      Matching is case-insensitive and includes generic/brand name variants.

      Examples:
      - Patient allergic to "Penicillin", prescribed "penicillin" → RED
      - Patient allergic to "Amoxicillin", prescribed "Amoxil" → RED (brand name)
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateDirectAllergyMatch',
    },

    dataDependencies: ['allergies', 'medications'],

    description: 'Patient has documented allergy to prescribed medication',
    descriptionPortuguese: 'Paciente tem alergia documentada ao medicamento prescrito',

    messageTemplate: 'ALLERGY ALERT: Patient is allergic to {{medication}}. Documented reaction: {{reaction}}',
    messageTemplatePortuguese: 'ALERTA DE ALERGIA: Paciente alérgico a {{medication}}. Reação documentada: {{reaction}}',

    regulatoryReference: 'ANVISA RDC 36/2013 (Patient Safety)',
    canOverride: false,
    overrideRequires: 'blocked',

    suggestedCorrectionTemplate: 'Select an alternative medication not in the allergy list. Consider: {{alternatives}}',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ALLERGY: Cross-Reactivity (RED)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'ALLERGY_CROSS_REACTIVITY',
    name: 'Cross-Reactive Allergy Risk',
    version: '1.0.0',
    category: 'CLINICAL',
    defaultColor: 'RED',
    isActive: true,

    applicableActions: ['prescription', 'order'],
    requiredPayloadFields: ['medication'],

    conditionDescription: `
      Trigger RED when prescribed medication belongs to a drug class with known
      cross-reactivity to a documented allergy.

      Examples:
      - Patient allergic to "Penicillin", prescribed "Amoxicillin" → RED (same class)
      - Patient allergic to "Penicillin", prescribed "Cephalexin" → RED (10% cross-reactivity)
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateCrossReactivity',
    },

    dataDependencies: ['allergies', 'medications'],

    description: 'Medication has cross-reactivity risk with documented allergy',
    descriptionPortuguese: 'Medicamento tem risco de reação cruzada com alergia documentada',

    messageTemplate: 'CROSS-REACTIVITY: {{medication}} has {{risk}}% cross-reactivity with {{allergen}} ({{group}} class)',
    messageTemplatePortuguese: 'REAÇÃO CRUZADA: {{medication}} tem {{risk}}% de reação cruzada com {{allergen}} (classe {{group}})',

    regulatoryReference: 'ANVISA RDC 36/2013 (Patient Safety)',
    canOverride: true,
    overrideRequires: 'supervisor',

    suggestedCorrectionTemplate: 'Consider alternative outside the {{group}} drug class. Options: {{alternatives}}',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DRUG INTERACTION: Lethal (RED)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INTERACTION_LETHAL',
    name: 'Lethal Drug Interaction',
    version: '1.0.0',
    category: 'CLINICAL',
    defaultColor: 'RED',
    isActive: true,

    applicableActions: ['prescription', 'order'],
    requiredPayloadFields: ['medication'],

    conditionDescription: `
      Trigger RED when prescribed medication has a known lethal interaction with
      patient's current medications.

      Lethal interactions include:
      - Warfarin + Aspirin → Fatal bleeding
      - Methotrexate + NSAID → Bone marrow suppression
      - MAO Inhibitor + SSRI → Serotonin syndrome
      - Digoxin + Amiodarone → Fatal arrhythmia
      - Lithium + NSAID → Lithium toxicity
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateDrugInteraction',
    },

    dataDependencies: ['medications'],

    description: 'Lethal drug-drug interaction detected',
    descriptionPortuguese: 'Interação medicamentosa letal detectada',

    messageTemplate: 'LETHAL INTERACTION: {{newDrug}} + {{currentDrug}} → {{risk}}',
    messageTemplatePortuguese: 'INTERAÇÃO LETAL: {{newDrug}} + {{currentDrug}} → {{risk}}',

    regulatoryReference: 'ANVISA RDC 36/2013 (Patient Safety)',
    canOverride: false,
    overrideRequires: 'blocked',

    suggestedCorrectionTemplate: 'STOP: This combination is contraindicated. Discontinue {{currentDrug}} before prescribing {{newDrug}}, or select alternative.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DRUG INTERACTION: Severe (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INTERACTION_SEVERE',
    name: 'Severe Drug Interaction',
    version: '1.0.0',
    category: 'CLINICAL',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['prescription', 'order'],
    requiredPayloadFields: ['medication'],

    conditionDescription: `
      Trigger YELLOW when prescribed medication has a severe (non-lethal) interaction.

      Severe interactions include:
      - ACE Inhibitor + Potassium → Hyperkalemia
      - Beta Blocker + Verapamil → Bradycardia
      - Fluoroquinolone + Corticosteroid → Tendon rupture
      - Benzodiazepine + Opioid → Respiratory depression
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateDrugInteraction',
    },

    dataDependencies: ['medications'],

    description: 'Severe drug-drug interaction requiring monitoring',
    descriptionPortuguese: 'Interação medicamentosa grave requerendo monitoramento',

    messageTemplate: 'SEVERE INTERACTION: {{newDrug}} + {{currentDrug}} → {{risk}}. Requires monitoring.',
    messageTemplatePortuguese: 'INTERAÇÃO GRAVE: {{newDrug}} + {{currentDrug}} → {{risk}}. Requer monitoramento.',

    regulatoryReference: 'ANVISA RDC 36/2013 (Patient Safety)',
    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'If proceeding, ensure monitoring for {{risk}}. Consider dose adjustment or alternative therapy.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DRUG INTERACTION: Moderate (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'INTERACTION_MODERATE',
    name: 'Moderate Drug Interaction',
    version: '1.0.0',
    category: 'CLINICAL',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['prescription', 'order'],
    requiredPayloadFields: ['medication'],

    conditionDescription: `
      Trigger YELLOW when prescribed medication has a moderate interaction.

      Moderate interactions include:
      - ACE Inhibitor + Spironolactone → Hyperkalemia risk
      - Metformin + Alcohol → Hypoglycemia risk
      - PPI + Clopidogrel → Reduced antiplatelet effect
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateDrugInteraction',
    },

    dataDependencies: ['medications'],

    description: 'Moderate drug-drug interaction detected',
    descriptionPortuguese: 'Interação medicamentosa moderada detectada',

    messageTemplate: 'MODERATE INTERACTION: {{newDrug}} + {{currentDrug}} → {{risk}}.',
    messageTemplatePortuguese: 'INTERAÇÃO MODERADA: {{newDrug}} + {{currentDrug}} → {{risk}}.',

    regulatoryReference: 'ANVISA RDC 36/2013 (Patient Safety)',
    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Document awareness of interaction. Consider monitoring or timing adjustments.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RENAL: Contraindication (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CONTRAINDICATION_RENAL',
    name: 'Renal Contraindication',
    version: '1.0.0',
    category: 'CLINICAL',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['prescription', 'order'],
    requiredPayloadFields: ['medication'],

    conditionDescription: `
      Trigger YELLOW when prescribed medication requires renal dose adjustment
      and patient has impaired renal function (eGFR < 60).

      Nephrotoxic medications include: aminoglycosides, vancomycin, NSAIDs,
      metformin, lithium, ACE inhibitors.
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateRenalContraindication',
    },

    dataDependencies: ['renalFunction', 'medications'],

    description: 'Renal dose adjustment required for medication',
    descriptionPortuguese: 'Ajuste de dose renal necessário para o medicamento',

    messageTemplate: 'RENAL ALERT: {{medication}} requires dose adjustment. Patient eGFR: {{eGFR}} mL/min. Recommend: {{adjustment}}',
    messageTemplatePortuguese: 'ALERTA RENAL: {{medication}} requer ajuste de dose. eGFR do paciente: {{eGFR}} mL/min. Recomendação: {{adjustment}}',

    regulatoryReference: 'ANVISA RDC 36/2013 (Patient Safety)',
    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Adjust dose based on renal function. eGFR {{eGFR}}: recommend {{adjustment}}',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AGE: Pediatric Contraindication (YELLOW)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CONTRAINDICATION_AGE_PEDIATRIC',
    name: 'Pediatric Contraindication',
    version: '1.0.0',
    category: 'CLINICAL',
    defaultColor: 'YELLOW',
    isActive: true,

    applicableActions: ['prescription', 'order'],
    requiredPayloadFields: ['medication'],

    conditionDescription: `
      Trigger YELLOW when prescribed medication is contraindicated in pediatric
      patients and patient is under 18 years old.

      Pediatric contraindications include: tetracyclines (< 8yo), fluoroquinolones,
      aspirin (Reye's syndrome risk).
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluateAgeContraindication',
    },

    dataDependencies: ['age', 'medications'],

    description: 'Medication not recommended for pediatric patients',
    descriptionPortuguese: 'Medicamento não recomendado para pacientes pediátricos',

    messageTemplate: 'PEDIATRIC ALERT: {{medication}} contraindicated for patient age {{age}}. Reason: {{reason}}',
    messageTemplatePortuguese: 'ALERTA PEDIÁTRICO: {{medication}} contraindicado para idade {{age}}. Razão: {{reason}}',

    regulatoryReference: 'ANVISA RDC 36/2013 (Patient Safety)',
    canOverride: true,
    overrideRequires: 'justification',

    suggestedCorrectionTemplate: 'Select pediatric-appropriate alternative. Consider: {{alternatives}}',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PREGNANCY: Category X (RED)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CONTRAINDICATION_PREGNANCY',
    name: 'Pregnancy Category X',
    version: '1.0.0',
    category: 'CLINICAL',
    defaultColor: 'RED',
    isActive: true,

    applicableActions: ['prescription', 'order'],
    requiredPayloadFields: ['medication'],

    conditionDescription: `
      Trigger RED when prescribed medication is FDA Pregnancy Category X
      and patient is pregnant or of childbearing potential.

      Category X medications include: isotretinoin, thalidomide, warfarin,
      methotrexate, finasteride, statins.
    `,

    conditionLogic: {
      type: 'function-name',
      value: 'evaluatePregnancyContraindication',
    },

    dataDependencies: ['pregnancy', 'medications'],

    description: 'Medication contraindicated in pregnancy (Category X)',
    descriptionPortuguese: 'Medicamento contraindicado na gravidez (Categoria X)',

    messageTemplate: 'PREGNANCY CONTRAINDICATION: {{medication}} is Category X - contraindicated in pregnancy.',
    messageTemplatePortuguese: 'CONTRAINDICAÇÃO NA GRAVIDEZ: {{medication}} é Categoria X - contraindicado na gravidez.',

    regulatoryReference: 'ANVISA RDC 36/2013 (Patient Safety), FDA Pregnancy Categories',
    canOverride: false,
    overrideRequires: 'blocked',

    suggestedCorrectionTemplate: 'STOP: Select pregnancy-safe alternative. Verify pregnancy status before proceeding.',
  },
];

export default CLINICAL_RULES;
