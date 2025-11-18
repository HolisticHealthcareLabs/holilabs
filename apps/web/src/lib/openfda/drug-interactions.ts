/**
 * OpenFDA Drug Interactions Client
 * Integrates with FDA's OpenFDA API for drug-drug interactions
 * API Documentation: https://open.fda.gov/apis/drug/
 */

interface OpenFDADrugLabel {
  openfda: {
    generic_name?: string[];
    brand_name?: string[];
    substance_name?: string[];
  };
  drug_interactions?: string[];
  warnings?: string[];
  contraindications?: string[];
}

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'high' | 'moderate' | 'low';
  description: string;
  source: 'openfda' | 'local';
}

const OPENFDA_BASE_URL = 'https://api.fda.gov/drug/label.json';

/**
 * Search for drug information in OpenFDA
 */
async function searchDrugLabel(drugName: string): Promise<OpenFDADrugLabel | null> {
  try {
    // Clean drug name (remove special characters, convert to lowercase)
    const cleanDrugName = drugName.toLowerCase().trim();

    // Search by generic name or brand name
    const searchQuery = `(openfda.generic_name:"${cleanDrugName}"+openfda.brand_name:"${cleanDrugName}"+openfda.substance_name:"${cleanDrugName}")`;

    const response = await fetch(
      `${OPENFDA_BASE_URL}?search=${encodeURIComponent(searchQuery)}&limit=1`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Drug not found
      }
      throw new Error(`OpenFDA API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    return data.results[0];
  } catch (error) {
    console.error(`Error fetching drug label for "${drugName}":`, error);
    return null;
  }
}

/**
 * Parse drug interaction text and extract severity
 */
function parseInteractionSeverity(interactionText: string): 'high' | 'moderate' | 'low' {
  const text = interactionText.toLowerCase();

  // High severity indicators
  if (
    text.includes('contraindicated') ||
    text.includes('do not use') ||
    text.includes('serious') ||
    text.includes('fatal') ||
    text.includes('life-threatening') ||
    text.includes('avoid')
  ) {
    return 'high';
  }

  // Moderate severity indicators
  if (
    text.includes('caution') ||
    text.includes('monitor') ||
    text.includes('may increase') ||
    text.includes('may decrease') ||
    text.includes('adjust')
  ) {
    return 'moderate';
  }

  // Default to low
  return 'low';
}

/**
 * Check for drug interactions using OpenFDA API
 */
export async function checkDrugInteractions(
  medications: string[]
): Promise<DrugInteraction[]> {
  if (medications.length < 2) {
    return [];
  }

  const interactions: DrugInteraction[] = [];

  // First, try OpenFDA API for each drug
  const drugLabels = await Promise.all(
    medications.map(async (drug) => ({
      name: drug,
      label: await searchDrugLabel(drug),
    }))
  );

  // Check interactions from OpenFDA data
  for (let i = 0; i < drugLabels.length; i++) {
    const drug1 = drugLabels[i];

    if (!drug1.label || !drug1.label.drug_interactions) {
      continue;
    }

    // Check if any other medication in the list is mentioned in the interactions
    for (let j = i + 1; j < drugLabels.length; j++) {
      const drug2 = drugLabels[j];

      // Search for mentions of drug2 in drug1's interaction text
      const interactionTexts = drug1.label.drug_interactions;

      for (const interactionText of interactionTexts) {
        const mentionsDrug2 =
          drug2.name && interactionText.toLowerCase().includes(drug2.name.toLowerCase());

        const mentionsGenericName =
          drug2.label?.openfda?.generic_name &&
          drug2.label.openfda.generic_name.some((name) =>
            interactionText.toLowerCase().includes(name.toLowerCase())
          );

        const mentionsBrandName =
          drug2.label?.openfda?.brand_name &&
          drug2.label.openfda.brand_name.some((name) =>
            interactionText.toLowerCase().includes(name.toLowerCase())
          );

        if (mentionsDrug2 || mentionsGenericName || mentionsBrandName) {
          const severity = parseInteractionSeverity(interactionText);

          interactions.push({
            drug1: drug1.name,
            drug2: drug2.name,
            severity,
            description: interactionText.substring(0, 500), // Truncate to 500 chars
            source: 'openfda',
          });

          break; // Only add one interaction per drug pair
        }
      }
    }
  }

  // If no interactions found via OpenFDA, check local database
  if (interactions.length === 0) {
    const localInteractions = checkLocalDrugInteractions(medications);
    interactions.push(...localInteractions);
  }

  return interactions;
}

/**
 * Local/cached drug interaction database (fallback)
 * This is a curated list of common high-severity interactions
 */
function checkLocalDrugInteractions(medications: string[]): DrugInteraction[] {
  const knownInteractions: Array<{
    drug1: string;
    drug2: string;
    severity: 'high' | 'moderate' | 'low';
    description: string;
  }> = [
    {
      drug1: 'warfarin',
      drug2: 'aspirin',
      severity: 'high',
      description: 'Increased risk of bleeding. Monitor INR closely and adjust warfarin dose as needed.',
    },
    {
      drug1: 'warfarin',
      drug2: 'ibuprofen',
      severity: 'high',
      description: 'NSAIDs may increase bleeding risk when combined with warfarin. Use with caution.',
    },
    {
      drug1: 'metformin',
      drug2: 'alcohol',
      severity: 'moderate',
      description: 'Alcohol may increase risk of lactic acidosis. Avoid excessive alcohol consumption.',
    },
    {
      drug1: 'simvastatin',
      drug2: 'amiodarone',
      severity: 'high',
      description: 'Increased risk of myopathy and rhabdomyolysis. Do not exceed simvastatin 20mg/day.',
    },
    {
      drug1: 'lisinopril',
      drug2: 'potassium',
      severity: 'moderate',
      description: 'ACE inhibitors with potassium supplements may cause hyperkalemia. Monitor potassium levels.',
    },
    {
      drug1: 'methotrexate',
      drug2: 'trimethoprim',
      severity: 'high',
      description: 'Increased methotrexate toxicity. Avoid combination or monitor closely.',
    },
    {
      drug1: 'fluoxetine',
      drug2: 'tramadol',
      severity: 'high',
      description: 'Increased risk of serotonin syndrome. Monitor for symptoms and use alternative if possible.',
    },
    {
      drug1: 'digoxin',
      drug2: 'amiodarone',
      severity: 'high',
      description: 'Amiodarone increases digoxin levels. Reduce digoxin dose by 50% and monitor levels.',
    },
  ];

  const interactions: DrugInteraction[] = [];

  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const drug1Lower = medications[i].toLowerCase();
      const drug2Lower = medications[j].toLowerCase();

      // Check both directions
      const interaction =
        knownInteractions.find(
          (int) =>
            (int.drug1.toLowerCase().includes(drug1Lower) &&
              int.drug2.toLowerCase().includes(drug2Lower)) ||
            (int.drug2.toLowerCase().includes(drug1Lower) &&
              int.drug1.toLowerCase().includes(drug2Lower))
        );

      if (interaction) {
        interactions.push({
          drug1: medications[i],
          drug2: medications[j],
          severity: interaction.severity,
          description: interaction.description,
          source: 'local',
        });
      }
    }
  }

  return interactions;
}

/**
 * Get detailed drug information from OpenFDA
 */
export async function getDrugInfo(drugName: string) {
  const label = await searchDrugLabel(drugName);

  if (!label) {
    return null;
  }

  return {
    genericName: label.openfda?.generic_name?.[0] || drugName,
    brandNames: label.openfda?.brand_name || [],
    interactions: label.drug_interactions || [],
    warnings: label.warnings || [],
    contraindications: label.contraindications || [],
  };
}
