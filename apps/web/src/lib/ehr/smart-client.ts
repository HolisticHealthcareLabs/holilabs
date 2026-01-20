/**
 * SMART on FHIR Client
 *
 * Implements SMART App Launch Framework (HL7 SMART on FHIR)
 * for OAuth 2.0 authentication with EHR systems.
 *
 * Features:
 * - Authorization URL generation with PKCE
 * - Token exchange (authorization code → access token)
 * - Token refresh
 * - Session management
 * - FHIR resource fetching with automatic token refresh
 *
 * References:
 * - https://hl7.org/fhir/smart-app-launch/
 * - https://www.medplum.com/docs/auth/smart-app-launch
 */

import { MedplumClient } from '@medplum/core';
import { getProviderConfig, fetchSmartConfiguration, EHR_PROVIDERS } from './providers';
import {
  EhrProviderId,
  SmartTokenResponse,
  SmartSession,
  OAuthState,
  EhrAuthError,
  EhrApiError,
  SmartConfiguration,
} from './types';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import crypto from 'crypto';

// ============================================================================
// PKCE HELPERS
// ============================================================================

/**
 * Generate a cryptographically secure code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  // 43-128 characters, URL-safe base64
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate code challenge from verifier using S256 method
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64url');
}

/**
 * Generate a secure state parameter
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

// ============================================================================
// AUTHORIZATION URL
// ============================================================================

export interface AuthorizationUrlOptions {
  providerId: EhrProviderId;
  userId: string;
  redirectPath?: string; // Where to redirect after auth completes
  launch?: string; // EHR launch context (for EHR launch flow)
  aud?: string; // FHIR server URL (required by some providers)
}

/**
 * Generate SMART authorization URL for initiating OAuth flow
 */
export async function generateAuthorizationUrl(
  options: AuthorizationUrlOptions
): Promise<{ url: string; state: string; codeVerifier?: string }> {
  const { providerId, userId, redirectPath = '/dashboard', launch, aud } = options;

  const config = getProviderConfig(providerId);
  if (!config) {
    throw new EhrAuthError(`Unknown provider: ${providerId}`, providerId);
  }

  if (!config.clientId) {
    throw new EhrAuthError(`Provider ${providerId} is not configured`, providerId);
  }

  // Get OAuth endpoints (from config or discovery)
  let authorizationEndpoint = config.authorizationEndpoint;

  if (!authorizationEndpoint) {
    const smartConfig = await fetchSmartConfiguration(providerId);
    authorizationEndpoint = smartConfig.authorization_endpoint;
  }

  if (!authorizationEndpoint) {
    throw new EhrAuthError(`No authorization endpoint for ${providerId}`, providerId);
  }

  // Generate state and PKCE
  const state = generateState();
  let codeVerifier: string | undefined;

  // Build OAuth state object to store
  const oauthState: OAuthState = {
    providerId,
    userId,
    redirectPath,
    launchContext: launch,
    createdAt: Date.now(),
  };

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state,
  });

  // Add PKCE if required
  if (config.requiresPKCE) {
    codeVerifier = generateCodeVerifier();
    oauthState.codeVerifier = codeVerifier;
    params.set('code_challenge', generateCodeChallenge(codeVerifier));
    params.set('code_challenge_method', 'S256');
  }

  // Add audience (FHIR server URL) - required by Epic
  params.set('aud', aud || config.fhirBaseUrl);

  // Add launch context if provided (EHR launch flow)
  if (launch) {
    params.set('launch', launch);
  }

  // Store OAuth state in database for verification
  await storeOAuthState(state, oauthState);

  const url = `${authorizationEndpoint}?${params.toString()}`;

  logger.info({
    event: 'smart_auth_url_generated',
    providerId,
    userId,
    hasLaunch: !!launch,
    hasPKCE: !!codeVerifier,
  });

  return { url, state, codeVerifier };
}

// ============================================================================
// TOKEN EXCHANGE
// ============================================================================

export interface TokenExchangeOptions {
  providerId: EhrProviderId;
  code: string;
  state: string;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  options: TokenExchangeOptions
): Promise<SmartSession> {
  const { providerId, code, state } = options;

  // Retrieve and verify OAuth state
  const oauthState = await retrieveOAuthState(state);
  if (!oauthState) {
    throw new EhrAuthError('Invalid or expired state parameter', providerId, 'invalid_state');
  }

  if (oauthState.providerId !== providerId) {
    throw new EhrAuthError('Provider mismatch in state', providerId, 'state_mismatch');
  }

  const config = getProviderConfig(providerId);
  if (!config) {
    throw new EhrAuthError(`Unknown provider: ${providerId}`, providerId);
  }

  // Get token endpoint
  let tokenEndpoint = config.tokenEndpoint;
  if (!tokenEndpoint) {
    const smartConfig = await fetchSmartConfiguration(providerId);
    tokenEndpoint = smartConfig.token_endpoint;
  }

  if (!tokenEndpoint) {
    throw new EhrAuthError(`No token endpoint for ${providerId}`, providerId);
  }

  // Build token request
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
  });

  // Add PKCE verifier if used
  if (oauthState.codeVerifier) {
    body.set('code_verifier', oauthState.codeVerifier);
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };

  // Add client authentication (if confidential client)
  if (config.clientSecret) {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  // Exchange code for token
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    logger.error({
      event: 'smart_token_exchange_failed',
      providerId,
      status: response.status,
      error: error.error,
      description: error.error_description,
    });
    throw new EhrAuthError(
      error.error_description || 'Token exchange failed',
      providerId,
      error.error,
      error.error_description
    );
  }

  const tokenResponse: SmartTokenResponse = await response.json();

  // Calculate expiration time
  const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

  // Create session
  const session: SmartSession = {
    id: crypto.randomUUID(),
    userId: oauthState.userId,
    providerId,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || null,
    expiresAt,
    scope: tokenResponse.scope,
    patientFhirId: tokenResponse.patient || null,
    encounterFhirId: tokenResponse.encounter || null,
    fhirUserReference: null, // Extract from id_token if needed
    fhirBaseUrl: config.fhirBaseUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store session
  await storeSmartSession(session);

  // Clean up OAuth state
  await deleteOAuthState(state);

  logger.info({
    event: 'smart_token_exchanged',
    providerId,
    userId: oauthState.userId,
    hasRefreshToken: !!tokenResponse.refresh_token,
    patientContext: !!tokenResponse.patient,
    expiresIn: tokenResponse.expires_in,
  });

  return session;
}

// ============================================================================
// TOKEN REFRESH
// ============================================================================

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  sessionId: string
): Promise<SmartSession | null> {
  const session = await getSmartSession(sessionId);
  if (!session) {
    return null;
  }

  if (!session.refreshToken) {
    logger.warn({
      event: 'smart_refresh_no_token',
      sessionId,
      providerId: session.providerId,
    });
    return null;
  }

  const config = getProviderConfig(session.providerId);
  if (!config) {
    throw new EhrAuthError(`Unknown provider: ${session.providerId}`, session.providerId);
  }

  // Get token endpoint
  let tokenEndpoint = config.tokenEndpoint;
  if (!tokenEndpoint) {
    const smartConfig = await fetchSmartConfiguration(session.providerId);
    tokenEndpoint = smartConfig.token_endpoint;
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
    client_id: config.clientId,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };

  if (config.clientSecret) {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(tokenEndpoint!, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    logger.error({
      event: 'smart_token_refresh_failed',
      sessionId,
      providerId: session.providerId,
      status: response.status,
      error: error.error,
    });

    // If refresh fails, delete the session
    await deleteSmartSession(sessionId);
    return null;
  }

  const tokenResponse: SmartTokenResponse = await response.json();

  // Update session
  const updatedSession: SmartSession = {
    ...session,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || session.refreshToken,
    expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
    scope: tokenResponse.scope,
    updatedAt: new Date(),
  };

  await updateSmartSession(updatedSession);

  logger.info({
    event: 'smart_token_refreshed',
    sessionId,
    providerId: session.providerId,
    expiresIn: tokenResponse.expires_in,
  });

  return updatedSession;
}

// ============================================================================
// FHIR CLIENT WITH AUTO-REFRESH
// ============================================================================

/**
 * Get a FHIR client with valid access token
 * Automatically refreshes token if expired
 */
export async function getFhirClient(
  sessionId: string
): Promise<{ client: MedplumClient; session: SmartSession } | null> {
  let session = await getSmartSession(sessionId);
  if (!session) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const expirationBuffer = 5 * 60 * 1000; // 5 minutes
  if (session.expiresAt.getTime() - Date.now() < expirationBuffer) {
    logger.info({
      event: 'smart_token_expiring',
      sessionId,
      providerId: session.providerId,
      expiresAt: session.expiresAt,
    });

    // Attempt refresh
    const refreshedSession = await refreshAccessToken(sessionId);
    if (!refreshedSession) {
      return null;
    }
    session = refreshedSession;
  }

  // Create Medplum client with the access token
  const client = new MedplumClient({
    baseUrl: session.fhirBaseUrl.replace('/fhir/R4', '').replace('/r4', ''),
    fhirUrlPath: session.fhirBaseUrl.includes('/fhir/R4') ? 'fhir/R4' : 'r4',
  });

  // Set access token directly
  client.setAccessToken(session.accessToken);

  return { client, session };
}

/**
 * Fetch FHIR resource with automatic token refresh
 */
export async function fetchFhirResource<T = any>(
  sessionId: string,
  resourceType: string,
  id?: string,
  params?: Record<string, string>
): Promise<T> {
  const result = await getFhirClient(sessionId);
  if (!result) {
    throw new EhrApiError('Session not found or expired', 'medplum' as EhrProviderId, 401);
  }

  const { session } = result;

  // Build URL
  let url = `${session.fhirBaseUrl}/${resourceType}`;
  if (id) {
    url += `/${id}`;
  }
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: 'application/fhir+json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new EhrApiError(
      error.issue?.[0]?.diagnostics || `Failed to fetch ${resourceType}`,
      session.providerId,
      response.status,
      error.resourceType === 'OperationOutcome' ? error : undefined
    );
  }

  return response.json();
}

// ============================================================================
// SESSION STORAGE (Using Prisma)
// ============================================================================

/**
 * Store SMART session in database
 */
async function storeSmartSession(session: SmartSession): Promise<void> {
  await prisma.ehrSession.upsert({
    where: {
      userId_providerId: {
        userId: session.userId,
        providerId: session.providerId,
      },
    },
    create: {
      id: session.id,
      userId: session.userId,
      providerId: session.providerId,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      scope: session.scope,
      patientFhirId: session.patientFhirId,
      encounterFhirId: session.encounterFhirId,
      fhirUserReference: session.fhirUserReference,
      fhirBaseUrl: session.fhirBaseUrl,
    },
    update: {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      scope: session.scope,
      patientFhirId: session.patientFhirId,
      encounterFhirId: session.encounterFhirId,
      fhirUserReference: session.fhirUserReference,
      fhirBaseUrl: session.fhirBaseUrl,
      updatedAt: new Date(),
    },
  });
}

/**
 * Update existing SMART session
 */
async function updateSmartSession(session: SmartSession): Promise<void> {
  await prisma.ehrSession.update({
    where: { id: session.id },
    data: {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      scope: session.scope,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get SMART session by ID
 */
async function getSmartSession(sessionId: string): Promise<SmartSession | null> {
  const session = await prisma.ehrSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return null;

  return {
    ...session,
    providerId: session.providerId as EhrProviderId,
  };
}

/**
 * Get SMART session for user and provider
 */
export async function getSmartSessionForUser(
  userId: string,
  providerId: EhrProviderId
): Promise<SmartSession | null> {
  const session = await prisma.ehrSession.findUnique({
    where: {
      userId_providerId: {
        userId,
        providerId,
      },
    },
  });

  if (!session) return null;

  return {
    ...session,
    providerId: session.providerId as EhrProviderId,
  };
}

/**
 * Delete SMART session
 */
async function deleteSmartSession(sessionId: string): Promise<void> {
  await prisma.ehrSession.delete({
    where: { id: sessionId },
  }).catch(() => {
    // Ignore if already deleted
  });
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  await prisma.ehrSession.deleteMany({
    where: { userId },
  });
}

// ============================================================================
// OAUTH STATE STORAGE (Using Redis or Database)
// ============================================================================

// For simplicity, using database. In production, consider Redis for short-lived state.

/**
 * Store OAuth state
 */
async function storeOAuthState(state: string, data: OAuthState): Promise<void> {
  await prisma.oAuthState.create({
    data: {
      state,
      providerId: data.providerId,
      userId: data.userId,
      redirectPath: data.redirectPath,
      codeVerifier: data.codeVerifier,
      launchContext: data.launchContext,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minute expiry
    },
  });
}

/**
 * Retrieve and validate OAuth state
 */
async function retrieveOAuthState(state: string): Promise<OAuthState | null> {
  const record = await prisma.oAuthState.findUnique({
    where: { state },
  });

  if (!record) return null;

  // Check expiry
  if (record.expiresAt < new Date()) {
    await deleteOAuthState(state);
    return null;
  }

  return {
    providerId: record.providerId as EhrProviderId,
    userId: record.userId,
    redirectPath: record.redirectPath,
    codeVerifier: record.codeVerifier || undefined,
    launchContext: record.launchContext || undefined,
    createdAt: record.createdAt.getTime(),
  };
}

/**
 * Delete OAuth state
 */
async function deleteOAuthState(state: string): Promise<void> {
  await prisma.oAuthState.delete({
    where: { state },
  }).catch(() => {
    // Ignore if already deleted
  });
}

// ============================================================================
// CONNECTION STATUS
// ============================================================================

import { EhrConnectionStatus } from './types';

/**
 * Get EHR connection status for a user
 */
export async function getConnectionStatus(
  userId: string,
  providerId: EhrProviderId
): Promise<EhrConnectionStatus> {
  const session = await getSmartSessionForUser(userId, providerId);

  if (!session) {
    return {
      providerId,
      isConnected: false,
    };
  }

  const isExpired = session.expiresAt < new Date();
  const canRefresh = !!session.refreshToken;

  return {
    providerId,
    isConnected: !isExpired || canRefresh,
    connectedAt: session.createdAt,
    expiresAt: session.expiresAt,
    patientContext: session.patientFhirId
      ? { fhirId: session.patientFhirId }
      : undefined,
    error: isExpired && !canRefresh ? 'Session expired' : undefined,
  };
}

/**
 * Get all EHR connection statuses for a user
 */
export async function getAllConnectionStatuses(
  userId: string
): Promise<EhrConnectionStatus[]> {
  const sessions = await prisma.ehrSession.findMany({
    where: { userId },
  });

  const statuses: EhrConnectionStatus[] = [];

  for (const providerId of Object.keys(EHR_PROVIDERS) as EhrProviderId[]) {
    const session = sessions.find((s) => s.providerId === providerId);

    if (!session) {
      statuses.push({
        providerId,
        isConnected: false,
      });
    } else {
      const isExpired = session.expiresAt < new Date();
      const canRefresh = !!session.refreshToken;

      statuses.push({
        providerId,
        isConnected: !isExpired || canRefresh,
        connectedAt: session.createdAt,
        expiresAt: session.expiresAt,
        patientContext: session.patientFhirId
          ? { fhirId: session.patientFhirId }
          : undefined,
        error: isExpired && !canRefresh ? 'Session expired' : undefined,
      });
    }
  }

  return statuses;
}

/**
 * Disconnect from an EHR provider
 */
export async function disconnectProvider(
  userId: string,
  providerId: EhrProviderId
): Promise<void> {
  await prisma.ehrSession.deleteMany({
    where: {
      userId,
      providerId,
    },
  });

  logger.info({
    event: 'smart_provider_disconnected',
    userId,
    providerId,
  });
}
