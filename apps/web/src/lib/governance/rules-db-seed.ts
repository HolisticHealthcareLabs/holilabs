/**
 * Rules DB Seed (Simulated)
 * 
 * Converted from FAST_LANE_RULES (json-logic) to RuleCache (Unified Engine)
 */

import { RuleCache, RuleLogic } from './shared-types';

export const UNIFIED_RULES_DB: RuleCache[] = [
    // 1. ASTHMA + BETA BLOCKERS
    {
        id: 'rule-001',
        ruleId: 'BSTH-001',
        name: 'Non-Selective Beta-Blocker in Asthma',
        version: 'v1.0.0',
        category: 'clinical',
        isActive: true,
        ruleLogic: JSON.stringify({
            applicableTo: ['prescription'],
            color: 'RED',
            message: 'Beta-blockers may precipitate bronchospasm in asthmatic patients.',
            messagePortuguese: 'Betabloqueadores podem precipitar broncoespasmo em pacientes asmáticos.',
            conditions: [
                {
                    field: 'patient_conditions',
                    operator: 'contains', // Checks if array contains value
                    value: 'Asthma'
                },
                {
                    field: 'proposed_medication_class',
                    operator: 'in', // Checks if value is in array
                    value: ["Non-selective Beta-blocker", "Beta-blocker"]
                }
            ],
            regulatoryReference: 'GINA Guidelines 2024',
            suggestedCorrection: 'Consider cardioselective beta-blocker.'
        } as RuleLogic)
    },
    // 2. PENICILLIN ALLERGY
    {
        id: 'rule-002',
        ruleId: 'PCN-002',
        name: 'Penicillin Allergy',
        version: 'v1.0.0',
        category: 'clinical',
        isActive: true, // "Fail-safe" block
        ruleLogic: JSON.stringify({
            applicableTo: ['prescription'],
            color: 'RED',
            message: 'Patient has a documented Penicillin Allergy. Beta-lactam prescribed.',
            messagePortuguese: 'Paciente com alergia documentada a Penicilina.',
            conditions: [
                {
                    field: 'patient_conditions',
                    operator: 'contains',
                    value: 'Penicillin Allergy'
                },
                {
                    field: 'proposed_medication_class',
                    operator: 'in',
                    value: ["Penicillin", "Beta-lactam"]
                }
            ],
            suggestedCorrection: 'Consider Macrolides or Fluoroquinolones.'
        } as RuleLogic)
    },
    // 3. WARFARIN + NSAIDS (Lethal)
    {
        id: 'rule-003',
        ruleId: 'DRUG_INT_001',
        name: 'Warfarin + NSAIDs',
        version: 'v1.0.0',
        category: 'clinical',
        isActive: true,
        ruleLogic: JSON.stringify({
            applicableTo: ['prescription'],
            color: 'RED', // Lethal
            message: 'COMBINATION LETHAL: Warfarin + NSAID increases risk of severe hemorrhage.',
            messagePortuguese: 'COMBINAÇÃO LETAL: Varfarina + AINE aumenta risco de hemorragia severa.',
            conditions: [
                {
                    field: 'current_medications',
                    operator: 'contains',
                    value: 'Warfarin'
                },
                {
                    field: 'proposed_medication_class',
                    operator: 'in',
                    value: ["NSAID", "Ibuprofen", "Naproxen", "Aspirin"]
                }
            ],
            suggestedCorrection: 'Use Acetaminophen.'
        } as RuleLogic)
    },
    // 4. NITRATES + PDE5 (Fatal Hypotension)
    {
        id: 'rule-004',
        ruleId: 'DRUG_INT_005',
        name: 'Nitrates + PDE5 Inhibitors',
        version: 'v1.0.0',
        category: 'clinical',
        isActive: true,
        ruleLogic: JSON.stringify({
            applicableTo: ['prescription'],
            color: 'RED',
            message: 'COMBINATION LETHAL: Nitrates + PDE5 causes fatal hypotension.',
            messagePortuguese: 'COMBINAÇÃO LETAL: Nitratos + PDE5 causa hipotensão fatal.',
            conditions: [
                {
                    field: 'current_medications',
                    operator: 'contains',
                    value: 'Nitroglycerin'
                },
                {
                    field: 'proposed_medication_class',
                    operator: 'in',
                    value: ["PDE5 Inhibitor", "Sildenafil", "Tadalafil"]
                }
            ],
            suggestedCorrection: 'Contraindicated.'
        } as RuleLogic)
    }
];
