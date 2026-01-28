/**
 * RxNorm Service - Drug normalization and interaction checking
 * 
 * Integrates with NIH/NLM RxNorm API for:
 * - Drug name normalization to RxCUI
 * - Drug-drug interaction checking
 * - Drug class identification
 * - NDC code mapping
 * 
 * @see https://rxnav.nlm.nih.gov/RxNormAPIs.html
 */

import { logger } from '@/lib/logger';

const RXNORM_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

// Simple in-memory cache (production: use Redis)
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for drug data

interface RxCUIResult {
    rxcui: string;
    name: string;
    tty?: string; // Term type (SBD, SCD, etc.)
}

interface DrugInteraction {
    drug1: { rxcui: string; name: string };
    drug2: { rxcui: string; name: string };
    severity: 'high' | 'moderate' | 'low';
    description: string;
    source: string;
}

interface DrugClassInfo {
    classId: string;
    className: string;
    classType: string;
    members: Array<{ rxcui: string; name: string }>;
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
// API HELPERS
// =============================================================================

async function fetchRxNorm(endpoint: string): Promise<any> {
    const url = `${RXNORM_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            headers: { Accept: 'application/json' },
            next: { revalidate: 86400 }, // Next.js cache for 24h
        });

        if (!response.ok) {
            throw new Error(`RxNorm API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        logger.error({
            event: 'rxnorm_api_error',
            endpoint,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Normalize a drug name to its RxCUI (RxNorm Concept Unique Identifier)
 */
export async function normalizeToRxCUI(drugName: string): Promise<RxCUIResult | null> {
    const cacheKey = `rxcui:${drugName.toLowerCase()}`;
    const cached = getCached<RxCUIResult>(cacheKey);
    if (cached) return cached;

    try {
        // Try approximate match first
        const data = await fetchRxNorm(`/approximateTerm.json?term=${encodeURIComponent(drugName)}&maxEntries=1`);

        const candidates = data?.approximateGroup?.candidate;
        if (candidates && candidates.length > 0) {
            const result: RxCUIResult = {
                rxcui: candidates[0].rxcui,
                name: candidates[0].name || drugName,
                tty: candidates[0].tty,
            };
            setCache(cacheKey, result);
            return result;
        }

        // Fallback to exact match
        const exactData = await fetchRxNorm(`/rxcui.json?name=${encodeURIComponent(drugName)}`);
        const rxcuis = exactData?.idGroup?.rxnormId;

        if (rxcuis && rxcuis.length > 0) {
            const result: RxCUIResult = { rxcui: rxcuis[0], name: drugName };
            setCache(cacheKey, result);
            return result;
        }

        return null;
    } catch (error) {
        logger.warn({
            event: 'rxcui_lookup_failed',
            drugName,
            error: error instanceof Error ? error.message : 'Unknown',
        });
        return null;
    }
}

/**
 * Get drug-drug interactions for a list of RxCUIs
 */
export async function getInteractions(rxcuis: string[]): Promise<DrugInteraction[]> {
    if (rxcuis.length < 2) return [];

    const cacheKey = `interactions:${rxcuis.sort().join(',')}`;
    const cached = getCached<DrugInteraction[]>(cacheKey);
    if (cached) return cached;

    try {
        const data = await fetchRxNorm(`/interaction/list.json?rxcuis=${rxcuis.join('+')}`);

        const interactions: DrugInteraction[] = [];
        const pairs = data?.fullInteractionTypeGroup?.[0]?.fullInteractionType || [];

        for (const pair of pairs) {
            const interactionPairs = pair.interactionPair || [];
            for (const interaction of interactionPairs) {
                const concepts = interaction.interactionConcept || [];
                if (concepts.length >= 2) {
                    interactions.push({
                        drug1: {
                            rxcui: concepts[0]?.minConceptItem?.rxcui || '',
                            name: concepts[0]?.minConceptItem?.name || '',
                        },
                        drug2: {
                            rxcui: concepts[1]?.minConceptItem?.rxcui || '',
                            name: concepts[1]?.minConceptItem?.name || '',
                        },
                        severity: mapSeverity(interaction.severity || ''),
                        description: interaction.description || '',
                        source: pair.comment || 'DrugBank/ONCHigh',
                    });
                }
            }
        }

        setCache(cacheKey, interactions);
        return interactions;
    } catch (error) {
        logger.error({
            event: 'interaction_check_failed',
            rxcuis,
            error: error instanceof Error ? error.message : 'Unknown',
        });
        return [];
    }
}

/**
 * Get drug class information
 */
export async function getDrugClass(rxcui: string): Promise<DrugClassInfo[]> {
    const cacheKey = `class:${rxcui}`;
    const cached = getCached<DrugClassInfo[]>(cacheKey);
    if (cached) return cached;

    try {
        const data = await fetchRxNorm(`/rxclass/class/byRxcui.json?rxcui=${rxcui}`);

        const classes: DrugClassInfo[] = [];
        const concepts = data?.rxclassDrugInfoList?.rxclassDrugInfo || [];

        for (const concept of concepts) {
            const cls = concept.rxclassMinConceptItem;
            if (cls) {
                classes.push({
                    classId: cls.classId,
                    className: cls.className,
                    classType: cls.classType,
                    members: [],
                });
            }
        }

        setCache(cacheKey, classes);
        return classes;
    } catch (error) {
        logger.warn({
            event: 'drug_class_lookup_failed',
            rxcui,
            error: error instanceof Error ? error.message : 'Unknown',
        });
        return [];
    }
}

/**
 * Map RxCUI to NDC codes
 */
export async function mapToNDC(rxcui: string): Promise<string[]> {
    const cacheKey = `ndc:${rxcui}`;
    const cached = getCached<string[]>(cacheKey);
    if (cached) return cached;

    try {
        const data = await fetchRxNorm(`/rxcui/${rxcui}/ndcs.json`);
        const ndcs = data?.ndcGroup?.ndcList?.ndc || [];
        setCache(cacheKey, ndcs);
        return ndcs;
    } catch (error) {
        return [];
    }
}

/**
 * Get all related drugs that should trigger allergy alerts
 */
export async function getCrossReactiveDrugs(rxcui: string): Promise<string[]> {
    const classes = await getDrugClass(rxcui);
    const relatedRxCUIs: string[] = [];

    // Get drugs in same class (e.g., all penicillins for penicillin allergy)
    for (const cls of classes) {
        if (cls.classType === 'ATC' || cls.className.toLowerCase().includes('antibiotic')) {
            try {
                const data = await fetchRxNorm(`/rxclass/classMembers.json?classId=${cls.classId}&relaSource=ATC`);
                const members = data?.drugMemberGroup?.drugMember || [];
                for (const member of members) {
                    if (member.minConcept?.rxcui) {
                        relatedRxCUIs.push(member.minConcept.rxcui);
                    }
                }
            } catch {
                // Continue with other classes
            }
        }
    }

    return [...new Set(relatedRxCUIs)];
}

// =============================================================================
// HELPERS
// =============================================================================

function mapSeverity(severity: string): 'high' | 'moderate' | 'low' {
    const lower = severity.toLowerCase();
    if (lower.includes('high') || lower.includes('severe') || lower.includes('major')) {
        return 'high';
    }
    if (lower.includes('moderate')) {
        return 'moderate';
    }
    return 'low';
}

// =============================================================================
// EXPORTS
// =============================================================================

export const rxnormService = {
    normalizeToRxCUI,
    getInteractions,
    getDrugClass,
    mapToNDC,
    getCrossReactiveDrugs,
};
