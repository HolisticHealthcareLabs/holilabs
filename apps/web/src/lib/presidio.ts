/**
 * Client for Microsoft Presidio De-identification Service
 * 
 * Requires Presidio Analyzer and Anonymizer running as services (e.g., via Docker).
 * Default URL: http://localhost:3000 (Analyzer) and http://localhost:3001 (Anonymizer)
 * 
 * Note: For this implementation, we assume a simplified setup where we might call
 * the Analyzer to get findings and then handle anonymization, or call an Anonymizer endpoint
 * if configured.
 */

const PRESIDIO_ANALYZER_URL = process.env.PRESIDIO_ANALYZER_URL || 'http://0.0.0.0:5001';
const PRESIDIO_ANONYMIZER_URL = process.env.PRESIDIO_ANONYMIZER_URL || 'http://0.0.0.0:5002';

export interface PresidioFinding {
  entity_type: string;
  start: number;
  end: number;
  score: number;
}

export interface AnonymizeResponse {
  text: string;
  items: {
    start: number;
    end: number;
    entity_type: string;
    text: string;
    operator: string;
  }[];
}

/**
 * De-identifies patient data by replacing PII/PHI with placeholders.
 * 
 * @param text The raw clinical text to de-identify
 * @returns De-identified text safe for LLM processing
 */
export async function anonymizePatientData(text: string): Promise<string> {
  try {
    // Default strictness: production => strict, development => non-strict
    // unless explicitly forced on via REQUIRE_DEIDENTIFICATION=true.
    const strictEnv = process.env.REQUIRE_DEIDENTIFICATION;
    const strict =
      strictEnv !== undefined ? strictEnv === 'true' : (process.env.NODE_ENV || 'development') === 'production';
    const timeoutMs = Number(process.env.PRESIDIO_TIMEOUT_MS || 8000);

    // 1. Analyze the text to find PII
    const analyzeController = new AbortController();
    const analyzeTimeout = setTimeout(() => analyzeController.abort(), timeoutMs);
    const analyzeResponse = await fetch(`${PRESIDIO_ANALYZER_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'close',
      },
      signal: analyzeController.signal,
      body: JSON.stringify({
        text: text,
        language: 'en',
        score_threshold: 0.6, // Confidence threshold
        entities: [
          'PERSON',
          'PHONE_NUMBER',
          'EMAIL_ADDRESS',
          'US_SSN',
          'US_PASSPORT',
          'IP_ADDRESS',
          'DATE_TIME',
          'LOCATION',
          'MEDICAL_LICENSE',
          // Add custom entities here if configured in Presidio
        ],
      }),
    });
    clearTimeout(analyzeTimeout);

    if (!analyzeResponse.ok) {
      const msg = `Presidio Analyzer returned ${analyzeResponse.status}`;
      if (strict) throw new Error(msg);
      console.warn(`${msg}. Returning original text (non-strict mode).`);
      return text;
    }

    const findings: PresidioFinding[] = await analyzeResponse.json();

    if (findings.length === 0) {
      return text;
    }

    // 2. Anonymize the text using the findings
    // We use the Anonymizer service to ensure consistent replacement
    const anonController = new AbortController();
    const anonTimeout = setTimeout(() => anonController.abort(), timeoutMs);
    const anonymizeResponse = await fetch(`${PRESIDIO_ANONYMIZER_URL}/anonymize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'close',
      },
      signal: anonController.signal,
      body: JSON.stringify({
        text: text,
        analyzer_results: findings,
        anonymizers: {
          DEFAULT: { type: 'replace', new_value: '<REDACTED>' },
          PERSON: { type: 'replace', new_value: '<PERSON>' },
          PHONE_NUMBER: { type: 'replace', new_value: '<PHONE>' },
          EMAIL_ADDRESS: { type: 'replace', new_value: '<EMAIL>' },
          DATE_TIME: { type: 'replace', new_value: '<DATE>' },
          LOCATION: { type: 'replace', new_value: '<LOCATION>' },
        },
      }),
    });
    clearTimeout(anonTimeout);

    if (!anonymizeResponse.ok) {
      const msg = `Presidio Anonymizer returned ${anonymizeResponse.status}`;
      if (strict) throw new Error(msg);
      console.warn(`${msg}. Returning original text (non-strict mode).`);
      return text;
    }

    const result: AnonymizeResponse = await anonymizeResponse.json();
    return result.text;

  } catch (error) {
    console.error('Error in anonymizePatientData:', error);
    // Fail closed if strict.
    const strictEnv = process.env.REQUIRE_DEIDENTIFICATION;
    const strict =
      strictEnv !== undefined ? strictEnv === 'true' : (process.env.NODE_ENV || 'development') === 'production';
    if (strict) throw error instanceof Error ? error : new Error('De-identification failed');
    return text;
  }
}
