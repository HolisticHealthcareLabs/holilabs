/**
 * Server-Side Analytics
 *
 * PostHog tracking for server-side API routes
 * HIPAA-compliant - never includes PHI in events
 */

import { PostHog } from 'posthog-node';
import logger from '@/lib/logger';

let posthogClient: PostHog | null = null;

/**
 * Get or create PostHog client for server-side tracking
 */
function getPostHogClient(): PostHog | null {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    // Silently skip if not configured (development mode)
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(apiKey, {
      host: apiHost,
      flushAt: 1, // Flush immediately for testing
      flushInterval: 1000 // Flush every second
    });
  }

  return posthogClient;
}

/**
 * Track an analytics event (server-side)
 *
 * IMPORTANT: Never include PHI in properties!
 * - Use hashed/anonymous user IDs
 * - Don't include: names, CPF, emails, phone numbers, diagnoses, medications
 *
 * @param event - Event name (use AnalyticsEvents constants)
 * @param userId - User ID (should be UUID, not real name)
 * @param properties - Event properties (NO PHI!)
 */
export async function trackEvent(
  event: string,
  userId: string,
  properties: Record<string, any> = {}
): Promise<void> {
  const client = getPostHogClient();

  if (!client) {
    // PostHog not configured, skip tracking
    return;
  }

  try {
    // Sanitize properties - remove any PHI that might have leaked
    const sanitizedProperties = sanitizeProperties(properties);

    // Add standard metadata
    const enrichedProperties = {
      ...sanitizedProperties,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      serverSide: true
    };

    // Capture event
    client.capture({
      distinctId: userId,
      event,
      properties: enrichedProperties
    });

    // Log for debugging
    logger.debug({
      message: 'Analytics event tracked',
      event,
      userId,
      propertiesCount: Object.keys(enrichedProperties).length
    });

  } catch (error) {
    // Never let analytics errors break the app
    logger.error({
      message: 'Failed to track analytics event',
      error: error instanceof Error ? error.message : 'Unknown error',
      event
    });
  }
}

/**
 * Identify a user (server-side)
 *
 * IMPORTANT: Never include PHI in traits!
 *
 * @param userId - User ID (UUID)
 * @param traits - User traits (NO PHI!)
 */
export async function identifyUser(
  userId: string,
  traits: Record<string, any> = {}
): Promise<void> {
  const client = getPostHogClient();

  if (!client) {
    return;
  }

  try {
    const sanitizedTraits = sanitizeProperties(traits);

    client.identify({
      distinctId: userId,
      properties: sanitizedTraits
    });

    logger.debug({
      message: 'User identified in analytics',
      userId,
      traitsCount: Object.keys(sanitizedTraits).length
    });

  } catch (error) {
    logger.error({
      message: 'Failed to identify user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Flush events immediately (call before server shutdown)
 */
export async function flushAnalytics(): Promise<void> {
  const client = getPostHogClient();

  if (!client) {
    return;
  }

  try {
    await client.shutdown();
    posthogClient = null; // Reset client
    logger.debug('Analytics events flushed');
  } catch (error) {
    logger.error({
      message: 'Failed to flush analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Sanitize properties to remove PHI
 *
 * Removes common PHI fields that should never be tracked
 */
function sanitizeProperties(properties: Record<string, any>): Record<string, any> {
  const sanitized = { ...properties };

  // List of sensitive fields to remove
  const sensitiveFields = [
    // Personal identifiers
    'email', 'phone', 'phoneNumber', 'cpf', 'cns', 'ssn', 'mrn',
    // Names
    'firstName', 'lastName', 'patientName', 'name', 'fullName',
    // Dates (can be PHI if specific)
    'dateOfBirth', 'birthDate', 'dob',
    // Medical information
    'diagnosis', 'medication', 'prescription', 'treatment',
    'symptoms', 'condition', 'medicalHistory',
    // Location (specific addresses are PHI)
    'address', 'street', 'streetAddress', 'fullAddress',
    // IDs that might be PHI
    'patientId', 'medicalRecordNumber'
  ];

  // Remove sensitive fields
  sensitiveFields.forEach(field => {
    delete sanitized[field];
  });

  // Remove any field that looks like a CPF (xxx.xxx.xxx-xx)
  Object.entries(sanitized).forEach(([key, value]) => {
    if (typeof value === 'string') {
      // Check for CPF pattern
      if (/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(value)) {
        delete sanitized[key];
      }
      // Check for phone pattern
      if (/\(\d{2}\)\s?\d{4,5}-?\d{4}/.test(value)) {
        delete sanitized[key];
      }
      // Check for email pattern
      if (/@/.test(value) && /\.[a-z]{2,}$/i.test(value)) {
        delete sanitized[key];
      }
    }
  });

  return sanitized;
}

/**
 * Standard analytics events for server-side tracking
 * Keep in sync with client-side AnalyticsEvents
 */
export const ServerAnalyticsEvents = {
  // Authentication
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_SIGNUP: 'user_signup',
  OTP_VERIFIED: 'otp_verified',
  MAGIC_LINK_VERIFIED: 'magic_link_verified',

  // Patient Management
  PATIENT_CREATED: 'patient_created',
  PATIENT_UPDATED: 'patient_updated',
  PATIENT_VIEWED: 'patient_viewed',
  PATIENT_SEARCHED: 'patient_searched',

  // Clinical Notes
  CLINICAL_NOTE_CREATED: 'clinical_note_created',
  CLINICAL_NOTE_UPDATED: 'clinical_note_updated',
  CLINICAL_NOTE_SIGNED: 'clinical_note_signed',
  CLINICAL_NOTE_VIEWED: 'clinical_note_viewed',

  // AI Scribe
  SCRIBE_SESSION_STARTED: 'scribe_session_started',
  SCRIBE_SESSION_COMPLETED: 'scribe_session_completed',
  SCRIBE_RECORDING_STARTED: 'scribe_recording_started',
  SCRIBE_RECORDING_STOPPED: 'scribe_recording_stopped',
  SCRIBE_TRANSCRIPTION_GENERATED: 'scribe_transcription_generated',
  SCRIBE_SOAP_GENERATED: 'scribe_soap_generated',

  // Prescriptions
  PRESCRIPTION_CREATED: 'prescription_created',
  MEDICATION_ADDED: 'medication_added',

  // Appointments
  APPOINTMENT_CREATED: 'appointment_created',
  APPOINTMENT_UPDATED: 'appointment_updated',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',

  // Documents
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_VIEWED: 'document_viewed',
  DOCUMENT_SHARED: 'document_shared',

  // Portal Events (Patient-side)
  PORTAL_LOGIN: 'portal_login',
  PORTAL_SIGNUP: 'portal_signup',
  PORTAL_DOCUMENT_UPLOADED: 'portal_document_uploaded',
  PORTAL_APPOINTMENT_BOOKED: 'portal_appointment_booked',
  PORTAL_MESSAGE_SENT: 'portal_message_sent',
  PORTAL_HEALTH_METRIC_ADDED: 'portal_health_metric_added',

  // API Events
  API_ERROR: 'api_error',
  API_RATE_LIMIT_EXCEEDED: 'api_rate_limit_exceeded',
} as const;

/**
 * Example usage in API routes:
 *
 * ```typescript
 * import { trackEvent, ServerAnalyticsEvents } from '@/lib/analytics/server-analytics';
 *
 * // In your API route after successful patient creation:
 * await trackEvent(
 *   ServerAnalyticsEvents.PATIENT_CREATED,
 *   userId, // UUID from JWT
 *   {
 *     // NO PHI! Only metadata
 *     success: true,
 *     hasMedications: medications.length > 0
 *   }
 * );
 * ```
 */
