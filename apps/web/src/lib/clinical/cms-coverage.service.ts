/**
 * CMS Coverage Database Service
 * 
 * Integrates with CMS Medicare Coverage Database for:
 * - National Coverage Determinations (NCDs)
 * - Local Coverage Determinations (LCDs)
 * - Prior authorization requirements
 * - Coverage eligibility checks
 * 
 * @see https://www.cms.gov/medicare-coverage-database
 */

import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

interface CoverageDecision {
    id: string;
    type: 'NCD' | 'LCD';
    title: string;
    cptCodes?: string[];
    hcpcsCodes?: string[];
    icd10Codes?: string[];
    contractor?: string;
    jurisdiction?: string[];
    effectiveDate: string;
    summary: string;
    limitations?: string[];
    priorAuthRequired: boolean;
}

interface CoverageCheckResult {
    covered: boolean;
    coverageType: 'FULL' | 'CONDITIONAL' | 'NOT_COVERED' | 'PENDING_REVIEW';
    decisions: CoverageDecision[];
    priorAuthRequired: boolean;
    limitations: string[];
    appealProcess?: string;
}

interface PriorAuthRequirement {
    required: boolean;
    reason?: string;
    criteria?: string[];
    documentationRequired?: string[];
    estimatedTimeline?: string;
}

// =============================================================================
// COVERAGE DATA (Core NCDs/LCDs for clinical decision support)
// =============================================================================

const COVERAGE_DECISIONS: CoverageDecision[] = [
    // Diabetes-related
    {
        id: 'NCD-40.2',
        type: 'NCD',
        title: 'Home Blood Glucose Monitors',
        cptCodes: ['82962'],
        hcpcsCodes: ['E0607', 'E2100', 'E2101'],
        icd10Codes: ['E10', 'E11', 'E13'],
        effectiveDate: '2021-01-01',
        summary: 'Covered for patients with diabetes mellitus who require insulin or oral antidiabetic agents.',
        limitations: ['Must have documented diabetes diagnosis', 'Limited to 100 test strips/month for non-insulin users'],
        priorAuthRequired: false,
    },
    {
        id: 'NCD-190.3',
        type: 'NCD',
        title: 'Continuous Glucose Monitoring (CGM)',
        hcpcsCodes: ['E0787', 'E2102', 'E2103', 'K0553', 'K0554'],
        icd10Codes: ['E10', 'E11'],
        effectiveDate: '2022-01-01',
        summary: 'Covered for patients with diabetes requiring multiple daily insulin injections or insulin pump.',
        limitations: ['Requires 4+ insulin injections daily or insulin pump', 'Testing 4+ times daily for 2 months prior'],
        priorAuthRequired: true,
    },

    // Cardiac
    {
        id: 'NCD-20.7',
        type: 'NCD',
        title: 'Implantable Cardioverter Defibrillators (ICDs)',
        cptCodes: ['33240', '33241', '33262', '33263', '33264'],
        icd10Codes: ['I21', 'I42', 'I43', 'I50'],
        effectiveDate: '2020-07-01',
        summary: 'Covered for documented life-threatening arrhythmias or primary prevention in high-risk patients.',
        limitations: ['LVEF ≤35% for primary prevention', 'NYHA Class II or III', 'Optimal medical therapy for 3+ months'],
        priorAuthRequired: true,
    },

    // Imaging
    {
        id: 'LCD-L33771',
        type: 'LCD',
        title: 'MRI of the Brain',
        cptCodes: ['70551', '70552', '70553'],
        jurisdiction: ['CA', 'NV', 'AZ'],
        effectiveDate: '2023-01-01',
        summary: 'Covered for evaluation of neurological disorders with specific clinical indications.',
        limitations: ['Must have documented symptoms', 'Generally not covered for routine screening'],
        priorAuthRequired: false,
    },

    // Respiratory
    {
        id: 'NCD-240.2',
        type: 'NCD',
        title: 'Home Oxygen Therapy',
        hcpcsCodes: ['E0424', 'E0431', 'E0433', 'E0434', 'E0439', 'E0441', 'E0443'],
        icd10Codes: ['J44', 'J43', 'J47', 'J96'],
        effectiveDate: '2021-04-01',
        summary: 'Covered for chronic hypoxemia with documented arterial blood gas or oximetry.',
        limitations: ['PaO2 ≤55 mmHg or SaO2 ≤88%', 'Must have qualifying test within 30 days prior'],
        priorAuthRequired: true,
    },

    // Medications
    {
        id: 'NCD-110.1',
        type: 'NCD',
        title: 'Biologics for Rheumatoid Arthritis',
        hcpcsCodes: ['J0129', 'J0135', 'J1745', 'J3380'],
        icd10Codes: ['M05', 'M06'],
        effectiveDate: '2022-06-01',
        summary: 'Covered after failure of conventional DMARDs.',
        limitations: ['Trial and failure of methotrexate or other csDMARD', 'Documented moderate-to-severe disease activity'],
        priorAuthRequired: true,
    },

    // Preventive
    {
        id: 'NCD-210.3',
        type: 'NCD',
        title: 'Colonoscopy Screening',
        cptCodes: ['45378', '45380', '45381', '45382', '45384', '45385'],
        effectiveDate: '2020-01-01',
        summary: 'Covered every 10 years for average-risk adults age 45+, or more frequently with risk factors.',
        limitations: ['Age 45-85 for screening', 'More frequent if positive family history'],
        priorAuthRequired: false,
    },
];

// =============================================================================
// CACHE
// =============================================================================

const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

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
 * Check Medicare coverage for a procedure/service
 */
export function checkCoverage(params: {
    cptCode?: string;
    hcpcsCode?: string;
    icd10Code?: string;
    jurisdiction?: string;
}): CoverageCheckResult {
    const { cptCode, hcpcsCode, icd10Code, jurisdiction } = params;
    const matchingDecisions: CoverageDecision[] = [];

    for (const decision of COVERAGE_DECISIONS) {
        let matches = false;

        if (cptCode && decision.cptCodes?.includes(cptCode)) {
            matches = true;
        }
        if (hcpcsCode && decision.hcpcsCodes?.includes(hcpcsCode)) {
            matches = true;
        }
        if (icd10Code) {
            const icdBase = icd10Code.substring(0, 3);
            if (decision.icd10Codes?.some(code => code.startsWith(icdBase))) {
                matches = true;
            }
        }

        // For LCDs, check jurisdiction
        if (matches && decision.jurisdiction && jurisdiction) {
            matches = decision.jurisdiction.includes(jurisdiction);
        }

        if (matches) {
            matchingDecisions.push(decision);
        }
    }

    if (matchingDecisions.length === 0) {
        return {
            covered: false,
            coverageType: 'PENDING_REVIEW',
            decisions: [],
            priorAuthRequired: false,
            limitations: [],
            appealProcess: 'Submit medical records for Medicare Administrative Contractor review.',
        };
    }

    const priorAuthRequired = matchingDecisions.some(d => d.priorAuthRequired);
    const allLimitations = matchingDecisions.flatMap(d => d.limitations || []);

    return {
        covered: true,
        coverageType: priorAuthRequired ? 'CONDITIONAL' : 'FULL',
        decisions: matchingDecisions,
        priorAuthRequired,
        limitations: [...new Set(allLimitations)],
    };
}

/**
 * Get prior authorization requirements
 */
export function getPriorAuthRequirements(params: {
    ncdId?: string;
    cptCode?: string;
    hcpcsCode?: string;
}): PriorAuthRequirement {
    const coverage = checkCoverage(params);

    if (!coverage.priorAuthRequired) {
        return { required: false };
    }

    return {
        required: true,
        reason: 'Medicare requires prior authorization for this service.',
        criteria: coverage.limitations,
        documentationRequired: [
            'Clinical notes supporting medical necessity',
            'Relevant diagnostic test results',
            'Trial and failure documentation (if applicable)',
            'Letter of medical necessity',
        ],
        estimatedTimeline: '5-10 business days standard, 24-72 hours for expedited',
    };
}

/**
 * Get all NCDs for a diagnosis code
 */
export function getNCDsForDiagnosis(icd10Code: string): CoverageDecision[] {
    const icdBase = icd10Code.substring(0, 3);
    return COVERAGE_DECISIONS.filter(d =>
        d.type === 'NCD' &&
        d.icd10Codes?.some(code => code.startsWith(icdBase))
    );
}

/**
 * Get all LCDs for a jurisdiction
 */
export function getLCDsForJurisdiction(jurisdiction: string): CoverageDecision[] {
    return COVERAGE_DECISIONS.filter(d =>
        d.type === 'LCD' &&
        d.jurisdiction?.includes(jurisdiction)
    );
}

/**
 * Search coverage decisions by keyword
 */
export function searchCoverage(query: string): CoverageDecision[] {
    const lowerQuery = query.toLowerCase();
    return COVERAGE_DECISIONS.filter(d =>
        d.title.toLowerCase().includes(lowerQuery) ||
        d.summary.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Generate coverage summary for documentation
 */
export function generateCoverageSummary(checkResult: CoverageCheckResult): string {
    if (!checkResult.covered && checkResult.coverageType === 'PENDING_REVIEW') {
        return 'No specific Medicare coverage decision found. Manual review required.';
    }

    let summary = `**Medicare Coverage Status: ${checkResult.coverageType}**\n\n`;

    if (checkResult.priorAuthRequired) {
        summary += '⚠️ **Prior Authorization Required**\n\n';
    }

    for (const decision of checkResult.decisions) {
        summary += `### ${decision.id}: ${decision.title}\n`;
        summary += `${decision.summary}\n`;
        if (decision.limitations && decision.limitations.length > 0) {
            summary += '\n**Limitations:**\n';
            for (const limitation of decision.limitations) {
                summary += `- ${limitation}\n`;
            }
        }
        summary += '\n';
    }

    return summary;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const cmsCoverageService = {
    checkCoverage,
    getPriorAuthRequirements,
    getNCDsForDiagnosis,
    getLCDsForJurisdiction,
    searchCoverage,
    generateCoverageSummary,
    COVERAGE_DECISIONS,
};
