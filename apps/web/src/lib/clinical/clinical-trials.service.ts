/**
 * Clinical Trials Service
 * 
 * Integrates with ClinicalTrials.gov API (v2.0) to:
 * - Search trials by condition, intervention, location
 * - Match patients to eligible trials based on criteria
 * - Track trial status and recruitment
 * 
 * @see https://clinicaltrials.gov/data-api/api
 */

import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface ClinicalTrial {
    nctId: string;
    title: string;
    status: 'RECRUITING' | 'NOT_YET_RECRUITING' | 'ACTIVE_NOT_RECRUITING' | 'COMPLETED' | 'TERMINATED' | 'SUSPENDED' | 'WITHDRAWN';
    phase: 'PHASE1' | 'PHASE2' | 'PHASE3' | 'PHASE4' | 'NA' | 'EARLY_PHASE1';
    conditions: string[];
    interventions: string[];
    sponsor: string;
    startDate: string;
    completionDate?: string;
    enrollmentCount?: number;
    eligibility: {
        minAge: number;
        maxAge: number;
        sex: 'ALL' | 'MALE' | 'FEMALE';
        healthyVolunteers: boolean;
        criteria: string;
    };
    locations: Array<{
        facility: string;
        city: string;
        state: string;
        country: string;
        status: 'RECRUITING' | 'NOT_YET_RECRUITING' | 'COMPLETED';
    }>;
    briefSummary: string;
    url: string;
}

export interface TrialSearchParams {
    condition?: string;
    intervention?: string;
    location?: string;
    status?: ClinicalTrial['status'][];
    phase?: ClinicalTrial['phase'][];
    minAge?: number;
    maxAge?: number;
    limit?: number;
}

export interface PatientTrialMatch {
    trial: ClinicalTrial;
    matchScore: number;
    matchReasons: string[];
    eligibilityStatus: 'LIKELY_ELIGIBLE' | 'POSSIBLY_ELIGIBLE' | 'REVIEW_REQUIRED';
}

// =============================================================================
// API CONFIGURATION
// =============================================================================

const CLINICALTRIALS_API_BASE = 'https://clinicaltrials.gov/api/v2';

// Cache for API responses
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// =============================================================================
// STATIC TRIAL DATA (Demo - in production uses live API)
// =============================================================================

const DEMO_TRIALS: ClinicalTrial[] = [
    {
        nctId: 'NCT05123456',
        title: 'A Phase 3 Study of Novel SGLT2 Inhibitor in Type 2 Diabetes with Heart Failure',
        status: 'RECRUITING',
        phase: 'PHASE3',
        conditions: ['Type 2 Diabetes', 'Heart Failure', 'Cardiomyopathy'],
        interventions: ['Experimental SGLT2 Inhibitor', 'Placebo'],
        sponsor: 'Example Pharmaceuticals',
        startDate: '2024-01-15',
        completionDate: '2026-12-31',
        enrollmentCount: 500,
        eligibility: {
            minAge: 40,
            maxAge: 80,
            sex: 'ALL',
            healthyVolunteers: false,
            criteria: 'Inclusion: Type 2 DM, EF < 40%, NYHA II-IV. Exclusion: Type 1 DM, eGFR < 30, recent MI.',
        },
        locations: [
            { facility: 'University Medical Center', city: 'Boston', state: 'MA', country: 'USA', status: 'RECRUITING' },
            { facility: 'Regional Heart Institute', city: 'Chicago', state: 'IL', country: 'USA', status: 'RECRUITING' },
        ],
        briefSummary: 'This study evaluates a novel SGLT2 inhibitor for reducing cardiovascular events in patients with T2DM and heart failure.',
        url: 'https://clinicaltrials.gov/study/NCT05123456',
    },
    {
        nctId: 'NCT05234567',
        title: 'Immune Checkpoint Inhibitor Combination for Advanced Non-Small Cell Lung Cancer',
        status: 'RECRUITING',
        phase: 'PHASE2',
        conditions: ['Non-Small Cell Lung Cancer', 'NSCLC', 'Lung Cancer'],
        interventions: ['Pembrolizumab', 'Novel TIM-3 Inhibitor'],
        sponsor: 'Cancer Research Consortium',
        startDate: '2023-06-01',
        completionDate: '2025-06-01',
        enrollmentCount: 200,
        eligibility: {
            minAge: 18,
            maxAge: 85,
            sex: 'ALL',
            healthyVolunteers: false,
            criteria: 'Inclusion: Stage IIIB-IV NSCLC, PD-L1 > 1%, no prior immunotherapy. Exclusion: Active autoimmune disease, brain mets.',
        },
        locations: [
            { facility: 'Cancer Treatment Center', city: 'New York', state: 'NY', country: 'USA', status: 'RECRUITING' },
        ],
        briefSummary: 'This trial combines anti-PD-1 and anti-TIM-3 therapy for patients with advanced NSCLC who have not received prior immunotherapy.',
        url: 'https://clinicaltrials.gov/study/NCT05234567',
    },
    {
        nctId: 'NCT05345678',
        title: 'Biologic Therapy for Severe Asthma with Eosinophilic Phenotype',
        status: 'RECRUITING',
        phase: 'PHASE3',
        conditions: ['Severe Asthma', 'Eosinophilic Asthma', 'Asthma'],
        interventions: ['Novel IL-5 Antibody', 'Mepolizumab'],
        sponsor: 'Respiratory Research Foundation',
        startDate: '2024-03-01',
        enrollmentCount: 300,
        eligibility: {
            minAge: 12,
            maxAge: 75,
            sex: 'ALL',
            healthyVolunteers: false,
            criteria: 'Inclusion: Severe asthma on high-dose ICS/LABA, blood eosinophils > 300. Exclusion: Current smoker, other lung disease.',
        },
        locations: [
            { facility: 'Pulmonary Research Center', city: 'Denver', state: 'CO', country: 'USA', status: 'RECRUITING' },
            { facility: 'Asthma Clinic', city: 'Los Angeles', state: 'CA', country: 'USA', status: 'RECRUITING' },
        ],
        briefSummary: 'Comparing a novel IL-5 antibody to mepolizumab for reduction of asthma exacerbations in patients with eosinophilic phenotype.',
        url: 'https://clinicaltrials.gov/study/NCT05345678',
    },
    {
        nctId: 'NCT05456789',
        title: 'GLP-1 Receptor Agonist for Obesity and Metabolic Syndrome',
        status: 'RECRUITING',
        phase: 'PHASE3',
        conditions: ['Obesity', 'Metabolic Syndrome', 'Prediabetes'],
        interventions: ['Weekly GLP-1 RA', 'Lifestyle Intervention'],
        sponsor: 'Metabolic Health Institute',
        startDate: '2024-02-01',
        enrollmentCount: 1000,
        eligibility: {
            minAge: 18,
            maxAge: 70,
            sex: 'ALL',
            healthyVolunteers: false,
            criteria: 'Inclusion: BMI > 30 or BMI > 27 with comorbidity, failed lifestyle modification. Exclusion: History of pancreatitis, MEN2.',
        },
        locations: [
            { facility: 'Weight Management Center', city: 'Houston', state: 'TX', country: 'USA', status: 'RECRUITING' },
        ],
        briefSummary: 'This study evaluates a once-weekly GLP-1 receptor agonist for sustained weight loss in adults with obesity.',
        url: 'https://clinicaltrials.gov/study/NCT05456789',
    },
    {
        nctId: 'NCT05567890',
        title: 'Novel Antidepressant for Treatment-Resistant Depression',
        status: 'RECRUITING',
        phase: 'PHASE2',
        conditions: ['Major Depressive Disorder', 'Treatment-Resistant Depression', 'Depression'],
        interventions: ['NMDA Modulator', 'Placebo'],
        sponsor: 'Neuroscience Research Partners',
        startDate: '2023-09-01',
        enrollmentCount: 150,
        eligibility: {
            minAge: 18,
            maxAge: 65,
            sex: 'ALL',
            healthyVolunteers: false,
            criteria: 'Inclusion: MDD diagnosis, failed ≥2 adequate antidepressant trials, PHQ-9 ≥15. Exclusion: Psychotic features, active suicidality.',
        },
        locations: [
            { facility: 'Psychiatric Research Unit', city: 'Baltimore', state: 'MD', country: 'USA', status: 'RECRUITING' },
        ],
        briefSummary: 'Evaluating a novel NMDA receptor modulator for rapid antidepressant effect in treatment-resistant depression.',
        url: 'https://clinicaltrials.gov/study/NCT05567890',
    },
];

// =============================================================================
// CACHE HELPERS
// =============================================================================

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (entry && entry.expires > Date.now()) {
        return entry.data as T;
    }
    cache.delete(key);
    return null;
}

function setCache(key: string, data: any): void {
    cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Search clinical trials by criteria
 */
export async function searchTrials(params: TrialSearchParams): Promise<ClinicalTrial[]> {
    const cacheKey = `trials:${JSON.stringify(params)}`;
    const cached = getCached<ClinicalTrial[]>(cacheKey);
    if (cached) return cached;

    // Filter demo trials (in production, call ClinicalTrials.gov API)
    let results = [...DEMO_TRIALS];

    if (params.condition) {
        const lowerCondition = params.condition.toLowerCase();
        results = results.filter(t =>
            t.conditions.some(c => c.toLowerCase().includes(lowerCondition)) ||
            t.title.toLowerCase().includes(lowerCondition)
        );
    }

    if (params.intervention) {
        const lowerIntervention = params.intervention.toLowerCase();
        results = results.filter(t =>
            t.interventions.some(i => i.toLowerCase().includes(lowerIntervention))
        );
    }

    if (params.status && params.status.length > 0) {
        results = results.filter(t => params.status!.includes(t.status));
    }

    if (params.phase && params.phase.length > 0) {
        results = results.filter(t => params.phase!.includes(t.phase));
    }

    if (params.minAge !== undefined) {
        results = results.filter(t => t.eligibility.maxAge >= params.minAge!);
    }

    if (params.maxAge !== undefined) {
        results = results.filter(t => t.eligibility.minAge <= params.maxAge!);
    }

    if (params.limit) {
        results = results.slice(0, params.limit);
    }

    setCache(cacheKey, results);
    return results;
}

/**
 * Get trial by NCT ID
 */
export function getTrialById(nctId: string): ClinicalTrial | null {
    return DEMO_TRIALS.find(t => t.nctId === nctId) || null;
}

/**
 * Match patient to eligible trials
 */
export async function matchPatientToTrials(patient: {
    age: number;
    sex: 'MALE' | 'FEMALE';
    conditions: string[];
    medications?: string[];
}): Promise<PatientTrialMatch[]> {
    const matches: PatientTrialMatch[] = [];

    for (const trial of DEMO_TRIALS) {
        if (trial.status !== 'RECRUITING') continue;

        let matchScore = 0;
        const matchReasons: string[] = [];

        // Check age eligibility
        if (patient.age >= trial.eligibility.minAge && patient.age <= trial.eligibility.maxAge) {
            matchScore += 25;
            matchReasons.push(`Age ${patient.age} within range ${trial.eligibility.minAge}-${trial.eligibility.maxAge}`);
        } else {
            continue; // Age disqualification
        }

        // Check sex eligibility
        if (trial.eligibility.sex === 'ALL' || trial.eligibility.sex === patient.sex) {
            matchScore += 10;
        } else {
            continue; // Sex disqualification
        }

        // Check condition match
        for (const patientCondition of patient.conditions) {
            const lowerCondition = patientCondition.toLowerCase();
            for (const trialCondition of trial.conditions) {
                if (trialCondition.toLowerCase().includes(lowerCondition) ||
                    lowerCondition.includes(trialCondition.toLowerCase())) {
                    matchScore += 30;
                    matchReasons.push(`Condition match: ${patientCondition} → ${trialCondition}`);
                    break;
                }
            }
        }

        if (matchScore < 35) continue; // Must have at least age + partial condition match

        // Determine eligibility status
        let eligibilityStatus: PatientTrialMatch['eligibilityStatus'] = 'REVIEW_REQUIRED';
        if (matchScore >= 65) {
            eligibilityStatus = 'LIKELY_ELIGIBLE';
        } else if (matchScore >= 50) {
            eligibilityStatus = 'POSSIBLY_ELIGIBLE';
        }

        matches.push({
            trial,
            matchScore,
            matchReasons,
            eligibilityStatus,
        });
    }

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return matches;
}

/**
 * Get recruiting trials count by condition
 */
export function getRecruitingTrialCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const trial of DEMO_TRIALS) {
        if (trial.status === 'RECRUITING') {
            for (const condition of trial.conditions) {
                counts[condition] = (counts[condition] || 0) + 1;
            }
        }
    }

    return counts;
}

/**
 * Generate trial summary for clinical notes
 */
export function generateTrialSummary(matches: PatientTrialMatch[]): string {
    if (matches.length === 0) {
        return 'No matching clinical trials found for this patient at this time.';
    }

    let summary = `**Clinical Trial Opportunities (${matches.length} matches)**\n\n`;

    const likelyEligible = matches.filter(m => m.eligibilityStatus === 'LIKELY_ELIGIBLE');
    if (likelyEligible.length > 0) {
        summary += `### Likely Eligible (${likelyEligible.length})\n`;
        for (const match of likelyEligible.slice(0, 3)) {
            summary += `- **${match.trial.nctId}**: ${match.trial.title}\n`;
            summary += `  Phase ${match.trial.phase.replace('PHASE', '')}, ${match.trial.status}\n`;
        }
        summary += '\n';
    }

    return summary;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const clinicalTrialsService = {
    search: searchTrials,
    getById: getTrialById,
    matchPatient: matchPatientToTrials,
    getRecruitingCounts: getRecruitingTrialCounts,
    generateSummary: generateTrialSummary,
    DEMO_TRIALS,
};
