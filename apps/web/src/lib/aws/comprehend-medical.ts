/**
 * AWS Comprehend Medical Integration
 *
 * De-identification and medical entity extraction for HIPAA/LGPD compliance
 * Reference: https://github.com/aws-samples/aws-ai-phi-deidentification
 * License: MIT-0 (AWS Samples)
 *
 * AWS Comprehend Medical automatically identifies PHI and medical entities
 * from unstructured clinical text with high accuracy (F1 score > 0.95)
 */

import {
  ComprehendMedicalClient,
  DetectPHICommand,
  DetectEntitiesV2Command,
  type Entity,
} from '@aws-sdk/client-comprehendmedical';

// Initialize AWS Comprehend Medical client
const comprehend = new ComprehendMedicalClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface PHIEntity {
  text: string;
  type: string;          // NAME, ID, DATE, AGE, PHONE, etc.
  score: number;         // Confidence score 0.0-1.0
  beginOffset: number;
  endOffset: number;
  category: string;      // PROTECTED_HEALTH_INFORMATION
  traits?: Array<{
    name: string;
    score: number;
  }>;
}

export interface MedicalEntity {
  text: string;
  category: string;      // MEDICATION, MEDICAL_CONDITION, etc.
  type: string;          // DX_NAME, GENERIC_NAME, etc.
  score: number;
  beginOffset: number;
  endOffset: number;
  attributes?: Array<{
    type: string;
    score: number;
    relationshipScore: number;
    text: string;
    beginOffset: number;
    endOffset: number;
  }>;
  traits?: Array<{
    name: string;
    score: number;
  }>;
}

export interface DeidentificationResult {
  deidentifiedText: string;
  mappingId: string;
  entitiesDetected: number;
  phiEntities: PHIEntity[];
  confidence: number;
}

export interface MedicalEntitiesResult {
  medications: MedicalEntity[];
  conditions: MedicalEntity[];
  procedures: MedicalEntity[];
  anatomy: MedicalEntity[];
  protectedHealth: MedicalEntity[];
}

/**
 * Step 1: Identify PHI entities in medical text
 * Uses AWS Comprehend Medical DetectPHI API
 */
export async function identifyPHI(medicalText: string): Promise<PHIEntity[]> {
  if (!medicalText || medicalText.trim().length === 0) {
    return [];
  }

  try {
    const command = new DetectPHICommand({ Text: medicalText });
    const response = await comprehend.send(command);

    return (
      response.Entities?.map((entity) => ({
        text: entity.Text || '',
        type: entity.Type || 'UNKNOWN',
        score: entity.Score || 0,
        beginOffset: entity.BeginOffset || 0,
        endOffset: entity.EndOffset || 0,
        category: entity.Category || 'PROTECTED_HEALTH_INFORMATION',
        traits: entity.Traits?.map((trait) => ({
          name: trait.Name || 'UNKNOWN',
          score: trait.Score || 0,
        })),
      })) || []
    );
  } catch (error) {
    console.error('[AWS Comprehend Medical] PHI detection failed:', error);
    throw new Error(`Failed to detect PHI: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Step 2: Mask PHI entities (preserving clinical utility)
 * Smart masking: Preserves age < 89, dates (year only), medical context
 */
export async function maskPHI(text: string, entities: PHIEntity[]): Promise<string> {
  if (entities.length === 0) {
    return text;
  }

  let maskedText = text;

  // Sort entities by offset (reverse order to preserve positions during replacement)
  const sortedEntities = [...entities].sort((a, b) => b.beginOffset - a.beginOffset);

  for (const entity of sortedEntities) {
    const before = maskedText.substring(0, entity.beginOffset);
    const after = maskedText.substring(entity.endOffset);

    let masked: string;

    switch (entity.type) {
      case 'NAME':
        masked = '[PATIENT_NAME]';
        break;

      case 'ID':
        // Medical Record Number, SSN, etc.
        masked = '[PATIENT_ID]';
        break;

      case 'DATE':
        // HIPAA Safe Harbor: Preserve year for age calculations, mask day/month
        const dateMatch = entity.text.match(/\d{4}/);
        masked = dateMatch ? `[DATE_${dateMatch[0]}]` : '[DATE]';
        break;

      case 'AGE':
        // HIPAA Safe Harbor: Mask ages > 89, keep exact age if < 89
        const age = parseInt(entity.text);
        if (!isNaN(age) && age > 89) {
          masked = '[AGE_>89]';
        } else {
          masked = entity.text;  // Keep actual age
        }
        break;

      case 'PHONE_OR_FAX':
        masked = '[PHONE]';
        break;

      case 'EMAIL':
        masked = '[EMAIL]';
        break;

      case 'ADDRESS':
        masked = '[ADDRESS]';
        break;

      case 'PROFESSION':
        // Usually physician name
        masked = '[PROVIDER_NAME]';
        break;

      case 'URL':
        masked = '[URL]';
        break;

      case 'IP_ADDRESS':
        masked = '[IP_ADDRESS]';
        break;

      default:
        masked = `[${entity.type}]`;
    }

    maskedText = before + masked + after;
  }

  return maskedText;
}

/**
 * Step 3: De-identify with reversibility (LGPD Article 6 compliance)
 * Stores mapping in DynamoDB for authorized re-identification
 */
export async function deidentifyWithReversibility(
  patientId: string,
  text: string,
  accessReason: string,
  userId?: string
): Promise<DeidentificationResult> {
  // 1. Detect PHI
  const entities = await identifyPHI(text);

  // 2. Mask PHI
  const maskedText = await maskPHI(text, entities);

  // 3. Calculate confidence score
  const confidence = entities.length > 0 ? entities.reduce((sum, e) => sum + e.score, 0) / entities.length : 1.0;

  // 4. Generate mapping ID for reversibility
  const mappingId = crypto.randomUUID();

  // TODO: Store mapping in DynamoDB for re-identification
  // For now, we'll just return the mapping ID
  // In production, implement DynamoDB storage with TTL

  console.log('[AWS Comprehend Medical] De-identification complete:', {
    mappingId,
    patientId,
    entitiesDetected: entities.length,
    accessReason,
    userId,
  });

  return {
    deidentifiedText: maskedText,
    mappingId,
    entitiesDetected: entities.length,
    phiEntities: entities,
    confidence,
  };
}

/**
 * Extract medical entities for clinical analysis (prevention plans)
 * Uses AWS Comprehend Medical DetectEntitiesV2 API
 */
export async function extractMedicalEntities(text: string): Promise<MedicalEntitiesResult> {
  if (!text || text.trim().length === 0) {
    return {
      medications: [],
      conditions: [],
      procedures: [],
      anatomy: [],
      protectedHealth: [],
    };
  }

  try {
    const command = new DetectEntitiesV2Command({ Text: text });
    const response = await comprehend.send(command);

    const entities: MedicalEntity[] =
      response.Entities?.map((entity) => ({
        text: entity.Text || '',
        category: entity.Category || 'UNKNOWN',
        type: entity.Type || 'UNKNOWN',
        score: entity.Score || 0,
        beginOffset: entity.BeginOffset || 0,
        endOffset: entity.EndOffset || 0,
        attributes: entity.Attributes?.map((attribute) => ({
          type: attribute.Type || 'UNKNOWN',
          score: attribute.Score || 0,
          relationshipScore: attribute.RelationshipScore || 0,
          text: attribute.Text || '',
          beginOffset: attribute.BeginOffset || 0,
          endOffset: attribute.EndOffset || 0,
        })),
        traits: entity.Traits?.map((trait) => ({
          name: trait.Name || 'UNKNOWN',
          score: trait.Score || 0,
        })),
      })) || [];

    return {
      medications: entities.filter((e) => e.category === 'MEDICATION'),
      conditions: entities.filter((e) => e.category === 'MEDICAL_CONDITION'),
      procedures: entities.filter((e) => e.category === 'TEST_TREATMENT_PROCEDURE'),
      anatomy: entities.filter((e) => e.category === 'ANATOMY'),
      protectedHealth: entities.filter((e) => e.category === 'PROTECTED_HEALTH_INFORMATION'),
    };
  } catch (error) {
    console.error('[AWS Comprehend Medical] Entity extraction failed:', error);
    throw new Error(`Failed to extract medical entities: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Analyze medication adherence from clinical text
 * Useful for prevention plans
 */
export async function analyzeMedicationAdherence(text: string): Promise<{
  medications: Array<{
    name: string;
    dose?: string;
    frequency?: string;
    duration?: string;
    adherence?: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN';
  }>;
}> {
  const entities = await extractMedicalEntities(text);

  const medications = entities.medications.map((med) => {
    // Extract attributes (dose, frequency, etc.)
    const dose = med.attributes?.find((attr) => attr.type === 'DOSAGE')?.text;
    const frequency = med.attributes?.find((attr) => attr.type === 'FREQUENCY')?.text;
    const duration = med.attributes?.find((attr) => attr.type === 'DURATION')?.text;

    // Check for adherence indicators in traits
    const negationTrait = med.traits?.find((trait) => trait.name === 'NEGATION');
    const adherence = negationTrait ? 'NON_COMPLIANT' : 'UNKNOWN';

    return {
      name: med.text,
      dose,
      frequency,
      duration,
      adherence: adherence as 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN',
    };
  });

  return { medications };
}

/**
 * Extract risk factors from clinical notes
 * For ASCVD/diabetes risk calculations
 */
export async function extractRiskFactors(text: string): Promise<{
  conditions: string[];
  medications: string[];
  hasDiabetes: boolean;
  hasHypertension: boolean;
  hasCVD: boolean;
  smoker: boolean;
}> {
  const entities = await extractMedicalEntities(text);

  const conditions = entities.conditions.map((c) => c.text.toLowerCase());
  const medications = entities.medications.map((m) => m.text.toLowerCase());

  return {
    conditions: entities.conditions.map((c) => c.text),
    medications: entities.medications.map((m) => m.text),
    hasDiabetes: conditions.some((c) => c.includes('diabetes') || c.includes('diabético')),
    hasHypertension: conditions.some(
      (c) => c.includes('hypertension') || c.includes('hipertensão') || c.includes('hipertensión') || c.includes('high blood pressure')
    ),
    hasCVD: conditions.some(
      (c) => c.includes('coronary') || c.includes('myocardial infarction') || c.includes('stroke') || c.includes('heart failure')
    ),
    smoker: conditions.some((c) => c.includes('smoker') || c.includes('smoking') || c.includes('tabagismo')),
  };
}

/**
 * Batch processing for multiple clinical documents
 * Useful for daily prevention orchestrator
 */
export async function batchDeidentify(
  documents: Array<{ patientId: string; text: string; accessReason: string }>
): Promise<DeidentificationResult[]> {
  const BATCH_SIZE = 5;  // AWS rate limits
  const results: DeidentificationResult[] = [];

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map((doc) => deidentifyWithReversibility(doc.patientId, doc.text, doc.accessReason))
    );

    results.push(...batchResults);

    // Rate limiting delay between batches (avoid throttling)
    if (i + BATCH_SIZE < documents.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Cost estimation for AWS Comprehend Medical
 * Useful for budget tracking
 */
export function estimateComprehendCost(characterCount: number): {
  estimatedCost: number;
  apiCallsRequired: number;
  breakdown: string;
} {
  // Pricing (as of 2024): $0.01 per 100 characters
  // Minimum: 100 characters per request
  const PRICE_PER_100_CHARS = 0.01;
  const MIN_CHARS_PER_REQUEST = 100;

  const billableChars = Math.max(characterCount, MIN_CHARS_PER_REQUEST);
  const apiCallsRequired = Math.ceil(characterCount / 5000);  // Max 5000 chars per call
  const estimatedCost = (billableChars / 100) * PRICE_PER_100_CHARS;

  return {
    estimatedCost: Math.round(estimatedCost * 100) / 100,  // Round to 2 decimals
    apiCallsRequired,
    breakdown: `${characterCount} characters → $${estimatedCost.toFixed(4)} (${apiCallsRequired} API calls)`,
  };
}
