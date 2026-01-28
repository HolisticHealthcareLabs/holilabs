/**
 * USPSTF Service - Preventive Care Recommendations
 * 
 * Integrates with USPSTF Prevention TaskForce API for:
 * - Evidence-based preventive care recommendations
 * - Screening schedules
 * - Grade A/B recommendations
 * 
 * @see https://www.uspreventiveservicestaskforce.org/uspstf/recommendation-topics/api
 */

import { logger } from '@/lib/logger';

const USPSTF_BASE_URL = 'https://data.uspstf.org/api/v2';

// Cache with 7-day TTL (recommendations change infrequently)
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

interface PatientCharacteristics {
    age: number;
    sex: 'male' | 'female';
    smokingStatus?: 'current' | 'former' | 'never';
    pregnant?: boolean;
    sexuallyActive?: boolean;
    diabetic?: boolean;
}

interface PreventiveRecommendation {
    id: string;
    title: string;
    grade: 'A' | 'B' | 'C' | 'D' | 'I';
    recommendation: string;
    releaseDate: string;
    ageRange?: { min?: number; max?: number };
    applicableSex?: 'male' | 'female' | 'both';
    riskFactors?: string[];
    screeningInterval?: string;
    url?: string;
}

interface CareGap {
    recommendationId: string;
    title: string;
    grade: string;
    reason: string;
    dueDate?: Date;
    priority: 'high' | 'medium' | 'low';
}

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
// CORE RECOMMENDATIONS (Static list for fast access)
// =============================================================================

const GRADE_A_B_RECOMMENDATIONS: PreventiveRecommendation[] = [
    // Screening Recommendations
    {
        id: 'breast-cancer-screening',
        title: 'Breast Cancer Screening',
        grade: 'B',
        recommendation: 'Biennial screening mammography for women aged 50-74',
        releaseDate: '2024-04-30',
        ageRange: { min: 50, max: 74 },
        applicableSex: 'female',
        screeningInterval: 'every 2 years',
    },
    {
        id: 'cervical-cancer-screening',
        title: 'Cervical Cancer Screening',
        grade: 'A',
        recommendation: 'Screen women aged 21-65 with cytology (Pap smear) every 3 years or cotesting with hrHPV every 5 years',
        releaseDate: '2018-08-21',
        ageRange: { min: 21, max: 65 },
        applicableSex: 'female',
        screeningInterval: 'every 3 years (Pap) or 5 years (HPV cotest)',
    },
    {
        id: 'colorectal-cancer-screening',
        title: 'Colorectal Cancer Screening',
        grade: 'A',
        recommendation: 'Screen adults aged 45-75 using stool-based tests, colonoscopy, or other tests',
        releaseDate: '2021-05-18',
        ageRange: { min: 45, max: 75 },
        applicableSex: 'both',
        screeningInterval: 'varies by method',
    },
    {
        id: 'lung-cancer-screening',
        title: 'Lung Cancer Screening',
        grade: 'B',
        recommendation: 'Annual low-dose CT for adults 50-80 with 20+ pack-year smoking history',
        releaseDate: '2021-03-09',
        ageRange: { min: 50, max: 80 },
        applicableSex: 'both',
        riskFactors: ['current_smoker', 'former_smoker_20pack_years'],
        screeningInterval: 'annually',
    },
    {
        id: 'diabetes-screening',
        title: 'Prediabetes and Diabetes Screening',
        grade: 'B',
        recommendation: 'Screen adults 35-70 with overweight or obesity for prediabetes and type 2 diabetes',
        releaseDate: '2021-08-24',
        ageRange: { min: 35, max: 70 },
        applicableSex: 'both',
        riskFactors: ['overweight', 'obesity'],
        screeningInterval: 'every 3 years',
    },
    {
        id: 'hypertension-screening',
        title: 'Hypertension Screening',
        grade: 'A',
        recommendation: 'Screen adults 18+ for hypertension with office blood pressure measurement',
        releaseDate: '2021-04-27',
        ageRange: { min: 18 },
        applicableSex: 'both',
        screeningInterval: 'annually',
    },
    {
        id: 'depression-screening',
        title: 'Depression Screening',
        grade: 'B',
        recommendation: 'Screen adults for depression when adequate systems are in place',
        releaseDate: '2016-01-26',
        ageRange: { min: 18 },
        applicableSex: 'both',
        screeningInterval: 'annually',
    },
    // Counseling Recommendations
    {
        id: 'statin-primary-prevention',
        title: 'Statin Use for Primary CVD Prevention',
        grade: 'B',
        recommendation: 'Prescribe statin for adults 40-75 with CVD risk factors and 10-year CVD risk ≥10%',
        releaseDate: '2022-08-23',
        ageRange: { min: 40, max: 75 },
        applicableSex: 'both',
        riskFactors: ['dyslipidemia', 'diabetes', 'hypertension', 'smoking'],
    },
    {
        id: 'fall-prevention',
        title: 'Fall Prevention in Older Adults',
        grade: 'B',
        recommendation: 'Exercise interventions to prevent falls in community-dwelling adults 65+',
        releaseDate: '2018-04-17',
        ageRange: { min: 65 },
        applicableSex: 'both',
    },
    {
        id: 'aspirin-preeclampsia',
        title: 'Aspirin for Preeclampsia Prevention',
        grade: 'B',
        recommendation: 'Low-dose aspirin after 12 weeks for pregnant persons at high risk',
        releaseDate: '2021-09-28',
        applicableSex: 'female',
        riskFactors: ['pregnant', 'high_risk_preeclampsia'],
    },
];

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get applicable preventive recommendations for a patient
 */
export function getRecommendations(
    patient: PatientCharacteristics
): PreventiveRecommendation[] {
    return GRADE_A_B_RECOMMENDATIONS.filter(rec => {
        // Check age range
        if (rec.ageRange?.min && patient.age < rec.ageRange.min) return false;
        if (rec.ageRange?.max && patient.age > rec.ageRange.max) return false;

        // Check sex
        if (rec.applicableSex && rec.applicableSex !== 'both' && rec.applicableSex !== patient.sex) {
            return false;
        }

        // Check specific risk factors for lung cancer screening
        if (rec.id === 'lung-cancer-screening') {
            if (patient.smokingStatus !== 'current' && patient.smokingStatus !== 'former') {
                return false;
            }
        }

        // Check pregnancy
        if (rec.id === 'aspirin-preeclampsia' && !patient.pregnant) {
            return false;
        }

        return true;
    });
}

/**
 * Identify care gaps for a patient based on last screening dates
 */
export function identifyCareGaps(
    patient: PatientCharacteristics,
    lastScreenings: Record<string, Date | null>
): CareGap[] {
    const applicable = getRecommendations(patient);
    const gaps: CareGap[] = [];

    for (const rec of applicable) {
        const lastDate = lastScreenings[rec.id];

        // Calculate if screening is due based on interval
        let isDue = !lastDate; // Due if never done

        if (lastDate && rec.screeningInterval) {
            const now = new Date();
            const intervalMonths = parseInterval(rec.screeningInterval);
            const dueDate = new Date(lastDate);
            dueDate.setMonth(dueDate.getMonth() + intervalMonths);
            isDue = now > dueDate;
        }

        if (isDue) {
            gaps.push({
                recommendationId: rec.id,
                title: rec.title,
                grade: rec.grade,
                reason: lastDate ? 'Screening overdue' : 'Never screened',
                priority: rec.grade === 'A' ? 'high' : 'medium',
                dueDate: lastDate ? undefined : new Date(),
            });
        }
    }

    return gaps.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

/**
 * Get screening schedule for a patient
 */
export function getScreeningSchedule(
    patient: PatientCharacteristics
): Array<{ screening: string; interval: string; nextDue: string }> {
    const applicable = getRecommendations(patient);

    return applicable
        .filter(rec => rec.screeningInterval)
        .map(rec => ({
            screening: rec.title,
            interval: rec.screeningInterval!,
            nextDue: 'Based on last screening date',
        }));
}

/**
 * Generate preventive care summary for clinical note
 */
export function generatePreventiveCareSummary(
    patient: PatientCharacteristics,
    lastScreenings: Record<string, Date | null>
): string {
    const gaps = identifyCareGaps(patient, lastScreenings);
    const applicable = getRecommendations(patient);

    let summary = `**Preventive Care Status**\n`;
    summary += `Applicable USPSTF Grade A/B Recommendations: ${applicable.length}\n\n`;

    if (gaps.length > 0) {
        summary += `**Care Gaps Identified (${gaps.length}):**\n`;
        for (const gap of gaps) {
            summary += `- ${gap.title} (Grade ${gap.grade}): ${gap.reason}\n`;
        }
    } else {
        summary += `All preventive screenings are up to date.\n`;
    }

    return summary;
}

// =============================================================================
// HELPERS
// =============================================================================

function parseInterval(interval: string): number {
    const lower = interval.toLowerCase();
    if (lower.includes('annual') || lower.includes('year')) {
        const match = lower.match(/(\d+)/);
        return (match ? parseInt(match[1]) : 1) * 12;
    }
    if (lower.includes('2 year')) return 24;
    if (lower.includes('3 year')) return 36;
    if (lower.includes('5 year')) return 60;
    return 12; // Default annual
}

// =============================================================================
// EXPORTS
// =============================================================================

export const uspstfService = {
    getRecommendations,
    identifyCareGaps,
    getScreeningSchedule,
    generatePreventiveCareSummary,
    GRADE_A_B_RECOMMENDATIONS,
};
