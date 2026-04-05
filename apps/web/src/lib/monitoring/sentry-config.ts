/**
 * Sentry PHI Scrubbing Configuration
 *
 * Provides a beforeSend hook that strips PHI/PII fields from Sentry error
 * events before they leave the application. Import and spread into your
 * Sentry.init() calls (server, client, edge).
 *
 * This is a defense-in-depth layer — the application should never put PHI
 * into error messages, but if it leaks through a stack trace or breadcrumb
 * this hook strips it before Sentry ingests it.
 *
 * @compliance HIPAA §164.312(e)(1) — transmission security
 * @compliance LGPD Art. 46 — security measures for personal data processing
 */

/**
 * Sentry event shape — inline to avoid dependency on @sentry/types or @sentry/core
 * which are internal to @sentry/nextjs v10 and not directly importable.
 */
interface SentryEvent {
  request?: { cookies?: unknown; headers?: unknown; data?: unknown };
  exception?: {
    values?: Array<{
      value?: string;
      stacktrace?: { frames?: Array<{ vars?: Record<string, string> }> };
    }>;
  };
  breadcrumbs?: Array<{ message?: string; data?: Record<string, unknown> }>;
  extra?: Record<string, unknown>;
}

/**
 * PHI field names that must never appear in Sentry events.
 * Sourced from CLAUDE.md §V.1 PHI Protection table.
 */
const PHI_FIELD_PATTERNS: readonly RegExp[] = [
  // Patient model L4 fields
  /\bfirstName\b/i,
  /\blastName\b/i,
  /\bdateOfBirth\b/i,
  /\b(patient)?email\b/i,
  /\bphone\b/i,
  /\baddress\b/i,
  /\bpostalCode\b/i,
  /\bmrn\b/i,
  /\bexternalMrn\b/i,
  /\bcpf\b/i,
  /\bcns\b/i,
  /\brg\b/i,

  // User model L3 fields
  /\bpasswordHash\b/i,
  /\bsigningPinHash\b/i,
  /\bmfaPhoneNumber\b/i,
  /\bmfaBackupCodes?\b/i,

  // Clinical model L4 fields
  /\bchiefComplaint\b/i,
  /\bsubjective\b/i,
  /\bobjective\b/i,
  /\bassessment\b/i,
  /\bvitalSigns\b/i,
  /\baudioFileUrl\b/i,

  // Brazilian national IDs
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/, // CPF format
  /\b\d{15}\b/, // CNS format (15 digits)
];

/**
 * Recursively scrub PHI patterns from any string value in an object.
 */
function scrubValue(value: string): string {
  let scrubbed = value;
  for (const pattern of PHI_FIELD_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, '[REDACTED]');
  }
  return scrubbed;
}

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Redact any key that matches a PHI field name
    const isPhiKey = PHI_FIELD_PATTERNS.some((p) => p.test(key));
    if (isPhiKey) {
      result[key] = '[REDACTED]';
      continue;
    }

    if (typeof value === 'string') {
      result[key] = scrubValue(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = scrubObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Sentry beforeSend hook — strips PHI from error events.
 *
 * Usage in sentry.server.config.ts / sentry.client.config.ts:
 *
 *   import { phiScrubBeforeSend } from '@/lib/monitoring/sentry-config';
 *
 *   Sentry.init({
 *     ...existingConfig,
 *     beforeSend: phiScrubBeforeSend,
 *   });
 */
export function phiScrubBeforeSend(event: SentryEvent, _hint?: unknown): SentryEvent | null {
  // Strip request cookies and headers (session tokens, auth)
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
  }

  // Scrub exception messages and stack traces
  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.value) {
        exception.value = scrubValue(exception.value);
      }
      if (exception.stacktrace?.frames) {
        for (const frame of exception.stacktrace.frames) {
          if (frame.vars) {
            frame.vars = scrubObject(frame.vars) as Record<string, string>;
          }
        }
      }
    }
  }

  // Scrub breadcrumb messages
  if (event.breadcrumbs) {
    for (const breadcrumb of event.breadcrumbs) {
      if (breadcrumb.message) {
        breadcrumb.message = scrubValue(breadcrumb.message);
      }
      if (breadcrumb.data) {
        breadcrumb.data = scrubObject(breadcrumb.data);
      }
    }
  }

  // Scrub extra context
  if (event.extra) {
    event.extra = scrubObject(event.extra as Record<string, unknown>);
  }

  return event;
}

/**
 * URLs to exclude from Sentry transaction tracing.
 * Health check endpoints generate high-frequency, low-value noise.
 */
export const SENTRY_DENY_URLS: readonly (string | RegExp)[] = [
  /\/api\/health/,
];

/**
 * Recommended traces sample rates.
 */
export const SENTRY_TRACES_SAMPLE_RATE = process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
