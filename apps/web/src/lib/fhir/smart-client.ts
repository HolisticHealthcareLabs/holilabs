/**
 * SMART on FHIR Authorization Client
 *
 * Implements SMART App Launch Framework for Epic/Cerner EHR integration
 * Spec: http://hl7.org/fhir/smart-app-launch/
 *
 * Environment Variables:
 * - SMART_CLIENT_ID: OAuth client ID registered with the EHR
 * - SMART_REDIRECT_URI: OAuth callback URL (e.g., https://app.holilabs.com/api/fhir/callback)
 * - SMART_SCOPES: Space-separated OAuth scopes (default: launch patient/*.read openid fhirUser)
 *
 * Test with: https://launch.smarthealthit.org/ (SMART Health IT Sandbox)
 */

import { logger } from '@/lib/logger';

/**
 * SMART Configuration from .well-known/smart-configuration
 * Spec: http://hl7.org/fhir/smart-app-launch/conformance.html
 */
export interface SMARTConfiguration {
  /** REQUIRED: URL of the authorization server's authorization endpoint */
  authorization_endpoint: string;

  /** REQUIRED: URL of the authorization server's token endpoint */
  token_endpoint: string;

  /** OPTIONAL: URL of the authorization server's introspection endpoint */
  introspection_endpoint?: string;

  /** OPTIONAL: URL of the authorization server's revocation endpoint */
  revocation_endpoint?: string;

  /** OPTIONAL: URL of the authorization server's registration endpoint */
  registration_endpoint?: string;

  /** OPTIONAL: URL of the authorization server's management endpoint */
  management_endpoint?: string;

  /** RECOMMENDED: Array of grant types supported */
  grant_types_supported?: string[];

  /** RECOMMENDED: Array of scopes supported */
  scopes_supported?: string[];

  /** RECOMMENDED: Array of response types supported */
  response_types_supported?: string[];

  /** RECOMMENDED: Array of code challenge methods supported (PKCE) */
  code_challenge_methods_supported?: string[];

  /** OPTIONAL: Array of capabilities supported */
  capabilities?: string[];

  /** OPTIONAL: JWKS URI for token validation */
  jwks_uri?: string;

  /** OPTIONAL: Issuer identifier */
  issuer?: string;
}

/**
 * OAuth Token Response from token endpoint
 */
export interface SMARTTokenResponse {
  /** Access token for FHIR API requests */
  access_token: string;

  /** Token type (usually "Bearer") */
  token_type: string;

  /** Token expiration time in seconds */
  expires_in?: number;

  /** Refresh token for obtaining new access tokens */
  refresh_token?: string;

  /** Scope granted by the authorization server */
  scope?: string;

  /** Patient ID in context (EHR launch) */
  patient?: string;

  /** Encounter ID in context (EHR launch) */
  encounter?: string;

  /** User identity claim (OpenID Connect) */
  id_token?: string;

  /** FHIR User reference (e.g., Practitioner/123) */
  fhirUser?: string;

  /** Need patient banner? */
  need_patient_banner?: boolean;

  /** Smart style URL */
  smart_style_url?: string;
}

/**
 * SMART Launch Context stored in session
 */
export interface SMARTLaunchContext {
  /** FHIR server base URL */
  iss: string;

  /** Launch token from EHR */
  launch?: string;

  /** Patient ID from token response */
  patientId?: string;

  /** Encounter ID from token response */
  encounterId?: string;

  /** FHIR User reference */
  fhirUser?: string;

  /** Access token for FHIR requests */
  accessToken: string;

  /** Token expiration timestamp (Unix ms) */
  expiresAt: number;

  /** Refresh token if available */
  refreshToken?: string;

  /** Scopes granted */
  scope?: string;
}

/**
 * Fetch SMART Configuration from FHIR server
 *
 * @param issUrl - FHIR server base URL (iss parameter)
 * @returns SMART configuration object
 * @throws Error if configuration cannot be fetched
 */
export async function getSmartConfiguration(issUrl: string): Promise<SMARTConfiguration> {
  // Normalize URL (remove trailing slash)
  const baseUrl = issUrl.replace(/\/$/, '');

  // Try .well-known/smart-configuration first (preferred)
  const smartConfigUrl = `${baseUrl}/.well-known/smart-configuration`;

  logger.info({
    event: 'smart_config_fetch_start',
    url: smartConfigUrl,
  });

  try {
    const response = await fetch(smartConfigUrl, {
      headers: {
        Accept: 'application/json',
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const config = await response.json();

      // Validate required fields
      if (!config.authorization_endpoint || !config.token_endpoint) {
        throw new Error('SMART configuration missing required endpoints');
      }

      logger.info({
        event: 'smart_config_fetch_success',
        authEndpoint: config.authorization_endpoint,
        tokenEndpoint: config.token_endpoint,
      });

      return config as SMARTConfiguration;
    }

    // If .well-known fails, try CapabilityStatement (fallback for older servers)
    logger.warn({
      event: 'smart_config_wellknown_failed',
      status: response.status,
      fallback: 'capability_statement',
    });

    return await getSmartConfigFromCapabilityStatement(baseUrl);
  } catch (error) {
    // Network error or timeout - try CapabilityStatement fallback
    if (error instanceof Error && error.name === 'TimeoutError') {
      logger.warn({
        event: 'smart_config_timeout',
        url: smartConfigUrl,
        fallback: 'capability_statement',
      });
    }

    // Try CapabilityStatement as fallback
    return await getSmartConfigFromCapabilityStatement(baseUrl);
  }
}

/**
 * Fallback: Extract SMART endpoints from CapabilityStatement
 * Used when .well-known/smart-configuration is not available
 */
async function getSmartConfigFromCapabilityStatement(baseUrl: string): Promise<SMARTConfiguration> {
  const capabilityUrl = `${baseUrl}/metadata`;

  logger.info({
    event: 'smart_config_capability_fallback',
    url: capabilityUrl,
  });

  const response = await fetch(capabilityUrl, {
    headers: {
      Accept: 'application/fhir+json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CapabilityStatement: ${response.status} ${response.statusText}`);
  }

  const capability = await response.json();

  // Find OAuth URIs in security extension
  const restSecurity = capability.rest?.[0]?.security;

  if (!restSecurity) {
    throw new Error('No security information in CapabilityStatement');
  }

  // Look for OAuth URIs extension
  const oauthExtension = restSecurity.extension?.find(
    (ext: { url: string }) =>
      ext.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris'
  );

  if (!oauthExtension?.extension) {
    throw new Error('No OAuth URIs extension found in CapabilityStatement');
  }

  // Extract endpoints from nested extensions
  let authorizationEndpoint = '';
  let tokenEndpoint = '';

  for (const ext of oauthExtension.extension) {
    if (ext.url === 'authorize' && ext.valueUri) {
      authorizationEndpoint = ext.valueUri;
    } else if (ext.url === 'token' && ext.valueUri) {
      tokenEndpoint = ext.valueUri;
    }
  }

  if (!authorizationEndpoint || !tokenEndpoint) {
    throw new Error('Missing required OAuth endpoints in CapabilityStatement');
  }

  logger.info({
    event: 'smart_config_capability_success',
    authEndpoint: authorizationEndpoint,
    tokenEndpoint: tokenEndpoint,
  });

  return {
    authorization_endpoint: authorizationEndpoint,
    token_endpoint: tokenEndpoint,
  };
}

/**
 * Build OAuth Authorization URL for SMART launch
 *
 * @param config - SMART configuration
 * @param clientId - OAuth client ID
 * @param redirectUri - OAuth callback URL
 * @param scope - OAuth scopes (space-separated)
 * @param state - CSRF protection state token
 * @param launch - Launch token from EHR (optional, for EHR launch)
 * @param aud - Audience (FHIR server URL)
 * @returns Authorization URL to redirect user to
 */
export function buildAuthorizationUrl(
  config: SMARTConfiguration,
  clientId: string,
  redirectUri: string,
  scope: string,
  state: string,
  launch?: string,
  aud?: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    state: state,
    aud: aud || '',
  });

  // Add launch token for EHR launch
  if (launch) {
    params.set('launch', launch);
  }

  const authUrl = `${config.authorization_endpoint}?${params.toString()}`;

  logger.info({
    event: 'smart_auth_url_built',
    authEndpoint: config.authorization_endpoint,
    clientId,
    scope,
    hasLaunch: !!launch,
  });

  return authUrl;
}

/**
 * Exchange authorization code for access token
 *
 * @param config - SMART configuration
 * @param code - Authorization code from callback
 * @param clientId - OAuth client ID
 * @param redirectUri - OAuth callback URL (must match original request)
 * @param clientSecret - OAuth client secret (optional, for confidential clients)
 * @returns Token response with access token and patient context
 */
export async function exchangeCodeForToken(
  config: SMARTConfiguration,
  code: string,
  clientId: string,
  redirectUri: string,
  clientSecret?: string
): Promise<SMARTTokenResponse> {
  logger.info({
    event: 'smart_token_exchange_start',
    tokenEndpoint: config.token_endpoint,
    clientId,
  });

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: clientId,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };

  // Add client secret for confidential clients
  if (clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(config.token_endpoint, {
    method: 'POST',
    headers,
    body: body.toString(),
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({
      event: 'smart_token_exchange_failed',
      status: response.status,
      error: errorBody,
    });
    throw new Error(`Token exchange failed: ${response.status} - ${errorBody}`);
  }

  const tokenResponse = (await response.json()) as SMARTTokenResponse;

  logger.info({
    event: 'smart_token_exchange_success',
    hasPatient: !!tokenResponse.patient,
    hasEncounter: !!tokenResponse.encounter,
    hasFhirUser: !!tokenResponse.fhirUser,
    expiresIn: tokenResponse.expires_in,
    scope: tokenResponse.scope,
  });

  return tokenResponse;
}

/**
 * Refresh access token using refresh token
 *
 * @param config - SMART configuration
 * @param refreshToken - Refresh token from previous token response
 * @param clientId - OAuth client ID
 * @param clientSecret - OAuth client secret (optional, for confidential clients)
 * @returns New token response
 */
export async function refreshAccessToken(
  config: SMARTConfiguration,
  refreshToken: string,
  clientId: string,
  clientSecret?: string
): Promise<SMARTTokenResponse> {
  logger.info({
    event: 'smart_token_refresh_start',
    tokenEndpoint: config.token_endpoint,
    clientId,
  });

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  };

  // Add client secret for confidential clients
  if (clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const response = await fetch(config.token_endpoint, {
    method: 'POST',
    headers,
    body: body.toString(),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error({
      event: 'smart_token_refresh_failed',
      status: response.status,
      error: errorBody,
    });
    throw new Error(`Token refresh failed: ${response.status} - ${errorBody}`);
  }

  const tokenResponse = (await response.json()) as SMARTTokenResponse;

  logger.info({
    event: 'smart_token_refresh_success',
    expiresIn: tokenResponse.expires_in,
  });

  return tokenResponse;
}

/**
 * Generate cryptographically secure state token for CSRF protection
 *
 * @returns Random state string
 */
export function generateStateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse FHIR User reference to extract resource type and ID
 *
 * @param fhirUser - FHIR User reference (e.g., "Practitioner/123")
 * @returns Object with resourceType and id, or null if invalid
 */
export function parseFhirUser(fhirUser: string): { resourceType: string; id: string } | null {
  if (!fhirUser) return null;

  // Handle full URL format (e.g., https://fhir.example.com/Practitioner/123)
  const urlMatch = fhirUser.match(/\/?(Patient|Practitioner|RelatedPerson)\/([^/]+)$/);
  if (urlMatch) {
    return {
      resourceType: urlMatch[1],
      id: urlMatch[2],
    };
  }

  // Handle relative reference format (e.g., Practitioner/123)
  const relativeMatch = fhirUser.match(/^(Patient|Practitioner|RelatedPerson)\/(.+)$/);
  if (relativeMatch) {
    return {
      resourceType: relativeMatch[1],
      id: relativeMatch[2],
    };
  }

  return null;
}

/**
 * Create SMART launch context from token response
 *
 * @param iss - FHIR server URL
 * @param tokenResponse - Token response from authorization server
 * @param launch - Original launch token (optional)
 * @returns SMART launch context for session storage
 */
export function createLaunchContext(
  iss: string,
  tokenResponse: SMARTTokenResponse,
  launch?: string
): SMARTLaunchContext {
  const expiresIn = tokenResponse.expires_in || 3600; // Default 1 hour
  const expiresAt = Date.now() + expiresIn * 1000;

  return {
    iss,
    launch,
    patientId: tokenResponse.patient,
    encounterId: tokenResponse.encounter,
    fhirUser: tokenResponse.fhirUser,
    accessToken: tokenResponse.access_token,
    expiresAt,
    refreshToken: tokenResponse.refresh_token,
    scope: tokenResponse.scope,
  };
}

/**
 * Check if SMART token is expired or about to expire
 *
 * @param context - SMART launch context
 * @param bufferSeconds - Buffer time before expiration (default 60 seconds)
 * @returns true if token is expired or expiring soon
 */
export function isTokenExpired(context: SMARTLaunchContext, bufferSeconds: number = 60): boolean {
  return Date.now() >= context.expiresAt - bufferSeconds * 1000;
}
