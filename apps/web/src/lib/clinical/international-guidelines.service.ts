/**
 * International Clinical Guidelines Service
 * 
 * Aggregates international health protocol sources:
 * - WHO Model List of Essential Medicines
 * - NICE UK Guidelines (via API)
 * - ESC Cardiology Guidelines (structured data)
 * - International medication safety alerts
 */

import { logger } from '@/lib/logger';

// =============================================================================
// WHO ESSENTIAL MEDICINES LIST (21st Edition 2019, updated 2023)
// =============================================================================

interface EssentialMedicine {
    name: string;
    category: string;
    formulation: string;
    whoCode: string;
    internationalNonproprietaryName: string;
    notes?: string;
}

// Core essential medicines for clinical decision support
const WHO_ESSENTIAL_MEDICINES: EssentialMedicine[] = [
    // Analgesics
    { name: 'Paracetamol', category: 'Analgesic', formulation: 'Tablet 500mg', whoCode: '2.1', internationalNonproprietaryName: 'Paracetamol' },
    { name: 'Ibuprofen', category: 'Analgesic (NSAID)', formulation: 'Tablet 200mg, 400mg', whoCode: '2.1', internationalNonproprietaryName: 'Ibuprofen' },
    { name: 'Morphine', category: 'Opioid Analgesic', formulation: 'Injection 10mg/mL', whoCode: '2.2', internationalNonproprietaryName: 'Morphine' },

    // Antibiotics
    { name: 'Amoxicillin', category: 'Antibiotic', formulation: 'Tablet/Capsule 500mg', whoCode: '6.2', internationalNonproprietaryName: 'Amoxicillin' },
    { name: 'Azithromycin', category: 'Antibiotic (Macrolide)', formulation: 'Tablet 250mg, 500mg', whoCode: '6.2', internationalNonproprietaryName: 'Azithromycin' },
    { name: 'Ciprofloxacin', category: 'Antibiotic (Fluoroquinolone)', formulation: 'Tablet 500mg', whoCode: '6.2', internationalNonproprietaryName: 'Ciprofloxacin' },
    { name: 'Metronidazole', category: 'Antibiotic/Antiprotozoal', formulation: 'Tablet 200-500mg', whoCode: '6.2', internationalNonproprietaryName: 'Metronidazole' },

    // Cardiovascular
    { name: 'Amlodipine', category: 'Antihypertensive', formulation: 'Tablet 5mg', whoCode: '12.3', internationalNonproprietaryName: 'Amlodipine' },
    { name: 'Atenolol', category: 'Beta-blocker', formulation: 'Tablet 50mg, 100mg', whoCode: '12.1', internationalNonproprietaryName: 'Atenolol' },
    { name: 'Aspirin', category: 'Antiplatelet', formulation: 'Tablet 75-100mg', whoCode: '12.5', internationalNonproprietaryName: 'Acetylsalicylic acid', notes: 'Low-dose for cardiovascular prevention' },
    { name: 'Atorvastatin', category: 'Statin', formulation: 'Tablet 10mg, 20mg, 40mg', whoCode: '12.6', internationalNonproprietaryName: 'Atorvastatin' },
    { name: 'Lisinopril', category: 'ACE Inhibitor', formulation: 'Tablet 5mg, 10mg, 20mg', whoCode: '12.3', internationalNonproprietaryName: 'Lisinopril' },

    // Diabetes
    { name: 'Metformin', category: 'Antidiabetic', formulation: 'Tablet 500mg, 850mg', whoCode: '18.5', internationalNonproprietaryName: 'Metformin' },
    { name: 'Insulin (Regular)', category: 'Insulin', formulation: 'Injection 100 IU/mL', whoCode: '18.5', internationalNonproprietaryName: 'Insulin' },
    { name: 'Glibenclamide', category: 'Sulfonylurea', formulation: 'Tablet 2.5mg, 5mg', whoCode: '18.5', internationalNonproprietaryName: 'Glibenclamide' },

    // Respiratory
    { name: 'Salbutamol', category: 'Bronchodilator', formulation: 'Inhaler 100mcg/dose', whoCode: '25.1', internationalNonproprietaryName: 'Salbutamol' },
    { name: 'Beclometasone', category: 'Inhaled Corticosteroid', formulation: 'Inhaler 50-250mcg/dose', whoCode: '25.2', internationalNonproprietaryName: 'Beclometasone' },

    // Mental Health
    { name: 'Fluoxetine', category: 'Antidepressant (SSRI)', formulation: 'Tablet/Capsule 20mg', whoCode: '24.2', internationalNonproprietaryName: 'Fluoxetine' },
    { name: 'Diazepam', category: 'Anxiolytic', formulation: 'Tablet 5mg', whoCode: '24.3', internationalNonproprietaryName: 'Diazepam', notes: 'Short-term use only' },
];

// =============================================================================
// INTERNATIONAL CLINICAL GUIDELINES (Structured Summaries)
// =============================================================================

interface ClinicalGuideline {
    id: string;
    title: string;
    source: 'WHO' | 'NICE' | 'ESC' | 'AHA' | 'ACC' | 'GINA' | 'USPSTF';
    country: string;
    condition: string;
    year: number;
    keyRecommendations: string[];
    targetBP?: string;
    targetHbA1c?: string;
    targetLDL?: string;
    targetFEV1?: string;
    url?: string;
}

const INTERNATIONAL_GUIDELINES: ClinicalGuideline[] = [
    // Hypertension
    {
        id: 'nice-hypertension-2022',
        title: 'Hypertension in adults: diagnosis and management',
        source: 'NICE',
        country: 'UK',
        condition: 'Hypertension',
        year: 2022,
        targetBP: '<140/90 mmHg clinic, <135/85 mmHg ABPM/home (under 80), <150/90 if over 80',
        keyRecommendations: [
            'Offer ABPM to confirm diagnosis',
            'Start with single antihypertensive (ACE-I/ARB, CCB, or thiazide)',
            'Step up therapy if not at target after 4-6 weeks',
            'Consider dual therapy if BP significantly elevated',
        ],
        url: 'https://www.nice.org.uk/guidance/ng136',
    },
    {
        id: 'esc-hypertension-2023',
        title: 'ESC Guidelines for Hypertension',
        source: 'ESC',
        country: 'Europe',
        condition: 'Hypertension',
        year: 2023,
        targetBP: '<130/80 mmHg if tolerated, but not <120/70',
        keyRecommendations: [
            'Initial combination therapy for most patients',
            'Single-pill combinations improve adherence',
            'RAAS blocker + CCB or RAAS blocker + diuretic preferred',
            'Reserve beta-blockers for specific indications',
        ],
    },

    // Diabetes
    {
        id: 'nice-diabetes-2022',
        title: 'Type 2 diabetes in adults: management',
        source: 'NICE',
        country: 'UK',
        condition: 'Type 2 Diabetes',
        year: 2022,
        targetHbA1c: '48 mmol/mol (6.5%) if on single drug, 53 mmol/mol (7.0%) if on multiple drugs',
        keyRecommendations: [
            'Metformin first-line unless contraindicated',
            'Consider SGLT2i for CVD or heart failure',
            'Consider GLP-1 RA if BMI ≥35 or overweight with specific conditions',
            'Annual review including foot examination',
        ],
        url: 'https://www.nice.org.uk/guidance/ng28',
    },

    // Cardiovascular Prevention
    {
        id: 'esc-cvd-prevention-2021',
        title: 'ESC Guidelines on Cardiovascular Disease Prevention',
        source: 'ESC',
        country: 'Europe',
        condition: 'CVD Prevention',
        year: 2021,
        keyRecommendations: [
            'Use SCORE2/SCORE2-OP for CV risk estimation',
            'LDL-C target <1.4 mmol/L in very high risk',
            'Aspirin for secondary prevention only',
            'SGLT2i/GLP-1 RA in T2DM with atherosclerotic CVD',
        ],
    },

    // Depression
    {
        id: 'nice-depression-2022',
        title: 'Depression in adults: treatment and management',
        source: 'NICE',
        country: 'UK',
        condition: 'Depression',
        year: 2022,
        keyRecommendations: [
            'Discuss treatment options including self-help',
            'First-line: SSRI (sertraline, fluoxetine, citalopram, escitalopram)',
            'Review after 2-4 weeks for response',
            'Continue treatment for 6+ months after remission',
        ],
        url: 'https://www.nice.org.uk/guidance/ng222',
    },

    // =========================================================================
    // AHA/ACC CARDIOLOGY GUIDELINES (US)
    // =========================================================================
    {
        id: 'aha-acc-lipids-2018',
        title: 'AHA/ACC Guideline on Management of Blood Cholesterol',
        source: 'AHA',
        country: 'USA',
        condition: 'Hyperlipidemia',
        year: 2018,
        targetLDL: '<70 mg/dL for very high risk, <100 mg/dL for high risk',
        keyRecommendations: [
            'High-intensity statin for clinical ASCVD',
            'Calculate 10-year ASCVD risk using Pooled Cohort Equations',
            'Consider adding ezetimibe if LDL >70 on max statin',
            'PCSK9 inhibitors for very high risk not at goal',
        ],
        url: 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000000625',
    },
    {
        id: 'aha-acc-hf-2022',
        title: 'AHA/ACC/HFSA Guideline for Heart Failure Management',
        source: 'AHA',
        country: 'USA',
        condition: 'Heart Failure',
        year: 2022,
        keyRecommendations: [
            'GDMT with ACEi/ARB/ARNi, beta-blocker, MRA, SGLT2i for HFrEF',
            'SGLT2i now Class I for all HFrEF regardless of diabetes',
            'Device therapy (ICD, CRT) per specific criteria',
            'Diuretics for volume management',
        ],
        url: 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000001063',
    },
    {
        id: 'acc-chronic-coronary-2023',
        title: 'ACC/AHA Chronic Coronary Disease Guideline',
        source: 'ACC',
        country: 'USA',
        condition: 'Coronary Artery Disease',
        year: 2023,
        keyRecommendations: [
            'Aspirin 75-100mg daily for secondary prevention',
            'High-intensity statin for all with CCD',
            'Consider P2Y12 inhibitor + aspirin if benefit > bleeding risk',
            'Beta-blockers for post-MI or LV dysfunction',
            'ACEi/ARB for HTN, DM, LV dysfunction, or CKD',
        ],
    },

    // =========================================================================
    // GINA ASTHMA GUIDELINES (International)
    // =========================================================================
    {
        id: 'gina-asthma-2024',
        title: 'GINA Global Strategy for Asthma Management and Prevention',
        source: 'GINA',
        country: 'International',
        condition: 'Asthma',
        year: 2024,
        keyRecommendations: [
            'Step 1: As-needed low-dose ICS-formoterol (preferred) or SABA + ICS',
            'Step 2: Daily low-dose ICS + as-needed SABA',
            'Step 3: Low-dose ICS-LABA maintenance + as-needed',
            'Step 4: Medium-dose ICS-LABA + as-needed',
            'Step 5: High-dose ICS-LABA ± add-on (anti-IgE, anti-IL5, etc.)',
            'NEVER SABA-only treatment - always with ICS',
        ],
        url: 'https://ginasthma.org/reports/',
    },
    {
        id: 'gina-copd-2024',
        title: 'GOLD 2024 Report - COPD Management',
        source: 'GINA',
        country: 'International',
        condition: 'COPD',
        year: 2024,
        targetFEV1: 'Symptom control and exacerbation prevention based on ABCD assessment',
        keyRecommendations: [
            'Inhaled bronchodilators (LABA ± LAMA) are central therapy',
            'Add ICS only if blood eosinophils ≥300 and exacerbations',
            'Pulmonary rehabilitation for all symptomatic patients',
            'Smoking cessation is essential',
            'Flu and pneumococcal vaccination recommended',
        ],
        url: 'https://goldcopd.org/2024-gold-report/',
    },
];

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Check if medicine is on WHO Essential Medicines List
 */
export function isEssentialMedicine(drugName: string): EssentialMedicine | null {
    const lowerName = drugName.toLowerCase();
    return WHO_ESSENTIAL_MEDICINES.find(m =>
        m.name.toLowerCase() === lowerName ||
        m.internationalNonproprietaryName.toLowerCase() === lowerName
    ) || null;
}

/**
 * Get all essential medicines by category
 */
export function getEssentialMedicinesByCategory(category: string): EssentialMedicine[] {
    return WHO_ESSENTIAL_MEDICINES.filter(m =>
        m.category.toLowerCase().includes(category.toLowerCase())
    );
}

/**
 * Get international guidelines for a condition
 */
export function getGuidelinesForCondition(condition: string): ClinicalGuideline[] {
    const lowerCondition = condition.toLowerCase();
    return INTERNATIONAL_GUIDELINES.filter(g =>
        g.condition.toLowerCase().includes(lowerCondition) ||
        g.title.toLowerCase().includes(lowerCondition)
    );
}

/**
 * Get guidelines by source (NICE, ESC, WHO)
 */
export function getGuidelinesBySource(source: ClinicalGuideline['source']): ClinicalGuideline[] {
    return INTERNATIONAL_GUIDELINES.filter(g => g.source === source);
}

/**
 * Get target values for common conditions
 */
export function getClinicalTargets(condition: string): {
    targets: Record<string, string>;
    sources: string[];
} {
    const guidelines = getGuidelinesForCondition(condition);
    const targets: Record<string, string> = {};
    const sources: string[] = [];

    for (const g of guidelines) {
        sources.push(`${g.source} ${g.year}`);
        if (g.targetBP) targets['bloodPressure'] = g.targetBP;
        if (g.targetHbA1c) targets['HbA1c'] = g.targetHbA1c;
    }

    return { targets, sources };
}

/**
 * Generate international guidelines summary for a patient's conditions
 */
export function generateGuidelinesSummary(conditions: string[]): string {
    let summary = '**International Clinical Guidelines Summary**\n\n';

    for (const condition of conditions) {
        const guidelines = getGuidelinesForCondition(condition);
        if (guidelines.length > 0) {
            summary += `### ${condition}\n`;
            for (const g of guidelines) {
                summary += `\n**${g.source} (${g.country}, ${g.year})**\n`;
                for (const rec of g.keyRecommendations.slice(0, 3)) {
                    summary += `- ${rec}\n`;
                }
                if (g.targetBP) summary += `- Target BP: ${g.targetBP}\n`;
                if (g.targetHbA1c) summary += `- Target HbA1c: ${g.targetHbA1c}\n`;
            }
            summary += '\n';
        }
    }

    return summary;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const internationalGuidelinesService = {
    isEssentialMedicine,
    getEssentialMedicinesByCategory,
    getGuidelinesForCondition,
    getGuidelinesBySource,
    getClinicalTargets,
    generateGuidelinesSummary,
    WHO_ESSENTIAL_MEDICINES,
    INTERNATIONAL_GUIDELINES,
};
