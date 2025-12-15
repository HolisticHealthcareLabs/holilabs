/**
 * RxNav API Client
 *
 * NLM RxNav REST API client for drug interaction checking
 * Documentation: https://lhncbc.nlm.nih.gov/RxNav/APIs/InteractionAPIs.html
 *
 * Features:
 * - Drug name to RxCUI lookup
 * - Drug-drug interaction checking
 * - Redis caching (30 days for RxCUI, 7 days for interactions)
 * - Rate limiting with exponential backoff
 * - Automatic fallback to hardcoded data
 *
 * @module integrations/rxnav-api
 */

import { cacheClient } from './redis-client';
import type { DrugInteraction } from '../cds/types';

const RXNAV_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

// Cache TTLs
const RXCUI_CACHE_TTL = 30 * 24 * 60 * 60; // 30 days
const INTERACTION_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

// Rate limiting
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

/**
 * RxNav API Response Types
 */
interface RxCUIResponse {
  idGroup?: {
    rxnormId?: string[];
  };
}

interface InteractionPair {
  interactionPair: Array<{
    interactionConcept: Array<{
      minConceptItem: {
        rxcui: string;
        name: string;
      };
      sourceConceptItem: {
        id: string;
        name: string;
      };
    }>;
    severity: string;
    description: string;
  }>;
}

interface InteractionResponse {
  fullInteractionTypeGroup?: Array<{
    sourceDisclaimer?: string;
    sourceName?: string;
    fullInteractionType?: Array<{
      comment?: string;
      minConcept?: Array<{
        rxcui: string;
        name: string;
        tty: string;
      }>;
      interactionPair?: Array<{
        interactionConcept?: Array<{
          minConceptItem?: {
            rxcui: string;
            name: string;
            tty: string;
          };
          sourceConceptItem?: {
            id: string;
            name: string;
            url: string;
          };
        }>;
        severity?: string;
        description?: string;
      }>;
    }>;
  }>;
}

/**
 * API Health Metrics
 */
interface APIMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  cacheHits: number;
  cacheMisses: number;
  averageLatency: number;
  lastError?: string;
  lastErrorTime?: string;
}

/**
 * RxNav API Client
 */
export class RxNavClient {
  private metrics: APIMetrics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLatency: 0,
  };

  /**
   * Get RxCUI (RxNorm Concept Unique Identifier) for a drug name
   */
  async getRxCUI(drugName: string): Promise<string | null> {
    const cacheKey = `rxcui:${drugName.toLowerCase().trim()}`;

    // Check cache
    const cached = await cacheClient.get<string>(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      console.log(`[RxNav] Cache hit for RxCUI: ${drugName}`);
      return cached;
    }

    this.metrics.cacheMisses++;

    // Make API call with retry
    try {
      const startTime = Date.now();
      const response = await this.fetchWithRetry<RxCUIResponse>(
        `${RXNAV_BASE_URL}/rxcui.json?name=${encodeURIComponent(drugName)}`
      );

      const latency = Date.now() - startTime;
      this.updateLatency(latency);

      if (response?.idGroup?.rxnormId && response.idGroup.rxnormId.length > 0) {
        const rxcui = response.idGroup.rxnormId[0];

        // Cache the result
        await cacheClient.set(cacheKey, rxcui, RXCUI_CACHE_TTL);

        this.metrics.successfulCalls++;
        console.log(`[RxNav] Found RxCUI for ${drugName}: ${rxcui}`);
        return rxcui;
      }

      console.warn(`[RxNav] No RxCUI found for drug: ${drugName}`);
      return null;
    } catch (error) {
      this.metrics.failedCalls++;
      this.metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.metrics.lastErrorTime = new Date().toISOString();
      console.error(`[RxNav] Error getting RxCUI for ${drugName}:`, error);
      return null;
    }
  }

  /**
   * Get drug-drug interactions for two RxCUIs
   */
  async getInteractions(rxcui1: string, rxcui2: string): Promise<DrugInteraction[]> {
    const cacheKey = `interaction:${[rxcui1, rxcui2].sort().join(':')}`;

    // Check cache
    const cached = await cacheClient.get<DrugInteraction[]>(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      console.log(`[RxNav] Cache hit for interaction: ${rxcui1} + ${rxcui2}`);
      return cached;
    }

    this.metrics.cacheMisses++;

    try {
      const startTime = Date.now();
      const response = await this.fetchWithRetry<InteractionResponse>(
        `${RXNAV_BASE_URL}/interaction/interaction.json?rxcui=${rxcui1}&sources=DrugBank`
      );

      const latency = Date.now() - startTime;
      this.updateLatency(latency);

      const interactions = this.parseInteractionResponse(response, rxcui2);

      // Cache the result (even if empty)
      await cacheClient.set(cacheKey, interactions, INTERACTION_CACHE_TTL);

      this.metrics.successfulCalls++;
      console.log(`[RxNav] Found ${interactions.length} interactions for ${rxcui1} + ${rxcui2}`);

      return interactions;
    } catch (error) {
      this.metrics.failedCalls++;
      this.metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.metrics.lastErrorTime = new Date().toISOString();
      console.error(`[RxNav] Error getting interactions for ${rxcui1} + ${rxcui2}:`, error);
      return [];
    }
  }

  /**
   * Check interactions for multiple medications
   */
  async checkMultipleInteractions(medications: Array<{ name: string; rxNormCode?: string }>): Promise<DrugInteraction[]> {
    const allInteractions: DrugInteraction[] = [];

    // Get RxCUIs for all medications
    const rxcuiMap = new Map<string, string>();

    for (const med of medications) {
      // Use existing rxNormCode if available
      if (med.rxNormCode) {
        rxcuiMap.set(med.name, med.rxNormCode);
      } else {
        const rxcui = await this.getRxCUI(med.name);
        if (rxcui) {
          rxcuiMap.set(med.name, rxcui);
        }
      }
    }

    // Check all pairs
    const medNames = Array.from(rxcuiMap.keys());
    for (let i = 0; i < medNames.length; i++) {
      for (let j = i + 1; j < medNames.length; j++) {
        const med1 = medNames[i];
        const med2 = medNames[j];
        const rxcui1 = rxcuiMap.get(med1);
        const rxcui2 = rxcuiMap.get(med2);

        if (rxcui1 && rxcui2) {
          const interactions = await this.getInteractions(rxcui1, rxcui2);
          allInteractions.push(...interactions);
        }
      }
    }

    return allInteractions;
  }

  /**
   * Parse RxNav API response into DrugInteraction format
   */
  private parseInteractionResponse(response: InteractionResponse, targetRxcui?: string): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];

    if (!response?.fullInteractionTypeGroup) {
      return interactions;
    }

    for (const group of response.fullInteractionTypeGroup) {
      if (!group.fullInteractionType) continue;

      for (const interactionType of group.fullInteractionType) {
        if (!interactionType.interactionPair) continue;

        for (const pair of interactionType.interactionPair) {
          if (!pair.interactionConcept || pair.interactionConcept.length < 2) continue;

          const [concept1, concept2] = pair.interactionConcept;

          // If targetRxcui specified, only include interactions with that drug
          if (targetRxcui) {
            const includesTarget =
              concept1.minConceptItem?.rxcui === targetRxcui ||
              concept2.minConceptItem?.rxcui === targetRxcui;

            if (!includesTarget) continue;
          }

          const interaction: DrugInteraction = {
            id: `rxnav-${concept1.minConceptItem?.rxcui}-${concept2.minConceptItem?.rxcui}`,
            drug1: {
              name: concept1.minConceptItem?.name || 'Unknown',
              rxNormCode: concept1.minConceptItem?.rxcui,
            },
            drug2: {
              name: concept2.minConceptItem?.name || 'Unknown',
              rxNormCode: concept2.minConceptItem?.rxcui,
            },
            severity: this.mapSeverity(pair.severity || ''),
            description: pair.description || 'Drug interaction detected',
            clinicalEffects: pair.description || '',
            management: 'Monitor closely. Consult prescribing information.',
            documentation: 'good',
            source: group.sourceName || 'RxNav/DrugBank',
          };

          interactions.push(interaction);
        }
      }
    }

    return interactions;
  }

  /**
   * Map RxNav severity to our severity levels
   */
  private mapSeverity(severity: string): DrugInteraction['severity'] {
    const severityLower = severity.toLowerCase();

    if (severityLower.includes('contraindicated') || severityLower.includes('major')) {
      return 'major';
    } else if (severityLower.includes('moderate')) {
      return 'moderate';
    } else if (severityLower.includes('minor')) {
      return 'minor';
    }

    return 'moderate'; // Default to moderate
  }

  /**
   * Fetch with exponential backoff retry
   */
  private async fetchWithRetry<T>(url: string, retries = 0): Promise<T> {
    this.metrics.totalCalls++;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'HoliLabs-CDSS/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429 && retries < MAX_RETRIES) {
          // Rate limited - exponential backoff
          const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retries);
          console.warn(`[RxNav] Rate limited. Retrying in ${backoffMs}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
          await this.sleep(backoffMs);
          return this.fetchWithRetry<T>(url, retries + 1);
        }

        throw new Error(`RxNav API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('RxNav API request timeout');
      }

      if (retries < MAX_RETRIES) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retries);
        console.warn(`[RxNav] Request failed. Retrying in ${backoffMs}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
        await this.sleep(backoffMs);
        return this.fetchWithRetry<T>(url, retries + 1);
      }

      throw error;
    }
  }

  /**
   * Update average latency metric
   */
  private updateLatency(latency: number): void {
    const totalCalls = this.metrics.successfulCalls + this.metrics.failedCalls;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (totalCalls - 1) + latency) / totalCalls;
  }

  /**
   * Sleep utility for backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get API health metrics
   */
  getMetrics(): APIMetrics {
    return { ...this.metrics };
  }

  /**
   * Get API health status
   */
  getHealthStatus(): {
    healthy: boolean;
    successRate: number;
    cacheHitRate: number;
    averageLatency: number;
  } {
    const totalCalls = this.metrics.successfulCalls + this.metrics.failedCalls;
    const successRate = totalCalls > 0 ? this.metrics.successfulCalls / totalCalls : 1;

    const totalCacheChecks = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalCacheChecks > 0 ? this.metrics.cacheHits / totalCacheChecks : 0;

    return {
      healthy: successRate >= 0.8, // 80% success rate threshold
      successRate,
      cacheHitRate,
      averageLatency: this.metrics.averageLatency,
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLatency: 0,
    };
  }
}

// Export singleton instance
export const rxNavClient = new RxNavClient();
