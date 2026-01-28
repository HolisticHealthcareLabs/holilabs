/**
 * Clinical Rules Configuration - Fast Lane Contraindication Library
 * 
 * High-liability rules using json-logic-js format.
 * Each rule includes authoritative citation.
 * 
 * @module config/clinical-rules
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ClinicalRule {
    ruleId: string;
    name: string;
    severity: 'BLOCK' | 'FLAG';  // BLOCK = Red Modal, FLAG = Yellow Toast
    source: {
        authority: string;
        year: number;
        url?: string;
    };
    logic: object;  // json-logic-js compatible
    intervention: {
        message: string;
        recommendation: string;
    };
    category: 'CONTRAINDICATION' | 'INTERACTION' | 'DOSING' | 'ALLERGY' | 'CONDITION';
}

// ============================================================================
// RULE LIBRARY
// ============================================================================

export const CLINICAL_RULES: ClinicalRule[] = [
    // =========================================================================
    // RULE 1: Asthma + Beta-Blocker (Original MVP Rule)
    // =========================================================================
    {
        ruleId: 'MED_CONTRA_001',
        name: 'Non-Selective Beta-Blocker in Asthma',
        severity: 'BLOCK',
        source: {
            authority: 'GINA Guidelines',
            year: 2024,
            url: 'https://ginasthma.org/reports/',
        },
        category: 'CONTRAINDICATION',
        logic: {
            and: [
                { in: ['Asthma', { var: 'patient_conditions' }] },
                {
                    or: [
                        { in: [{ var: 'proposed_medication_class' }, ['Non-selective Beta-blocker', 'Beta-blocker']] },
                        { in: [{ var: 'proposed_medication' }, ['propranolol', 'nadolol', 'timolol', 'sotalol', 'carvedilol']] },
                    ]
                },
            ],
        },
        intervention: {
            message: 'Beta-blockers may precipitate bronchospasm in asthmatic patients.',
            recommendation: 'Consider cardioselective beta-blocker (e.g., metoprolol, bisoprolol) or alternative antihypertensive.',
        },
    },

    // =========================================================================
    // RULE 2: Penicillin Allergy (Original MVP Rule)
    // =========================================================================
    {
        ruleId: 'MED_CONTRA_002',
        name: 'Penicillin-Class Antibiotic in Penicillin Allergy',
        severity: 'BLOCK',
        source: {
            authority: 'CDC Guidelines',
            year: 2023,
            url: 'https://www.cdc.gov/antibiotic-use/',
        },
        category: 'ALLERGY',
        logic: {
            and: [
                {
                    or: [
                        { in: ['Penicillin Allergy', { var: 'patient_allergies' }] },
                        { in: ['penicillin', { var: 'patient_allergies' }] },
                        { in: ['PCN Allergy', { var: 'patient_allergies' }] },
                    ]
                },
                {
                    or: [
                        { in: [{ var: 'proposed_medication_class' }, ['Penicillin', 'Aminopenicillin']] },
                        { in: [{ var: 'proposed_medication' }, ['amoxicillin', 'ampicillin', 'penicillin', 'piperacillin', 'augmentin']] },
                    ]
                },
            ],
        },
        intervention: {
            message: 'Patient has documented penicillin allergy. Risk of anaphylaxis.',
            recommendation: 'Consider azithromycin, fluoroquinolone, or confirm allergy status before proceeding.',
        },
    },

    // =========================================================================
    // RULE 3: Opioid + Benzodiazepine (FDA Black Box Warning)
    // =========================================================================
    {
        ruleId: 'MED_INTER_001',
        name: 'Opioid + Benzodiazepine Concurrent Use',
        severity: 'BLOCK',
        source: {
            authority: 'FDA Drug Safety Communication',
            year: 2016,
            url: 'https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-fda-warns-about-serious-risks-and-death-when-combining-opioid-pain-or',
        },
        category: 'INTERACTION',
        logic: {
            and: [
                {
                    or: [
                        { in: ['Opioid', { var: 'current_medications_class' }] },
                        {
                            some: [
                                { var: 'current_medications' },
                                { in: [{ var: '' }, ['oxycodone', 'hydrocodone', 'morphine', 'fentanyl', 'codeine', 'tramadol', 'methadone']] }
                            ]
                        },
                    ]
                },
                {
                    or: [
                        { in: [{ var: 'proposed_medication_class' }, ['Benzodiazepine']] },
                        { in: [{ var: 'proposed_medication' }, ['alprazolam', 'lorazepam', 'diazepam', 'clonazepam', 'xanax', 'ativan', 'valium', 'klonopin']] },
                    ]
                },
            ],
        },
        intervention: {
            message: 'FDA BLACK BOX WARNING: Concurrent use of opioids and benzodiazepines may result in profound sedation, respiratory depression, coma, and death.',
            recommendation: 'Avoid concurrent prescribing. If clinically necessary, prescribe lowest effective dosages and shortest duration. Monitor closely.',
        },
    },

    // =========================================================================
    // RULE 4: Methotrexate + Pregnancy (Teratogenic Category X)
    // =========================================================================
    {
        ruleId: 'MED_CONTRA_003',
        name: 'Methotrexate in Pregnancy',
        severity: 'BLOCK',
        source: {
            authority: 'FDA Pregnancy Category X',
            year: 2023,
            url: 'https://www.accessdata.fda.gov/drugsatfda_docs/label/',
        },
        category: 'CONTRAINDICATION',
        logic: {
            and: [
                {
                    or: [
                        { '==': [{ var: 'patient_pregnant' }, true] },
                        { in: ['Pregnant', { var: 'patient_conditions' }] },
                        { in: ['Pregnancy', { var: 'patient_conditions' }] },
                    ]
                },
                {
                    or: [
                        { in: [{ var: 'proposed_medication' }, ['methotrexate', 'mtx', 'trexall', 'rasuvo', 'otrexup']] },
                        { in: [{ var: 'proposed_medication_class' }, ['Antimetabolite', 'DMARD']] },
                    ]
                },
            ],
        },
        intervention: {
            message: 'PREGNANCY CATEGORY X: Methotrexate is contraindicated in pregnancy. Known to cause fetal death and teratogenic effects.',
            recommendation: 'Discontinue methotrexate. Confirm pregnancy status. Consider alternative therapy (e.g., sulfasalazine if indicated).',
        },
    },

    // =========================================================================
    // RULE 5: NSAID + CKD Stage 3-5 (Nephrotoxicity Risk)
    // =========================================================================
    {
        ruleId: 'MED_CONTRA_004',
        name: 'NSAID in Chronic Kidney Disease (Stage 3-5)',
        severity: 'FLAG',  // Yellow Toast - warning, not hard block
        source: {
            authority: 'KDIGO Guidelines',
            year: 2024,
            url: 'https://kdigo.org/guidelines/',
        },
        category: 'CONTRAINDICATION',
        logic: {
            and: [
                {
                    or: [
                        { in: ['CKD', { var: 'patient_conditions' }] },
                        { in: ['Chronic Kidney Disease', { var: 'patient_conditions' }] },
                        { in: ['CKD Stage 3', { var: 'patient_conditions' }] },
                        { in: ['CKD Stage 4', { var: 'patient_conditions' }] },
                        { in: ['CKD Stage 5', { var: 'patient_conditions' }] },
                        { in: ['ESRD', { var: 'patient_conditions' }] },
                        { '<': [{ var: 'patient_egfr' }, 60] },
                    ]
                },
                {
                    or: [
                        { in: [{ var: 'proposed_medication_class' }, ['NSAID', 'Non-steroidal anti-inflammatory']] },
                        { in: [{ var: 'proposed_medication' }, ['ibuprofen', 'naproxen', 'meloxicam', 'diclofenac', 'indomethacin', 'ketorolac', 'advil', 'motrin', 'aleve']] },
                    ]
                },
            ],
        },
        intervention: {
            message: 'NSAIDs may worsen renal function in patients with CKD (eGFR < 60). Use with caution.',
            recommendation: 'Consider acetaminophen for pain. If NSAID required, use lowest dose for shortest duration. Monitor renal function closely.',
        },
    },

    // =========================================================================
    // RULE 6: Warfarin + High INR (Bleeding Risk)
    // =========================================================================
    {
        ruleId: 'MED_DOSING_001',
        name: 'Warfarin with Supratherapeutic INR',
        severity: 'BLOCK',
        source: {
            authority: 'CHEST Guidelines',
            year: 2022,
            url: 'https://journal.chestnet.org/',
        },
        category: 'DOSING',
        logic: {
            and: [
                { '>': [{ var: 'patient_inr' }, 4.0] },
                { '!': { in: ['Hold Warfarin', { var: 'proposed_action' }] } },  // Not already holding
            ],
        },
        intervention: {
            message: 'INR is supratherapeutic (> 4.0). Continuing warfarin increases bleeding risk.',
            recommendation: 'Hold warfarin. Consider Vitamin K if INR > 10 or bleeding present. Recheck INR in 24-48 hours.',
        },
    },

    // =========================================================================
    // RULE 7: QT-Prolonging Drug Combination
    // =========================================================================
    {
        ruleId: 'MED_INTER_002',
        name: 'Multiple QT-Prolonging Medications',
        severity: 'FLAG',
        source: {
            authority: 'CredibleMeds QTDrugs List',
            year: 2024,
            url: 'https://crediblemeds.org/',
        },
        category: 'INTERACTION',
        logic: {
            and: [
                {
                    some: [
                        { var: 'current_medications' },
                        { in: [{ var: '' }, ['amiodarone', 'sotalol', 'haloperidol', 'methadone', 'ondansetron', 'azithromycin', 'levofloxacin', 'moxifloxacin']] }
                    ]
                },
                {
                    or: [
                        { in: [{ var: 'proposed_medication' }, ['amiodarone', 'sotalol', 'haloperidol', 'methadone', 'ondansetron', 'azithromycin', 'levofloxacin', 'moxifloxacin', 'citalopram', 'escitalopram']] },
                    ]
                },
            ],
        },
        intervention: {
            message: 'Patient is on a QT-prolonging medication. Adding another may increase risk of Torsades de Pointes.',
            recommendation: 'Check baseline QTc. Consider alternative agent. If proceeding, monitor ECG.',
        },
    },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all rules by severity
 */
export function getRulesBySeverity(severity: 'BLOCK' | 'FLAG'): ClinicalRule[] {
    return CLINICAL_RULES.filter(rule => rule.severity === severity);
}

/**
 * Get rule by ID
 */
export function getRuleById(ruleId: string): ClinicalRule | undefined {
    return CLINICAL_RULES.find(rule => rule.ruleId === ruleId);
}

/**
 * Get all rule IDs
 */
export function getAllRuleIds(): string[] {
    return CLINICAL_RULES.map(rule => rule.ruleId);
}

/**
 * Count rules by category
 */
export function getRuleCountByCategory(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const rule of CLINICAL_RULES) {
        counts[rule.category] = (counts[rule.category] || 0) + 1;
    }
    return counts;
}
