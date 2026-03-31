/**
 * RNDS OAuth2 Token Manager — mTLS Client Credentials Flow
 *
 * Authenticates with Brazil's RNDS (Rede Nacional de Dados em Saude)
 * using OAuth2 client_credentials grant with certificate-based mTLS.
 *
 * CYRUS: mTLS certificate + private key fetched from GCP Secret Manager
 *        on every token refresh. Never stored in env vars or on disk.
 * RUTH:  Token acquisition itself is logged as an RNDS boundary event.
 */

import { RNDS_ENDPOINTS } from './rnds-profiles';
import { getSecret, getSecretJSON } from '@/lib/secrets/gcp-secrets';
import { auditBuffer } from '@/lib/api/audit-buffer';
import logger from '@/lib/logger';

/* ── Types ─────────────────────────────────────────────────────── */

interface RndsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface RndsCertBundle {
  cert: string;
  key: string;
  ca?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/* ── Secret Names ──────────────────────────────────────────────── */

const RNDS_CERT_SECRET = 'RNDS_MTLS_CERT_BUNDLE';
const RNDS_CLIENT_ID_SECRET = 'RNDS_CLIENT_ID';

/* ── Token Cache ───────────────────────────────────────────────── */

let cachedToken: CachedToken | null = null;
const TOKEN_REFRESH_MARGIN_MS = 60_000;

/* ── Internal Helpers ──────────────────────────────────────────── */

function isHomolog(): boolean {
  return process.env.RNDS_ENV === 'homolog' || process.env.NODE_ENV !== 'production';
}

function getAuthEndpoint(): string {
  return isHomolog() ? RNDS_ENDPOINTS.authHomolog : RNDS_ENDPOINTS.auth;
}

/**
 * Load mTLS certificate bundle from GCP Secret Manager.
 * CYRUS: certificate material lives exclusively in Secret Manager.
 */
async function loadCertBundle(): Promise<RndsCertBundle> {
  const bundle = await getSecretJSON<RndsCertBundle>(RNDS_CERT_SECRET);

  if (!bundle.cert || !bundle.key) {
    throw new Error(
      '[CYRUS] RNDS mTLS certificate bundle is incomplete — ' +
      'both "cert" and "key" fields are required in the secret.'
    );
  }

  return bundle;
}

/**
 * Emit LGPD Art. 33 boundary-crossing audit entry.
 * RUTH: even domestic RNDS transfers cross the application boundary
 * and must be annotated for the audit trail.
 */
function emitBoundaryAudit(
  action: string,
  details: Record<string, unknown>,
  success: boolean,
): void {
  auditBuffer.enqueue({
    userEmail: 'system@holilabs.internal',
    ipAddress: '0.0.0.0',
    action,
    resource: 'RNDS_BOUNDARY',
    resourceId: 'rnds-token-manager',
    success,
    actorType: 'SYSTEM',
    accessReason: 'LGPD Art. 33 — data boundary crossing (RNDS national health network)',
    details: {
      ...details,
      legalBasis: 'LGPD Art. 33',
      dataFlow: 'OUTBOUND',
      destination: 'RNDS (ehr-services.saude.gov.br)',
      country: 'BR',
      isHomolog: isHomolog(),
    },
  });
}

/* ── Public API ─────────────────────────────────────────────────── */

/**
 * Acquire a valid RNDS access token.
 *
 * Returns a cached token if still valid (with 60s margin).
 * Otherwise performs a fresh OAuth2 client_credentials exchange
 * using mTLS from the certificate bundle in Secret Manager.
 */
export async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS) {
    return cachedToken.accessToken;
  }

  const certBundle = await loadCertBundle();
  const clientId = await getSecret(RNDS_CLIENT_ID_SECRET);
  const authUrl = getAuthEndpoint();

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
  });

  let https: typeof import('https');
  try {
    https = await import('https');
  } catch {
    throw new Error('Node.js https module required for mTLS — cannot run in edge runtime');
  }

  const agent = new https.Agent({
    cert: certBundle.cert,
    key: certBundle.key,
    ca: certBundle.ca || undefined,
    rejectUnauthorized: true,
  });

  const startMs = Date.now();

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      // @ts-expect-error — Node.js fetch accepts agent via dispatcher
      dispatcher: agent,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown');
      throw new Error(`RNDS auth failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as RndsTokenResponse;
    const elapsedMs = Date.now() - startMs;

    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    logger.info(
      { event: 'rnds_token_acquired', elapsedMs, expiresIn: data.expires_in },
      'RNDS OAuth2 token acquired',
    );

    emitBoundaryAudit('RNDS_TOKEN_ACQUIRE', { elapsedMs, expiresIn: data.expires_in }, true);

    return cachedToken.accessToken;
  } catch (error) {
    const elapsedMs = Date.now() - startMs;
    const message = error instanceof Error ? error.message : String(error);

    logger.error(
      { event: 'rnds_token_failed', elapsedMs, error: message },
      'RNDS OAuth2 token acquisition failed',
    );

    emitBoundaryAudit('RNDS_TOKEN_ACQUIRE', { elapsedMs, error: message }, false);

    throw error;
  }
}

/**
 * Force-clear the cached token.
 * Call after receiving a 401 from RNDS to trigger re-authentication.
 */
export function invalidateToken(): void {
  cachedToken = null;
  logger.info({ event: 'rnds_token_invalidated' }, 'RNDS token cache cleared');
}

/**
 * Check whether a valid token exists without triggering a refresh.
 */
export function hasValidToken(): boolean {
  return cachedToken !== null && Date.now() < cachedToken.expiresAt - TOKEN_REFRESH_MARGIN_MS;
}
