/**
 * Drug Interaction Validator
 *
 * Validates drug combinations for potential interactions.
 * Uses RxNav API for interaction checking.
 *
 * @see https://rxnav.nlm.nih.gov/InteractionAPIREST.html
 */

import logger from '@/lib/logger';

const RXNAV_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

export type InteractionSeverity = 'high' | 'moderate' | 'low' | 'unknown';

export interface DrugInteraction {
  drug1: {
    name: string;
    rxcui?: string;
  };
  drug2: {
    name: string;
    rxcui?: string;
  };
  severity: InteractionSeverity;
  description: string;
  source?: string;
  clinicalConsequence?: string;
  recommendation?: string;
}

export interface InteractionCheckResult {
  hasInteractions: boolean;
  interactions: DrugInteraction[];
  checkedDrugs: string[];
  error?: string;
}

/**
 * Look up RxCUI (RxNorm concept unique identifier) for a drug name
 */
export async function getRxCUI(drugName: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${RXNAV_BASE_URL}/rxcui.json?name=${encodeURIComponent(drugName)}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rxcui = data?.idGroup?.rxnormId?.[0];

    return rxcui || null;
  } catch (error) {
    logger.warn({
      event: 'rxcui_lookup_failed',
      drugName,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Check for interactions between a list of drugs using RxNav
 */
export async function checkDrugInteractions(
  drugNames: string[]
): Promise<InteractionCheckResult> {
  if (drugNames.length < 2) {
    return {
      hasInteractions: false,
      interactions: [],
      checkedDrugs: drugNames,
    };
  }

  try {
    // Look up RxCUIs for all drugs
    const rxcuiPromises = drugNames.map(async (name) => ({
      name,
      rxcui: await getRxCUI(name),
    }));

    const drugs = await Promise.all(rxcuiPromises);
    const validDrugs = drugs.filter((d) => d.rxcui !== null);

    if (validDrugs.length < 2) {
      logger.warn({
        event: 'insufficient_rxcuis_for_interaction_check',
        totalDrugs: drugNames.length,
        foundRxcuis: validDrugs.length,
      });

      return {
        hasInteractions: false,
        interactions: [],
        checkedDrugs: drugNames,
        error: `Could not find RxCUI for some drugs. Only ${validDrugs.length} of ${drugNames.length} drugs could be checked.`,
      };
    }

    // Build RxCUI list for API call
    const rxcuiList = validDrugs.map((d) => d.rxcui).join('+');

    // Call RxNav interaction API
    const response = await fetch(
      `${RXNAV_BASE_URL}/interaction/list.json?rxcuis=${rxcuiList}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`RxNav API returned ${response.status}`);
    }

    const data = await response.json();
    const interactions: DrugInteraction[] = [];

    // Parse interaction data
    const fullInteractionGroups = data?.fullInteractionTypeGroup || [];

    for (const group of fullInteractionGroups) {
      const interactionTypes = group?.fullInteractionType || [];

      for (const interactionType of interactionTypes) {
        const pairs = interactionType?.interactionPair || [];

        for (const pair of pairs) {
          const concepts = pair?.interactionConcept || [];
          if (concepts.length < 2) continue;

          const severity = mapSeverity(pair?.severity);
          const description = pair?.description || 'Unknown interaction';

          interactions.push({
            drug1: {
              name: concepts[0]?.minConceptItem?.name || 'Unknown',
              rxcui: concepts[0]?.minConceptItem?.rxcui,
            },
            drug2: {
              name: concepts[1]?.minConceptItem?.name || 'Unknown',
              rxcui: concepts[1]?.minConceptItem?.rxcui,
            },
            severity,
            description,
            source: group?.sourceName,
          });
        }
      }
    }

    logger.info({
      event: 'drug_interaction_check_complete',
      drugCount: drugNames.length,
      interactionCount: interactions.length,
      highSeverityCount: interactions.filter((i) => i.severity === 'high').length,
    });

    return {
      hasInteractions: interactions.length > 0,
      interactions,
      checkedDrugs: validDrugs.map((d) => d.name),
    };
  } catch (error) {
    logger.error({
      event: 'drug_interaction_check_failed',
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      hasInteractions: false,
      interactions: [],
      checkedDrugs: drugNames,
      error: `Interaction check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Map severity string from RxNav to our severity type
 */
function mapSeverity(severityString?: string): InteractionSeverity {
  if (!severityString) return 'unknown';

  const lower = severityString.toLowerCase();

  if (lower.includes('high') || lower.includes('severe') || lower.includes('major')) {
    return 'high';
  }
  if (lower.includes('moderate') || lower.includes('significant')) {
    return 'moderate';
  }
  if (lower.includes('low') || lower.includes('minor')) {
    return 'low';
  }

  return 'unknown';
}

/**
 * Check interactions for a new drug against existing medication list
 */
export async function checkNewDrugInteractions(
  newDrug: string,
  currentMedications: string[]
): Promise<InteractionCheckResult> {
  const allDrugs = [newDrug, ...currentMedications];
  const result = await checkDrugInteractions(allDrugs);

  // Filter to only show interactions involving the new drug
  const newDrugInteractions = result.interactions.filter(
    (i) =>
      i.drug1.name.toLowerCase().includes(newDrug.toLowerCase()) ||
      i.drug2.name.toLowerCase().includes(newDrug.toLowerCase())
  );

  return {
    ...result,
    interactions: newDrugInteractions,
  };
}

/**
 * Get high-severity interactions only
 */
export function filterHighSeverityInteractions(
  result: InteractionCheckResult
): DrugInteraction[] {
  return result.interactions.filter((i) => i.severity === 'high');
}

/**
 * Format interactions as a clinical warning string
 */
export function formatInteractionWarning(interactions: DrugInteraction[]): string {
  if (interactions.length === 0) {
    return 'No drug interactions found.';
  }

  const warnings = interactions.map((i) => {
    const severityLabel =
      i.severity === 'high'
        ? '⚠️ HIGH SEVERITY'
        : i.severity === 'moderate'
          ? '⚡ MODERATE'
          : i.severity === 'low'
            ? 'ℹ️ LOW'
            : '❓ UNKNOWN SEVERITY';

    return `${severityLabel}: ${i.drug1.name} + ${i.drug2.name}\n  ${i.description}`;
  });

  return `Found ${interactions.length} potential drug interaction(s):\n\n${warnings.join('\n\n')}`;
}
