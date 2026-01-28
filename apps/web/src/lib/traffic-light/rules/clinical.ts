/**
 * Clinical Rules
 *
 * Drug interactions, allergies, and clinical guidelines.
 * These rules protect patient safety and are the highest priority.
 *
 * Rule Categories:
 * - ALLERGY_* : Medication allergy checks
 * - INTERACTION_* : Drug-drug interaction checks
 * - CONTRAINDICATION_* : Condition-based contraindications
 * - DOSAGE_* : Dosage limit checks
 *
 * @module lib/traffic-light/rules/clinical
 */

import type {
  RuleDefinition,
  EvaluationContext,
  PatientContext,
  TrafficLightSignal,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// DRUG INTERACTION DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

interface DrugInteraction {
  drug1: string[];
  drug2: string[];
  severity: 'LETHAL' | 'SEVERE' | 'MODERATE' | 'MILD';
  description: string;
  descriptionPortuguese: string;
  mechanism?: string;
}

const DRUG_INTERACTIONS: DrugInteraction[] = [
  {
    drug1: ['warfarin', 'coumadin'],
    drug2: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac'],
    severity: 'SEVERE',
    description: 'Increased bleeding risk - anticoagulant with NSAID',
    descriptionPortuguese: 'Risco aumentado de sangramento - anticoagulante com AINE',
    mechanism: 'Both affect platelet function and bleeding time',
  },
  {
    drug1: ['methotrexate'],
    drug2: ['trimethoprim', 'bactrim', 'sulfamethoxazole'],
    severity: 'LETHAL',
    description: 'Potentially lethal interaction - bone marrow suppression',
    descriptionPortuguese: 'Interacao potencialmente letal - supressao da medula ossea',
    mechanism: 'Both inhibit folate metabolism',
  },
  {
    drug1: ['maoi', 'phenelzine', 'tranylcypromine', 'isocarboxazid'],
    drug2: ['ssri', 'fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram'],
    severity: 'LETHAL',
    description: 'Serotonin syndrome risk - potentially fatal',
    descriptionPortuguese: 'Risco de sindrome serotoninergica - potencialmente fatal',
    mechanism: 'Excessive serotonin accumulation',
  },
  {
    drug1: ['digoxin', 'lanoxin'],
    drug2: ['amiodarone', 'verapamil', 'quinidine'],
    severity: 'SEVERE',
    description: 'Digoxin toxicity risk - arrhythmia danger',
    descriptionPortuguese: 'Risco de toxicidade por digoxina - perigo de arritmia',
    mechanism: 'Increased digoxin levels',
  },
  {
    drug1: ['metformin'],
    drug2: ['contrast', 'iodinated contrast', 'gadolinium'],
    severity: 'MODERATE',
    description: 'Lactic acidosis risk with contrast - hold metformin 48h',
    descriptionPortuguese: 'Risco de acidose latica com contraste - suspender metformina 48h',
    mechanism: 'Renal function impairment',
  },
  {
    drug1: ['sildenafil', 'viagra', 'tadalafil', 'cialis', 'vardenafil'],
    drug2: ['nitrate', 'nitroglycerin', 'isosorbide'],
    severity: 'LETHAL',
    description: 'Severe hypotension risk - potentially fatal',
    descriptionPortuguese: 'Risco de hipotensao grave - potencialmente fatal',
    mechanism: 'Synergistic vasodilation',
  },
  {
    drug1: ['lithium'],
    drug2: ['ace inhibitor', 'lisinopril', 'enalapril', 'ramipril', 'nsaid', 'ibuprofen'],
    severity: 'SEVERE',
    description: 'Lithium toxicity risk - monitor levels closely',
    descriptionPortuguese: 'Risco de toxicidade por litio - monitorar niveis',
    mechanism: 'Reduced lithium clearance',
  },
  {
    drug1: ['potassium', 'kcl', 'potassium chloride'],
    drug2: ['spironolactone', 'aldactone', 'ace inhibitor', 'lisinopril', 'enalapril'],
    severity: 'SEVERE',
    description: 'Hyperkalemia risk - cardiac arrhythmia danger',
    descriptionPortuguese: 'Risco de hipercalemia - perigo de arritmia cardiaca',
    mechanism: 'Potassium retention',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ALLERGY CROSS-REACTIVITY
// ═══════════════════════════════════════════════════════════════════════════════

interface AllergyGroup {
  name: string;
  members: string[];
  crossReactivity: number; // 0-100%
}

const ALLERGY_GROUPS: AllergyGroup[] = [
  {
    name: 'Penicillins',
    members: ['penicillin', 'amoxicillin', 'ampicillin', 'piperacillin', 'nafcillin'],
    crossReactivity: 100,
  },
  {
    name: 'Cephalosporins (1st gen)',
    members: ['cephalexin', 'cefazolin', 'cefadroxil'],
    crossReactivity: 10, // ~10% cross-reactivity with penicillin
  },
  {
    name: 'Sulfonamides',
    members: ['sulfamethoxazole', 'bactrim', 'sulfasalazine', 'sulfadiazine'],
    crossReactivity: 100,
  },
  {
    name: 'NSAIDs',
    members: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'ketorolac', 'meloxicam'],
    crossReactivity: 50,
  },
  {
    name: 'Opioids',
    members: ['morphine', 'codeine', 'hydrocodone', 'oxycodone', 'fentanyl', 'tramadol'],
    crossReactivity: 30,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function normalizedrugName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function drugsMatch(drug1: string, drugList: string[]): boolean {
  const normalized = normalizedrugName(drug1);
  return drugList.some((d) => normalizedrugName(d) === normalized || normalized.includes(normalizedrugName(d)));
}

function checkInteraction(
  newMed: string,
  currentMeds: string[]
): DrugInteraction | null {
  const normalizedNew = normalizedrugName(newMed);

  for (const interaction of DRUG_INTERACTIONS) {
    const newInDrug1 = interaction.drug1.some((d) => normalizedNew.includes(normalizedrugName(d)));
    const newInDrug2 = interaction.drug2.some((d) => normalizedNew.includes(normalizedrugName(d)));

    for (const currentMed of currentMeds) {
      const normalizedCurrent = normalizedrugName(currentMed);
      const currentInDrug1 = interaction.drug1.some((d) => normalizedCurrent.includes(normalizedrugName(d)));
      const currentInDrug2 = interaction.drug2.some((d) => normalizedCurrent.includes(normalizedrugName(d)));

      if ((newInDrug1 && currentInDrug2) || (newInDrug2 && currentInDrug1)) {
        return interaction;
      }
    }
  }

  return null;
}

function checkAllergyMatch(
  newMed: string,
  allergies: PatientContext['allergies']
): { matched: boolean; allergen?: string; severity?: string; crossReactivity?: boolean } {
  if (!allergies || allergies.length === 0) return { matched: false };

  const normalizedNew = normalizedrugName(newMed);

  for (const allergy of allergies) {
    if (allergy.type !== 'MEDICATION') continue;

    const normalizedAllergen = normalizedrugName(allergy.allergen);

    // Direct match
    if (normalizedNew.includes(normalizedAllergen) || normalizedAllergen.includes(normalizedNew)) {
      return {
        matched: true,
        allergen: allergy.allergen,
        severity: allergy.severity,
        crossReactivity: false,
      };
    }

    // Check cross-reactivity within allergy groups
    for (const group of ALLERGY_GROUPS) {
      const allergenInGroup = group.members.some((m) => normalizedAllergen.includes(normalizedrugName(m)));
      const newMedInGroup = group.members.some((m) => normalizedNew.includes(normalizedrugName(m)));

      if (allergenInGroup && newMedInGroup && group.crossReactivity > 0) {
        return {
          matched: true,
          allergen: allergy.allergen,
          severity: allergy.severity,
          crossReactivity: true,
        };
      }
    }
  }

  return { matched: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLINICAL RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const clinicalRules: RuleDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // ALLERGY RULES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'ALLERGY_DIRECT_MATCH',
    name: 'Direct Medication Allergy',
    category: 'CLINICAL',
    defaultColor: 'RED',
    isActive: true,
    description: 'Patient has documented allergy to this medication',
    descriptionPortuguese: 'Paciente tem alergia documentada a este medicamento',
    regulatoryReference: 'ANVISA RDC 36/2013 - Patient Safety',
    correctionTemplate: 'Consider alternative medication. Document clinical justification if proceeding.',
    correctionTemplatePortuguese: 'Considerar medicamento alternativo. Documentar justificativa clinica se prosseguir.',

    async evaluate(context, patientContext): Promise<TrafficLightSignal | null> {
      const medication = context.payload.medication;
      if (!medication?.name) return null;

      const allergyCheck = checkAllergyMatch(medication.name, patientContext.allergies);

      if (allergyCheck.matched && !allergyCheck.crossReactivity) {
        const isSevere = allergyCheck.severity === 'SEVERE';

        return {
          ruleId: isSevere ? 'ALLERGY_SEVERE_DIRECT' : 'ALLERGY_DIRECT_MATCH',
          ruleName: isSevere ? 'Severe Medication Allergy' : 'Direct Medication Allergy',
          category: 'CLINICAL',
          color: 'RED',
          message: `Patient has ${allergyCheck.severity?.toLowerCase()} documented allergy to ${allergyCheck.allergen}`,
          messagePortuguese: `Paciente tem alergia ${allergyCheck.severity?.toLowerCase()} documentada a ${allergyCheck.allergen}`,
          regulatoryReference: 'ANVISA RDC 36/2013',
          evidence: [
            `Prescribed: ${medication.name}`,
            `Documented allergy: ${allergyCheck.allergen}`,
            `Severity: ${allergyCheck.severity}`,
          ],
          suggestedCorrection: 'Consider alternative medication from different drug class.',
          suggestedCorrectionPortuguese: 'Considerar medicamento alternativo de classe diferente.',
        };
      }

      return null;
    },
  },

  {
    id: 'ALLERGY_CROSS_REACTIVITY',
    name: 'Potential Cross-Reactivity Allergy',
    category: 'CLINICAL',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'Medication may cross-react with documented allergy',
    descriptionPortuguese: 'Medicamento pode ter reatividade cruzada com alergia documentada',
    regulatoryReference: 'ANVISA RDC 36/2013 - Patient Safety',

    async evaluate(context, patientContext): Promise<TrafficLightSignal | null> {
      const medication = context.payload.medication;
      if (!medication?.name) return null;

      const allergyCheck = checkAllergyMatch(medication.name, patientContext.allergies);

      if (allergyCheck.matched && allergyCheck.crossReactivity) {
        return {
          ruleId: 'ALLERGY_CROSS_REACTIVITY',
          ruleName: 'Potential Cross-Reactivity Allergy',
          category: 'CLINICAL',
          color: 'YELLOW',
          message: `Potential cross-reactivity with documented allergy to ${allergyCheck.allergen}`,
          messagePortuguese: `Potencial reatividade cruzada com alergia documentada a ${allergyCheck.allergen}`,
          regulatoryReference: 'ANVISA RDC 36/2013',
          evidence: [
            `Prescribed: ${medication.name}`,
            `Documented allergy: ${allergyCheck.allergen}`,
            `Cross-reactivity possible within drug class`,
          ],
          suggestedCorrection: 'Assess risk/benefit. Consider alternative or pre-medication.',
          suggestedCorrectionPortuguese: 'Avaliar risco/beneficio. Considerar alternativa ou pre-medicacao.',
        };
      }

      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // DRUG INTERACTION RULES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'INTERACTION_LETHAL',
    name: 'Potentially Lethal Drug Interaction',
    category: 'CLINICAL',
    defaultColor: 'RED',
    isActive: true,
    description: 'Combination of medications may cause life-threatening interaction',
    descriptionPortuguese: 'Combinacao de medicamentos pode causar interacao com risco de vida',
    regulatoryReference: 'ANVISA RDC 36/2013 - Patient Safety',

    async evaluate(context, patientContext): Promise<TrafficLightSignal | null> {
      const medication = context.payload.medication;
      if (!medication?.name || !patientContext.medications) return null;

      const currentMedNames = patientContext.medications
        .filter((m) => m.isActive)
        .map((m) => m.name);

      const interaction = checkInteraction(medication.name, currentMedNames);

      if (interaction && interaction.severity === 'LETHAL') {
        const interactingMed = currentMedNames.find((m) =>
          interaction.drug1.some((d) => normalizedrugName(m).includes(normalizedrugName(d))) ||
          interaction.drug2.some((d) => normalizedrugName(m).includes(normalizedrugName(d)))
        );

        return {
          ruleId: 'INTERACTION_LETHAL',
          ruleName: 'Potentially Lethal Drug Interaction',
          category: 'CLINICAL',
          color: 'RED',
          message: interaction.description,
          messagePortuguese: interaction.descriptionPortuguese,
          regulatoryReference: 'ANVISA RDC 36/2013',
          evidence: [
            `New medication: ${medication.name}`,
            `Current medication: ${interactingMed}`,
            `Mechanism: ${interaction.mechanism || 'See clinical reference'}`,
          ],
          suggestedCorrection: 'This combination should be avoided. Consider alternative therapy.',
          suggestedCorrectionPortuguese: 'Esta combinacao deve ser evitada. Considerar terapia alternativa.',
        };
      }

      return null;
    },
  },

  {
    id: 'INTERACTION_SEVERE',
    name: 'Severe Drug Interaction',
    category: 'CLINICAL',
    defaultColor: 'RED',
    isActive: true,
    description: 'Significant drug interaction requiring close monitoring or alternative',
    descriptionPortuguese: 'Interacao medicamentosa significativa requerendo monitoramento ou alternativa',
    regulatoryReference: 'ANVISA RDC 36/2013',

    async evaluate(context, patientContext): Promise<TrafficLightSignal | null> {
      const medication = context.payload.medication;
      if (!medication?.name || !patientContext.medications) return null;

      const currentMedNames = patientContext.medications
        .filter((m) => m.isActive)
        .map((m) => m.name);

      const interaction = checkInteraction(medication.name, currentMedNames);

      if (interaction && interaction.severity === 'SEVERE') {
        const interactingMed = currentMedNames.find((m) =>
          interaction.drug1.some((d) => normalizedrugName(m).includes(normalizedrugName(d))) ||
          interaction.drug2.some((d) => normalizedrugName(m).includes(normalizedrugName(d)))
        );

        return {
          ruleId: 'INTERACTION_SEVERE',
          ruleName: 'Severe Drug Interaction',
          category: 'CLINICAL',
          color: 'RED',
          message: interaction.description,
          messagePortuguese: interaction.descriptionPortuguese,
          regulatoryReference: 'ANVISA RDC 36/2013',
          evidence: [
            `New medication: ${medication.name}`,
            `Current medication: ${interactingMed}`,
            `Mechanism: ${interaction.mechanism || 'See clinical reference'}`,
          ],
          suggestedCorrection: 'Consider alternative or implement monitoring protocol.',
          suggestedCorrectionPortuguese: 'Considerar alternativa ou implementar protocolo de monitoramento.',
        };
      }

      return null;
    },
  },

  {
    id: 'INTERACTION_MODERATE',
    name: 'Moderate Drug Interaction',
    category: 'CLINICAL',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'Drug interaction that may require dose adjustment or monitoring',
    descriptionPortuguese: 'Interacao medicamentosa que pode requerer ajuste de dose ou monitoramento',

    async evaluate(context, patientContext): Promise<TrafficLightSignal | null> {
      const medication = context.payload.medication;
      if (!medication?.name || !patientContext.medications) return null;

      const currentMedNames = patientContext.medications
        .filter((m) => m.isActive)
        .map((m) => m.name);

      const interaction = checkInteraction(medication.name, currentMedNames);

      if (interaction && interaction.severity === 'MODERATE') {
        const interactingMed = currentMedNames.find((m) =>
          interaction.drug1.some((d) => normalizedrugName(m).includes(normalizedrugName(d))) ||
          interaction.drug2.some((d) => normalizedrugName(m).includes(normalizedrugName(d)))
        );

        return {
          ruleId: 'INTERACTION_MODERATE',
          ruleName: 'Moderate Drug Interaction',
          category: 'CLINICAL',
          color: 'YELLOW',
          message: interaction.description,
          messagePortuguese: interaction.descriptionPortuguese,
          evidence: [
            `New medication: ${medication.name}`,
            `Current medication: ${interactingMed}`,
          ],
          suggestedCorrection: 'Monitor patient closely. Consider dose adjustment.',
          suggestedCorrectionPortuguese: 'Monitorar paciente de perto. Considerar ajuste de dose.',
        };
      }

      return null;
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTRAINDICATION RULES
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'CONTRAINDICATION_RENAL',
    name: 'Renal Impairment Contraindication',
    category: 'CLINICAL',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'Medication may be contraindicated or require adjustment for renal function',
    descriptionPortuguese: 'Medicamento pode ser contraindicado ou requerer ajuste para funcao renal',

    async evaluate(context, patientContext): Promise<TrafficLightSignal | null> {
      const medication = context.payload.medication;
      if (!medication?.name || !patientContext.labResults) return null;

      // Check for recent eGFR or creatinine
      const recentEgfr = patientContext.labResults.find(
        (l) => l.testName.toLowerCase().includes('egfr') && l.status !== 'NORMAL'
      );

      const renalClearMeds = ['metformin', 'gabapentin', 'pregabalin', 'lithium', 'digoxin', 'vancomycin'];
      const needsRenalAdjustment = renalClearMeds.some((m) =>
        normalizedrugName(medication.name).includes(normalizedrugName(m))
      );

      if (needsRenalAdjustment && recentEgfr && recentEgfr.value < 60) {
        return {
          ruleId: 'CONTRAINDICATION_RENAL',
          ruleName: 'Renal Impairment - Dose Adjustment Required',
          category: 'CLINICAL',
          color: recentEgfr.value < 30 ? 'RED' : 'YELLOW',
          message: `${medication.name} requires dose adjustment for eGFR ${recentEgfr.value}`,
          messagePortuguese: `${medication.name} requer ajuste de dose para TFGe ${recentEgfr.value}`,
          evidence: [
            `Medication: ${medication.name}`,
            `eGFR: ${recentEgfr.value} ${recentEgfr.unit}`,
            `This medication is renally cleared`,
          ],
          suggestedCorrection: 'Consult renal dosing guidelines. Adjust dose or frequency.',
          suggestedCorrectionPortuguese: 'Consultar diretrizes de dose renal. Ajustar dose ou frequencia.',
        };
      }

      return null;
    },
  },

  {
    id: 'CONTRAINDICATION_AGE_PEDIATRIC',
    name: 'Pediatric Age Contraindication',
    category: 'CLINICAL',
    defaultColor: 'YELLOW',
    isActive: true,
    description: 'Medication may not be appropriate for pediatric patients',
    descriptionPortuguese: 'Medicamento pode nao ser apropriado para pacientes pediatricos',

    async evaluate(context, patientContext): Promise<TrafficLightSignal | null> {
      const medication = context.payload.medication;
      if (!medication?.name || !patientContext.age) return null;

      // Medications with pediatric restrictions
      const pediatricRestricted = [
        { name: 'aspirin', minAge: 16, reason: 'Reye syndrome risk' },
        { name: 'fluoroquinolone', minAge: 18, reason: 'Cartilage toxicity' },
        { name: 'ciprofloxacin', minAge: 18, reason: 'Cartilage toxicity' },
        { name: 'levofloxacin', minAge: 18, reason: 'Cartilage toxicity' },
        { name: 'tetracycline', minAge: 8, reason: 'Tooth discoloration' },
        { name: 'doxycycline', minAge: 8, reason: 'Tooth discoloration' },
      ];

      const normalizedMed = normalizedrugName(medication.name);
      const restriction = pediatricRestricted.find((r) =>
        normalizedMed.includes(normalizedrugName(r.name))
      );

      if (restriction && patientContext.age < restriction.minAge) {
        return {
          ruleId: 'CONTRAINDICATION_AGE_PEDIATRIC',
          ruleName: 'Pediatric Age Restriction',
          category: 'CLINICAL',
          color: 'YELLOW',
          message: `${medication.name} not recommended under age ${restriction.minAge}: ${restriction.reason}`,
          messagePortuguese: `${medication.name} nao recomendado abaixo de ${restriction.minAge} anos: ${restriction.reason}`,
          evidence: [
            `Patient age: ${patientContext.age}`,
            `Minimum age for ${medication.name}: ${restriction.minAge}`,
            `Reason: ${restriction.reason}`,
          ],
          suggestedCorrection: 'Consider age-appropriate alternative.',
          suggestedCorrectionPortuguese: 'Considerar alternativa apropriada para idade.',
        };
      }

      return null;
    },
  },
];
