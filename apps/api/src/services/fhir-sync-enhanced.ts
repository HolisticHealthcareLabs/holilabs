// @ts-nocheck
/**
 * Production-Grade FHIR Sync Service
 * Privacy-preserving bridge between Holi Labs and Medplum FHIR server
 */

import type {
  Patient,
  Encounter as FHIREncounter,
  Observation as FHIRObservation,
  Bundle,
} from '@medplum/fhirtypes';
import type { PrismaClient, Encounter, Observation, PatientToken, Consent } from '@prisma/client';

/**
 * Configuration
 */
const MEDPLUM_BASE_URL = process.env.MEDPLUM_BASE_URL || 'http://localhost:8100';
const MEDPLUM_CLIENT_ID = process.env.MEDPLUM_CLIENT_ID;
const MEDPLUM_CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET;
const MEDPLUM_PROJECT_ID = process.env.MEDPLUM_PROJECT_ID || 'default';
const ENABLE_MEDPLUM = process.env.ENABLE_MEDPLUM === 'true';

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Type definitions
 */
interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

interface SyncContext {
  correlationId: string;
  orgId: string;
  resourceType: string;
  resourceId: string;
}

interface SyncResult {
  success: boolean;
  fhirResourceId?: string;
  error?: string;
  retries?: number;
}

/**
 * Global state
 */
let cachedToken: AccessTokenCache | null = null;
let prismaClient: PrismaClient | null = null;

/**
 * Initialize the sync service with Prisma client
 */
export function initFhirSyncService(prisma: PrismaClient): void {
  prismaClient = prisma;
}

/**
 * Logging utilities
 */
function log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    service: 'fhir-sync',
    message,
    ...context,
  };
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(logEntry));
}

/**
 * Configuration validation
 */
function isMedplumConfigured(): boolean {
  if (!ENABLE_MEDPLUM) {
    log('info', 'FHIR sync disabled via ENABLE_MEDPLUM flag');
    return false;
  }

  const configured = Boolean(MEDPLUM_CLIENT_ID && MEDPLUM_CLIENT_SECRET && MEDPLUM_BASE_URL);
  if (!configured) {
    log('warn', 'Medplum configuration incomplete', {
      hasClientId: Boolean(MEDPLUM_CLIENT_ID),
      hasClientSecret: Boolean(MEDPLUM_CLIENT_SECRET),
      hasBaseUrl: Boolean(MEDPLUM_BASE_URL),
    });
  }
  return configured;
}

/**
 * Exponential backoff with jitter
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
    RETRY_CONFIG.maxDelayMs
  );
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * OAuth2 token management with retry
 */
async function getAccessToken(context: SyncContext): Promise<string | null> {
  if (!isMedplumConfigured()) {
    return null;
  }

  // Return cached token if valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60 * 1000) {
    return cachedToken.token;
  }

  const tokenUrl = new URL('/oauth2/token', MEDPLUM_BASE_URL).toString();
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: MEDPLUM_CLIENT_ID!,
    client_secret: MEDPLUM_CLIENT_SECRET!,
    scope: `project/${MEDPLUM_PROJECT_ID}./*`,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      log('info', 'Fetching Medplum OAuth token', { ...context, attempt });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Token fetch failed: ${response.status} ${detail}`);
      }

      const data = (await response.json()) as { access_token: string; expires_in: number };
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };

      log('info', 'OAuth token acquired', { ...context, expiresIn: data.expires_in });
      return cachedToken.token;
    } catch (error) {
      lastError = error as Error;
      log('warn', 'Token fetch failed, will retry', {
        ...context,
        attempt,
        error: lastError.message,
      });

      if (attempt < RETRY_CONFIG.maxRetries) {
        await sleep(calculateBackoff(attempt));
      }
    }
  }

  log('error', 'Token fetch failed after all retries', {
    ...context,
    error: lastError?.message,
  });
  throw new Error(`Failed to fetch Medplum token: ${lastError?.message}`);
}

/**
 * Generic FHIR resource upsert with retry
 */
async function upsertResource<T extends { resourceType: string; id?: string }>(
  resourceType: T['resourceType'],
  resource: T,
  context: SyncContext
): Promise<void> {
  const token = await getAccessToken(context);
  if (!token) return;

  if (!resource.id) {
    throw new Error(`[FHIR] ${resourceType} resource is missing an id`);
  }

  const url = new URL(`/fhir/R4/${resourceType}/${resource.id}`, MEDPLUM_BASE_URL).toString();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      log('info', 'Upserting FHIR resource', { ...context, attempt, fhirId: resource.id });

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/fhir+json',
          'X-Correlation-ID': context.correlationId,
        },
        body: JSON.stringify(resource),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Upsert failed: ${response.status} ${detail}`);
      }

      log('info', 'FHIR resource upserted successfully', {
        ...context,
        fhirId: resource.id,
        retries: attempt,
      });
      return;
    } catch (error) {
      lastError = error as Error;
      log('warn', 'FHIR upsert failed, will retry', {
        ...context,
        attempt,
        error: lastError.message,
      });

      if (attempt < RETRY_CONFIG.maxRetries) {
        await sleep(calculateBackoff(attempt));
      }
    }
  }

  throw new Error(`Failed to upsert ${resourceType}/${resource.id} after ${RETRY_CONFIG.maxRetries} retries: ${lastError?.message}`);
}

/**
 * Consent validation
 */
async function checkConsent(
  patientTokenId: string,
  orgId: string,
  dataClass: string,
  context: SyncContext
): Promise<boolean> {
  if (!prismaClient) {
    log('error', 'Prisma client not initialized', context);
    return false;
  }

  try {
    const consent = await prismaClient.consent.findFirst({
      where: {
        patientTokenId,
        orgId,
        purpose: 'CARE',
        state: 'ACTIVE',
      },
    });

    if (!consent) {
      log('warn', 'No active CARE consent found', { ...context, dataClass });
      return false;
    }

    const hasConsent = consent.dataClasses.includes(dataClass);
    if (!hasConsent) {
      log('warn', 'Data class not authorized in consent', {
        ...context,
        dataClass,
        authorizedClasses: consent.dataClasses,
      });
    }

    return hasConsent;
  } catch (error) {
    log('error', 'Consent check failed', {
      ...context,
      error: (error as Error).message,
    });
    return false;
  }
}

/**
 * Audit logging
 */
async function auditSync(
  context: SyncContext,
  result: SyncResult,
  action: 'UPSERT' | 'DELETE'
): Promise<void> {
  if (!prismaClient) return;

  try {
    await prismaClient.auditEvent.create({
      data: {
        orgId: context.orgId,
        eventType: 'FHIR_SYNC',
        payload: {
          correlationId: context.correlationId,
          resourceType: context.resourceType,
          resourceId: context.resourceId,
          fhirResourceId: result.fhirResourceId,
          action,
          success: result.success,
          error: result.error,
          retries: result.retries,
        },
      },
    });
  } catch (error) {
    log('error', 'Failed to create audit log', {
      ...context,
      error: (error as Error).message,
    });
  }
}

/**
 * Map EncounterType to FHIR ActCode
 */
function mapEncounterTypeToActCode(type: string): string {
  const mapping: Record<string, string> = {
    OFFICE_VISIT: 'AMB',
    TELEHEALTH: 'VR',
    EMERGENCY: 'EMER',
    HOME_HEALTH: 'HH',
    PHONE_CONSULT: 'VR',
  };
  return mapping[type] || 'AMB';
}

/**
 * PATIENT SYNC
 * Creates de-identified FHIR Patient resource
 */
export interface PatientSyncPayload {
  id: string;
  orgId: string;
  patientTokenId: string;
  displayName?: string; // Optional anonymized display name
}

export async function syncPatientToFhir(payload: PatientSyncPayload): Promise<SyncResult> {
  const correlationId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const context: SyncContext = {
    correlationId,
    orgId: payload.orgId,
    resourceType: 'Patient',
    resourceId: payload.id,
  };

  try {
    log('info', 'Starting Patient sync', context);

    // Check consent
    const hasConsent = await checkConsent(payload.patientTokenId, payload.orgId, 'demographics', context);
    if (!hasConsent) {
      const result: SyncResult = { success: false, error: 'No active consent' };
      await auditSync(context, result, 'UPSERT');
      return result;
    }

    // Build de-identified FHIR Patient
    const patient: Patient = {
      resourceType: 'Patient',
      id: payload.patientTokenId,
      identifier: [{
        system: 'https://holilabs.xyz/patient-token',
        value: payload.patientTokenId,
      }],
      name: [{
        text: payload.displayName || `Patient [${payload.patientTokenId.slice(0, 6).toUpperCase()}]`,
        family: '***',
        given: ['***'],
      }],
      telecom: [], // No contact info
      address: [], // No address
      extension: [{
        url: 'https://holilabs.xyz/fhir/consent-state',
        valueCode: 'ACTIVE',
      }],
    };

    await upsertResource('Patient', patient, context);

    const result: SyncResult = { success: true, fhirResourceId: patient.id };
    await auditSync(context, result, 'UPSERT');
    return result;
  } catch (error) {
    log('error', 'Patient sync failed', { ...context, error: (error as Error).message });
    const result: SyncResult = { success: false, error: (error as Error).message };
    await auditSync(context, result, 'UPSERT');
    return result;
  }
}

/**
 * ENCOUNTER SYNC
 */
export interface EncounterSyncPayload {
  encounter: Encounter;
  patientToken: PatientToken;
}

export async function syncEncounterToFhir(payload: EncounterSyncPayload): Promise<SyncResult> {
  const correlationId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const context: SyncContext = {
    correlationId,
    orgId: payload.encounter.orgId,
    resourceType: 'Encounter',
    resourceId: payload.encounter.id,
  };

  try {
    log('info', 'Starting Encounter sync', context);

    if (!payload.encounter.fhirSyncEnabled) {
      log('info', 'Encounter sync disabled', context);
      return { success: false, error: 'Sync disabled for this resource' };
    }

    // Check consent
    const hasConsent = await checkConsent(
      payload.encounter.patientTokenId,
      payload.encounter.orgId,
      'encounters',
      context
    );
    if (!hasConsent) {
      const result: SyncResult = { success: false, error: 'No active consent' };
      await auditSync(context, result, 'UPSERT');
      return result;
    }

    // Build FHIR Encounter
    const fhirEncounter: FHIREncounter = {
      resourceType: 'Encounter',
      id: payload.encounter.fhirResourceId || payload.encounter.id,
      status: payload.encounter.status.toLowerCase().replace('_', '-') as FHIREncounter['status'],
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: mapEncounterTypeToActCode(payload.encounter.type),
      },
      subject: {
        reference: `Patient/${payload.patientToken.id}`,
        display: `Patient [${payload.patientToken.id.slice(0, 6).toUpperCase()}]`,
      },
      period: {
        start: payload.encounter.start?.toISOString(),
        end: payload.encounter.end?.toISOString(),
      },
      reasonCode: payload.encounter.reasonCode ? [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: payload.encounter.reasonCode,
          display: payload.encounter.reasonDisplay,
        }],
      }] : undefined,
      location: payload.encounter.locationDisplay ? [{
        location: {
          display: payload.encounter.locationDisplay,
        },
      }] : undefined,
    };

    await upsertResource('Encounter', fhirEncounter, context);

    // Update local metadata
    if (prismaClient) {
      await prismaClient.encounter.update({
        where: { id: payload.encounter.id },
        data: {
          fhirResourceId: fhirEncounter.id,
          lastSyncedAt: new Date(),
        },
      });
    }

    const result: SyncResult = { success: true, fhirResourceId: fhirEncounter.id };
    await auditSync(context, result, 'UPSERT');
    return result;
  } catch (error) {
    log('error', 'Encounter sync failed', { ...context, error: (error as Error).message });
    const result: SyncResult = { success: false, error: (error as Error).message };
    await auditSync(context, result, 'UPSERT');
    return result;
  }
}

/**
 * OBSERVATION SYNC
 */
export interface ObservationSyncPayload {
  observation: Observation;
  patientToken: PatientToken;
}

export async function syncObservationToFhir(payload: ObservationSyncPayload): Promise<SyncResult> {
  const correlationId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const context: SyncContext = {
    correlationId,
    orgId: payload.observation.orgId,
    resourceType: 'Observation',
    resourceId: payload.observation.id,
  };

  try {
    log('info', 'Starting Observation sync', context);

    if (!payload.observation.fhirSyncEnabled) {
      log('info', 'Observation sync disabled', context);
      return { success: false, error: 'Sync disabled for this resource' };
    }

    // Check consent
    const dataClass = payload.observation.code.startsWith('8867-') ? 'vitals' : 'labs';
    const hasConsent = await checkConsent(
      payload.observation.patientTokenId,
      payload.observation.orgId,
      dataClass,
      context
    );
    if (!hasConsent) {
      const result: SyncResult = { success: false, error: 'No active consent' };
      await auditSync(context, result, 'UPSERT');
      return result;
    }

    // Build FHIR Observation
    const fhirObservation: FHIRObservation = {
      resourceType: 'Observation',
      id: payload.observation.fhirResourceId || payload.observation.id,
      status: 'final',
      code: {
        coding: [{
          system: payload.observation.codeSystem,
          code: payload.observation.code,
          display: payload.observation.display,
        }],
      },
      subject: {
        reference: `Patient/${payload.patientToken.id}`,
      },
      encounter: payload.observation.encounterId ? {
        reference: `Encounter/${payload.observation.encounterId}`,
      } : undefined,
      effectiveDateTime: payload.observation.effectiveDateTime.toISOString(),
      valueQuantity: payload.observation.valueQuantity ? {
        value: Number(payload.observation.valueQuantity),
        unit: payload.observation.valueUnit || undefined,
      } : undefined,
      valueString: payload.observation.valueString || undefined,
      valueBoolean: payload.observation.valueBoolean ?? undefined,
    };

    await upsertResource('Observation', fhirObservation, context);

    // Update local metadata
    if (prismaClient) {
      await prismaClient.observation.update({
        where: { id: payload.observation.id },
        data: {
          fhirResourceId: fhirObservation.id,
          lastSyncedAt: new Date(),
        },
      });
    }

    const result: SyncResult = { success: true, fhirResourceId: fhirObservation.id };
    await auditSync(context, result, 'UPSERT');
    return result;
  } catch (error) {
    log('error', 'Observation sync failed', { ...context, error: (error as Error).message });
    const result: SyncResult = { success: false, error: (error as Error).message };
    await auditSync(context, result, 'UPSERT');
    return result;
  }
}

/**
 * PATIENT EVERYTHING EXPORT
 * Fetches complete FHIR bundle for a patient
 */
export async function fetchPatientEverything(patientId: string, orgId: string): Promise<Bundle | null> {
  const correlationId = `fetch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const context: SyncContext = {
    correlationId,
    orgId,
    resourceType: 'Bundle',
    resourceId: patientId,
  };

  try {
    const token = await getAccessToken(context);
    if (!token) return null;

    const url = new URL(`/fhir/R4/Patient/${patientId}/$everything`, MEDPLUM_BASE_URL).toString();

    log('info', 'Fetching patient bundle', context);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Correlation-ID': correlationId,
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Bundle fetch failed: ${response.status} ${detail}`);
    }

    const bundle = (await response.json()) as Bundle;

    log('info', 'Patient bundle fetched', {
      ...context,
      entryCount: bundle.entry?.length || 0,
    });

    // Audit the export
    await auditSync(context, { success: true }, 'UPSERT');

    return bundle;
  } catch (error) {
    log('error', 'Bundle fetch failed', { ...context, error: (error as Error).message });
    return null;
  }
}
