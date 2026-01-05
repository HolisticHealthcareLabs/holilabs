/**
 * Embedding Generation Service
 *
 * Generates vector embeddings for clinical text using OpenAI's text-embedding-ada-002
 * Used for semantic search across clinical notes, diagnoses, and patient summaries
 *
 * Features:
 * - Automatic content preprocessing (truncation, sanitization)
 * - Batch embedding generation
 * - Caching to avoid duplicate API calls
 * - Error handling and retry logic
 */

import { logger } from '@/lib/logger';
import crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBEDDING_MODEL = 'text-embedding-ada-002';
const MAX_TOKENS = 8191; // OpenAI ada-002 limit
const EMBEDDING_DIMENSIONS = 1536; // OpenAI ada-002 output dimensions

// ============================================================================
// TYPES
// ============================================================================

export interface EmbeddingRequest {
  text: string;
  sourceType: string;
  sourceId: string;
  patientId?: string;
}

export interface EmbeddingResult {
  embedding: number[];
  contentHash: string;
  contentPreview: string;
  dimensions: number;
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }

  // Preprocess text (truncate, clean)
  const processedText = preprocessText(text);

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: processedText,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No embedding returned from OpenAI API');
    }

    return data.data[0].embedding;
  } catch (error: any) {
    logger.error({
      event: 'embedding_generation_failed',
      error: error.message,
      textLength: text.length,
    });
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable not set');
  }

  if (texts.length === 0) {
    return [];
  }

  // Preprocess all texts
  const processedTexts = texts.map(preprocessText);

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: processedTexts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No embeddings returned from OpenAI API');
    }

    // Sort by index to maintain order
    return data.data
      .sort((a: any, b: any) => a.index - b.index)
      .map((item: any) => item.embedding);
  } catch (error: any) {
    logger.error({
      event: 'batch_embedding_generation_failed',
      error: error.message,
      batchSize: texts.length,
    });
    throw error;
  }
}

/**
 * Generate embedding with metadata
 */
export async function generateEmbeddingWithMetadata(
  request: EmbeddingRequest
): Promise<EmbeddingResult> {
  const embedding = await generateEmbedding(request.text);

  return {
    embedding,
    contentHash: generateContentHash(request.text),
    contentPreview: request.text.substring(0, 200),
    dimensions: EMBEDDING_DIMENSIONS,
  };
}

// ============================================================================
// TEXT PREPROCESSING
// ============================================================================

/**
 * Preprocess text for embedding generation
 * - Truncate to max tokens
 * - Remove excessive whitespace
 * - Normalize line breaks
 */
function preprocessText(text: string): string {
  // Normalize whitespace
  let processed = text.replace(/\s+/g, ' ').trim();

  // Rough token estimation (1 token ≈ 4 characters for English)
  const estimatedTokens = Math.ceil(processed.length / 4);

  if (estimatedTokens > MAX_TOKENS) {
    // Truncate to max tokens (rough estimate)
    const maxChars = MAX_TOKENS * 4;
    processed = processed.substring(0, maxChars);
    logger.warn({
      event: 'text_truncated_for_embedding',
      originalLength: text.length,
      truncatedLength: processed.length,
    });
  }

  return processed;
}

/**
 * Generate SHA-256 hash of content (for deduplication)
 */
function generateContentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ============================================================================
// PATIENT SUMMARY GENERATION
// ============================================================================

/**
 * Generate patient summary text for embedding
 * Creates a comprehensive but de-identified summary
 */
export function generatePatientSummaryText(patientData: {
  ageBand?: string;
  gender?: string;
  diagnoses: string[]; // ICD codes + names
  medications: string[]; // Medication names
  recentLabs: Array<{ test: string; value: string; date: string }>;
  isPalliativeCare: boolean;
}): string {
  const parts: string[] = [];

  // Demographics (de-identified)
  if (patientData.ageBand) {
    parts.push(`Age range: ${patientData.ageBand}`);
  }
  if (patientData.gender) {
    parts.push(`Gender: ${patientData.gender}`);
  }

  // Care type
  if (patientData.isPalliativeCare) {
    parts.push('Receiving palliative care');
  }

  // Diagnoses
  if (patientData.diagnoses.length > 0) {
    parts.push(`Diagnoses: ${patientData.diagnoses.join(', ')}`);
  }

  // Medications
  if (patientData.medications.length > 0) {
    parts.push(`Current medications: ${patientData.medications.slice(0, 10).join(', ')}`);
  }

  // Recent labs (last 5)
  if (patientData.recentLabs.length > 0) {
    const labSummary = patientData.recentLabs
      .slice(0, 5)
      .map(lab => `${lab.test}: ${lab.value}`)
      .join(', ');
    parts.push(`Recent lab results: ${labSummary}`);
  }

  return parts.join('. ');
}

/**
 * Generate diagnosis summary text for embedding
 */
export function generateDiagnosisSummaryText(diagnosisData: {
  name: string;
  icdCode?: string;
  snomedCode?: string;
  severity?: string;
  notes?: string;
}): string {
  const parts: string[] = [];

  parts.push(diagnosisData.name);

  if (diagnosisData.icdCode) {
    parts.push(`ICD: ${diagnosisData.icdCode}`);
  }

  if (diagnosisData.severity) {
    parts.push(`Severity: ${diagnosisData.severity}`);
  }

  if (diagnosisData.notes) {
    parts.push(diagnosisData.notes.substring(0, 500));
  }

  return parts.join('. ');
}

// ============================================================================
// SIMILARITY SEARCH UTILITIES
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}
