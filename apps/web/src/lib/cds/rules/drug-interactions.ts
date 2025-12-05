/**
 * Drug Interaction Rules
 *
 * Common drug-drug interactions database
 * Adapted from ONCHigh priority interactions and DrugBank
 *
 * Sources:
 * - NLM RxNav Drug Interaction API
 * - ONCHigh Priority Drug-Drug Interactions
 * - DrugBank
 *
 * @compliance ONC, FDA
 */

import type { DrugInteraction } from '../types';

/**
 * High-priority drug-drug interactions
 * Based on ONCHigh list
 */
export const DRUG_INTERACTIONS: DrugInteraction[] = [
  // Warfarin interactions (anticoagulant)
  {
    id: 'warfarin-nsaid-001',
    drug1: { name: 'Warfarin', rxNormCode: '11289' },
    drug2: { name: 'Ibuprofen', rxNormCode: '5640' },
    severity: 'major',
    description: 'Concurrent use of warfarin with NSAIDs significantly increases bleeding risk',
    clinicalEffects: 'Increased risk of gastrointestinal bleeding, bruising, and hemorrhage',
    management: 'Monitor INR closely. Consider alternative analgesic (acetaminophen). Use gastroprotection if NSAID necessary.',
    documentation: 'excellent',
    source: 'ONCHigh, DrugBank',
  },
  {
    id: 'warfarin-aspirin-002',
    drug1: { name: 'Warfarin', rxNormCode: '11289' },
    drug2: { name: 'Aspirin', rxNormCode: '1191' },
    severity: 'major',
    description: 'Additive anticoagulant and antiplatelet effects increase bleeding risk',
    clinicalEffects: 'Increased risk of major bleeding events',
    management: 'Use combination only when clearly indicated. Monitor INR frequently. Consider lower aspirin dose (81mg).',
    documentation: 'excellent',
    source: 'ONCHigh',
  },

  // ACE inhibitor + Potassium
  {
    id: 'acei-potassium-003',
    drug1: { name: 'Lisinopril', rxNormCode: '29046' },
    drug2: { name: 'Potassium Chloride', rxNormCode: '8588' },
    severity: 'major',
    description: 'ACE inhibitors increase serum potassium; potassium supplements can cause hyperkalemia',
    clinicalEffects: 'Life-threatening hyperkalemia, cardiac arrhythmias',
    management: 'Monitor serum potassium closely. Avoid routine potassium supplementation. Check renal function.',
    documentation: 'excellent',
    source: 'ONCHigh, FDA',
  },

  // SSRIs + NSAIDs
  {
    id: 'ssri-nsaid-004',
    drug1: { name: 'Sertraline', rxNormCode: '36437' },
    drug2: { name: 'Ibuprofen', rxNormCode: '5640' },
    severity: 'moderate',
    description: 'SSRIs increase bleeding risk; NSAIDs further increase this risk',
    clinicalEffects: 'Increased risk of gastrointestinal and other bleeding',
    management: 'Consider gastroprotection (PPI). Use lowest effective NSAID dose. Monitor for bleeding.',
    documentation: 'good',
    source: 'DrugBank',
  },

  // Statins + Gemfibrozil
  {
    id: 'statin-fibrate-005',
    drug1: { name: 'Simvastatin', rxNormCode: '36567' },
    drug2: { name: 'Gemfibrozil', rxNormCode: '4493' },
    severity: 'contraindicated',
    description: 'Combination significantly increases risk of rhabdomyolysis',
    clinicalEffects: 'Severe muscle breakdown (rhabdomyolysis), acute kidney injury, death',
    management: 'DO NOT COMBINE. Use fenofibrate instead if fibrate needed. Monitor CK if combination unavoidable.',
    documentation: 'excellent',
    source: 'FDA, ONCHigh',
  },

  // Metformin + Contrast dye
  {
    id: 'metformin-contrast-006',
    drug1: { name: 'Metformin', rxNormCode: '6809' },
    drug2: { name: 'Iodinated Contrast', rxNormCode: '82355' },
    severity: 'major',
    description: 'Increased risk of contrast-induced nephropathy and lactic acidosis',
    clinicalEffects: 'Acute kidney injury, lactic acidosis',
    management: 'Hold metformin 48 hours before and after contrast administration. Check renal function before restarting.',
    documentation: 'excellent',
    source: 'FDA, ONCHigh',
  },

  // Digoxin + Amiodarone
  {
    id: 'digoxin-amiodarone-007',
    drug1: { name: 'Digoxin', rxNormCode: '3407' },
    drug2: { name: 'Amiodarone', rxNormCode: '703' },
    severity: 'major',
    description: 'Amiodarone significantly increases digoxin levels',
    clinicalEffects: 'Digoxin toxicity: nausea, vomiting, arrhythmias, visual disturbances',
    management: 'Reduce digoxin dose by 50%. Monitor digoxin levels and ECG. Watch for toxicity symptoms.',
    documentation: 'excellent',
    source: 'DrugBank, ONCHigh',
  },

  // Benzodiazepines + Opioids
  {
    id: 'benzo-opioid-008',
    drug1: { name: 'Alprazolam', rxNormCode: '596' },
    drug2: { name: 'Oxycodone', rxNormCode: '7804' },
    severity: 'major',
    description: 'Additive CNS and respiratory depression',
    clinicalEffects: 'Severe sedation, respiratory depression, coma, death',
    management: 'Avoid combination when possible. If necessary, use lowest doses, close monitoring. Patient education on risks.',
    documentation: 'excellent',
    source: 'FDA Black Box Warning, ONCHigh',
  },

  // Macrolides + Statins
  {
    id: 'macrolide-statin-009',
    drug1: { name: 'Clarithromycin', rxNormCode: '21212' },
    drug2: { name: 'Simvastatin', rxNormCode: '36567' },
    severity: 'major',
    description: 'Macrolides inhibit statin metabolism, increasing myopathy risk',
    clinicalEffects: 'Rhabdomyolysis, muscle pain, weakness',
    management: 'Temporarily discontinue statin during macrolide course. Consider azithromycin instead.',
    documentation: 'excellent',
    source: 'FDA, DrugBank',
  },

  // Fluoroquinolones + Antacids
  {
    id: 'fluoroquinolone-antacid-010',
    drug1: { name: 'Ciprofloxacin', rxNormCode: '2551' },
    drug2: { name: 'Calcium Carbonate', rxNormCode: '1946' },
    severity: 'moderate',
    description: 'Antacids reduce fluoroquinolone absorption',
    clinicalEffects: 'Reduced antibiotic efficacy, treatment failure',
    management: 'Separate administration by 2-6 hours. Take fluoroquinolone first.',
    documentation: 'excellent',
    source: 'DrugBank',
  },

  // MAOIs + SSRIs
  {
    id: 'maoi-ssri-011',
    drug1: { name: 'Phenelzine', rxNormCode: '8121' },
    drug2: { name: 'Sertraline', rxNormCode: '36437' },
    severity: 'contraindicated',
    description: 'Risk of serotonin syndrome',
    clinicalEffects: 'Serotonin syndrome: agitation, hyperthermia, seizures, coma, death',
    management: 'DO NOT COMBINE. Allow 14-day washout after MAOI before starting SSRI. 5 weeks for fluoxetine.',
    documentation: 'excellent',
    source: 'FDA Black Box Warning',
  },

  // ACE inhibitor + ARB
  {
    id: 'acei-arb-012',
    drug1: { name: 'Lisinopril', rxNormCode: '29046' },
    drug2: { name: 'Losartan', rxNormCode: '52175' },
    severity: 'major',
    description: 'Dual RAAS blockade increases risk of hyperkalemia, hypotension, and renal dysfunction',
    clinicalEffects: 'Hyperkalemia, acute kidney injury, hypotension',
    management: 'Generally avoid combination. If used, close monitoring of renal function and potassium.',
    documentation: 'excellent',
    source: 'FDA, Clinical Trials',
  },

  // Methotrexate + NSAIDs
  {
    id: 'methotrexate-nsaid-013',
    drug1: { name: 'Methotrexate', rxNormCode: '6851' },
    drug2: { name: 'Ibuprofen', rxNormCode: '5640' },
    severity: 'major',
    description: 'NSAIDs reduce methotrexate elimination',
    clinicalEffects: 'Methotrexate toxicity: bone marrow suppression, mucositis, hepatotoxicity',
    management: 'Avoid high-dose NSAIDs. Monitor CBC, liver function. Use acetaminophen if possible.',
    documentation: 'excellent',
    source: 'DrugBank, ONCHigh',
  },

  // Tamoxifen + CYP2D6 inhibitors
  {
    id: 'tamoxifen-ssri-014',
    drug1: { name: 'Tamoxifen', rxNormCode: '10324' },
    drug2: { name: 'Paroxetine', rxNormCode: '32937' },
    severity: 'major',
    description: 'Strong CYP2D6 inhibitors reduce tamoxifen efficacy',
    clinicalEffects: 'Reduced tamoxifen effectiveness, increased breast cancer recurrence risk',
    management: 'Avoid strong CYP2D6 inhibitors (paroxetine, fluoxetine). Use alternatives (sertraline, citalopram).',
    documentation: 'good',
    source: 'Clinical Studies, Oncology Guidelines',
  },

  // Theophylline + Fluoroquinolones
  {
    id: 'theophylline-fluoroquinolone-015',
    drug1: { name: 'Theophylline', rxNormCode: '10438' },
    drug2: { name: 'Ciprofloxacin', rxNormCode: '2551' },
    severity: 'major',
    description: 'Fluoroquinolones inhibit theophylline metabolism',
    clinicalEffects: 'Theophylline toxicity: seizures, arrhythmias, nausea',
    management: 'Monitor theophylline levels. Consider alternative antibiotic. Reduce theophylline dose by 50%.',
    documentation: 'excellent',
    source: 'FDA, DrugBank',
  },
];

/**
 * Check for drug-drug interactions
 */
export function checkDrugInteractions(medications: Array<{ name: string; rxNormCode?: string }>): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];

  // Check all medication pairs
  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const med1 = medications[i];
      const med2 = medications[j];

      // Find matching interactions
      const matchingInteractions = DRUG_INTERACTIONS.filter(interaction => {
        // Match by name (case-insensitive partial match)
        const nameMatch1 =
          (interaction.drug1.name.toLowerCase().includes(med1.name.toLowerCase()) &&
           interaction.drug2.name.toLowerCase().includes(med2.name.toLowerCase())) ||
          (interaction.drug1.name.toLowerCase().includes(med2.name.toLowerCase()) &&
           interaction.drug2.name.toLowerCase().includes(med1.name.toLowerCase()));

        // Match by RxNorm code if available
        const codeMatch1 =
          med1.rxNormCode && med2.rxNormCode &&
          ((interaction.drug1.rxNormCode === med1.rxNormCode && interaction.drug2.rxNormCode === med2.rxNormCode) ||
           (interaction.drug1.rxNormCode === med2.rxNormCode && interaction.drug2.rxNormCode === med1.rxNormCode));

        return nameMatch1 || codeMatch1;
      });

      interactions.push(...matchingInteractions);
    }
  }

  return interactions;
}

/**
 * Get severity color for UI
 */
export function getInteractionSeverityColor(severity: DrugInteraction['severity']): string {
  switch (severity) {
    case 'contraindicated':
      return '#DC2626'; // Red 600
    case 'major':
      return '#EA580C'; // Orange 600
    case 'moderate':
      return '#D97706'; // Amber 600
    case 'minor':
      return '#3B82F6'; // Blue 500
    default:
      return '#6B7280'; // Gray 500
  }
}

/**
 * Get severity display text
 */
export function getInteractionSeverityText(severity: DrugInteraction['severity']): string {
  switch (severity) {
    case 'contraindicated':
      return 'CONTRAINDICATED';
    case 'major':
      return 'Major Interaction';
    case 'moderate':
      return 'Moderate Interaction';
    case 'minor':
      return 'Minor Interaction';
    default:
      return 'Unknown';
  }
}
