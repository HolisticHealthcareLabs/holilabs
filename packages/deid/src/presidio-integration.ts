/**
 * Microsoft Presidio Integration Layer
 *
 * Enterprise-grade TypeScript wrapper for Presidio REST API
 * Provides PII detection and anonymization for healthcare data
 *
 * @see https://microsoft.github.io/presidio/
 * @compliance HIPAA Safe Harbor (18 identifiers)
 * @compliance LGPD Art. 46 (Security Measures)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Environment configuration
const PRESIDIO_ANALYZER_URL = process.env.PRESIDIO_ANALYZER_URL || 'http://presidio-analyzer:5001';
const PRESIDIO_ANONYMIZER_URL = process.env.PRESIDIO_ANONYMIZER_URL || 'http://presidio-anonymizer:5002';
const PRESIDIO_TIMEOUT_MS = parseInt(process.env.PRESIDIO_TIMEOUT_MS || '5000', 10);
const PRESIDIO_MAX_RETRIES = parseInt(process.env.PRESIDIO_MAX_RETRIES || '3', 10);

/**
 * Presidio Entity Types (HIPAA Safe Harbor 18 identifiers)
 */
export type PresidioEntityType =
  | 'PERSON'                // Names
  | 'EMAIL_ADDRESS'         // Email addresses
  | 'PHONE_NUMBER'          // Phone numbers
  | 'US_SSN'                // Social Security Numbers
  | 'US_DRIVER_LICENSE'     // Driver's license numbers
  | 'MEDICAL_LICENSE'       // Medical license numbers (MRN)
  | 'LOCATION'              // Geographic locations
  | 'DATE_TIME'             // Dates
  | 'URL'                   // URLs
  | 'IP_ADDRESS'            // IP addresses
  | 'IBAN_CODE'             // Bank account numbers
  | 'CREDIT_CARD'           // Credit card numbers
  | 'US_PASSPORT'           // Passport numbers
  | 'AGE'                   // Ages over 89
  | 'ORGANIZATION';         // Organization names

/**
 * Presidio entity detection result
 */
export interface PresidioEntity {
  entity_type: PresidioEntityType;
  start: number;
  end: number;
  score: number; // 0.0 to 1.0 confidence
  analysis_explanation?: {
    recognizer: string;
    pattern_name?: string;
    pattern?: string;
    original_score: number;
    score: number;
    textual_explanation?: string;
  };
}

/**
 * Presidio analysis request configuration
 */
export interface PresidioAnalyzeRequest {
  text: string;
  language: 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'nl';
  score_threshold?: number; // Default: 0.5
  entities?: PresidioEntityType[]; // Specific entities to detect
  context?: string[]; // Context words to improve accuracy
  correlation_id?: string; // For request tracing
  return_decision_process?: boolean; // Include analysis explanation
}

/**
 * Presidio anonymization request configuration
 */
export interface PresidioAnonymizeRequest {
  text: string;
  analyzer_results: PresidioEntity[];
  anonymizers?: Record<string, {
    type: 'replace' | 'mask' | 'redact' | 'hash' | 'encrypt';
    new_value?: string; // For 'replace' type
    masking_char?: string; // For 'mask' type
    chars_to_mask?: number; // For 'mask' type
    from_end?: boolean; // For 'mask' type
  }>;
}

/**
 * Presidio anonymization result
 */
export interface PresidioAnonymizeResult {
  text: string; // Anonymized text
  items: Array<{
    start: number;
    end: number;
    entity_type: PresidioEntityType;
    text: string; // Original text
    operator: string; // Operator used
  }>;
}

/**
 * Presidio health check response
 */
export interface PresidioHealthCheck {
  status: 'healthy' | 'unhealthy';
  version?: string;
  uptime_seconds?: number;
}

/**
 * Presidio error response
 */
export interface PresidioError {
  error: string;
  message: string;
  status_code?: number;
}

/**
 * Circuit breaker state for fault tolerance
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold = 5,
    private timeout = 60000 // 60 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - Presidio service unavailable');
      }
    }

    try {
      const result = await fn();

      if (this.state === 'HALF_OPEN') {
        this.reset();
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.error(`[Presidio Circuit Breaker] OPEN - ${this.failures} consecutive failures`);
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    console.info('[Presidio Circuit Breaker] CLOSED - Service recovered');
  }

  getState(): string {
    return this.state;
  }
}

/**
 * Presidio Client - Enterprise-grade integration
 */
export class PresidioClient {
  private analyzerClient: AxiosInstance;
  private anonymizerClient: AxiosInstance;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    // Analyzer client
    this.analyzerClient = axios.create({
      baseURL: PRESIDIO_ANALYZER_URL,
      timeout: PRESIDIO_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HoliLabs/1.0 (Presidio Integration)',
      },
    });

    // Anonymizer client
    this.anonymizerClient = axios.create({
      baseURL: PRESIDIO_ANONYMIZER_URL,
      timeout: PRESIDIO_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HoliLabs/1.0 (Presidio Integration)',
      },
    });

    // Circuit breaker for fault tolerance
    this.circuitBreaker = new CircuitBreaker(5, 60000);

    // Add request interceptors for logging
    this.addRequestInterceptors();
  }

  private addRequestInterceptors(): void {
    // Request logger
    const requestLogger = (config: any) => {
      console.debug(`[Presidio Request] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    };

    // Error handler
    const errorHandler = (error: AxiosError) => {
      if (error.response) {
        console.error(`[Presidio Error] ${error.response.status}: ${error.response.statusText}`);
      } else if (error.request) {
        console.error('[Presidio Error] No response received from Presidio service');
      } else {
        console.error(`[Presidio Error] ${error.message}`);
      }
      return Promise.reject(error);
    };

    this.analyzerClient.interceptors.request.use(requestLogger);
    this.analyzerClient.interceptors.response.use(undefined, errorHandler);

    this.anonymizerClient.interceptors.request.use(requestLogger);
    this.anonymizerClient.interceptors.response.use(undefined, errorHandler);
  }

  /**
   * Health check for Presidio Analyzer service
   */
  async healthCheckAnalyzer(): Promise<PresidioHealthCheck> {
    try {
      const response = await this.analyzerClient.get('/health');
      return {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        version: response.data?.version,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
      };
    }
  }

  /**
   * Health check for Presidio Anonymizer service
   */
  async healthCheckAnonymizer(): Promise<PresidioHealthCheck> {
    try {
      const response = await this.anonymizerClient.get('/health');
      return {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        version: response.data?.version,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
      };
    }
  }

  /**
   * Analyze text for PII entities
   *
   * @throws Error if Presidio service is unavailable or circuit breaker is open
   */
  async analyze(request: PresidioAnalyzeRequest): Promise<PresidioEntity[]> {
    return this.circuitBreaker.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await this.analyzerClient.post<PresidioEntity[]>('/analyze', {
          text: request.text,
          language: request.language,
          score_threshold: request.score_threshold ?? 0.7,
          entities: request.entities,
          context: request.context,
          correlation_id: request.correlation_id,
          return_decision_process: request.return_decision_process ?? false,
        });

        const duration = Date.now() - startTime;
        console.info(`[Presidio Analyze] Found ${response.data.length} entities in ${duration}ms`);

        return response.data;
      } catch (err: unknown) {
        const error = err as AxiosError;
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED') {
            throw new Error('Presidio Analyzer service is not reachable - check deployment');
          }
          if (error.response?.status === 422) {
            throw new Error(`Invalid request to Presidio: ${(error.response.data as any)?.error || 'Validation error'}`);
          }
        }
        throw new Error(`Presidio analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Anonymize text based on detected entities
   *
   * @throws Error if Presidio service is unavailable or circuit breaker is open
   */
  async anonymize(request: PresidioAnonymizeRequest): Promise<PresidioAnonymizeResult> {
    return this.circuitBreaker.execute(async () => {
      const startTime = Date.now();

      try {
        const response = await this.anonymizerClient.post<PresidioAnonymizeResult>('/anonymize', {
          text: request.text,
          analyzer_results: request.analyzer_results,
          anonymizers: request.anonymizers || {
            DEFAULT: { type: 'replace', new_value: '<REDACTED>' },
          },
        });

        const duration = Date.now() - startTime;
        console.info(`[Presidio Anonymize] Redacted ${response.data.items.length} entities in ${duration}ms`);

        return response.data;
      } catch (err: unknown) {
        const error = err as AxiosError;
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED') {
            throw new Error('Presidio Anonymizer service is not reachable - check deployment');
          }
          if (error.response?.status === 422) {
            throw new Error(`Invalid request to Presidio: ${(error.response.data as any)?.error || 'Validation error'}`);
          }
        }
        throw new Error(`Presidio anonymization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Analyze and anonymize in a single operation (convenience method)
   */
  async analyzeAndAnonymize(
    text: string,
    language: 'en' | 'es' | 'pt' = 'es',
    scoreThreshold: number = 0.7
  ): Promise<{
    anonymizedText: string;
    entities: PresidioEntity[];
    statistics: {
      totalEntities: number;
      processingTimeMs: number;
    };
  }> {
    const startTime = Date.now();

    // Step 1: Analyze
    const entities = await this.analyze({
      text,
      language,
      score_threshold: scoreThreshold,
    });

    // Step 2: Anonymize
    const result = await this.anonymize({
      text,
      analyzer_results: entities,
    });

    const duration = Date.now() - startTime;

    return {
      anonymizedText: result.text,
      entities,
      statistics: {
        totalEntities: entities.length,
        processingTimeMs: duration,
      },
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerState(): string {
    return this.circuitBreaker.getState();
  }
}

// Singleton instance
let presidioClientInstance: PresidioClient | null = null;

/**
 * Get or create Presidio client instance (singleton pattern)
 */
export function getPresidioClient(): PresidioClient {
  if (!presidioClientInstance) {
    presidioClientInstance = new PresidioClient();
  }
  return presidioClientInstance;
}

/**
 * Convenience function: Analyze text for PII
 */
export async function analyzeWithPresidio(
  request: PresidioAnalyzeRequest
): Promise<PresidioEntity[]> {
  const client = getPresidioClient();
  return client.analyze(request);
}

/**
 * Convenience function: Anonymize text
 */
export async function anonymizeWithPresidio(
  request: PresidioAnonymizeRequest
): Promise<PresidioAnonymizeResult> {
  const client = getPresidioClient();
  return client.anonymize(request);
}

/**
 * Convenience function: Analyze and anonymize in one call
 */
export async function analyzeAndAnonymize(
  text: string,
  language: 'en' | 'es' | 'pt' = 'es',
  scoreThreshold: number = 0.7
): Promise<{
  anonymizedText: string;
  entities: PresidioEntity[];
  statistics: {
    totalEntities: number;
    processingTimeMs: number;
  };
}> {
  const client = getPresidioClient();
  return client.analyzeAndAnonymize(text, language, scoreThreshold);
}
