import { env } from 'process';

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
    // 1. Analyze the text to find PII
    const analyzeResponse = await fetch(`${PRESIDIO_ANALYZER_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'close',
      },
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

    if (!analyzeResponse.ok) {
      // If Presidio is not running, warn and return original text (fail open for prototype, or fail closed for prod)
      console.warn('Presidio Analyzer service not reachable or returned error. Returning original text.');
      return text;
    }

    const findings: PresidioFinding[] = await analyzeResponse.json();

    if (findings.length === 0) {
      return text;
    }

    // 2. Anonymize the text using the findings
    // We use the Anonymizer service to ensure consistent replacement
    const anonymizeResponse = await fetch(`${PRESIDIO_ANONYMIZER_URL}/anonymize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'close',
      },
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

    if (!anonymizeResponse.ok) {
      console.warn('Presidio Anonymizer service not reachable. Returning original text.');
      return text;
    }

    const result: AnonymizeResponse = await anonymizeResponse.json();
    return result.text;

  } catch (error) {
    console.error('Error in anonymizePatientData:', error);
    // Fallback: Return original text but log error. 
    // In a strict production environment, you might want to throw an error to prevent data leak.
    return text;
  }
}
