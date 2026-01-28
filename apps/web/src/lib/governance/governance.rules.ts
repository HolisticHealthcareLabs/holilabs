import { RulesLogic } from 'json-logic-js';

/**
 * Clinical Governance Rules Engine (JSON-Logic)
 * ---------------------------------------------
 * Defines deterministic "Fast Lane" rules using json-logic-js.
 * This ensures rules are serializable, database-ready, and execute instantly (<5ms).
 */

export interface GovernanceRule {
    ruleId: string;
    name: string;
    severity: 'HARD_BLOCK' | 'SOFT_NUDGE' | 'INFO';
    source: {
        authority: string;
        year: number;
        url?: string;
    };
    /**
     * json-logic-js rule definition
     * Evaluates against context: { patient_conditions: string[], proposed_medication_class: string }
     */
    logic: RulesLogic;
    intervention: {
        message: string;
        recommendation: string;
    };
}

export const FAST_LANE_RULES: GovernanceRule[] = [
    {
        ruleId: 'BSTH-001',
        name: 'Non-Selective Beta-Blocker in Asthma',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'GINA Guidelines',
            year: 2024,
            url: 'https://ginasthma.org/reports/'
        },
        logic: {
            "and": [
                { "some": [{ "var": "patient_conditions" }, { "in": ["Asthma", { "var": "" }] }] },
                { "in": [{ "var": "proposed_medication_class" }, ["Non-selective Beta-blocker", "Beta-blocker"]] }
            ]
        },
        intervention: {
            message: 'Beta-blockers may precipitate bronchospasm in asthmatic patients.',
            recommendation: 'Consider cardioselective beta-blocker or alternative antihypertensive.'
        }
    },
    {
        ruleId: 'PCN-002',
        name: 'Penicillin Allergy',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'CDC Guidelines',
            year: 2023
        },
        logic: {
            "and": [
                { "some": [{ "var": "patient_conditions" }, { "in": ["Penicillin Allergy", { "var": "" }] }] },
                { "in": [{ "var": "proposed_medication_class" }, ["Penicillin", "Beta-lactam"]] }
            ]
        },
        intervention: {
            message: 'Patient has a documented Penicillin Allergy.',
            recommendation: 'Avoid beta-lactams. Consider Macrolides or Fluoroquinolones if appropriate.'
        }
    },
    // ============================================
    // HARD_BLOCK Rules - Life-threatening interactions
    // ============================================
    {
        ruleId: 'DRUG_INT_001',
        name: 'Warfarin + NSAIDs (Bleeding Risk)',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'FDA Drug Safety Communication',
            year: 2024,
            url: 'https://www.fda.gov/drugs/drug-safety-and-availability'
        },
        logic: {
            "and": [
                { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Warfarin", "Coumadin"]] }] },
                { "in": [{ "var": "proposed_medication_class" }, ["NSAID", "Ibuprofen", "Naproxen", "Aspirin", "Diclofenac", "Ketorolac"]] }
            ]
        },
        intervention: {
            message: 'Warfarin combined with NSAIDs significantly increases risk of GI bleeding and hemorrhage.',
            recommendation: 'Use acetaminophen for pain management. If NSAID required, use lowest dose for shortest duration with PPI gastroprotection and increased INR monitoring.'
        }
    },
    {
        ruleId: 'DRUG_INT_002',
        name: 'Opioids + Benzodiazepines (Respiratory Depression)',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'FDA Boxed Warning',
            year: 2024,
            url: 'https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-fda-warns-about-serious-risks-and-death-when-combining-opioid-pain-or'
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Oxycodone", "Hydrocodone", "Morphine", "Fentanyl", "Codeine", "Tramadol", "Methadone", "Hydromorphone"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Benzodiazepine", "Alprazolam", "Diazepam", "Lorazepam", "Clonazepam", "Temazepam"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Alprazolam", "Diazepam", "Lorazepam", "Clonazepam", "Temazepam"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Opioid", "Oxycodone", "Hydrocodone", "Morphine", "Fentanyl", "Codeine", "Tramadol"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Concurrent use of opioids and benzodiazepines can cause profound sedation, respiratory depression, coma, and death.',
            recommendation: 'Avoid concurrent prescribing. If absolutely necessary, limit dosages and duration to minimum required. Consider non-benzodiazepine anxiolytics or non-opioid analgesics.'
        }
    },
    {
        ruleId: 'DRUG_INT_003',
        name: 'MAOIs + SSRIs (Serotonin Syndrome)',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'FDA Drug Safety Communication',
            year: 2024,
            url: 'https://www.fda.gov/drugs/drug-safety-and-availability'
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Phenelzine", "Tranylcypromine", "Isocarboxazid", "Selegiline", "MAOI"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["SSRI", "Fluoxetine", "Sertraline", "Paroxetine", "Citalopram", "Escitalopram", "SNRI", "Venlafaxine", "Duloxetine"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Fluoxetine", "Sertraline", "Paroxetine", "Citalopram", "Escitalopram", "Venlafaxine", "Duloxetine"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["MAOI", "Phenelzine", "Tranylcypromine", "Isocarboxazid", "Selegiline"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Concurrent use of MAOIs and serotonergic drugs can cause life-threatening serotonin syndrome (hyperthermia, rigidity, autonomic instability).',
            recommendation: 'CONTRAINDICATED. Allow 14-day washout after stopping MAOI, 5-week washout after fluoxetine before starting MAOI.'
        }
    },
    {
        ruleId: 'MED_CONTRA_001',
        name: 'Methotrexate + Pregnancy',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'FDA Pregnancy Category X',
            year: 2024,
            url: 'https://www.fda.gov/drugs'
        },
        logic: {
            "and": [
                { "some": [{ "var": "patient_conditions" }, { "in": [{ "var": "" }, ["Pregnancy", "Pregnant", "Possible Pregnancy"]] }] },
                { "in": [{ "var": "proposed_medication_class" }, ["Methotrexate", "MTX", "Antimetabolite"]] }
            ]
        },
        intervention: {
            message: 'Methotrexate is absolutely contraindicated in pregnancy - causes fetal death and severe birth defects.',
            recommendation: 'Verify pregnancy status before prescribing. Use effective contraception during and 3 months after treatment. Consider alternative DMARDs like sulfasalazine if immunosuppression needed.'
        }
    },
    {
        ruleId: 'DRUG_INT_004',
        name: 'QT-Prolonging Drug Combination',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'CredibleMeds QTDrugs List / AHA Guidelines',
            year: 2024,
            url: 'https://crediblemeds.org/'
        },
        logic: {
            "and": [
                { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Amiodarone", "Sotalol", "Dofetilide", "Haloperidol", "Droperidol", "Methadone", "Ondansetron", "Erythromycin", "Azithromycin", "Levofloxacin", "Moxifloxacin"]] }] },
                { "in": [{ "var": "proposed_medication_class" }, ["QT-Prolonging Agent", "Amiodarone", "Sotalol", "Dofetilide", "Haloperidol", "Droperidol", "Methadone", "Ondansetron", "Erythromycin", "Azithromycin", "Levofloxacin", "Moxifloxacin", "Antipsychotic", "Fluoroquinolone"]] }
            ]
        },
        intervention: {
            message: 'Combining QT-prolonging drugs significantly increases risk of Torsades de Pointes and sudden cardiac death.',
            recommendation: 'Avoid combination. If essential, obtain baseline ECG, monitor QTc closely, correct electrolyte abnormalities (K+, Mg2+). Consider alternative agents.'
        }
    },
    {
        ruleId: 'DRUG_INT_005',
        name: 'Nitrates + PDE5 Inhibitors (Severe Hypotension)',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'FDA Drug Safety Communication / ACC Guidelines',
            year: 2024,
            url: 'https://www.fda.gov/drugs'
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Nitroglycerin", "Isosorbide", "Isosorbide Mononitrate", "Isosorbide Dinitrate", "Nitrate"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["PDE5 Inhibitor", "Sildenafil", "Tadalafil", "Vardenafil", "Avanafil"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Sildenafil", "Tadalafil", "Vardenafil", "Avanafil"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Nitrate", "Nitroglycerin", "Isosorbide"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Concurrent use of nitrates and PDE5 inhibitors causes severe, potentially fatal hypotension.',
            recommendation: 'ABSOLUTELY CONTRAINDICATED. Do not administer nitrates within 24 hours of sildenafil/vardenafil or 48 hours of tadalafil.'
        }
    },
    {
        ruleId: 'DRUG_INT_006',
        name: 'Clozapine + Carbamazepine (Agranulocytosis)',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'FDA Boxed Warning / Clozapine REMS',
            year: 2024,
            url: 'https://www.clozapinerems.com/'
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Clozapine", "Clozaril"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Carbamazepine", "Tegretol", "Antiepileptic"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Carbamazepine", "Tegretol"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Clozapine", "Clozaril"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Both clozapine and carbamazepine cause bone marrow suppression. Concurrent use dramatically increases risk of fatal agranulocytosis.',
            recommendation: 'CONTRAINDICATED. Use alternative mood stabilizers (valproate, lithium) or antiepileptics (lamotrigine with caution).'
        }
    },
    {
        ruleId: 'DRUG_INT_007',
        name: 'Tricyclic Antidepressants + MAOIs (Hypertensive Crisis)',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'FDA Drug Interaction Warning',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Amitriptyline", "Nortriptyline", "Imipramine", "Desipramine", "Clomipramine", "Doxepin", "TCA"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["MAOI", "Phenelzine", "Tranylcypromine", "Isocarboxazid", "Selegiline"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Phenelzine", "Tranylcypromine", "Isocarboxazid", "Selegiline", "MAOI"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["TCA", "Tricyclic", "Amitriptyline", "Nortriptyline", "Imipramine", "Desipramine"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Concurrent use of TCAs and MAOIs can cause hypertensive crisis, hyperpyrexia, seizures, and death.',
            recommendation: 'CONTRAINDICATED. Allow 14-day washout period between agents. Consider alternative antidepressants with supervision.'
        }
    },
    {
        ruleId: 'DRUG_INT_008',
        name: 'Aminoglycosides + Loop Diuretics (Ototoxicity/Nephrotoxicity)',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'IDSA Guidelines / FDA Warning',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Gentamicin", "Tobramycin", "Amikacin", "Streptomycin", "Neomycin", "Aminoglycoside"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Loop Diuretic", "Furosemide", "Bumetanide", "Torsemide", "Ethacrynic Acid"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Furosemide", "Bumetanide", "Torsemide", "Ethacrynic Acid"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Aminoglycoside", "Gentamicin", "Tobramycin", "Amikacin"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Concurrent use of aminoglycosides and loop diuretics increases risk of permanent ototoxicity and acute kidney injury.',
            recommendation: 'Avoid combination. If necessary, use extended-interval aminoglycoside dosing, monitor drug levels, audiometry, and renal function closely.'
        }
    },
    // ============================================
    // SOFT_NUDGE Rules - Significant interactions requiring monitoring
    // ============================================
    {
        ruleId: 'DRUG_INT_009',
        name: 'ACE Inhibitors + Potassium Supplements (Hyperkalemia)',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'AHA/ACC Heart Failure Guidelines',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Lisinopril", "Enalapril", "Ramipril", "Captopril", "Benazepril", "ACE Inhibitor", "Losartan", "Valsartan", "ARB"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Potassium Supplement", "Potassium Chloride", "K-Dur", "Klor-Con"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Potassium Chloride", "K-Dur", "Klor-Con"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["ACE Inhibitor", "Lisinopril", "Enalapril", "ARB", "Losartan", "Valsartan"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'ACE inhibitors/ARBs reduce potassium excretion. Adding potassium supplements increases risk of life-threatening hyperkalemia.',
            recommendation: 'Check serum potassium before and within 1 week of starting. Avoid if K+ > 5.0 mEq/L. Monitor K+ regularly. Consider dietary potassium sources instead.'
        }
    },
    {
        ruleId: 'DRUG_INT_010',
        name: 'Potassium-Sparing Diuretics + ACE Inhibitors/ARBs (Hyperkalemia)',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'AHA Heart Failure Guidelines',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Spironolactone", "Eplerenone", "Amiloride", "Triamterene"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["ACE Inhibitor", "Lisinopril", "Enalapril", "ARB", "Losartan", "Valsartan"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Lisinopril", "Enalapril", "Ramipril", "Losartan", "Valsartan"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Potassium-Sparing Diuretic", "Spironolactone", "Eplerenone", "Amiloride"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Combining potassium-sparing diuretics with ACE inhibitors/ARBs significantly increases hyperkalemia risk, especially in renal impairment.',
            recommendation: 'Can be used together with careful monitoring. Check K+ at baseline, 1 week, then monthly. Start with low doses. Avoid if eGFR < 30 mL/min.'
        }
    },
    {
        ruleId: 'MED_CONTRA_002',
        name: 'Fluoroquinolones + Tendon Rupture History',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'FDA Boxed Warning',
            year: 2024,
            url: 'https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-fda-updates-warnings-fluoroquinolone-antibiotics'
        },
        logic: {
            "and": [
                { "some": [{ "var": "patient_conditions" }, { "in": [{ "var": "" }, ["Tendon Rupture History", "Tendinopathy", "Achilles Tendon Injury", "Corticosteroid Use"]] }] },
                { "in": [{ "var": "proposed_medication_class" }, ["Fluoroquinolone", "Ciprofloxacin", "Levofloxacin", "Moxifloxacin", "Ofloxacin"]] }
            ]
        },
        intervention: {
            message: 'Fluoroquinolones increase risk of tendon rupture, especially in patients with prior tendon disorders or concurrent corticosteroid use.',
            recommendation: 'Use alternative antibiotic if possible. If fluoroquinolone required, warn patient to stop immediately and seek care if tendon pain/swelling occurs.'
        }
    },
    {
        ruleId: 'DRUG_INT_011',
        name: 'Lithium + NSAIDs/Dehydration (Lithium Toxicity)',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'APA Practice Guidelines / FDA',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Lithium", "Lithobid", "Eskalith"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["NSAID", "Ibuprofen", "Naproxen", "Diclofenac", "Indomethacin", "Ketorolac"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Lithium", "Lithobid"]] }] },
                        { "some": [{ "var": "patient_conditions" }, { "in": [{ "var": "" }, ["Dehydration", "Diarrhea", "Vomiting", "Low Sodium Diet"]] }] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'NSAIDs reduce lithium clearance by 25%. Dehydration further increases lithium levels, risking toxicity (tremor, confusion, seizures).',
            recommendation: 'Use acetaminophen instead of NSAIDs. Ensure adequate hydration. Check lithium level within 5 days of NSAID initiation. Educate on toxicity signs.'
        }
    },
    {
        ruleId: 'DRUG_INT_012',
        name: 'Digoxin + Hypokalemia (Digoxin Toxicity)',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'AHA/ACC Heart Failure Guidelines',
            year: 2024
        },
        logic: {
            "and": [
                { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Digoxin", "Digitalis", "Lanoxin"]] }] },
                { "or": [
                    { "some": [{ "var": "patient_conditions" }, { "in": [{ "var": "" }, ["Hypokalemia", "Low Potassium"]] }] },
                    { "in": [{ "var": "proposed_medication_class" }, ["Loop Diuretic", "Thiazide", "Furosemide", "Hydrochlorothiazide"]] }
                ]}
            ]
        },
        intervention: {
            message: 'Hypokalemia increases myocardial sensitivity to digoxin, increasing risk of fatal arrhythmias even at therapeutic digoxin levels.',
            recommendation: 'Maintain K+ between 4.0-5.0 mEq/L. Monitor potassium with diuretic initiation. Consider potassium-sparing diuretic or supplementation.'
        }
    },
    {
        ruleId: 'MED_CONTRA_003',
        name: 'Anticoagulants + Fall Risk (Elderly)',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'AGS Beers Criteria / CHEST Guidelines',
            year: 2024,
            url: 'https://www.americangeriatrics.org/beers-criteria'
        },
        logic: {
            "and": [
                { "some": [{ "var": "patient_conditions" }, { "in": [{ "var": "" }, ["Fall Risk", "Falls History", "Gait Instability", "Balance Disorder", "Age > 75"]] }] },
                { "in": [{ "var": "proposed_medication_class" }, ["Anticoagulant", "Warfarin", "Apixaban", "Rivaroxaban", "Dabigatran", "Edoxaban", "Enoxaparin"]] }
            ]
        },
        intervention: {
            message: 'Anticoagulants in fall-prone elderly patients increase risk of intracranial hemorrhage and major bleeding events.',
            recommendation: 'Assess fall risk formally. Address modifiable fall risk factors. Consider shorter-acting agents. Ensure indication is appropriate and benefits outweigh risks.'
        }
    },
    {
        ruleId: 'DRUG_INT_013',
        name: 'Tetracyclines + Antacids/Dairy (Reduced Absorption)',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'Clinical Pharmacology / FDA',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Tetracycline", "Doxycycline", "Minocycline"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Antacid", "Calcium Supplement", "Iron Supplement", "Magnesium", "Aluminum Hydroxide"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Calcium Carbonate", "Tums", "Iron Sulfate", "Magnesium Hydroxide"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Tetracycline", "Doxycycline", "Minocycline"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Divalent and trivalent cations (Ca, Mg, Fe, Al) chelate tetracyclines, reducing absorption by up to 90%.',
            recommendation: 'Separate administration by at least 2 hours (tetracycline before) or 4-6 hours (after). Counsel patient on dairy avoidance around dosing.'
        }
    },
    {
        ruleId: 'DRUG_INT_014',
        name: 'Theophylline + Ciprofloxacin (Theophylline Toxicity)',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'Clinical Pharmacokinetics / FDA',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Theophylline", "Aminophylline"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Ciprofloxacin", "Enoxacin", "Fluoroquinolone"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Ciprofloxacin", "Enoxacin"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Theophylline", "Aminophylline"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Ciprofloxacin inhibits CYP1A2, increasing theophylline levels by 15-30%, causing seizures, arrhythmias, and nausea.',
            recommendation: 'Reduce theophylline dose by 30-50%. Monitor theophylline levels. Consider levofloxacin or moxifloxacin which have less CYP1A2 inhibition.'
        }
    },
    {
        ruleId: 'DRUG_INT_015',
        name: 'Azole Antifungals + Statins (Rhabdomyolysis)',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'FDA Drug Safety Communication',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Itraconazole", "Ketoconazole", "Voriconazole", "Posaconazole"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Statin", "Simvastatin", "Lovastatin", "Atorvastatin"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Simvastatin", "Lovastatin", "Atorvastatin"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Azole Antifungal", "Itraconazole", "Ketoconazole", "Voriconazole"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Azole antifungals inhibit CYP3A4, dramatically increasing statin levels and risk of myopathy/rhabdomyolysis.',
            recommendation: 'Temporarily discontinue statin during azole therapy, or use pravastatin/rosuvastatin which are not CYP3A4 substrates. Monitor for muscle pain/weakness.'
        }
    },
    {
        ruleId: 'DRUG_INT_016',
        name: 'Sulfonamides + Methotrexate (Bone Marrow Suppression)',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'ACR Rheumatology Guidelines',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Methotrexate", "MTX"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Sulfonamide", "Sulfamethoxazole", "Trimethoprim-Sulfamethoxazole", "Bactrim", "Septra"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Sulfamethoxazole", "Bactrim", "Septra"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Methotrexate", "MTX", "Antimetabolite"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Sulfonamides displace methotrexate from protein binding and inhibit renal excretion, increasing risk of pancytopenia.',
            recommendation: 'Avoid combination. Use alternative antibiotics. If unavoidable, reduce methotrexate dose and monitor CBC weekly.'
        }
    },
    {
        ruleId: 'MED_CONTRA_004',
        name: 'NSAIDs + Chronic Kidney Disease',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'KDIGO CKD Guidelines',
            year: 2024,
            url: 'https://kdigo.org/guidelines/'
        },
        logic: {
            "and": [
                { "some": [{ "var": "patient_conditions" }, { "in": [{ "var": "" }, ["Chronic Kidney Disease", "CKD", "Renal Impairment", "eGFR < 60", "Kidney Disease"]] }] },
                { "in": [{ "var": "proposed_medication_class" }, ["NSAID", "Ibuprofen", "Naproxen", "Diclofenac", "Ketorolac", "Celecoxib", "Meloxicam"]] }
            ]
        },
        intervention: {
            message: 'NSAIDs reduce renal prostaglandins, causing acute kidney injury and accelerating CKD progression.',
            recommendation: 'Avoid NSAIDs in CKD Stage 3+. Use acetaminophen, topical agents, or non-pharmacological pain management. If essential, use lowest dose for shortest duration.'
        }
    },
    {
        ruleId: 'DRUG_INT_017',
        name: 'Carbamazepine + Hormonal Contraceptives (Contraceptive Failure)',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'ACOG / FDA',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Carbamazepine", "Tegretol", "Phenytoin", "Phenobarbital", "Oxcarbazepine"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Oral Contraceptive", "Hormonal Contraceptive", "Estrogen", "Progestin", "Birth Control"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Oral Contraceptive", "Ethinyl Estradiol", "Levonorgestrel"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Carbamazepine", "Phenytoin", "Phenobarbital", "Enzyme-Inducing Antiepileptic"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Enzyme-inducing antiepileptics increase hepatic metabolism of contraceptive hormones, reducing efficacy and causing unintended pregnancy.',
            recommendation: 'Use IUD (copper or high-dose levonorgestrel), depot medroxyprogesterone, or barrier methods. If oral contraceptives used, recommend 50mcg ethinyl estradiol formulation.'
        }
    },
    {
        ruleId: 'DRUG_INT_018',
        name: 'Rifampin + Oral Contraceptives (Contraceptive Failure)',
        severity: 'SOFT_NUDGE',
        source: {
            authority: 'CDC / WHO Contraception Guidelines',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Rifampin", "Rifampicin", "Rifabutin"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Oral Contraceptive", "Hormonal Contraceptive", "Birth Control"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Oral Contraceptive", "Birth Control Pill"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Rifampin", "Rifampicin", "Rifabutin"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Rifampin is a potent CYP3A4 inducer that reduces oral contraceptive efficacy by up to 50%, causing contraceptive failure.',
            recommendation: 'Use non-hormonal contraception (copper IUD, barrier methods) during rifampin therapy and for 28 days after discontinuation.'
        }
    },
    // ============================================
    // INFO Rules - Important but lower severity
    // ============================================
    {
        ruleId: 'DRUG_INT_019',
        name: 'Statins + Grapefruit Juice (Increased Statin Levels)',
        severity: 'INFO',
        source: {
            authority: 'FDA / Clinical Pharmacology',
            year: 2024
        },
        logic: {
            "and": [
                { "some": [{ "var": "dietary_factors" }, { "in": [{ "var": "" }, ["Grapefruit", "Grapefruit Juice"]] }] },
                { "in": [{ "var": "proposed_medication_class" }, ["Statin", "Simvastatin", "Lovastatin", "Atorvastatin"]] }
            ]
        },
        intervention: {
            message: 'Grapefruit juice inhibits intestinal CYP3A4, increasing levels of simvastatin, lovastatin, and atorvastatin.',
            recommendation: 'Counsel patient to avoid grapefruit/grapefruit juice, or switch to pravastatin/rosuvastatin which are not affected.'
        }
    },
    {
        ruleId: 'DRUG_INT_020',
        name: 'Metformin + IV Contrast (Lactic Acidosis Risk)',
        severity: 'INFO',
        source: {
            authority: 'ACR Contrast Manual',
            year: 2024,
            url: 'https://www.acr.org/Clinical-Resources/Contrast-Manual'
        },
        logic: {
            "and": [
                { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Metformin", "Glucophage"]] }] },
                { "some": [{ "var": "planned_procedures" }, { "in": [{ "var": "" }, ["IV Contrast", "CT with Contrast", "Angiography"]] }] }
            ]
        },
        intervention: {
            message: 'Metformin may accumulate if contrast-induced nephropathy occurs, potentially causing lactic acidosis.',
            recommendation: 'Hold metformin day of and 48 hours after contrast. Resume after confirming stable renal function. Higher risk if eGFR < 45.'
        }
    },
    {
        ruleId: 'DRUG_INT_021',
        name: 'Warfarin + Vitamin K (Reduced Anticoagulation)',
        severity: 'INFO',
        source: {
            authority: 'CHEST Anticoagulation Guidelines',
            year: 2024
        },
        logic: {
            "and": [
                { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Warfarin", "Coumadin"]] }] },
                { "or": [
                    { "some": [{ "var": "dietary_factors" }, { "in": [{ "var": "" }, ["High Vitamin K Diet", "Kale", "Spinach", "Broccoli"]] }] },
                    { "in": [{ "var": "proposed_medication_class" }, ["Vitamin K", "Vitamin K Supplement"]] }
                ]}
            ]
        },
        intervention: {
            message: 'Variable vitamin K intake causes INR fluctuations in patients on warfarin.',
            recommendation: 'Counsel on consistent vitamin K intake rather than avoidance. Do not start vitamin K supplements without discussing with provider.'
        }
    },
    {
        ruleId: 'DRUG_INT_022',
        name: 'Metronidazole + Alcohol (Disulfiram-like Reaction)',
        severity: 'INFO',
        source: {
            authority: 'Clinical Pharmacology / FDA',
            year: 2024
        },
        logic: {
            "and": [
                { "in": [{ "var": "proposed_medication_class" }, ["Metronidazole", "Flagyl", "Tinidazole"]] },
                { "some": [{ "var": "social_history" }, { "in": [{ "var": "" }, ["Alcohol Use", "Social Drinker"]] }] }
            ]
        },
        intervention: {
            message: 'Metronidazole inhibits aldehyde dehydrogenase, causing severe nausea, vomiting, and flushing with alcohol consumption.',
            recommendation: 'Advise complete alcohol avoidance during treatment and 48 hours after completing metronidazole. Includes alcohol in mouthwash and cooking.'
        }
    },
    {
        ruleId: 'DRUG_INT_023',
        name: 'Proton Pump Inhibitors + Clopidogrel (Reduced Efficacy)',
        severity: 'INFO',
        source: {
            authority: 'FDA Drug Safety Communication',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Omeprazole", "Esomeprazole"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Clopidogrel", "Plavix"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Clopidogrel", "Plavix"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["PPI", "Omeprazole", "Esomeprazole"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Omeprazole and esomeprazole inhibit CYP2C19 activation of clopidogrel, potentially reducing antiplatelet effect.',
            recommendation: 'Use pantoprazole or H2 blocker if gastroprotection needed. Separate dosing by 12 hours if omeprazole must be used.'
        }
    },
    {
        ruleId: 'DRUG_INT_024',
        name: 'Allopurinol + Azathioprine (Myelosuppression)',
        severity: 'INFO',
        source: {
            authority: 'ACR Rheumatology Guidelines',
            year: 2024
        },
        logic: {
            "or": [
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Allopurinol", "Zyloprim"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Azathioprine", "Imuran", "6-Mercaptopurine"]] }
                    ]
                },
                {
                    "and": [
                        { "some": [{ "var": "current_medications" }, { "in": [{ "var": "" }, ["Azathioprine", "Imuran", "6-Mercaptopurine"]] }] },
                        { "in": [{ "var": "proposed_medication_class" }, ["Allopurinol", "Zyloprim"]] }
                    ]
                }
            ]
        },
        intervention: {
            message: 'Allopurinol inhibits xanthine oxidase, blocking azathioprine/6-MP metabolism and causing toxic accumulation.',
            recommendation: 'Reduce azathioprine dose by 50-75% if combination necessary. Consider febuxostat as alternative (less interaction). Monitor CBC closely.'
        }
    },
    {
        ruleId: 'MED_CONTRA_005',
        name: 'ACE Inhibitors/ARBs + Pregnancy',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'FDA Pregnancy Category D/X',
            year: 2024
        },
        logic: {
            "and": [
                { "some": [{ "var": "patient_conditions" }, { "in": [{ "var": "" }, ["Pregnancy", "Pregnant", "Possible Pregnancy"]] }] },
                { "in": [{ "var": "proposed_medication_class" }, ["ACE Inhibitor", "ARB", "Lisinopril", "Enalapril", "Losartan", "Valsartan", "Captopril"]] }
            ]
        },
        intervention: {
            message: 'ACE inhibitors and ARBs cause fetal renal dysgenesis, oligohydramnios, and death when used in 2nd/3rd trimester.',
            recommendation: 'Discontinue immediately if pregnancy detected. Use labetalol, nifedipine, or methyldopa for hypertension in pregnancy.'
        }
    },
    {
        ruleId: 'MED_CONTRA_006',
        name: 'Isotretinoin + Pregnancy',
        severity: 'HARD_BLOCK',
        source: {
            authority: 'FDA iPLEDGE Program',
            year: 2024,
            url: 'https://www.ipledgeprogram.com/'
        },
        logic: {
            "and": [
                { "some": [{ "var": "patient_conditions" }, { "in": [{ "var": "" }, ["Pregnancy", "Pregnant", "Possible Pregnancy"]] }] },
                { "in": [{ "var": "proposed_medication_class" }, ["Isotretinoin", "Accutane", "Claravis", "Retinoid"]] }
            ]
        },
        intervention: {
            message: 'Isotretinoin is absolutely contraindicated in pregnancy - causes severe birth defects (CNS, cardiac, craniofacial).',
            recommendation: 'Must be enrolled in iPLEDGE. Requires 2 negative pregnancy tests before starting and monthly thereafter. Two forms of contraception required.'
        }
    }
];
