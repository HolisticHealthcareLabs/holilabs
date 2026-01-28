/**
 * openFDA Service - FDA drug data and adverse events
 * 
 * Integrates with FDA openFDA API for:
 * - Drug labeling (boxed warnings, contraindications)
 * - Adverse event reports
 * - Drug recalls
 * 
 * @see https://open.fda.gov/apis/drug/
 */

import { logger } from '@/lib/logger';

const OPENFDA_BASE_URL = 'https://api.fda.gov/drug';

// Cache with shorter TTL for adverse events (more dynamic)
const cache = new Map<string, { data: any; expires: number }>();
const LABEL_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for labels
const EVENT_CACHE_TTL = 1 * 60 * 60 * 1000; // 1 hour for events

interface FDALabel {
    brandName: string;
    genericName: string;
    manufacturer: string;
    boxedWarning?: string;
    contraindications?: string;
    warnings?: string;
    drugInteractions?: string;
    adverseReactions?: string;
    indicationsAndUsage?: string;
    dosageAndAdministration?: string;
    applicationNumber?: string;
}

interface AdverseEvent {
    receiveDate: string;
    serious: boolean;
    seriousnessHospitalization?: boolean;
    seriousnessDeath?: boolean;
    reactions: string[];
    patientAge?: number;
    patientSex?: string;
    drugs: Array<{ name: string; indication?: string }>;
    reporterQualification?: string;
}

interface DrugRecall {
    recallNumber: string;
    reason: string;
    status: string;
    classification: string;
    product: string;
    initiationDate: string;
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

function setCache(key: string, data: any, ttl: number): void {
    cache.set(key, { data, expires: Date.now() + ttl });
}

// =============================================================================
// API HELPERS
// =============================================================================

async function fetchOpenFDA(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const searchParams = new URLSearchParams(params);
    const url = `${OPENFDA_BASE_URL}${endpoint}?${searchParams}`;

    try {
        const response = await fetch(url, {
            headers: { Accept: 'application/json' },
        });

        if (response.status === 404) {
            return null; // No results
        }

        if (!response.ok) {
            throw new Error(`openFDA API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        logger.error({
            event: 'openfda_api_error',
            endpoint,
            params,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
    }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get FDA-approved drug label for a medication
 */
export async function getDrugLabel(drugName: string): Promise<FDALabel | null> {
    const cacheKey = `label:${drugName.toLowerCase()}`;
    const cached = getCached<FDALabel>(cacheKey);
    if (cached) return cached;

    // Search by brand name or generic name
    const searchTerm = `openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`;
    const data = await fetchOpenFDA('/label.json', {
        search: searchTerm,
        limit: '1',
    });

    if (!data?.results?.[0]) {
        return null;
    }

    const result = data.results[0];
    const label: FDALabel = {
        brandName: result.openfda?.brand_name?.[0] || drugName,
        genericName: result.openfda?.generic_name?.[0] || '',
        manufacturer: result.openfda?.manufacturer_name?.[0] || '',
        boxedWarning: result.boxed_warning?.[0],
        contraindications: result.contraindications?.[0],
        warnings: result.warnings?.[0],
        drugInteractions: result.drug_interactions?.[0],
        adverseReactions: result.adverse_reactions?.[0],
        indicationsAndUsage: result.indications_and_usage?.[0],
        dosageAndAdministration: result.dosage_and_administration?.[0],
        applicationNumber: result.openfda?.application_number?.[0],
    };

    setCache(cacheKey, label, LABEL_CACHE_TTL);
    return label;
}

/**
 * Check if drug has FDA Black Box Warning
 */
export async function hasBlackBoxWarning(drugName: string): Promise<boolean> {
    const label = await getDrugLabel(drugName);
    return !!label?.boxedWarning;
}

/**
 * Get FDA contraindications for a drug
 */
export async function getContraindications(drugName: string): Promise<string | null> {
    const label = await getDrugLabel(drugName);
    return label?.contraindications || null;
}

/**
 * Get adverse event reports for a drug
 */
export async function getAdverseEvents(
    drugName: string,
    options: {
        serious?: boolean;
        limit?: number;
    } = {}
): Promise<AdverseEvent[]> {
    const { serious, limit = 10 } = options;

    const cacheKey = `events:${drugName.toLowerCase()}:${serious}:${limit}`;
    const cached = getCached<AdverseEvent[]>(cacheKey);
    if (cached) return cached;

    let search = `patient.drug.medicinalproduct:"${drugName}"`;
    if (serious) {
        search += ' AND serious:1';
    }

    const data = await fetchOpenFDA('/event.json', {
        search,
        limit: String(limit),
    });

    if (!data?.results) {
        return [];
    }

    const events: AdverseEvent[] = data.results.map((r: any) => ({
        receiveDate: r.receivedate || '',
        serious: r.serious === 1 || r.serious === '1',
        seriousnessHospitalization: r.seriousnesshospitalization === '1',
        seriousnessDeath: r.seriousnessdeath === '1',
        reactions: r.patient?.reaction?.map((rx: any) => rx.reactionmeddrapt) || [],
        patientAge: r.patient?.patientonsetage,
        patientSex: r.patient?.patientsex === '1' ? 'male' : r.patient?.patientsex === '2' ? 'female' : undefined,
        drugs: r.patient?.drug?.map((d: any) => ({
            name: d.medicinalproduct,
            indication: d.drugindication,
        })) || [],
        reporterQualification: r.primarysource?.qualification,
    }));

    setCache(cacheKey, events, EVENT_CACHE_TTL);
    return events;
}

/**
 * Get adverse event count for drug monitoring
 */
export async function getAdverseEventCount(drugName: string): Promise<number> {
    const data = await fetchOpenFDA('/event.json', {
        search: `patient.drug.medicinalproduct:"${drugName}"`,
        count: 'receivedate',
        limit: '1',
    });

    return data?.results?.reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;
}

/**
 * Get active drug recalls
 */
export async function getDrugRecalls(
    drugName: string,
    options: { ongoingOnly?: boolean } = {}
): Promise<DrugRecall[]> {
    const cacheKey = `recalls:${drugName.toLowerCase()}`;
    const cached = getCached<DrugRecall[]>(cacheKey);
    if (cached) return cached;

    let search = `product_description:"${drugName}"`;
    if (options.ongoingOnly) {
        search += ' AND status:"Ongoing"';
    }

    const data = await fetchOpenFDA('/enforcement.json', {
        search,
        limit: '10',
    });

    if (!data?.results) {
        return [];
    }

    const recalls: DrugRecall[] = data.results.map((r: any) => ({
        recallNumber: r.recall_number || '',
        reason: r.reason_for_recall || '',
        status: r.status || '',
        classification: r.classification || '',
        product: r.product_description || '',
        initiationDate: r.recall_initiation_date || '',
    }));

    setCache(cacheKey, recalls, EVENT_CACHE_TTL);
    return recalls;
}

// =============================================================================
// GOVERNANCE INTEGRATION
// =============================================================================

/**
 * FDA-enhanced safety check for governance Fast Lane
 */
export async function checkFDASafety(
    drugName: string,
    patientConditions: string[]
): Promise<{
    safe: boolean;
    alerts: Array<{ type: string; severity: 'high' | 'moderate'; message: string }>;
}> {
    const alerts: Array<{ type: string; severity: 'high' | 'moderate'; message: string }> = [];

    const label = await getDrugLabel(drugName);

    if (label?.boxedWarning) {
        alerts.push({
            type: 'BLACK_BOX_WARNING',
            severity: 'high',
            message: `FDA Black Box Warning: ${label.boxedWarning.substring(0, 200)}...`,
        });
    }

    if (label?.contraindications) {
        // Check if any patient conditions match contraindications
        const contraLower = label.contraindications.toLowerCase();
        for (const condition of patientConditions) {
            if (contraLower.includes(condition.toLowerCase())) {
                alerts.push({
                    type: 'CONTRAINDICATION',
                    severity: 'high',
                    message: `FDA contraindication for ${condition}`,
                });
            }
        }
    }

    return {
        safe: !alerts.some(a => a.severity === 'high'),
        alerts,
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const openFDAService = {
    getDrugLabel,
    hasBlackBoxWarning,
    getContraindications,
    getAdverseEvents,
    getAdverseEventCount,
    getDrugRecalls,
    checkFDASafety,
};
