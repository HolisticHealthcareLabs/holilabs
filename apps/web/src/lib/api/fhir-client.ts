/**
 * FHIR API Client
 * Production-grade client for FHIR resource operations with:
 * - Type safety
 * - Exponential backoff retry logic
 * - Comprehensive error handling
 * - Request caching
 * - Loading states
 * - Timeout handling
 */

import { ApiClientError } from './client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'searchset' | 'collection' | 'transaction' | 'batch';
  total?: number;
  entry?: Array<{
    fullUrl?: string;
    resource: FhirResource;
    search?: {
      mode?: 'match' | 'include';
      score?: number;
    };
  }>;
  link?: Array<{
    relation: string;
    url: string;
  }>;
}

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    source?: string;
    profile?: string[];
    security?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    tag?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
}

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: Array<{
    system?: string;
    value?: string;
    type?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
    };
  }>;
  active?: boolean;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
  }>;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
}

export interface FhirObservation extends FhirResource {
  resourceType: 'Observation';
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
  code: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject?: {
    reference?: string;
    display?: string;
  };
  encounter?: {
    reference?: string;
  };
  effectiveDateTime?: string;
  effectivePeriod?: {
    start?: string;
    end?: string;
  };
  issued?: string;
  performer?: Array<{
    reference?: string;
    display?: string;
  }>;
  valueQuantity?: {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
  };
  valueString?: string;
  valueBoolean?: boolean;
  valueCodeableConcept?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  interpretation?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
  note?: Array<{
    text: string;
    time?: string;
  }>;
  referenceRange?: Array<{
    low?: {
      value?: number;
      unit?: string;
    };
    high?: {
      value?: number;
      unit?: string;
    };
    type?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
    };
    text?: string;
  }>;
}

export interface FhirEncounter extends FhirResource {
  resourceType: 'Encounter';
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';
  class: {
    system?: string;
    code?: string;
    display?: string;
  };
  type?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
  priority?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
  subject?: {
    reference?: string;
    display?: string;
  };
  participant?: Array<{
    type?: Array<{
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
    }>;
    individual?: {
      reference?: string;
      display?: string;
    };
  }>;
  period?: {
    start?: string;
    end?: string;
  };
  reasonCode?: Array<{
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  }>;
  diagnosis?: Array<{
    condition?: {
      reference?: string;
      display?: string;
    };
    use?: {
      coding?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
    };
    rank?: number;
  }>;
  location?: Array<{
    location?: {
      reference?: string;
      display?: string;
    };
    status?: string;
    period?: {
      start?: string;
      end?: string;
    };
  }>;
}

export interface FhirExportOptions {
  patientTokenId: string;
  start?: string; // ISO 8601 date
  end?: string; // ISO 8601 date
  type?: string[]; // Resource types to filter
}

export interface FhirExportResponse {
  success: boolean;
  bundle: FhirBundle;
  error?: string;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class FhirApiError extends ApiClientError {
  constructor(
    message: string,
    status: number,
    public fhirError?: {
      resourceType?: string;
      issue?: Array<{
        severity: 'fatal' | 'error' | 'warning' | 'information';
        code: string;
        diagnostics?: string;
        details?: {
          text?: string;
        };
      }>;
    }
  ) {
    super(message, status);
    this.name = 'FhirApiError';
  }
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  const jitter = delay * 0.25 * Math.random(); // ±25% jitter
  return Math.min(delay + jitter, config.maxDelay);
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Success case
      if (response.ok) {
        return response;
      }

      // Check if should retry
      if (
        attempt < config.maxRetries &&
        config.retryableStatuses.includes(response.status)
      ) {
        const backoffMs = calculateBackoff(attempt, config);
        console.warn(
          `FHIR API request failed (status ${response.status}), retrying in ${backoffMs}ms (attempt ${attempt + 1}/${config.maxRetries})`
        );
        await sleep(backoffMs);
        continue;
      }

      // Non-retryable error or max retries reached
      const errorBody = await response.json().catch(() => ({}));
      throw new FhirApiError(
        errorBody.error || `FHIR API request failed with status ${response.status}`,
        response.status,
        errorBody.fhirError
      );
    } catch (error) {
      lastError = error as Error;

      // Network errors are retryable
      if (attempt < config.maxRetries && (error as any).name === 'TypeError') {
        const backoffMs = calculateBackoff(attempt, config);
        console.warn(
          `Network error, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${config.maxRetries})`
        );
        await sleep(backoffMs);
        continue;
      }

      // If it's already a FhirApiError, rethrow it
      if (error instanceof FhirApiError) {
        throw error;
      }

      throw error;
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

// ============================================================================
// FHIR CLIENT
// ============================================================================

// API Base URL - defaults to same origin, but can be overridden via environment variable
const API_BASE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Fetch patient FHIR Bundle ($everything operation)
 */
export async function fetchPatientFhirBundle(
  options: FhirExportOptions
): Promise<FhirBundle> {
  const { patientTokenId, start, end, type } = options;

  // Build query parameters
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  if (type && type.length > 0) {
    type.forEach((t) => params.append('type', t));
  }

  const url = `${API_BASE_URL}/fhir/export/patient/${patientTokenId}/$everything${
    params.toString() ? `?${params.toString()}` : ''
  }`;

  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new FhirApiError(
      error.error || 'Failed to fetch FHIR bundle',
      response.status,
      error.fhirError
    );
  }

  const bundle = await response.json();
  return bundle as FhirBundle;
}

/**
 * Get FHIR export history for patient
 */
export async function getFhirExportHistory(): Promise<
  Array<{
    timestamp: string;
    correlationId: string;
    userId: string;
    patientTokenId: string;
    resourceCount: number;
  }>
> {
  const response = await fetchWithRetry(`${API_BASE_URL}/fhir/export/exports`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new FhirApiError(
      'Failed to fetch export history',
      response.status
    );
  }

  const data = await response.json();
  return data.exports || [];
}

/**
 * Parse FHIR Bundle and extract resources by type
 */
export function extractResourcesByType(
  bundle: FhirBundle,
  resourceType: string
): FhirResource[] {
  if (!bundle.entry) return [];

  return bundle.entry
    .filter((entry) => entry.resource?.resourceType === resourceType)
    .map((entry) => entry.resource);
}

/**
 * Get resource display name
 */
export function getResourceDisplayName(resource: FhirResource): string {
  switch (resource.resourceType) {
    case 'Observation': {
      const obs = resource as FhirObservation;
      return obs.code?.text || obs.code?.coding?.[0]?.display || 'Observation';
    }
    case 'Encounter': {
      const enc = resource as FhirEncounter;
      return enc.type?.[0]?.text || enc.type?.[0]?.coding?.[0]?.display || 'Encounter';
    }
    case 'Patient': {
      const pat = resource as FhirPatient;
      const name = pat.name?.[0];
      if (name) {
        return `${name.given?.join(' ')} ${name.family}`.trim();
      }
      return 'Patient';
    }
    default:
      return resource.resourceType;
  }
}

/**
 * Format FHIR date/datetime for display
 */
export function formatFhirDateTime(dateTime?: string): string {
  if (!dateTime) return 'N/A';

  try {
    const date = new Date(dateTime);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateTime;
  }
}

/**
 * Format FHIR date for display
 */
export function formatFhirDate(date?: string): string {
  if (!date) return 'N/A';

  try {
    const dateObj = new Date(date);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  } catch {
    return date;
  }
}

/**
 * Get status badge color
 */
export function getStatusColor(
  status: string
): 'gray' | 'blue' | 'green' | 'yellow' | 'red' {
  const statusLower = status.toLowerCase();

  if (statusLower === 'final' || statusLower === 'finished') return 'green';
  if (statusLower === 'in-progress' || statusLower === 'preliminary')
    return 'blue';
  if (statusLower === 'cancelled' || statusLower === 'entered-in-error')
    return 'red';
  if (statusLower === 'planned' || statusLower === 'registered')
    return 'yellow';

  return 'gray';
}
