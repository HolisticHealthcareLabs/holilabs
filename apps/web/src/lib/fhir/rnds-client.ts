/**
 * RNDS Syndication Client
 *
 * Sends FHIR R4 resources to Brazil's RNDS (Rede Nacional de Dados em Saude).
 * Every outbound request is:
 *   1. Injected with the correct RNDS profile URL (injectRndsProfile)
 *   2. Authenticated via mTLS OAuth2 token (rnds-token-manager)
 *   3. Logged with LGPD Art. 33 boundary annotation (audit-buffer)
 *
 * RUTH:  Every FHIR write is annotated as an LGPD Art. 33 boundary crossing.
 * CYRUS: No credential material touches this module — delegated to token manager.
 * ELENA: Resource validation is caller's responsibility; this client is transport-only.
 */

import { RNDS_ENDPOINTS } from './rnds-profiles';
import { injectRndsProfile } from './rnds-profiles';
import { getToken, invalidateToken } from './rnds-token-manager';
import { auditBuffer } from '@/lib/api/audit-buffer';
import logger from '@/lib/logger';

/* ── Types ─────────────────────────────────────────────────────── */

export interface RndsSendResult {
  success: boolean;
  status: number;
  location?: string;
  operationOutcome?: Record<string, unknown>;
}

interface RndsSendOptions {
  /** Practitioner or system user email for audit trail */
  actorEmail: string;
  /** Patient ID for audit scoping */
  patientId?: string;
  /** Organization ID for tenant scoping */
  organizationId?: string;
  /** Reason for access (logged in audit) */
  accessReason?: string;
}

/* ── Internal ──────────────────────────────────────────────────── */

function getFhirEndpoint(): string {
  const isHomolog = process.env.RNDS_ENV === 'homolog' || process.env.NODE_ENV !== 'production';
  return isHomolog ? RNDS_ENDPOINTS.fhirHomolog : RNDS_ENDPOINTS.fhir;
}

function emitBoundaryAudit(
  action: string,
  options: RndsSendOptions,
  details: Record<string, unknown>,
  success: boolean,
): void {
  auditBuffer.enqueue({
    userEmail: options.actorEmail,
    ipAddress: '0.0.0.0',
    action,
    resource: 'RNDS_FHIR',
    resourceId: options.patientId ?? 'unknown',
    success,
    actorType: 'SYSTEM',
    accessReason: options.accessReason ?? 'LGPD Art. 33 — RNDS FHIR syndication',
    details: {
      ...details,
      legalBasis: 'LGPD Art. 33',
      dataFlow: 'OUTBOUND',
      destination: 'RNDS (ehr-services.saude.gov.br)',
      country: 'BR',
      organizationId: options.organizationId,
    },
  });
}

/* ── Public API ─────────────────────────────────────────────────── */

/**
 * Send a FHIR resource to RNDS.
 *
 * Automatically injects the RNDS profile URL and handles
 * token refresh on 401 (single retry).
 */
export async function sendToRnds(
  resource: { resourceType: string; [key: string]: unknown },
  options: RndsSendOptions,
): Promise<RndsSendResult> {
  const enriched = injectRndsProfile(resource as any);
  const endpoint = `${getFhirEndpoint()}/${enriched.resourceType}`;

  const attempt = async (isRetry: boolean): Promise<RndsSendResult> => {
    const token = await getToken();
    const startMs = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/fhir+json',
        },
        body: JSON.stringify(enriched),
      });

      const elapsedMs = Date.now() - startMs;

      if (response.status === 401 && !isRetry) {
        invalidateToken();
        logger.warn({ event: 'rnds_401_retry' }, 'RNDS returned 401 — retrying with fresh token');
        return attempt(true);
      }

      const result: RndsSendResult = {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        location: response.headers.get('Location') ?? undefined,
      };

      if (!result.success) {
        try {
          result.operationOutcome = await response.json();
        } catch {
          // Response body may not be JSON
        }
      }

      logger.info(
        {
          event: 'rnds_send',
          resourceType: enriched.resourceType,
          status: response.status,
          elapsedMs,
          success: result.success,
        },
        `RNDS ${enriched.resourceType} → ${response.status}`,
      );

      emitBoundaryAudit(
        `RNDS_SEND_${enriched.resourceType.toUpperCase()}`,
        options,
        {
          resourceType: enriched.resourceType,
          httpStatus: response.status,
          elapsedMs,
          location: result.location,
          isRetry,
        },
        result.success,
      );

      return result;
    } catch (error) {
      const elapsedMs = Date.now() - startMs;
      const message = error instanceof Error ? error.message : String(error);

      logger.error(
        {
          event: 'rnds_send_failed',
          resourceType: enriched.resourceType,
          elapsedMs,
          error: message,
        },
        `RNDS ${enriched.resourceType} send failed`,
      );

      emitBoundaryAudit(
        `RNDS_SEND_${enriched.resourceType.toUpperCase()}`,
        options,
        {
          resourceType: enriched.resourceType,
          elapsedMs,
          error: message,
          isRetry,
        },
        false,
      );

      return {
        success: false,
        status: 0,
        operationOutcome: { error: message },
      };
    }
  };

  return attempt(false);
}

/**
 * Send a FHIR Bundle (transaction/batch) to RNDS.
 *
 * Each entry's resource is profile-injected before sending.
 * The entire bundle counts as a single boundary crossing event.
 */
export async function sendBundleToRnds(
  bundle: {
    resourceType: 'Bundle';
    type: 'transaction' | 'batch';
    entry: Array<{
      resource: { resourceType: string; [key: string]: unknown };
      request?: { method: string; url: string };
    }>;
  },
  options: RndsSendOptions,
): Promise<RndsSendResult> {
  const enrichedBundle = {
    ...bundle,
    entry: bundle.entry.map((entry) => ({
      ...entry,
      resource: injectRndsProfile(entry.resource as any),
    })),
  };

  const endpoint = getFhirEndpoint();
  const token = await getToken();
  const startMs = Date.now();
  const resourceTypes = [...new Set(bundle.entry.map((e) => e.resource.resourceType))];

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/fhir+json',
      },
      body: JSON.stringify(enrichedBundle),
    });

    const elapsedMs = Date.now() - startMs;

    if (response.status === 401) {
      invalidateToken();
      const freshToken = await getToken();
      const retryResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json',
          Authorization: `Bearer ${freshToken}`,
          Accept: 'application/fhir+json',
        },
        body: JSON.stringify(enrichedBundle),
      });

      const result: RndsSendResult = {
        success: retryResponse.status >= 200 && retryResponse.status < 300,
        status: retryResponse.status,
      };

      emitBoundaryAudit('RNDS_SEND_BUNDLE', options, {
        entryCount: bundle.entry.length,
        resourceTypes,
        httpStatus: retryResponse.status,
        elapsedMs: Date.now() - startMs,
        isRetry: true,
      }, result.success);

      return result;
    }

    const result: RndsSendResult = {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
    };

    if (!result.success) {
      try {
        result.operationOutcome = await response.json();
      } catch {
        // Response body may not be JSON
      }
    }

    logger.info(
      {
        event: 'rnds_send_bundle',
        entryCount: bundle.entry.length,
        resourceTypes,
        status: response.status,
        elapsedMs,
      },
      `RNDS Bundle (${bundle.entry.length} entries) → ${response.status}`,
    );

    emitBoundaryAudit('RNDS_SEND_BUNDLE', options, {
      entryCount: bundle.entry.length,
      resourceTypes,
      httpStatus: response.status,
      elapsedMs,
    }, result.success);

    return result;
  } catch (error) {
    const elapsedMs = Date.now() - startMs;
    const message = error instanceof Error ? error.message : String(error);

    emitBoundaryAudit('RNDS_SEND_BUNDLE', options, {
      entryCount: bundle.entry.length,
      resourceTypes,
      elapsedMs,
      error: message,
    }, false);

    return {
      success: false,
      status: 0,
      operationOutcome: { error: message },
    };
  }
}
