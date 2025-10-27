/**
 * Enhanced NLP-Based Redaction
 * Context-aware PHI detection using pattern matching and heuristics
 *
 * FEATURES:
 * - Context-aware entity detection (not just regex)
 * - Confidence scoring
 * - Multi-language support (EN, ES, PT)
 * - Medical context understanding
 * - False positive reduction
 *
 * NOTE: For production, consider upgrading to:
 * - Microsoft Presidio (free, open-source)
 * - Google Cloud DLP API ($0.50-2.00 per 1000 docs)
 * - AWS Comprehend Medical
 */

export interface NLPRedactionConfig {
  locale: 'en' | 'es' | 'pt';
  minConfidence: number; // 0.0 to 1.0
  preserveStructure: boolean; // Keep sentence structure when redacting
  redactPartial: boolean; // Partially redact (e.g., "John D***")
}

export interface DetectedEntity {
  type: EntityType;
  text: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  context: string; // Surrounding text
  replacement: string;
}

export type EntityType =
  | 'PERSON_NAME'
  | 'EMAIL'
  | 'PHONE'
  | 'SSN'
  | 'MRN'
  | 'ADDRESS'
  | 'DATE'
  | 'LOCATION'
  | 'ORGANIZATION'
  | 'AGE'
  | 'MEDICAL_RECORD';

export interface NLPRedactionResult {
  redactedText: string;
  entities: DetectedEntity[];
  statistics: {
    totalEntities: number;
    entitiesByType: Record<EntityType, number>;
    averageConfidence: number;
    charactersRedacted: number;
  };
}

/**
 * Redact PHI from text using NLP-based entity detection
 *
 * @param text - Text to redact
 * @param config - Redaction configuration
 * @returns Redaction results with detected entities
 */
export function redactWithNLP(
  text: string,
  config: NLPRedactionConfig
): NLPRedactionResult {
  // Detect all entities
  const entities = detectEntities(text, config);

  // Filter by confidence threshold
  const highConfidenceEntities = entities.filter(
    (e) => e.confidence >= config.minConfidence
  );

  // Sort by position (reverse order for safe string replacement)
  highConfidenceEntities.sort((a, b) => b.startIndex - a.startIndex);

  // Redact text
  let redactedText = text;
  for (const entity of highConfidenceEntities) {
    const before = redactedText.substring(0, entity.startIndex);
    const after = redactedText.substring(entity.endIndex);
    redactedText = before + entity.replacement + after;
  }

  // Calculate statistics
  const entitiesByType: Record<string, number> = {};
  let totalConfidence = 0;
  let charactersRedacted = 0;

  highConfidenceEntities.forEach((entity) => {
    entitiesByType[entity.type] = (entitiesByType[entity.type] || 0) + 1;
    totalConfidence += entity.confidence;
    charactersRedacted += entity.text.length;
  });

  return {
    redactedText,
    entities: highConfidenceEntities,
    statistics: {
      totalEntities: highConfidenceEntities.length,
      entitiesByType: entitiesByType as Record<EntityType, number>,
      averageConfidence:
        highConfidenceEntities.length > 0
          ? totalConfidence / highConfidenceEntities.length
          : 0,
      charactersRedacted,
    },
  };
}

/**
 * Detect entities in text with confidence scores
 */
function detectEntities(
  text: string,
  config: NLPRedactionConfig
): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  // Detect each entity type
  entities.push(...detectPersonNames(text, config));
  entities.push(...detectEmails(text, config));
  entities.push(...detectPhones(text, config));
  entities.push(...detectSSNs(text, config));
  entities.push(...detectMRNs(text, config));
  entities.push(...detectAddresses(text, config));
  entities.push(...detectDates(text, config));
  entities.push(...detectLocations(text, config));
  entities.push(...detectOrganizations(text, config));
  entities.push(...detectAges(text, config));

  // Remove overlapping entities (keep highest confidence)
  return removeOverlaps(entities);
}

/**
 * Detect person names with context awareness
 */
function detectPersonNames(
  text: string,
  config: NLPRedactionConfig
): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  // Context patterns that indicate a name
  const nameContextPatterns = [
    /(?:patient|pt|mr|mrs|ms|dr|doctor|señor|señora|senhora)\s+([A-ZÁ-Ú][a-zá-ú]+(?:\s+[A-ZÁ-Ú][a-zá-ú]+)+)/gi,
    /(?:name|nombre|nome):\s*([A-ZÁ-Ú][a-zá-ú]+(?:\s+[A-ZÁ-Ú][a-zá-ú]+)+)/gi,
    /([A-ZÁ-Ú][a-zá-ú]+\s+[A-ZÁ-Ú][a-zá-ú]+)\s+(?:was admitted|presented|reported|stated)/gi,
  ];

  for (const pattern of nameContextPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const nameMatch = match[1];
      const startIndex = match.index + fullMatch.indexOf(nameMatch);

      entities.push({
        type: 'PERSON_NAME',
        text: nameMatch,
        startIndex,
        endIndex: startIndex + nameMatch.length,
        confidence: 0.95, // High confidence due to context
        context: getContext(text, startIndex, 50),
        replacement: config.redactPartial
          ? partialRedact(nameMatch)
          : '[NAME_REDACTED]',
      });
    }
  }

  // General capitalized name pattern (lower confidence without context)
  const generalNamePattern = /\b([A-ZÁ-Ú][a-zá-ú]+\s+[A-ZÁ-Ú][a-zá-ú]+)\b/g;
  let match;
  while ((match = generalNamePattern.exec(text)) !== null) {
    const nameMatch = match[1];
    const startIndex = match.index;

    // Skip if already detected with high confidence
    if (entities.some((e) => overlaps(e, startIndex, startIndex + nameMatch.length))) {
      continue;
    }

    // Check if it's likely NOT a name (e.g., "New York", "São Paulo")
    if (isLikelyLocation(nameMatch)) {
      continue;
    }

    entities.push({
      type: 'PERSON_NAME',
      text: nameMatch,
      startIndex,
      endIndex: startIndex + nameMatch.length,
      confidence: 0.7, // Medium confidence without context
      context: getContext(text, startIndex, 50),
      replacement: config.redactPartial
        ? partialRedact(nameMatch)
        : '[NAME_REDACTED]',
    });
  }

  return entities;
}

/**
 * Detect email addresses
 */
function detectEmails(text: string, config: NLPRedactionConfig): DetectedEntity[] {
  const entities: DetectedEntity[] = [];
  const emailPattern = /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/g;

  let match;
  while ((match = emailPattern.exec(text)) !== null) {
    entities.push({
      type: 'EMAIL',
      text: match[1],
      startIndex: match.index,
      endIndex: match.index + match[1].length,
      confidence: 1.0, // Email regex is very accurate
      context: getContext(text, match.index, 30),
      replacement: config.redactPartial
        ? `${match[1].split('@')[0].charAt(0)}***@***`
        : '[EMAIL_REDACTED]',
    });
  }

  return entities;
}

/**
 * Detect phone numbers (multiple formats)
 */
function detectPhones(text: string, config: NLPRedactionConfig): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  const phonePatterns = [
    /\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/g, // US: 123-456-7890
    /\b(\+?55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4})\b/g, // Brazil: +55 (11) 98765-4321
    /\b(\+?52\s?\d{2,3}\s?\d{3,4}\s?\d{4})\b/g, // Mexico: +52 55 1234 5678
    /\b(\+?54\s?\d{2,4}\s?\d{6,8})\b/g, // Argentina
  ];

  for (const pattern of phonePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'PHONE',
        text: match[1],
        startIndex: match.index,
        endIndex: match.index + match[1].length,
        confidence: 0.95,
        context: getContext(text, match.index, 30),
        replacement: config.redactPartial ? '***-***-' + match[1].slice(-4) : '[PHONE_REDACTED]',
      });
    }
  }

  return entities;
}

/**
 * Detect SSNs and national IDs
 */
function detectSSNs(text: string, config: NLPRedactionConfig): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  const ssnPatterns = [
    /\b(\d{3}-\d{2}-\d{4})\b/g, // US SSN
    /\b(\d{11})\b/g, // Brazil CPF (11 digits)
    /\b([A-Z]{4}\d{6}[A-Z\d]{7})\b/g, // Mexico CURP
    /\b(\d{7,8})\b/g, // Argentina DNI
  ];

  for (const pattern of ssnPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const context = getContext(text, match.index, 50);

      // Increase confidence if SSN keywords are nearby
      const confidence = /\b(ssn|social security|cpf|curp|dni|rg)\b/i.test(context)
        ? 0.95
        : 0.8;

      entities.push({
        type: 'SSN',
        text: match[1],
        startIndex: match.index,
        endIndex: match.index + match[1].length,
        confidence,
        context,
        replacement: config.redactPartial ? '***-**-' + match[1].slice(-4) : '[SSN_REDACTED]',
      });
    }
  }

  return entities;
}

/**
 * Detect Medical Record Numbers
 */
function detectMRNs(text: string, config: NLPRedactionConfig): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  const mrnPatterns = [
    /\b(MRN[:\s]?\d{6,10})\b/gi,
    /\b(Patient\s+ID[:\s]?\d{6,10})\b/gi,
    /\b(Medical\s+Record[:\s]?\d{6,10})\b/gi,
  ];

  for (const pattern of mrnPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'MRN',
        text: match[1],
        startIndex: match.index,
        endIndex: match.index + match[1].length,
        confidence: 0.95,
        context: getContext(text, match.index, 30),
        replacement: '[MRN_REDACTED]',
      });
    }
  }

  return entities;
}

/**
 * Detect addresses
 */
function detectAddresses(text: string, config: NLPRedactionConfig): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  const addressPattern =
    /\b(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Calle|Avenida|Rua)(?:\s+[\w\s]+)?)\b/gi;

  let match;
  while ((match = addressPattern.exec(text)) !== null) {
    entities.push({
      type: 'ADDRESS',
      text: match[1],
      startIndex: match.index,
      endIndex: match.index + match[1].length,
      confidence: 0.9,
      context: getContext(text, match.index, 40),
      replacement: '[ADDRESS_REDACTED]',
    });
  }

  return entities;
}

/**
 * Detect dates
 */
function detectDates(text: string, config: NLPRedactionConfig): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  const datePatterns = [
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g,
    /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi,
  ];

  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'DATE',
        text: match[1],
        startIndex: match.index,
        endIndex: match.index + match[1].length,
        confidence: 0.95,
        context: getContext(text, match.index, 30),
        replacement: '[DATE_REDACTED]',
      });
    }
  }

  return entities;
}

/**
 * Detect locations (cities, states, countries)
 */
function detectLocations(text: string, config: NLPRedactionConfig): DetectedEntity[] {
  // For production, integrate with a proper geocoding database
  // This is a simplified version
  return [];
}

/**
 * Detect organizations
 */
function detectOrganizations(text: string, config: NLPRedactionConfig): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  const orgPatterns = [
    /\b([A-Z][a-zá-ú]+\s+(?:Hospital|Clinic|Medical Center|Centro Médico|Clínica|Hospital))\b/gi,
    /\b([A-Z][a-zá-ú]+\s+(?:Inc|LLC|Ltd|Corp|Corporation))\b/g,
  ];

  for (const pattern of orgPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'ORGANIZATION',
        text: match[1],
        startIndex: match.index,
        endIndex: match.index + match[1].length,
        confidence: 0.85,
        context: getContext(text, match.index, 40),
        replacement: '[ORGANIZATION_REDACTED]',
      });
    }
  }

  return entities;
}

/**
 * Detect ages
 */
function detectAges(text: string, config: NLPRedactionConfig): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  const agePattern = /\b(\d{1,3})\s*(?:years?\s+old|yo|años?|anos?)\b/gi;

  let match;
  while ((match = agePattern.exec(text)) !== null) {
    const age = parseInt(match[1]);

    // Only redact if age > 89 (HIPAA requirement)
    if (age > 89) {
      entities.push({
        type: 'AGE',
        text: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.95,
        context: getContext(text, match.index, 30),
        replacement: '90+ years old',
      });
    }
  }

  return entities;
}

/**
 * Get surrounding context for an entity
 */
function getContext(text: string, index: number, radius: number): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.substring(start, end);
}

/**
 * Partially redact a string (e.g., "John Doe" → "J*** D***")
 */
function partialRedact(text: string): string {
  const words = text.split(/\s+/);
  return words.map((word) => (word.length > 0 ? word[0] + '***' : '')).join(' ');
}

/**
 * Check if two entities overlap
 */
function overlaps(
  entity: DetectedEntity,
  startIndex: number,
  endIndex: number
): boolean {
  return !(endIndex <= entity.startIndex || startIndex >= entity.endIndex);
}

/**
 * Remove overlapping entities, keeping highest confidence
 */
function removeOverlaps(entities: DetectedEntity[]): DetectedEntity[] {
  // Sort by confidence (descending)
  entities.sort((a, b) => b.confidence - a.confidence);

  const nonOverlapping: DetectedEntity[] = [];

  for (const entity of entities) {
    // Check if it overlaps with any already selected entity
    const hasOverlap = nonOverlapping.some((e) =>
      overlaps(e, entity.startIndex, entity.endIndex)
    );

    if (!hasOverlap) {
      nonOverlapping.push(entity);
    }
  }

  // Re-sort by position
  nonOverlapping.sort((a, b) => a.startIndex - b.startIndex);

  return nonOverlapping;
}

/**
 * Check if a name is likely a location
 */
function isLikelyLocation(name: string): boolean {
  const locationKeywords = [
    'New York',
    'Los Angeles',
    'São Paulo',
    'Buenos Aires',
    'Mexico City',
    'Rio de Janeiro',
  ];
  return locationKeywords.some((loc) =>
    name.toLowerCase().includes(loc.toLowerCase())
  );
}
